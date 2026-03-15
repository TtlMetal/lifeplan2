import { AppData, ProjectionRow, Expense, Account, Income, MonteCarloMode } from '../types';
import { HISTORICAL_RETURNS } from '../constants/historicalReturns';

export function resolveExpenses(expenses: Expense[], retirementAge: number, lifeExpectancy: number): Expense[] {
  return expenses.map(e => {
    const start = e.duringRetirement ? retirementAge : e.startAge;
    const end = e.isUntilDeath ? lifeExpectancy : (e.duringRetirement ? lifeExpectancy : e.endAge);
    return { ...e, startAge: start, endAge: end };
  });
}

export function resolveIncome(income: Income[], currentAge: number, retirementAge: number, lifeExpectancy: number): Income[] {
  return income.map(i => {
    let start = i.startAge;
    let end = i.isUntilDeath ? lifeExpectancy : i.endAge;
    
    if (i.isWorkingYears) {
      start = currentAge;
      end = retirementAge;
    } else if (i.duringRetirement) {
      start = retirementAge;
      end = lifeExpectancy;
    }
    
    return { ...i, startAge: start, endAge: end };
  });
}

// Simple seeded PRNG (Mulberry32) for deterministic Monte Carlo results
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getAnnualIncrease(account: Account, yearsIn: number): number {
  const annualIncrease = Number(account.annualIncrease || 0);
  if (annualIncrease === 0) return 0;
  const interval = Math.max(1, Number(account.annualIncreaseInterval || 1));
  const periods = Math.floor(yearsIn / interval);
  if (periods <= 0) return 0;
  
  const baseContrib = account.contributionFreq === 'annual' ? Number(account.contribution) : Number(account.contribution) * 12;
  if (account.annualIncreaseType === 'percent') {
    return baseContrib * Math.pow(1 + annualIncrease / 100, periods) - baseContrib;
  } else {
    return periods * annualIncrease;
  }
}

export function calculateProjection(data: AppData, runs: number = 1, mode: MonteCarloMode = 'standard'): ProjectionRow[] {
  const { profile, retirement, accounts, income, expenses, milestones } = data;
  const activeAccounts = accounts.filter(a => !a.isHidden);
  const activeIncome = resolveIncome(income.filter(i => !i.isHidden), profile.currentAge, profile.retirementAge, profile.lifeExpectancy);
  const activeExpenses = expenses.filter(e => !e.isHidden);
  const activeMilestones = milestones.filter(m => !m.isHidden);
  
  const currentDiscretionaryPct = (() => {
    const retAge = profile.retirementAge;
    let activeAtRet = activeExpenses.filter(e => retAge >= e.startAge && retAge < e.endAge);
    if (activeAtRet.length === 0) {
      activeAtRet = activeExpenses.filter(e => profile.currentAge >= e.startAge && profile.currentAge < e.endAge);
    }
    if (activeAtRet.length === 0) {
      activeAtRet = activeExpenses;
    }
    const total = activeAtRet.reduce((sum, e) => sum + (e.freq === 'monthly' ? e.amount : e.amount / 12), 0);
    if (total === 0) return 30;
    const discretionary = activeAtRet
      .filter(e => e.flexibility === 'discretionary')
      .reduce((sum, e) => sum + (e.freq === 'monthly' ? e.amount : e.amount / 12), 0);
    return Math.round((discretionary / total) * 100);
  })();

  const retRatio = retirement.expenseRatio / 100;
  const resolvedExp = resolveExpenses(activeExpenses, profile.retirementAge, profile.lifeExpectancy);
  const rows: ProjectionRow[] = [];
  
  // Use a fixed seed so the same inputs always produce the same Monte Carlo results
  const random = mulberry32(12345);

  // Initialize balances for each run
  let runBalances = Array.from({ length: runs }, () => 
    activeAccounts.reduce((acc, a) => ({ ...acc, [a.id]: a.balance }), {} as Record<string, number>)
  );

  const runPeakNetWorth: number[] = Array.from({ length: runs }, () => 
    activeAccounts.reduce((acc, a) => acc + a.balance, 0)
  );

  // For Monte Carlo, assign each run a random starting year from historical data
  const runStartYears = Array.from({ length: runs }, () => 
    HISTORICAL_RETURNS[Math.floor(random() * HISTORICAL_RETURNS.length)].year
  );

  const runTotalsHistory: number[][] = Array.from({ length: runs }, () => []);

  for (let age = profile.currentAge; age <= profile.lifeExpectancy; age++) {
    const retired = age >= profile.retirementAge;
    const yearsIn = age - profile.currentAge;
    const inflationFactor = Math.pow(1 + profile.inflationRate / 100, yearsIn);

    // Income calculation
    const annIncome = activeIncome
      .filter(i => age >= i.startAge && age < i.endAge)
      .reduce((sum, i) => {
        const gr = i.growthRate / 100;
        const grown = i.isFixed ? 1 : Math.pow(1 + gr, yearsIn);
        return sum + (i.freq === 'monthly' ? i.amount * 12 : i.amount) * grown;
      }, 0);

    // Expenses calculation
    let baseEssentialExp = 0;
    let baseDiscretionaryExp = 0;
    let retSpecificEssentialExp = 0;
    let retSpecificDiscretionaryExp = 0;
    
    resolvedExp
      .filter(e => age >= e.startAge && age < e.endAge)
      .forEach(e => {
        const factor = e.isFixed ? 1 : Math.pow(1 + profile.inflationRate / 100, yearsIn);
        const amount = (e.freq === 'monthly' ? e.amount * 12 : e.amount) * factor;
        const isEssential = e.flexibility !== 'discretionary';
        
        if (e.duringRetirement) {
          if (isEssential) retSpecificEssentialExp += amount;
          else retSpecificDiscretionaryExp += amount;
        } else {
          if (isEssential) baseEssentialExp += amount;
          else baseDiscretionaryExp += amount;
        }
      });
    
    let essentialExp = 0;
    let discretionaryExp = 0;

    if (retired) {
      if (retirement.useCustom && retirement.customMonthly !== null) {
        // Inflate custom monthly from current age to this age
        const yearsFromNow = Math.max(0, age - profile.currentAge);
        const factor = Math.pow(1 + profile.inflationRate / 100, yearsFromNow);
        const customAnnual = (retirement.customMonthly * 12) * factor;
        
        // Split custom amount based on current discretionary percentage
        const flexPct = currentDiscretionaryPct / 100;
        discretionaryExp = (customAnnual * flexPct) + retSpecificDiscretionaryExp;
        essentialExp = (customAnnual * (1 - flexPct)) + retSpecificEssentialExp;
      } else {
        discretionaryExp = (baseDiscretionaryExp * retRatio) + retSpecificDiscretionaryExp;
        essentialExp = (baseEssentialExp * retRatio) + retSpecificEssentialExp;
      }
    } else {
      essentialExp = baseEssentialExp + retSpecificEssentialExp;
      discretionaryExp = baseDiscretionaryExp + retSpecificDiscretionaryExp;
    }

    // Milestone impact
    const milestone = activeMilestones.find(m => m.age === age);
    const mImpact = milestone ? milestone.impact : 0;
    
    let sumActualExp = 0;
    let sumEssential = 0;
    let sumDiscretionary = 0;
    let sumNetCF = 0;
    let sumAnnualContrib = 0;

    // 1. Calculate start totals
    const startTotals = runBalances.map(balances => activeAccounts.reduce((s, a) => s + balances[a.id], 0));

    // 2. Apply growth/contribs/netCF
    const endTotals = runBalances.map((balances, runIndex) => {
      let currentNW = startTotals[runIndex];
      if (currentNW > runPeakNetWorth[runIndex]) {
        runPeakNetWorth[runIndex] = currentNW;
      }
      
      let drawdown = 0;
      if (runPeakNetWorth[runIndex] > 0) {
        drawdown = (runPeakNetWorth[runIndex] - currentNW) / runPeakNetWorth[runIndex];
      }

      let cut = 0;
      if (retirement.enableGuardrails && retired) {
        if (drawdown >= 0.40) cut = 0.50; // 50% cut to discretionary
        else if (drawdown >= 0.20) cut = 0.25; // 25% cut to discretionary
      }

      let actualDiscretionary = discretionaryExp * (1 - cut);
      let actualExp = essentialExp + actualDiscretionary;
      let netCF = annIncome - actualExp + mImpact;

      let annualContributions = 0;
      let plannedContributions = 0;
      let extraInvestment = 0;

      if (!retired) {
        plannedContributions = activeAccounts.reduce((s, a) => {
          const increase = getAnnualIncrease(a, yearsIn);
          const baseC = a.contributionFreq === 'annual' ? Number(a.contribution) : Number(a.contribution) * 12;
          return s + Math.max(0, baseC + increase) + (Number(a.match) * 12);
        }, 0);

        // Correct leftover calculation: netCF is the total surplus before non-deferred contributions.
        // Tax-deferred contributions (like 401k) are assumed to be pre-tax and already deducted from take-home pay.
        // Employer match is also not paid from take-home pay.
        const nonDeferredContributions = activeAccounts.reduce((s, a) => {
          if (a.type === 'tax_deferred') return s;
          const increase = getAnnualIncrease(a, yearsIn);
          const baseC = a.contributionFreq === 'annual' ? Number(a.contribution) : Number(a.contribution) * 12;
          return s + Math.max(0, baseC + increase);
        }, 0);

        const surplus = netCF - nonDeferredContributions;
        const investRate = (retirement.investLeftoverRate || 0) / 100;
        
        // If surplus is positive, we invest a portion of it.
        // If negative, it's a shortfall that must be drawn from taxable accounts.
        extraInvestment = surplus > 0 ? surplus * investRate : surplus;
        
        // The value shown in the "Contributions" column should be the planned amount plus any extra invested.
        annualContributions = plannedContributions + (extraInvestment > 0 ? extraInvestment : 0);
      } else {
        annualContributions = netCF; // In retirement, netCF is what goes in/out of accounts
        plannedContributions = 0;
        extraInvestment = netCF;
      }

      sumActualExp += actualExp;
      sumEssential += essentialExp;
      sumDiscretionary += actualDiscretionary;
      sumNetCF += netCF;
      sumAnnualContrib += annualContributions;

      let total = 0;
      
      // Generate one market return for this run this year
      let marketR = 0;
      if (runs > 1) {
        if (mode === 'historical') {
          const startYear = runStartYears[runIndex];
          const currentYearIndex = (HISTORICAL_RETURNS.findIndex(h => h.year === startYear) + yearsIn) % HISTORICAL_RETURNS.length;
          marketR = HISTORICAL_RETURNS[currentYearIndex].return;
        } else if (mode === 'allocation') {
          const startYear = runStartYears[runIndex];
          const currentYearIndex = (HISTORICAL_RETURNS.findIndex(h => h.year === startYear) + yearsIn) % HISTORICAL_RETURNS.length;
          const hist = HISTORICAL_RETURNS[currentYearIndex];
          const stockWeight = age < profile.retirementAge ? 0.8 : 0.6;
          const bondWeight = 1 - stockWeight;
          marketR = (hist.return * stockWeight) + (hist.bondReturn * bondWeight);
        } else {
          marketR = (profile.marketReturn / 100) + (random() - 0.5) * 0.36;
        }
      } else {
        marketR = profile.marketReturn / 100;
      }

      for (const acc of activeAccounts) {
        // Apply market return. 
        let r = acc.type === 'cash' ? 0 : marketR;

        let balance = balances[acc.id];
        balance *= (1 + r);

        if (!retired) {
          const increase = getAnnualIncrease(acc, yearsIn);
          const baseC = acc.contributionFreq === 'annual' ? Number(acc.contribution) : Number(acc.contribution) * 12;
          const currentContrib = Math.max(0, baseC + increase);
          const totalC = currentContrib + (Number(acc.match) * 12);
          
          // Always add the full target contribution
          balance += totalC;
        }

        balance = Math.max(0, balance);
        balances[acc.id] = balance;
        total += balance;
      }

      // Handle leftover cash flow or deficit
      if (!retired) {
        if (extraInvestment > 0) {
          // Invest in taxable accounts only (not cash, as cash has 0% return)
          const taxableAccounts = activeAccounts.filter(a => a.type === 'taxable');
          const totalTaxableBalance = taxableAccounts.reduce((s, a) => s + balances[a.id], 0);
          
          if (taxableAccounts.length > 0) {
            for (const acc of taxableAccounts) {
              const share = totalTaxableBalance > 0 ? balances[acc.id] / totalTaxableBalance : 1 / taxableAccounts.length;
              balances[acc.id] = Math.max(0, balances[acc.id] + (extraInvestment * share));
            }
          } else {
            // Fallback: if no taxable accounts, distribute across non-cash accounts
            const nonCashAccounts = activeAccounts.filter(a => a.type !== 'cash');
            if (nonCashAccounts.length > 0) {
              const totalNonCash = nonCashAccounts.reduce((s, a) => s + balances[a.id], 0);
              for (const acc of nonCashAccounts) {
                const share = totalNonCash > 0 ? balances[acc.id] / totalNonCash : 1 / nonCashAccounts.length;
                balances[acc.id] = Math.max(0, balances[acc.id] + (extraInvestment * share));
              }
            } else {
              // Absolute fallback
              for (const acc of activeAccounts) {
                const share = total > 0 ? balances[acc.id] / total : 1 / activeAccounts.length;
                balances[acc.id] = Math.max(0, balances[acc.id] + (extraInvestment * share));
              }
            }
          }
        } else if (extraInvestment < 0) {
          // Deficit, distribute across all accounts proportionally to balance
          for (const acc of activeAccounts) {
            const share = total > 0 ? balances[acc.id] / total : 1 / activeAccounts.length;
            balances[acc.id] = Math.max(0, balances[acc.id] + (extraInvestment * share));
          }
        }
      } else {
        // In retirement, distribute netCF across accounts
        const taxableAccounts = activeAccounts.filter(a => a.type === 'taxable' || a.type === 'cash');
        const deferredAccounts = activeAccounts.filter(a => a.type === 'tax_deferred');
        const taxFreeAccounts = activeAccounts.filter(a => a.type === 'tax_free');
        
        if (netCF < 0) {
          // Draw from taxable first, then deferred, then tax-free
          const totalTaxable = taxableAccounts.reduce((s, a) => s + balances[a.id], 0);
          if (totalTaxable >= Math.abs(netCF)) {
            for (const acc of taxableAccounts) {
              const share = totalTaxable > 0 ? balances[acc.id] / totalTaxable : 1 / taxableAccounts.length;
              balances[acc.id] = Math.max(0, balances[acc.id] + (netCF * share));
            }
          } else {
            let remaining = Math.abs(netCF) - totalTaxable;
            for (const acc of taxableAccounts) {
              balances[acc.id] = 0;
            }
            
            const totalDeferred = deferredAccounts.reduce((s, a) => s + balances[a.id], 0);
            if (totalDeferred >= remaining) {
              for (const acc of deferredAccounts) {
                const share = totalDeferred > 0 ? balances[acc.id] / totalDeferred : 1 / deferredAccounts.length;
                balances[acc.id] = Math.max(0, balances[acc.id] - (remaining * share));
              }
            } else {
              remaining -= totalDeferred;
              for (const acc of deferredAccounts) {
                balances[acc.id] = 0;
              }
              
              const totalTaxFree = taxFreeAccounts.reduce((s, a) => s + balances[a.id], 0);
              for (const acc of taxFreeAccounts) {
                const share = totalTaxFree > 0 ? balances[acc.id] / totalTaxFree : 1 / taxFreeAccounts.length;
                balances[acc.id] = Math.max(0, balances[acc.id] - (remaining * share));
              }
            }
          }
        } else if (netCF > 0) {
          // Surplus in retirement: add to taxable
          if (taxableAccounts.length > 0) {
            const totalTaxable = taxableAccounts.reduce((s, a) => s + balances[a.id], 0);
            for (const acc of taxableAccounts) {
              const share = totalTaxable > 0 ? balances[acc.id] / totalTaxable : 1 / taxableAccounts.length;
              balances[acc.id] = Math.max(0, balances[acc.id] + (netCF * share));
            }
          } else {
            for (const acc of activeAccounts) {
              const share = total > 0 ? balances[acc.id] / total : 1 / activeAccounts.length;
              balances[acc.id] = Math.max(0, balances[acc.id] + (netCF * share));
            }
          }
        }
      }

      // Recalculate total after adjustments
      const finalTotal = activeAccounts.reduce((s, a) => s + balances[a.id], 0);
      runTotalsHistory[runIndex].push(finalTotal);
      return finalTotal;
    });

    const avgActualExp = sumActualExp / runs;
    const avgEssential = sumEssential / runs;
    const avgDiscretionary = sumDiscretionary / runs;
    const avgNetCF = sumNetCF / runs;
    const avgAnnualContrib = sumAnnualContrib / runs;

    const sorted = [...endTotals].sort((a, b) => a - b);
    
    rows.push({
      age,
      retired,
      annIncome,
      annualIncome: annIncome,
      annualExpenses: avgActualExp,
      essentialExpenses: avgEssential,
      discretionaryExpenses: avgDiscretionary,
      netCF: avgNetCF,
      annualContributions: avgAnnualContrib,
      mImpact,
      netWorth: startTotals[0],
      p10: sorted[Math.floor(sorted.length * 0.1)],
      p5: sorted[Math.floor(sorted.length * 0.05)],
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      survived: endTotals.filter(v => v > 0).length / runs,
    });
  }
  
  if (runs > 1) {
    const finalTotals = runTotalsHistory.map((history, index) => ({ index, total: history[history.length - 1] }));
    finalTotals.sort((a, b) => a.total - b.total);
    
    const p5Index = finalTotals[Math.floor(runs * 0.05)].index;
    const p50Index = finalTotals[Math.floor(runs * 0.5)].index;
    const p95Index = finalTotals[Math.floor(runs * 0.95)].index;
    
    rows.forEach((row, i) => {
      row.sampleRuns = [
        runTotalsHistory[p5Index][i],
        runTotalsHistory[p50Index][i],
        runTotalsHistory[p95Index][i]
      ];
      row.sampleRunYears = [
        runStartYears[p5Index],
        runStartYears[p50Index],
        runStartYears[p95Index]
      ];
    });
  }
  
  return rows;
}
