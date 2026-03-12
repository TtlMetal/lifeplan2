import React from 'react';
import { AppData } from '../types';
import { fmtK, fmtUSD, fmtPct } from '../utils';
import { LifetimeAreaChart } from './ChartComponents';

interface FirePageProps {
  data: AppData;
  derived: any;
}

export const FirePage = ({ data, derived }: FirePageProps) => {
  const { totalNW, fireNum, futureFireNum, fireAge, mSave, saveRate, proj } = derived;
  const p = data.profile;
  const firePct = Math.min(100, (totalNW / futureFireNum) * 100);

  const stats = [
    { label: 'FIRE Number (Nominal)', value: fmtK(futureFireNum), sub: `Target at age ${p.retirementAge}`, color: 'text-amber-400', bg: 'bg-amber-500/5' },
    { label: 'Current Net Worth', value: fmtK(totalNW), sub: `${fmtPct(firePct)} of nominal target`, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
    { label: 'FIRE Age', value: fireAge ?? '—', sub: fireAge ? `${fireAge - p.currentAge} years away` : 'Adjust your plan', color: 'text-sky-400', bg: 'bg-sky-500/5' },
    { label: 'Monthly Savings', value: fmtUSD(mSave), sub: `${fmtPct(saveRate)} savings rate`, color: mSave >= 0 ? 'text-emerald-400' : 'text-red-400', bg: mSave >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-100">🔥 FIRE Calculator</h2>
        <p className="text-sm text-slate-500">Financial Independence, Retire Early</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border border-border ${s.bg}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{s.label}</p>
            <p className={`text-2xl font-black font-mono tracking-tighter ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Progress to Nominal FIRE Number</p>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-slate-400">Current Progress</span>
          <span className="text-2xl font-black font-mono text-emerald-400">{fmtPct(firePct)}</span>
        </div>
        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${firePct}%` }} />
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <span>{fmtK(totalNW)} saved</span>
          <span>{fmtK(Math.max(0, futureFireNum - totalNW))} remaining</span>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target in Today's Dollars:</p>
          <p className="text-sm font-bold text-slate-300 font-mono">{fmtK(fireNum)}</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Net Worth vs Nominal FIRE Target</p>
        <div className="h-[260px]">
          <LifetimeAreaChart 
            data={proj} 
            series={[
              { key: 'fireTarget', label: 'FIRE Target (Nominal)', color: '#fbbf24', dash: '6 5' },
              { key: 'netWorth', label: 'Net Worth', color: '#56e39f', fill: '#56e39f' }
            ]} 
            milestones={derived.activeMilestones}
            retirementAge={p.retirementAge}
            showSuccess={false}
          />
        </div>
      </div>
    </div>
  );
};
