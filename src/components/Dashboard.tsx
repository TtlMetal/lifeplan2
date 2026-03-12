import React from 'react';
import { AppData, ProjectionRow } from '../types';
import { fmtK, fmtUSD, fmtPct } from '../utils';
import { LifetimeAreaChart, CashFlowBarChart } from './ChartComponents';

interface DashboardProps {
  data: AppData;
  derived: any;
  projection: ProjectionRow[];
}

export const Dashboard = ({ data, derived, projection }: DashboardProps) => {
  const { totalNW, mSave, saveRate, retVal, fireNum, fireAge, retMonthly } = derived;
  const p = data.profile;

  const activeAccounts = data.accounts.filter(a => !a.isHidden);
  const stats = [
    { label: 'Net Worth', value: fmtK(totalNW), sub: `${activeAccounts.length} accounts`, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
    { label: 'Monthly Savings', value: fmtUSD(mSave), sub: `${fmtPct(saveRate)} savings rate`, color: mSave >= 0 ? 'text-emerald-400' : 'text-red-400', bg: mSave >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5' },
    { label: `Retirement @ ${p.retirementAge}`, value: fmtK(retVal), sub: 'Projected portfolio', color: 'text-sky-400', bg: 'bg-sky-500/5' },
    { label: 'FIRE Number', value: fmtK(derived.futureFireNum), sub: fireAge ? `On track at age ${fireAge}` : 'Keep investing!', color: 'text-amber-400', bg: 'bg-amber-500/5' },
  ];

  const firePct = Math.min(100, (totalNW / derived.futureFireNum) * 100);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-100">{p.name} · DASHBOARDZZZ</h2>
        <p className="text-sm text-slate-500">Your living financial snapshot</p>
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

      <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 w-full">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">🔥 FIRE Progress (Nominal)</p>
          <p className="text-3xl font-black font-mono tracking-tighter text-emerald-400">{fmtPct(firePct)} funded</p>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-slate-500">Target {fmtK(derived.futureFireNum)} · Current {fmtK(totalNW)}</p>
            <div className="h-4 w-[1px] bg-slate-800" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real Target (Today's $): <span className="text-emerald-500/60">{fmtK(fireNum)}</span></p>
          </div>
          <div className="h-2 w-full max-w-md bg-slate-800 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${firePct}%` }} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">YEARS TO FIRE</p>
          <p className="text-5xl font-black font-mono tracking-tighter text-emerald-400">{fireAge ? fireAge - p.currentAge : '—'}</p>
          <p className="text-xs text-slate-500 mt-1">at age {fireAge ?? '?'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-surface">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Net Worth Projection</p>
          <div className="h-[240px]">
            <LifetimeAreaChart 
              data={projection} 
              series={[{ key: 'netWorth', label: 'Net Worth', color: '#56e39f' }]} 
              milestones={derived.activeMilestones}
              retirementAge={p.retirementAge}
              showSuccess={false}
            />
          </div>
        </div>
        <div className="p-6 rounded-2xl border border-border bg-surface">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Account Breakdown</p>
          <div className="space-y-4">
            {activeAccounts.map(a => (
              <div key={a.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{a.name}</span>
                  <span className="font-bold font-mono text-emerald-400">{fmtK(a.balance)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${(a.balance / (totalNW || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-border flex justify-between items-center text-sm">
              <span className="text-slate-500">Monthly contributions</span>
              <span className="font-bold font-mono text-sky-400">
                {fmtUSD(activeAccounts.reduce((s, a) => s + (a.contributionFreq === 'annual' ? a.contribution / 12 : a.contribution) + a.match, 0))}/mo
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Annual Income vs Expenses</p>
        <div className="h-[200px]">
          <CashFlowBarChart 
            data={projection.filter((_, i) => i % 2 === 0)} 
            milestones={derived.activeMilestones}
            showSuccess={false}
            showNetWorth={true}
          />
        </div>
      </div>
    </div>
  );
};
