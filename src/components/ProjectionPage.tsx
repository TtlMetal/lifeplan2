import React from 'react';
import { AppData, ProjectionRow } from '../types';
import { fmtK } from '../utils';
import { LifetimeAreaChart, CashFlowBarChart } from './ChartComponents';

interface ProjectionPageProps {
  data: AppData;
  projection: ProjectionRow[];
  derived: any;
}

export const ProjectionPage = ({ data, projection, derived }: ProjectionPageProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-100">Lifetime Projection</h2>
        <p className="text-sm text-slate-500">Age-by-age financial trajectory</p>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Net Worth Over Time</p>
        <div className="h-[280px]">
          <LifetimeAreaChart 
            data={projection} 
            series={[
              { key: 'fireTarget', label: 'FIRE Target', color: '#fbbf24', dash: '6 5' },
              { key: 'netWorth', label: 'Net Worth', color: '#56e39f', fill: '#56e39f' }
            ]} 
            milestones={derived.activeMilestones}
            retirementAge={data.profile.retirementAge}
            showSuccess={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-surface">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Income vs Expenses</p>
          <div className="h-[220px]">
            <CashFlowBarChart 
              data={projection.filter((_, i) => i % 2 === 0)} 
              milestones={derived.activeMilestones}
              showSuccess={false}
              showNetWorth={true}
            />
          </div>
        </div>
        <div className="p-6 rounded-2xl border border-border bg-surface flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Year-by-Year Table</p>
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[220px] -mx-6 px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Age</th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Net Worth</th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Contributions</th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Status</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((r) => (
                  <tr key={r.age} className="hover:bg-white/5 transition-colors">
                    <td className={`p-2 border-b border-slate-800 text-sm font-bold ${r.retired ? 'text-sky-400' : 'text-slate-200'}`}>{r.age}</td>
                    <td className="p-2 border-b border-slate-800 font-mono font-bold text-emerald-400 text-sm">{fmtK(r.netWorth)}</td>
                    <td className={`p-2 border-b border-slate-800 font-mono font-bold text-sm ${r.annualContributions >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                      {fmtK(r.annualContributions)}
                    </td>
                    <td className="p-2 border-b border-slate-800">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                        r.retired 
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                          : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                      }`}>
                        {r.retired ? 'Retired 🌴' : 'Working'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
