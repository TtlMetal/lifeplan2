import React, { useState } from 'react';
import { AppData, ProjectionRow } from '../types';
import { calculateProjection } from '../services/projectionService';
import { fmtK, fmtPct } from '../utils';
import { LifetimeAreaChart } from './ChartComponents';
import { Dices, RotateCcw, Info } from 'lucide-react';

interface MonteCarloPageProps {
  data: AppData;
  derived: any;
}

export const MonteCarloPage = ({ data, derived }: MonteCarloPageProps) => {
  const [mcData, setMcData] = useState<ProjectionRow[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSimulation = () => {
    setIsRunning(true);
    // Use setTimeout to allow UI to update to "Running..." state
    setTimeout(() => {
      const results = calculateProjection(data, 500);
      setMcData(results);
      setIsRunning(false);
    }, 100);
  };

  const reset = () => {
    setMcData(null);
  };

  if (!mcData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="p-8 rounded-full bg-emerald-500/10 text-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.1)]">
          <Dices size={64} />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-3xl font-black tracking-tight text-slate-100">Monte Carlo Simulation</h2>
          <p className="text-slate-500 leading-relaxed">
            Run 500 randomized scenarios to estimate your probability of success. 
            Each run uses randomized annual returns (base ± 18% variance) to model market volatility.
          </p>
        </div>
        <button 
          onClick={runSimulation}
          disabled={isRunning}
          className="px-8 py-4 bg-emerald-400 text-slate-900 font-black tracking-tight text-lg rounded-2xl hover:bg-emerald-300 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50"
        >
          {isRunning ? 'Running 500 Scenarios...' : 'Run Simulation'}
        </button>
      </div>
    );
  }

  const p = data.profile;
  const atRet = mcData.find(r => r.age === p.retirementAge) || mcData[mcData.length - 1];
  const atEnd = mcData[mcData.length - 1];
  const sr = (atEnd.survived || 0) * 100;

  const stats = [
    { label: 'Success Rate', value: fmtPct(sr), sub: sr < 100 ? `${Math.round(500 * (1 - sr/100))} failures in 500 runs` : `Survives to age ${p.lifeExpectancy}`, color: sr > 85 ? 'text-emerald-400' : sr > 70 ? 'text-amber-400' : 'text-red-400', bg: sr > 85 ? 'bg-emerald-500/5' : sr > 70 ? 'bg-amber-500/5' : 'bg-red-500/5' },
    { label: 'Median Outcome', value: fmtK(atEnd.p50 || 0), sub: '50th percentile', color: 'text-sky-400', bg: 'bg-sky-500/5' },
    { label: 'Top 5% (P95)', value: fmtK(atEnd.p95 || 0), sub: 'Lucky scenario', color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
    { label: 'Bottom 5% (P5)', value: fmtK(atEnd.p5 || 0), sub: 'Unlucky scenario', color: 'text-red-400', bg: 'bg-red-500/5' },
  ];

  const percentiles = [
    { label: 'P95 (Top 5%)', value: atEnd.p95, color: 'text-emerald-500' },
    { label: 'P90 (Top 10%)', value: atEnd.p90, color: 'text-emerald-400' },
    { label: 'P75 (Top 25%)', value: atEnd.p75, color: 'text-emerald-300' },
    { label: 'P50 (Median)', value: atEnd.p50, color: 'text-sky-400' },
    { label: 'P25 (Bottom 25%)', value: atEnd.p25, color: 'text-amber-400' },
    { label: 'P10 (Bottom 10%)', value: atEnd.p10, color: 'text-red-400' },
    { label: 'P5 (Bottom 5%)', value: atEnd.p5, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-100">Monte Carlo Simulation</h2>
          <p className="text-sm text-slate-500">500 randomized scenarios to estimate your probability of success</p>
        </div>
        <button 
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 font-bold text-sm rounded-xl border border-border-2 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
        >
          <RotateCcw size={16} /> Re-run
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border border-border ${s.bg}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
              {s.label}
              {s.label === 'Success Rate' && (
                <div className="group relative">
                  <Info size={12} className="text-slate-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-border rounded-lg text-[10px] text-slate-400 font-normal normal-case tracking-normal invisible group-hover:visible z-50 shadow-xl">
                    Your chance of not running out of money before age {p.lifeExpectancy}.
                  </div>
                </div>
              )}
            </p>
            <p className={`text-2xl font-black font-mono tracking-tighter ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Full Distribution Range</p>
            <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> P95</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> P75</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-sky-400" /> P50</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> P25</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> P5</div>
            </div>
          </div>
          <div className="h-[320px]">
            <LifetimeAreaChart 
              data={mcData} 
              series={[
                { key: 'p95', label: 'Top 5% (P95)', color: '#10b981', dash: '5 4' },
                { key: 'p75', label: 'Top 25% (P75)', color: '#34d399', dash: '3 3', fillOpacity: 0.1 },
                { key: 'p50', label: 'Median (P50)', color: '#38bdf8', fill: '#38bdf8' },
                { key: 'p25', label: 'Bottom 25% (P25)', color: '#fbbf24', dash: '3 3', fillOpacity: 0.1 },
                { key: 'p5', label: 'Bottom 5% (P5)', color: '#ef4444', dash: '5 4' }
              ]} 
              milestones={derived.activeMilestones}
              retirementAge={p.retirementAge}
              showSuccess={true}
            />
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Outcome Distribution (Age {p.lifeExpectancy})</p>
          <div className="flex-1 space-y-3">
            {percentiles.map((pct, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{pct.label}</span>
                  <span className={`text-xs font-black font-mono ${pct.color}`}>{fmtK(pct.value || 0)}</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full opacity-60 transition-all duration-1000 ${
                      pct.label.includes('95') || pct.label.includes('90') ? 'bg-emerald-500' : 
                      pct.label.includes('75') ? 'bg-emerald-300' : 
                      pct.label.includes('50') ? 'bg-sky-400' : 
                      pct.label.includes('25') ? 'bg-amber-400' : 'bg-red-400'
                    }`} 
                    style={{ width: `${Math.min(100, ((pct.value || 0) / (atEnd.p95 || 1)) * 100)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-border text-[10px] text-slate-500 leading-relaxed italic">
            Success rate is {fmtPct(sr)}. If this is less than 100%, the P5 or P10 lines may hit zero, indicating scenarios where funds were exhausted.
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface-2 space-y-4">
        <div className="flex items-center gap-2 text-sky-400">
          <Info size={16} />
          <p className="text-xs font-bold uppercase tracking-widest">Understanding the Results</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-200">Success Rate</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              The percentage of simulations where your net worth remained above $0 until age {p.lifeExpectancy}. 
              A rate above 90% is generally considered very safe.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-200">The Median (P50)</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              The "middle" outcome. Half of the scenarios performed better than this, and half performed worse. 
              This is often more realistic than a deterministic projection.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-200">Percentile Bounds</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              P5 represents a "bad sequence of returns" (bottom 5% of outcomes), while P95 represents a "great sequence of returns" (top 5%). 
              The P25 and P75 lines show the middle 50% of all possible outcomes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
