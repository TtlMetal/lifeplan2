import React, { useState } from 'react';
import { AppData, ProjectionRow, MonteCarloMode } from '../types';
import { calculateProjection } from '../services/projectionService';
import { fmtK, fmtPct } from '../utils';
import { LifetimeAreaChart } from './ChartComponents';
import { Dices, RotateCcw, Info, BarChart3, History, PieChart } from 'lucide-react';

interface MonteCarloPageProps {
  data: AppData;
  derived: any;
}

export const MonteCarloPage = ({ data, derived }: MonteCarloPageProps) => {
  const [mcData, setMcData] = useState<ProjectionRow[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<MonteCarloMode>('standard');

  const runSimulation = () => {
    setIsRunning(true);
    // Use setTimeout to allow UI to update to "Running..." state
    setTimeout(() => {
      const results = calculateProjection(data, 500, mode);
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
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <button 
            onClick={() => setMode('standard')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${mode === 'standard' ? 'border-emerald-400 bg-emerald-500/5' : 'border-border bg-surface hover:border-slate-700'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${mode === 'standard' ? 'bg-emerald-400 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                <BarChart3 size={20} />
              </div>
              <span className="font-black tracking-tight text-slate-100">Standard (Randomized)</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Uses your <strong>{data.profile.marketReturn}%</strong> expected return as the average. Each year, the return is randomized within a ±18% range (e.g., if you expect 7%, years could range from -11% to +25%).
            </p>
          </button>

          <button 
            onClick={() => setMode('historical')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${mode === 'historical' ? 'border-sky-400 bg-sky-500/5' : 'border-border bg-surface hover:border-slate-700'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${mode === 'historical' ? 'bg-sky-400 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                <History size={20} />
              </div>
              <span className="font-black tracking-tight text-slate-100">Historical (S&P 500)</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Uses actual sequences of S&P 500 returns from <strong>1928–2023</strong>. Captures real-world market cycles and "Sequence of Returns" risk.
            </p>
          </button>

          <button 
            onClick={() => setMode('allocation')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${mode === 'allocation' ? 'border-amber-400 bg-amber-500/5' : 'border-border bg-surface hover:border-slate-700'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${mode === 'allocation' ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                <PieChart size={20} />
              </div>
              <span className="font-black tracking-tight text-slate-100">Asset Allocation</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Uses a <strong>80/20</strong> stock/bond split pre-retirement, shifting to <strong>60/40</strong> in retirement. Uses historical data for both.
            </p>
          </button>
        </div>

        <button 
          onClick={runSimulation}
          disabled={isRunning}
          className={`px-8 py-4 text-slate-900 font-black tracking-tight text-lg rounded-2xl transition-all shadow-xl disabled:opacity-50 ${
            mode === 'standard' ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20' : 
            mode === 'historical' ? 'bg-sky-400 hover:bg-sky-300 shadow-sky-500/20' :
            'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
          }`}
        >
          {isRunning ? 'Running 500 Scenarios...' : `Run ${mode === 'standard' ? 'Standard' : mode === 'historical' ? 'Historical' : 'Allocation'} Simulation`}
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
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
              {s.label}
              {s.label === 'Success Rate' && (
                <div className="group relative">
                  <Info size={12} className="text-slate-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-border rounded-lg text-[10px] text-slate-400 font-normal normal-case tracking-normal invisible group-hover:visible z-50 shadow-xl">
                    Your chance of not running out of money before age {p.lifeExpectancy}.
                  </div>
                </div>
              )}
            </div>
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

      {mode === 'standard' && (
        <div className="p-6 rounded-2xl border border-border bg-surface-2 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Info size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Standard Mode Methodology</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-200">What is "±18% Variance"?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                In Standard Mode, we take your <strong>{data.profile.marketReturn}%</strong> expected return and apply a random "swing" each year. 
                The ±18% range means that in any given year, the market could perform as much as 18% better or 18% worse than your average.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-border">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Example Calculation</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Expected Average:</span>
                    <span className="text-slate-200 font-mono">{data.profile.marketReturn}%</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Worst Case Year:</span>
                    <span className="text-red-400 font-mono">{data.profile.marketReturn - 18}%</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Best Case Year:</span>
                    <span className="text-emerald-400 font-mono">{data.profile.marketReturn + 18}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-200">Why use this mode?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                This mode is useful if you have a specific asset allocation (like a 60/40 stock/bond split) that doesn't match the 100% S&P 500 historical data. 
                By setting a lower expected return in your settings, you can model a more conservative portfolio while still accounting for the "ups and downs" of the market.
              </p>
              <p className="text-[10px] text-slate-500 italic">
                Note: This model assumes every year is independent, which is a simplification. For real-world market cycles, try the "Historical" mode.
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === 'allocation' && (
        <div className="p-6 rounded-2xl border border-border bg-surface-2 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Info size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Asset Allocation Methodology</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-200">The "Glide Path"</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                This mode models a realistic shift in risk as you age. It uses an <strong>80% Stock / 20% Bond</strong> allocation during your working years, and automatically shifts to a more conservative <strong>60% Stock / 40% Bond</strong> allocation once you reach retirement age.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-border space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allocation Split</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 rounded-lg bg-slate-800 border border-border">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Pre-Retirement</p>
                    <p className="text-sm font-black text-emerald-400">80/20</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800 border border-border">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">In Retirement</p>
                    <p className="text-sm font-black text-sky-400">60/40</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-200">Why use this mode?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Most investors don't stay 100% in stocks forever. Bonds provide a "cushion" during market downturns. 
                By using historical data for both stocks (S&P 500) and bonds (10-Year Treasuries), this simulation shows how a balanced portfolio would have survived historical market cycles.
              </p>
              <p className="text-[10px] text-slate-500 italic">
                Note: This mode captures the "Sequence of Returns" risk while accounting for the stabilizing effect of bonds in retirement.
              </p>
            </div>
          </div>
        </div>
      )}

      {(mode === 'historical' || mode === 'allocation') && (
        <div className="p-6 rounded-2xl border border-border bg-surface-2 space-y-4">
          <div className="flex items-center gap-2 text-sky-400">
            <Info size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Historical Context & Methodology</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-200">Simulation Methodology</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                This simulation uses a <strong>Historical Bootstrap</strong> approach. Instead of assuming a normal distribution of returns, it pulls from the actual annual total returns of the {mode === 'allocation' ? 'S&P 500 and 10-Year Treasuries' : 'S&P 500'} from 1928 to 2023. 
                Each of the 500 runs picks a random starting year and follows the sequence of historical returns that followed, wrapping back to 1928 if the sequence reaches 2023.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-border space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sample Path Starting Years</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[9px] text-red-400 font-bold uppercase">Unlucky (P5)</p>
                    <p className="text-lg font-black font-mono text-slate-200">{atEnd.sampleRunYears?.[0]}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-sky-400 font-bold uppercase">Median (P50)</p>
                    <p className="text-lg font-black font-mono text-slate-200">{atEnd.sampleRunYears?.[1]}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-emerald-400 font-bold uppercase">Lucky (P95)</p>
                    <p className="text-lg font-black font-mono text-slate-200">{atEnd.sampleRunYears?.[2]}</p>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 italic">
                  The "Unlucky" path represents a sequence of returns starting in {atEnd.sampleRunYears?.[0]}, which resulted in a bottom 5% outcome for your specific plan.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-200">Why Historical Data?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Historical data captures "fat tails" and market regimes (like the Great Depression or the 1970s stagflation) that simple randomized models often miss. 
                By seeing which starting years lead to failure, you can better understand the specific market conditions that pose the greatest risk to your retirement.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-[9px] font-bold text-red-400 uppercase mb-1">Worst Historical Years</p>
                  <p className="text-[10px] text-slate-400">1931 (-43.8%), 2008 (-37.0%), 1937 (-35.3%)</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase mb-1">Best Historical Years</p>
                  <p className="text-[10px] text-slate-400">1933 (+54.0%), 1954 (+52.6%), 1935 (+47.7%)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
