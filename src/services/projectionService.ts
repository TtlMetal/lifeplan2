import { AppData, ProjectionRow, Expense, Account, Income } from '../types';

export function resolveExpenses(expenses: Expense[], retirementAge: number, lifeExpectancy: number): Expense[] {
  return expenses.map(e => e.duringRetirement ? { ...e, startAge: retirementAge, endAge: lifeExpectancy } : e);
}

export function resolveIncome(income: Income[], currentAge: number, retirementAge: number, lifeExpectancy: number): Income[] {
  return income.map(i => i.isWorkingYears ? { ...i, startAge: currentAge, endAge: retirementAge } : i.duringRetirement ? { ...i, startAge: retirementAge, endAge: lifeExpectancy } : i);
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
  if (!account.annualIncrease) return 0;
  const interval = account.annualIncreaseInterval || 1;
  const periods = Math.floor(yearsIn / interval);
  if (periods <= 0) return 0;
  
  const baseContrib = account.contributionFreq === 'annual' ? account.contribution : account.contribution * 12;
  if (account.annualIncreaseType === 'percent') {
    return baseContrib * Math.pow(1 + account.annualIncrease / 100, periods) - baseContrib;
  } else {
    return periods * account.annualIncrease;
  }
}

export function calculateProjection(data: AppData, runs: number = 1): ProjectionRow[] {
  const { profile, retirement, accounts, income, expenses, milestones } = data;
  const activeAccounts = accounts.filter(a => !a.isHidden);
  const activeIncome = resolveIncome(income.filter(i => !i.isHidden), profile.currentAge, profile.retirementAge, profile.lifeExpectancy);
  const activeExpenses = expenses.filter(e => !e.isHidden);
  const activeMilestones = milestones.filter(m => !m.isHidden);
  
  const retRatio = retirement.expenseRatio / 100;
  const resolvedExp = resolveExpenses(activeExpenses, profile.retirementAge, profile.lifeExpectancy);
  const rows: ProjectionRow[] = [];
  
  // Use a fixed seed so the same inputs always produce the same Monte Carlo results
  const random = mulberry32(12345);

  // Initialize balances for each run
  let runBalances = Array.from({ length: runs }, () => 
    activeAccounts.reduce((acc, a) => ({ ...acc, [a.id]: a.balance }), {} as Record<string, number>)
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
        const yearsSinceStart = Math.max(0, age - i.startAge);
        const grown = i.isFixed ? 1 : Math.pow(1 + gr, yearsSinceStart);
        return sum + (i.freq === 'monthly' ? i.amount * 12 : i.amount) * grown;
      }, 0);

    // Expenses calculation
    let baseExp = 0;
    let retSpecificExp = 0;
    
    resolvedExp
      .filter(e => age >= e.startAge && age < e.endAge)
      .forEach(e => {
        const yearsSinceStart = Math.max(0, age - e.startAge);
        const factor = e.isFixed ? 1 : Math.pow(1 + profile.inflationRate / 100, yearsSinceStart);
        const amount = (e.freq === 'monthly' ? e.amount * 12 : e.amount) * factor;
        
        if (e.duringRetirement) {
          retSpecificExp += amount;
        } else {
          baseExp += amount;
        }
      });
    
    let annExp = baseExp + retSpecificExp;
    if (retired) {
      if (retirement.useCustom && retirement.customMonthly !== null) {
        // Inflate custom monthly from current age to this age
        const yearsFromNow = Math.max(0, age - profile.currentAge);
        const factor = Math.pow(1 + profile.inflationRate / 100, yearsFromNow);
        annExp = (retirement.customMonthly * 12) * factor;
      } else {
        annExp = (baseExp * retRatio) + retSpecificExp;
      }
    }

    // Milestone impact
    const milestone = activeMilestones.find(m => m.age === age);
    const mImpact = milestone ? milestone.impact : 0;
    
    // Net Cash Flow (Income - Expenses + One-time Milestone Impact)
    const netCF = annIncome - annExp + mImpact;
    
    let annualContributions = 0;
    let additionalInvestment = 0;

    if (!retired) {
      const baseContrib = activeAccounts.reduce((s, a) => {
        const increase = getAnnualIncrease(a, yearsIn);
        const baseC = a.contributionFreq === 'annual' ? a.contribution : a.contribution * 12;
        const currentContrib = Math.max(0, baseC + increase);
        return s + currentContrib + (a.match * 12);
      }, 0);
      const totalNonDeferredContrib = activeAccounts.filter(a => a.type !== 'tax_deferred').reduce((s, a) => {
        const increase = getAnnualIncrease(a, yearsIn);
        const baseC = a.contributionFreq === 'annual' ? a.contribution : a.contribution * 12;
        const currentContrib = Math.max(0, baseC + increase);
        return s + currentContrib + (a.match * 12);
      }, 0);
      const leftover = netCF - totalNonDeferredContrib;
      const investRate = (retirement.investLeftoverRate || 0) / 100;
      
      additionalInvestment = leftover > 0 ? leftover * investRate : leftover;
      annualContributions = baseContrib + additionalInvestment;
    } else {
      annualContributions = netCF; // In retirement, netCF is what goes in/out of accounts
    }

    // 1. Calculate start totals
    const startTotals = runBalances.map(balances => activeAccounts.reduce((s, a) => s + balances[a.id], 0));

    // 2. Apply growth/contribs/netCF
    const endTotals = runBalances.map((balances, runIndex) => {
      let total = 0;
      for (const acc of activeAccounts) {
        // Apply market return with variance if runs > 1. Cash accounts yield 0% return.
        const r = acc.type === 'cash' ? 0 : ((profile.marketReturn / 100) + (runs > 1 ? (random() - 0.5) * 0.36 : 0));
        
        balances[acc.id] = Math.max(0, balances[acc.id] * (1 + r));
        
        if (!retired) {
          // Specified contributions
          const increase = getAnnualIncrease(acc, yearsIn);
          const baseC = acc.contributionFreq === 'annual' ? acc.contribution : acc.contribution * 12;
          const specContrib = Math.max(0, baseC + increase) + (acc.match * 12);
          balances[acc.id] += specContrib;
        }
        
        total += balances[acc.id];
      }

      // Handle leftover cash flow or deficit
      if (!retired) {
        if (additionalInvestment > 0) {
          // Invest in taxable accounts only
          const taxableAccounts = activeAccounts.filter(a => a.type === 'taxable');
          const totalTaxableBalance = taxableAccounts.reduce((s, a) => s + balances[a.id], 0);
          
          if (taxableAccounts.length > 0) {
            for (const acc of taxableAccounts) {
              const share = totalTaxableBalance > 0 ? balances[acc.id] / totalTaxableBalance : 1 / taxableAccounts.length;
              balances[acc.id] = Math.max(0, balances[acc.id] + (additionalInvestment * share));
            }
          } else {
            // Fallback: if no taxable accounts, distribute across all accounts proportionally
            for (const acc of activeAccounts) {
              const share = total > 0 ? balances[acc.id] / total : 1 / activeAccounts.length;
              balances[acc.id] = Math.max(0, balances[acc.id] + (additionalInvestment * share));
            }
          }
        } else if (additionalInvestment < 0) {
          // Deficit, distribute across all accounts proportionally to balance
          for (const acc of activeAccounts) {
            const share = total > 0 ? balances[acc.id] / total : 1 / activeAccounts.length;
            balances[acc.id] = Math.max(0, balances[acc.id] + (additionalInvestment * share));
          }
        }
      } else {
        // In retirement, withdraw netCF (which is usually negative) proportionally
        for (const acc of activeAccounts) {
          const share = total > 0 ? balances[acc.id] / total : 1 / activeAccounts.length;
          balances[acc.id] = Math.max(0, balances[acc.id] + (netCF * share));
        }
      }

      // Recalculate total after adjustments
      const finalTotal = activeAccounts.reduce((s, a) => s + balances[a.id], 0);
      runTotalsHistory[runIndex].push(finalTotal);
      return finalTotal;
    });

    const sorted = [...endTotals].sort((a, b) => a - b);
    
    rows.push({
      age,
      retired,
      annIncome,
      annualIncome: annIncome,
      annualExpenses: annExp,
      netCF,
      annualContributions,
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
    });
  }
  
  return rows;
}
