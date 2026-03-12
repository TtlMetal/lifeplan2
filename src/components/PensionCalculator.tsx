import React, { useState } from 'react';
import { fmtUSD } from '../utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const PensionCalculator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [endingSalary, setEndingSalary] = useState(100000);
  const [percentage, setPercentage] = useState(5);

  const annualPension = (endingSalary * percentage) / 100;

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface-2 space-y-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-black tracking-tight text-slate-100">Pension Calculator (Helper Tool)</h3>
        {isOpen ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
      </button>
      
      {isOpen && (
        <div className="space-y-4 pt-4 border-t border-border">
          <p className="text-xs text-slate-500 italic">
            Note: This is a simplified estimator. For accurate figures, please consult your individual's Pension website.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ending Salary ($)</label>
              <input 
                type="number" 
                className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" 
                value={endingSalary} 
                onChange={e => setEndingSalary(Number(e.target.value))} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pension Percentage (%)</label>
              <input 
                type="number" 
                className="w-full bg-bg border border-border-2 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-400" 
                value={percentage} 
                onChange={e => setPercentage(Number(e.target.value))} 
              />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <p className="text-sm font-bold text-emerald-400">Estimated Annual Pension</p>
            <p className="text-xl font-black font-mono text-emerald-400">{fmtUSD(annualPension)}</p>
          </div>
        </div>
      )}
    </div>
  );
};
