import React, { useState, useEffect, useMemo } from 'react';
import { AppData, Account, Income, Expense, Milestone, Frequency, AccountType, PlansState, Plan } from './types';
import { DEFAULT_DATA, EXPENSE_CATS } from './constants';
import { calculateProjection, resolveExpenses, resolveIncome } from './services/projectionService';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import { Dashboard } from './components/Dashboard';
import { AccountsPage } from './components/AccountsPage';
import { IncomeExpensesPage } from './components/IncomeExpensesPage';
import { MilestonesPage } from './components/MilestonesPage';
import { RetirementPage } from './components/RetirementPage';
import { ProjectionPage } from './components/ProjectionPage';
import { MonteCarloPage } from './components/MonteCarloPage';
import { FirePage } from './components/FirePage';
import { SettingsPage } from './components/SettingsPage';

const STORAGE_KEY = 'lifeplan_v6_react';

export default function App() {
  const [plansState, setPlansState] = useState<PlansState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.plans && Array.isArray(parsed.plans) && parsed.plans.length > 0) return parsed; // Already migrated
        // Migration from AppData to PlansState
        if (parsed.profile) {
          return {
            currentPlanId: 'default',
            plans: [{ id: 'default', ...parsed }]
          };
        }
        throw new Error('Invalid data');
      } catch (e) {
        return { currentPlanId: 'default', plans: [{ id: 'default', ...DEFAULT_DATA }] };
      }
    }
    return { currentPlanId: 'default', plans: [{ id: 'default', ...DEFAULT_DATA }] };
  });

  const data = useMemo(() => plansState.plans.find(p => p.id === plansState.currentPlanId) || plansState.plans[0], [plansState]);

  const setData = (updater: (prev: AppData) => AppData) => {
    setPlansState(prev => {
      const currentPlan = prev.plans.find(p => p.id === prev.currentPlanId) || prev.plans[0];
      const updatedPlan = { ...updater(currentPlan), id: currentPlan.id };
      return {
        ...prev,
        plans: prev.plans.map(p => p.id === prev.currentPlanId ? updatedPlan : p)
      };
    });
  };

  const [activePage, setActivePage] = useState('dashboard');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'account' | 'income' | 'expense' | 'milestone' | null;
    id: string | null;
  }>({ isOpen: false, type: null, id: null });

  // Persist data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plansState));
  }, [plansState]);

  // Derived calculations
  const projection = useMemo(() => calculateProjection(data, 1), [data]);
  
  const derived = useMemo(() => {
    const p = data.profile;
    const ret = data.retirement;
    const wRate = ret.withdrawalRate / 100;
    const totalNW = data.accounts.filter(a => !a.isHidden).reduce((s, a) => s + a.balance, 0);
    const resolvedExp = resolveExpenses(data.expenses.filter(e => !e.isHidden), p.retirementAge, p.lifeExpectancy);
    const resolvedInc = resolveIncome(data.income.filter(i => !i.isHidden), p.currentAge, p.retirementAge, p.lifeExpectancy);
    
    const mIncome = resolvedInc
      .filter(i => p.currentAge >= i.startAge && p.currentAge < i.endAge)
      .reduce((s, i) => {
        return s + (i.freq === 'monthly' ? i.amount : i.amount / 12);
      }, 0);
    
    const mExpBase = resolvedExp
      .filter(e => p.currentAge >= e.startAge && p.currentAge < e.endAge)
      .reduce((s, e) => {
        return s + (e.freq === 'monthly' ? e.amount : e.amount / 12);
      }, 0);
    
    const activeMilestones = data.milestones.filter(m => !m.isHidden);
    
    const mExp = Math.max(0, mExpBase);
    
    const mSaveSpecified = data.accounts.filter(a => !a.isHidden).reduce((s, a) => {
      const mContrib = a.contributionFreq === 'annual' ? a.contribution / 12 : a.contribution;
      return s + mContrib + a.match;
    }, 0);
    const mSaveNonDeferred = data.accounts.filter(a => !a.isHidden && a.type !== 'tax_deferred').reduce((s, a) => {
      const mContrib = a.contributionFreq === 'annual' ? a.contribution / 12 : a.contribution;
      return s + mContrib;
    }, 0);
    const leftover = mIncome - mExp - mSaveNonDeferred;
    const additionalInvested = leftover > 0 ? leftover * (ret.investLeftoverRate / 100) : 0;
    
    const mSave = mSaveSpecified + additionalInvested;
    const saveRate = mIncome > 0 ? (mSave / mIncome) * 100 : 0;
    
    // Calculate retirement-specific expenses (in today's dollars)
    const mRetSpecificExp = resolvedExp
      .filter(e => e.duringRetirement)
      .reduce((s, e) => {
        // Since we want this in today's dollars for the FIRE calculation,
        // we don't inflate it here. It will be inflated by futureFireNum.
        return s + (e.freq === 'monthly' ? e.amount : e.amount / 12);
      }, 0);

    const retMonthly = (ret.useCustom && ret.customMonthly !== null 
      ? ret.customMonthly 
      : (mExp * (ret.expenseRatio / 100))) + mRetSpecificExp;
    
    const fireNum = (retMonthly * 12) / wRate;
    const inflationFactor = Math.pow(1 + p.inflationRate / 100, p.retirementAge - p.currentAge);
    const futureFireNum = fireNum * inflationFactor;
    
    const retVal = projection.find(r => r.age === p.retirementAge)?.netWorth ?? 0;
    
    // Add fireTarget to each projection row
    const projWithFireTarget = projection.map(r => {
      const targetInflationFactor = Math.pow(1 + p.inflationRate / 100, r.age - p.currentAge);
      return {
        ...r,
        fireTarget: fireNum * targetInflationFactor
      };
    });

    // Correct fireAge calculation: find the first age where nominal net worth 
    // exceeds the nominal FIRE target for that specific age.
    const fireAge = projWithFireTarget.find(r => r.netWorth >= (r.fireTarget || 0))?.age ?? null;

    const actualWR = retVal > 0 ? (retMonthly * 12) / retVal * 100 : 0;

    return { totalNW, mIncome, mExp, mSave, mSaveNonDeferred, saveRate, retMonthly, mRetSpecificExp, fireNum, futureFireNum, retVal, fireAge, actualWR, wRate, proj: projWithFireTarget, activeMilestones };
  }, [data, projection]);

  // Handlers
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(plansState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeplan-all-plans-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const fileContent = ev.target?.result as string;
        if (!fileContent) throw new Error('Empty file');
        const parsed = JSON.parse(fileContent);
        
        const mergePlan = (importedPlan: any): Plan => {
          const id = importedPlan.id || Math.random().toString(36).substr(2, 9);
          return {
            ...DEFAULT_DATA,
            ...importedPlan,
            id,
            profile: { ...DEFAULT_DATA.profile, ...(importedPlan.profile || {}) },
            retirement: { ...DEFAULT_DATA.retirement, ...(importedPlan.retirement || {}) },
            accounts: Array.isArray(importedPlan.accounts) ? importedPlan.accounts : DEFAULT_DATA.accounts,
            income: Array.isArray(importedPlan.income) ? importedPlan.income : DEFAULT_DATA.income,
            expenses: Array.isArray(importedPlan.expenses) ? importedPlan.expenses : DEFAULT_DATA.expenses,
            milestones: Array.isArray(importedPlan.milestones) ? importedPlan.milestones : DEFAULT_DATA.milestones,
          };
        };

        let plansStateToSet: PlansState;
        if (parsed.plans && Array.isArray(parsed.plans) && parsed.plans.length > 0) {
          const mergedPlans = parsed.plans.map(mergePlan);
          plansStateToSet = {
            plans: mergedPlans,
            currentPlanId: (parsed.currentPlanId && mergedPlans.some(p => p.id === parsed.currentPlanId))
              ? parsed.currentPlanId
              : mergedPlans[0].id
          };
        } else if (parsed.profile || parsed.accounts || parsed.income) {
          // Migration from AppData to PlansState
          const singlePlan = mergePlan(parsed);
          plansStateToSet = {
            currentPlanId: singlePlan.id,
            plans: [singlePlan]
          };
        } else {
          throw new Error('Invalid file structure');
        }
        
        setPlansState(plansStateToSet);
        alert('Data imported successfully!');
      } catch (err) {
        console.error('Import error:', err);
        alert('Error importing file: ' + (err instanceof Error ? err.message : 'Invalid format'));
      }
      // Reset input value so same file can be imported again
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Reset all data to demo values? This cannot be undone.')) {
      setData(() => ({ ...DEFAULT_DATA }));
    }
  };

  const deleteItem = (collection: keyof AppData, id: string) => {
    setData(prev => {
      const currentList = prev[collection];
      if (!Array.isArray(currentList)) return prev;
      return {
        ...prev,
        [collection]: currentList.filter((item: any) => String(item.id) !== String(id))
      };
    });
  };

  const toggleItem = (collection: keyof AppData, id: string) => {
    setData(prev => {
      const currentList = prev[collection];
      if (!Array.isArray(currentList)) return prev;
      return {
        ...prev,
        [collection]: currentList.map((item: any) => 
          String(item.id) === String(id) 
            ? { ...item, isHidden: !item.isHidden } 
            : item
        )
      };
    });
  };

  const saveModal = (formData: any) => {
    const { type, id } = modalState;
    if (!type) return;

    const collection = type === 'account' ? 'accounts' : type === 'income' ? 'income' : type === 'expense' ? 'expenses' : 'milestones';
    const newItem = { ...formData, id: id || Math.random().toString(36).substr(2, 9) };

    setData(prev => {
      const list = [...(prev[collection] as any[])];
      const index = id ? list.findIndex(item => item.id === id) : -1;
      if (index > -1) list[index] = newItem;
      else list.push(newItem);
      return { ...prev, [collection]: list };
    });

    setModalState({ isOpen: false, type: null, id: null });
  };

  return (
    <div className="flex h-screen bg-bg text-slate-200 font-sans overflow-hidden">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
      />
      
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          {activePage === 'dashboard' && <Dashboard data={data} derived={derived} projection={projection} />}
          {activePage === 'accounts' && (
            <AccountsPage 
              accounts={data.accounts} 
              setAccounts={(acc) => setData(prev => ({ ...prev, accounts: acc }))}
              onAdd={() => setModalState({ isOpen: true, type: 'account', id: null })}
              onEdit={(id) => setModalState({ isOpen: true, type: 'account', id })}
              onDelete={(id) => deleteItem('accounts', id)}
              onToggle={(id) => toggleItem('accounts', id)}
            />
          )}
          {activePage === 'income' && (
            <IncomeExpensesPage 
              type="income"
              items={data.income}
              milestones={derived.activeMilestones}
              onAdd={() => setModalState({ isOpen: true, type: 'income', id: null })}
              onEdit={(id) => setModalState({ isOpen: true, type: 'income', id })}
              onDelete={(id) => deleteItem('income', id)}
              onToggle={(id) => toggleItem('income', id)}
              inflationRate={data.profile.inflationRate}
              currentAge={data.profile.currentAge}
              retirementAge={data.profile.retirementAge}
              lifeExpectancy={data.profile.lifeExpectancy}
            />
          )}
          {activePage === 'expenses' && (
            <IncomeExpensesPage 
              type="expense"
              items={data.expenses}
              milestones={derived.activeMilestones}
              onAdd={() => setModalState({ isOpen: true, type: 'expense', id: null })}
              onEdit={(id) => setModalState({ isOpen: true, type: 'expense', id })}
              onDelete={(id) => deleteItem('expenses', id)}
              onToggle={(id) => toggleItem('expenses', id)}
              inflationRate={data.profile.inflationRate}
              currentAge={data.profile.currentAge}
              retirementAge={data.profile.retirementAge}
              lifeExpectancy={data.profile.lifeExpectancy}
            />
          )}
          {activePage === 'milestones' && (
            <MilestonesPage 
              milestones={data.milestones}
              onAdd={() => setModalState({ isOpen: true, type: 'milestone', id: null })}
              onEdit={(id) => setModalState({ isOpen: true, type: 'milestone', id })}
              onDelete={(id) => deleteItem('milestones', id)}
              onToggle={(id) => toggleItem('milestones', id)}
            />
          )}
          {activePage === 'retirement' && (
            <RetirementPage 
              data={data} 
              derived={derived} 
              setRetirement={(config) => setData(prev => ({ ...prev, retirement: config }))} 
            />
          )}
          {activePage === 'projection' && <ProjectionPage data={data} projection={projection} derived={derived} />}
          {activePage === 'montecarlo' && <MonteCarloPage data={data} derived={derived} />}
          {activePage === 'fire' && <FirePage data={data} derived={derived} />}
          {activePage === 'settings' && (
            <SettingsPage 
              plansState={plansState}
              setPlansState={setPlansState}
              profile={data.profile} 
              setProfile={(p) => setData(prev => ({ ...prev, profile: p }))} 
            />
          )}
        </div>
      </main>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ isOpen: false, type: null, id: null })}
        title={(modalState.id ? 'Edit ' : 'Add ') + (modalState.type || '')}
      >
        <ModalForm 
          type={modalState.type} 
          id={modalState.id} 
          data={data} 
          onSave={saveModal} 
          onCancel={() => setModalState({ isOpen: false, type: null, id: null })}
        />
      </Modal>
    </div>
  );
}

// Sub-component for Modal Form to handle its own local state
const ModalForm = ({ type, id, data, onSave, onCancel }: any) => {
  const collection = type === 'account' ? 'accounts' : type === 'income' ? 'income' : type === 'expense' ? 'expenses' : 'milestones';
  const initial = id ? (data[collection] as any[]).find(item => item.id === id) : null;

  const [formData, setFormData] = useState(() => {
    if (initial) return { ...initial };
    if (type === 'account') return { name: '', type: 'taxable', balance: 0, contribution: 0, contributionFreq: 'monthly', match: 0, annualIncrease: 0, annualIncreaseType: 'amount', annualIncreaseInterval: 1 };
    if (type === 'income') return { name: '', amount: 0, freq: 'monthly', startAge: data.profile.currentAge, endAge: data.profile.retirementAge, isUntilDeath: false, growthRate: data.profile.inflationRate, duringRetirement: false, isWorkingYears: true };
    if (type === 'expense') return { name: 'Housing / Rent', amount: 0, freq: 'monthly', startAge: data.profile.currentAge, endAge: data.profile.lifeExpectancy, isUntilDeath: true, duringRetirement: false, category: 'Housing / Rent', flexibility: 'essential' };
    if (type === 'milestone') return { name: '', age: data.profile.currentAge + 5, impact: 0, expenseImpact: 0 };
    return {};
  });

  const [impactDir, setImpactDir] = useState<'pos' | 'neg'>(initial?.impact < 0 ? 'neg' : 'pos');

  const update = (key: string, val: any) => setFormData((prev: any) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (type === 'milestone') {
      const finalImpact = impactDir === 'neg' ? -Math.abs(formData.impact) : Math.abs(formData.impact);
      onSave({ ...formData, impact: finalImpact });
    } else {
      onSave(formData);
    }
  };

  const getAccountHint = (type: string) => {
    switch (type) {
      case 'tax_deferred':
        return "Historically, 401k/457b limits increase by ~$500 every year.";
      case 'tax_free':
        return "Historically, IRA limits increase by ~$500 every 3-4 years (avg ~$125/yr).";
      case 'taxable':
        return "No limit. You can increase this as your income grows.";
      case 'cash':
        return "No limit. Good for building an emergency fund.";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {type === 'account' && (
        <>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Account Name</label>
            <input className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Account Type</label>
            <select className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.type} onChange={e => update('type', e.target.value)}>
              <option value="tax_deferred">Tax-Deferred</option>
              <option value="tax_free">Tax-Free (Roth)</option>
              <option value="taxable">Taxable</option>
              <option value="cash">Cash/Savings</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Balance ($)</label>
              <input type="number" className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.balance} onChange={e => update('balance', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="my-6 border-t border-border-2 relative">
            <div className="absolute -top-2.5 left-4 bg-surface px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Contributions
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount ($)</label>
              <input type="number" className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.contribution} onChange={e => update('contribution', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Frequency</label>
              <select className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.contributionFreq || 'monthly'} onChange={e => update('contributionFreq', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Employer Match ($/mo)</label>
              <input type="number" className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.match} onChange={e => update('match', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Annual Contrib Increase</label>
            <div className="flex gap-2">
              <div className="flex-1 flex bg-bg border border-border-2 rounded-xl overflow-hidden focus-within:border-emerald-400">
                <select 
                  className="bg-surface-2 px-3 py-3 text-sm font-bold text-slate-400 outline-none border-r border-border-2"
                  value={formData.annualIncreaseType || 'amount'}
                  onChange={e => update('annualIncreaseType', e.target.value)}
                >
                  <option value="amount">$</option>
                  <option value="percent">%</option>
                </select>
                <input 
                  type="number" 
                  step={formData.annualIncreaseType === 'percent' ? "0.1" : "1"}
                  className="w-full bg-transparent p-3 text-sm font-bold text-slate-200 outline-none" 
                  value={formData.annualIncrease || 0} 
                  onChange={e => update('annualIncrease', parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div className="flex items-center gap-2 bg-bg border border-border-2 rounded-xl px-3 focus-within:border-emerald-400">
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Every</span>
                <input 
                  type="number" 
                  className="w-12 bg-transparent py-3 text-sm font-bold text-slate-200 outline-none text-center" 
                  value={formData.annualIncreaseInterval || 1} 
                  onChange={e => update('annualIncreaseInterval', parseInt(e.target.value) || 1)} 
                  min="1"
                />
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Yrs</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-1">{getAccountHint(formData.type)}</p>
        </>
      )}

      {(type === 'income' || type === 'expense') && (
        <>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{type === 'income' ? 'Source' : 'Category'}</label>
            {type === 'expense' ? (
              <select className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={EXPENSE_CATS.includes(formData.name) ? formData.name : 'Other'} onChange={e => {
                const val = e.target.value;
                if (val !== 'Other') {
                  update('name', val);
                  update('category', val);
                  const essentialCats = ['Housing / Rent', 'Food & Groceries', 'Transportation', 'Healthcare / Medical', 'Insurance', 'Utilities', 'Childcare / Education', 'Home Maintenance', 'Phone'];
                  update('flexibility', essentialCats.includes(val) ? 'essential' : 'discretionary');
                } else {
                  update('name', 'Other');
                }
              }}>
                {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.name} onChange={e => update('name', e.target.value)} />
            )}
          </div>
          {type === 'expense' && (formData.name === 'Other' || !EXPENSE_CATS.includes(formData.name)) && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Custom Name</label>
              <input className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.name === 'Other' ? '' : formData.name} onChange={e => update('name', e.target.value)} />
            </div>
          )}
          {type === 'expense' && (
            <div className="space-y-2 p-4 rounded-xl bg-surface-2 border border-border">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Flexibility (Guardrails)</label>
              <div className="flex gap-2 mb-1">
                <button 
                  onClick={() => update('flexibility', 'essential')} 
                  className={`flex-1 px-3 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.flexibility === 'essential' ? 'bg-red-500/10 text-red-400 border-red-400' : 'bg-slate-800 text-slate-400 border-border-2'}`}
                >
                  Need (Essential)
                </button>
                <button 
                  onClick={() => update('flexibility', 'discretionary')} 
                  className={`flex-1 px-3 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.flexibility === 'discretionary' ? 'bg-sky-500/10 text-sky-400 border-sky-400' : 'bg-slate-800 text-slate-400 border-border-2'}`}
                >
                  Want (Discretionary)
                </button>
              </div>
              <p className="text-[9px] text-slate-500 italic">
                {formData.flexibility === 'essential' 
                  ? "Essential expenses are never cut during market downturns." 
                  : "Discretionary expenses will be dynamically reduced during severe market drawdowns if Guardrails are enabled."}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount ($)</label>
              <input type="number" className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.amount} onChange={e => update('amount', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Frequency</label>
              <select className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.freq} onChange={e => update('freq', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          {type === 'income' && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Enter the amount that hits your paycheck only (after taxes)</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="isFixed"
              checked={formData.isFixed || false} 
              onChange={e => {
                const checked = e.target.checked;
                setFormData((prev: any) => ({ 
                  ...prev, 
                  isFixed: checked,
                  growthRate: checked ? 0 : prev.growthRate 
                }));
              }}
              className="w-4 h-4 rounded border-border-2 bg-bg text-emerald-400 focus:ring-emerald-400"
            />
            <label htmlFor="isFixed" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer">
              Fixed Amount (No Inflation/Growth)
            </label>
          </div>
          {type === 'income' && !formData.isFixed && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Annual Growth Rate (%)</label>
              <input type="number" step="0.1" className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.growthRate} onChange={e => update('growthRate', parseFloat(e.target.value) || 0)} />
            </div>
          )}
          <div className="space-y-4 p-4 rounded-xl bg-surface-2 border border-border">
            <div className="flex gap-2">
              <button onClick={() => { update('duringRetirement', false); update('isWorkingYears', false); }} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${!formData.duringRetirement && !formData.isWorkingYears ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400' : 'bg-slate-800 text-slate-400 border-border-2'}`}>Custom Ages</button>
              {type === 'expense' && <button onClick={() => { update('duringRetirement', true); update('isWorkingYears', false); }} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${formData.duringRetirement ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400' : 'bg-slate-800 text-slate-400 border-border-2'}`}>Retirement Years</button>}
              {type === 'income' && <button onClick={() => { update('duringRetirement', false); update('isWorkingYears', true); }} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${formData.isWorkingYears ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400' : 'bg-slate-800 text-slate-400 border-border-2'}`}>Working Years</button>}
            </div>
            {!formData.duringRetirement && !formData.isWorkingYears ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Start Age</label>
                  <input type="number" className="w-full bg-bg border border-border-2 rounded-xl p-2 text-xs font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.startAge} onChange={e => update('startAge', parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">End Age</label>
                  <div className="space-y-2">
                    <input 
                      type="number" 
                      disabled={formData.isUntilDeath}
                      className={`w-full bg-bg border border-border-2 rounded-xl p-2 text-xs font-bold outline-none focus:border-emerald-400 ${formData.isUntilDeath ? 'opacity-50 text-slate-500' : 'text-slate-200'}`} 
                      value={formData.isUntilDeath ? data.profile.lifeExpectancy : formData.endAge} 
                      onChange={e => update('endAge', parseInt(e.target.value) || 0)} 
                    />
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isUntilDeath"
                        checked={formData.isUntilDeath || false} 
                        onChange={e => update('isUntilDeath', e.target.checked)}
                        className="w-3 h-3 rounded border-border-2 bg-bg text-emerald-400 focus:ring-emerald-400"
                      />
                      <label htmlFor="isUntilDeath" className="text-[9px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer">
                        Until Life Expectancy ({data.profile.lifeExpectancy})
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 text-center">
                Auto-tracks {formData.isWorkingYears ? 'working' : 'retirement'} years ({formData.isWorkingYears ? `${data.profile.currentAge} → ${data.profile.retirementAge}` : `${data.profile.retirementAge} → ${data.profile.lifeExpectancy}`})
              </p>
            )}
          </div>
        </>
      )}

      {type === 'milestone' && (
        <>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Milestone Name</label>
            <input className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">At Age</label>
              <input type="number" className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" value={formData.age} onChange={e => update('age', parseInt(e.target.value) || 0)} />
            </div>
            
            <div className="space-y-2 p-4 rounded-xl bg-surface-2 border border-border">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Net Worth Impact</label>
              <div className="flex gap-2 mb-3">
                <button 
                  onClick={() => setImpactDir('pos')} 
                  className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${impactDir === 'pos' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400' : 'bg-slate-800 text-slate-400 border-border-2'}`}
                >
                  Increase (+)
                </button>
                <button 
                  onClick={() => setImpactDir('neg')} 
                  className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${impactDir === 'neg' ? 'bg-red-500/10 text-red-400 border-red-400' : 'bg-slate-800 text-slate-400 border-border-2'}`}
                >
                  Decrease (−)
                </button>
              </div>
              <input 
                type="number" 
                className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" 
                value={Math.abs(formData.impact)} 
                onChange={e => update('impact', parseInt(e.target.value) || 0)} 
              />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-6">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
        <button onClick={handleSave} className="px-6 py-2 bg-emerald-400 text-slate-900 font-black tracking-tight text-sm rounded-xl hover:bg-emerald-300 transition-all shadow-[0_0_12px_rgba(52,211,153,0.3)]">Save</button>
      </div>
    </div>
  );
};
