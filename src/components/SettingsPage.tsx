import React, { useState, useEffect } from 'react';
import { Profile, PlansState, Plan } from '../types';
import { Info } from 'lucide-react';
import { DEFAULT_DATA } from '../constants';

interface SettingsPageProps {
  plansState: PlansState;
  setPlansState: (plansState: PlansState) => void;
  profile: Profile;
  setProfile: (profile: Profile) => void;
}

export const SettingsPage = ({ plansState, setPlansState, profile, setProfile }: SettingsPageProps) => {
  const [localProfile, setLocalProfile] = useState(profile);

  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleChange = (key: keyof Profile, value: any) => {
    const updated = { ...localProfile, [key]: value };
    setLocalProfile(updated);
    setProfile(updated);
  };

  const applyPreset = (market: number, inflation: number) => {
    const updated = { ...localProfile, marketReturn: market, inflationRate: inflation };
    setLocalProfile(updated);
    setProfile(updated);
  };

  const exportPlans = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plansState));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "plans.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importPlans = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let plansStateToSet: PlansState;

        const mergePlan = (importedPlan: any): Plan => {
          return {
            id: importedPlan.id || Math.random().toString(36).substr(2, 9),
            ...DEFAULT_DATA,
            ...importedPlan,
            profile: { ...DEFAULT_DATA.profile, ...importedPlan.profile },
            retirement: { ...DEFAULT_DATA.retirement, ...importedPlan.retirement },
            accounts: importedPlan.accounts || DEFAULT_DATA.accounts,
            income: importedPlan.income || DEFAULT_DATA.income,
            expenses: importedPlan.expenses || DEFAULT_DATA.expenses,
            milestones: importedPlan.milestones || DEFAULT_DATA.milestones,
          };
        };

        if (parsed.plans && Array.isArray(parsed.plans) && parsed.plans.length > 0) {
          plansStateToSet = {
            ...parsed,
            plans: parsed.plans.map(mergePlan)
          };
        } else if (parsed.profile) {
          // Migration from AppData to PlansState
          plansStateToSet = {
            currentPlanId: 'default',
            plans: [mergePlan({ ...parsed, id: 'default' })]
          };
        } else {
          throw new Error('Invalid file structure');
        }
        setPlansState(plansStateToSet);
      } catch (e) {
        alert('Invalid file');
      }
    };
    reader.readAsText(file);
  };

  const addPlan = () => {
    const newPlan: Plan = {
      ...DEFAULT_DATA,
      id: Math.random().toString(36).substr(2, 9),
      profile: { ...DEFAULT_DATA.profile, name: 'New Plan' }
    };
    setPlansState({
      ...plansState,
      plans: [...plansState.plans, newPlan],
      currentPlanId: newPlan.id
    });
  };

  const copyPlan = () => {
    const currentPlan = plansState.plans.find(p => p.id === plansState.currentPlanId) || plansState.plans[0];
    const newPlan: Plan = {
      ...currentPlan,
      id: Math.random().toString(36).substr(2, 9),
      profile: { ...currentPlan.profile, name: `${currentPlan.profile.name} (Copy)` }
    };
    setPlansState({
      ...plansState,
      plans: [...plansState.plans, newPlan],
      currentPlanId: newPlan.id
    });
  };

  const deletePlan = (id: string) => {
    // Force sync comment
    if (plansState.plans.length <= 1) return;
    const newPlans = plansState.plans.filter(p => p.id !== id);
    setPlansState({
      ...plansState,
      plans: newPlans,
      currentPlanId: plansState.currentPlanId === id ? newPlans[0].id : plansState.currentPlanId
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {planToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-2xl border border-border space-y-4 max-w-sm w-full">
            <h3 className="text-lg font-black text-slate-100">Delete Plan?</h3>
            <p className="text-sm text-slate-400">Are you sure you want to delete this plan? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={() => setPlanToDelete(null)} className="flex-1 px-4 py-2 bg-slate-700 text-slate-100 font-bold text-sm rounded-xl">Cancel</button>
              <button onClick={() => { deletePlan(planToDelete); setPlanToDelete(null); }} className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500">Core planning assumptions & Plan management</p>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface space-y-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Plan Management</p>
        <div className="flex flex-wrap gap-4 items-center">
          <select 
            className="bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400"
            value={plansState.currentPlanId}
            onChange={(e) => setPlansState({ ...plansState, currentPlanId: e.target.value })}
          >
            {plansState.plans.map(p => (
              <option key={p.id} value={p.id}>{p.profile.name}</option>
            ))}
          </select>
          <button onClick={addPlan} className="px-4 py-2 bg-emerald-400 text-slate-900 font-black tracking-tight text-sm rounded-xl hover:bg-emerald-300 transition-all">+ New Plan</button>
          <button onClick={copyPlan} className="px-4 py-2 bg-slate-700 text-slate-100 font-black tracking-tight text-sm rounded-xl hover:bg-slate-600 transition-all">Copy Plan</button>
          <button onClick={() => setPlanToDelete(plansState.currentPlanId)} className="px-4 py-2 bg-red-900/50 text-red-400 font-black tracking-tight text-sm rounded-xl hover:bg-red-900 transition-all">Delete Plan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-surface space-y-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Profile</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Plan Name</label>
              <input 
                className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 focus:border-emerald-400 transition-all outline-none"
                value={localProfile.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Age</label>
                <input 
                  type="number"
                  className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 focus:border-emerald-400 transition-all outline-none"
                  value={localProfile.currentAge}
                  onChange={(e) => handleChange('currentAge', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  Retirement Age
                  <div className="group relative">
                    <Info size={12} className="text-slate-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-border rounded-lg text-[10px] text-slate-400 font-normal normal-case tracking-normal invisible group-hover:visible z-50 shadow-xl">
                      The age you plan to stop working full-time and start living off your investments.
                    </div>
                  </div>
                </label>
                <input 
                  type="number"
                  className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 focus:border-emerald-400 transition-all outline-none"
                  value={localProfile.retirementAge}
                  onChange={(e) => handleChange('retirementAge', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Life Expectancy</label>
                <input 
                  type="number"
                  className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 focus:border-emerald-400 transition-all outline-none"
                  value={localProfile.lifeExpectancy}
                  onChange={(e) => handleChange('lifeExpectancy', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface space-y-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Market Assumptions</p>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Expected Return (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-emerald-400 focus:border-emerald-400 transition-all outline-none"
                  value={localProfile.marketReturn}
                  onChange={(e) => handleChange('marketReturn', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Inflation Rate (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-red-400 focus:border-emerald-400 transition-all outline-none"
                  value={localProfile.inflationRate}
                  onChange={(e) => handleChange('inflationRate', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => applyPreset(5, 3)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-border-2 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                >
                  Conservative (5%)
                </button>
                <button 
                  onClick={() => applyPreset(7, 3)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-border-2 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                >
                  Moderate (7%)
                </button>
                <button 
                  onClick={() => applyPreset(9, 3)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-border-2 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                >
                  Aggressive (9%)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
