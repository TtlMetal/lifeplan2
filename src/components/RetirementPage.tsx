import React from 'react';
import { AppData, RetirementConfig } from '../types';
import { fmtK, fmtUSD, fmtPct } from '../utils';
import { LifetimeAreaChart } from './ChartComponents';
import { Info } from 'lucide-react';

interface RetirementPageProps {
  data: AppData;
  derived: any;
  setRetirement: (config: RetirementConfig) => void;
}

export const RetirementPage = ({ data, derived, setRetirement }: RetirementPageProps) => {
  const { totalNW, fireNum, fireAge, retMonthly, actualWR, wRate, proj } = derived;
  const p = data.profile;
  const ret = data.retirement;
  const firePct = Math.min(100, (totalNW / fireNum) * 100);

  const updateConfig = (updates: Partial<RetirementConfig>) => {
    setRetirement({ ...ret, ...updates });
  };

  const scenarios = [50, 70, 80, 100, 120];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-100">🌴 Retirement Planning</h2>
        <p className="text-sm text-slate-500">Set your spending target and withdrawal rate</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-surface space-y-8">
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Retirement Expense Target</p>
            <div className="flex gap-2">
              <button 
                onClick={() => updateConfig({ useCustom: false })}
                className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                  !ret.useCustom 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400' 
                    : 'bg-slate-800 text-slate-400 border-border-2 hover:border-emerald-500/30'
                }`}
              >
                % of Expenses
              </button>
              <button 
                onClick={() => updateConfig({ useCustom: true, customMonthly: ret.customMonthly || Math.round(derived.mExp) })}
                className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                  ret.useCustom 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400' 
                    : 'bg-slate-800 text-slate-400 border-border-2 hover:border-emerald-500/30'
                }`}
              >
                Custom Monthly
              </button>
            </div>

            {!ret.useCustom ? (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">% of current monthly expenses</label>
                  <span className="text-xl font-black font-mono text-emerald-400">{ret.expenseRatio}%</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="150" 
                  step="5" 
                  value={ret.expenseRatio} 
                  onChange={(e) => updateConfig({ expenseRatio: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  <span>20% Frugal</span>
                  <span>100% Same</span>
                  <span>150% Lavish</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Custom Monthly Spending ($)</label>
                <input 
                  type="number" 
                  value={ret.customMonthly || ''} 
                  onChange={(e) => updateConfig({ customMonthly: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-emerald-400 focus:border-emerald-400 transition-all outline-none"
                />
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-border space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Target Safe Withdrawal Rate (SWR)</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">FIRE Number = Annual Spend ÷ SWR</p>
            </div>
            <div className="flex items-center gap-6">
              <input 
                type="range" 
                min="2" 
                max="6" 
                step="0.5" 
                value={ret.withdrawalRate} 
                onChange={(e) => updateConfig({ withdrawalRate: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className={`text-2xl font-black font-mono min-w-[60px] text-right ${
                ret.withdrawalRate <= 4 ? 'text-emerald-400' : ret.withdrawalRate <= 5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {ret.withdrawalRate}%
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[3, 3.5, 4, 4.5, 5].map(r => (
                <button 
                  key={r}
                  onClick={() => updateConfig({ withdrawalRate: r })}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                    ret.withdrawalRate === r 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400' 
                      : 'bg-slate-800 text-slate-400 border-border-2 hover:border-emerald-500/30'
                  }`}
                >
                  {r === 4 ? '4% Rule' : `${r}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-border space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                Invest Leftover Income
                <div className="group relative">
                  <Info size={12} className="text-slate-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-border rounded-lg text-[10px] text-slate-400 font-normal normal-case tracking-normal invisible group-hover:visible z-50 shadow-xl">
                    See how increasing more of your take-home pay to investing can quicken your time to FIRE or increase your chances of success.
                  </div>
                </div>
              </p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">How much of your surplus income (after expenses & contributions) should be invested?</p>
            </div>
            <div className="flex items-center gap-6">
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5" 
                value={ret.investLeftoverRate} 
                onChange={(e) => updateConfig({ investLeftoverRate: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <span className="text-2xl font-black font-mono min-w-[60px] text-right text-sky-400">
                {ret.investLeftoverRate}%
              </span>
            </div>
            <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-3">
              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                You have <span className="text-sky-400 font-bold">{fmtUSD(Math.max(0, (derived.mIncome || 0) - derived.mExp - derived.mSaveNonDeferred))}</span> leftover each month.
                Investing <span className="text-sky-400 font-bold">{ret.investLeftoverRate}%</span> of this will add <span className="text-sky-400 font-bold">{fmtUSD(Math.max(0, (derived.mIncome || 0) - derived.mExp - derived.mSaveNonDeferred) * (ret.investLeftoverRate / 100))}/mo</span> to your taxable investments.
              </p>
              <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-500 border-t border-sky-500/20 pt-2">
                <div>
                  <p className="font-bold text-slate-400">Take-Home</p>
                  <p className="font-mono">{fmtUSD(derived.mIncome || 0)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">Expenses</p>
                  <p className="font-mono">-{fmtUSD(derived.mExp)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">Taxable/Roth/Cash Contribs</p>
                  <p className="font-mono">-{fmtUSD(derived.mSaveNonDeferred)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Current monthly expenses</span>
              <span className="font-bold text-slate-200">{fmtUSD(derived.mExp)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Total Monthly Savings</span>
              <span className="font-bold text-sky-400">{fmtUSD(derived.mSave)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Retirement monthly target</span>
              <span className="font-bold text-emerald-400">{fmtUSD(retMonthly)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Annual retirement spend</span>
              <span className="font-bold text-sky-400">{fmtUSD(retMonthly * 12)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">FIRE multiplier (÷{ret.withdrawalRate}%)</span>
              <span className="font-bold text-amber-400">{(100 / ret.withdrawalRate).toFixed(1)}×</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-border bg-emerald-500/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">FIRE Number (Nominal Target)</p>
              <div className="group relative">
                <Info size={12} className="text-slate-600 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 border border-border rounded-lg text-[10px] text-slate-400 font-normal normal-case tracking-normal invisible group-hover:visible z-50 shadow-xl">
                  This is the actual dollar amount you need to hit at age {p.retirementAge} to maintain your desired lifestyle. It accounts for inflation between now and then.
                </div>
              </div>
            </div>
            <p className="text-3xl font-black font-mono tracking-tighter text-emerald-400">{fmtK(derived.futureFireNum)}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In Today's Dollars:</p>
              <p className="text-xs font-bold text-emerald-500/60 font-mono">{fmtK(fireNum)}</p>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 italic">Targeting {fmtUSD(retMonthly)}/mo purchasing power (today's dollars)</p>
            <div className="h-2 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${firePct}%` }} />
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{fmtPct(firePct)} funded (Nominal)</p>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{fmtPct(Math.min(100, (totalNW / fireNum) * 100))} funded (Real)</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-sky-500/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">FIRE Age</p>
            <p className="text-3xl font-black font-mono tracking-tighter text-sky-400">{fireAge ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-1">{fireAge ? `${fireAge - p.currentAge} years away` : 'Increase savings or lower target'}</p>
          </div>
          <div className={`p-6 rounded-2xl border border-border ${
            actualWR <= ret.withdrawalRate ? 'bg-emerald-500/5' : actualWR <= ret.withdrawalRate * 1.25 ? 'bg-amber-500/5' : 'bg-red-500/5'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Retirement Age Withdrawal Rate</p>
              <div className="group relative">
                <Info size={12} className="text-slate-600 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 border border-border rounded-lg text-[10px] text-slate-400 font-normal normal-case tracking-normal invisible group-hover:visible z-50 shadow-xl">
                  This is your projected annual spending at age {p.retirementAge} divided by your expected portfolio at that same age. If this is lower than your Target SWR (e.g. 4%), your plan is safer than your target.
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black font-mono tracking-tighter ${
                actualWR <= ret.withdrawalRate ? 'text-emerald-400' : actualWR <= ret.withdrawalRate * 1.25 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {actualWR.toFixed(1)}%
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">at age {p.retirementAge}</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {actualWR <= ret.withdrawalRate ? `✅ At or below ${ret.withdrawalRate}% target` : actualWR <= 5 ? '⚠️ Above target' : '❌ High risk'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Spending Scenarios — click to apply</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {scenarios.map(pc => {
            const mo = derived.mExp * pc / 100;
            const isA = !ret.useCustom && ret.expenseRatio === pc;
            return (
              <button 
                key={pc}
                onClick={() => updateConfig({ useCustom: false, expenseRatio: pc })}
                className={`p-4 rounded-xl border text-center transition-all ${
                  isA 
                    ? 'bg-emerald-500/10 border-emerald-400' 
                    : 'bg-surface-2 border-border hover:border-emerald-500/30'
                }`}
              >
                <p className={`text-xl font-black font-mono ${isA ? 'text-emerald-400' : 'text-slate-200'}`}>{pc}%</p>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">of expenses</p>
                <p className="text-sm font-bold text-sky-400">{fmtUSD(mo)}/mo</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Net Worth vs FIRE Target</p>
        <div className="h-[260px]">
          <LifetimeAreaChart 
            data={proj} 
            series={[
              { key: 'fireTarget', label: 'FIRE Target', color: '#fbbf24', dash: '5 5' },
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
