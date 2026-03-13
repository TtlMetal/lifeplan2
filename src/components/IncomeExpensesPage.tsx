import React from 'react';
import { Income, Expense, Milestone } from '../types';
import { fmtUSD, fmtPct } from '../utils';
import { Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { PensionCalculator } from './PensionCalculator';

interface IncomeExpensesPageProps {
  type: 'income' | 'expense';
  items: (Income | Expense)[];
  milestones: Milestone[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  inflationRate: number;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
}

export const IncomeExpensesPage = ({ type, items, milestones, onAdd, onEdit, onDelete, onToggle, inflationRate, currentAge, retirementAge, lifeExpectancy }: IncomeExpensesPageProps) => {
  const isIncome = type === 'income';
  
  const baseAnnual = items
    .filter(item => !item.isHidden)
    .filter(item => {
      const start = (item as Expense).duringRetirement ? retirementAge : item.startAge;
      const end = (item as Expense).duringRetirement ? lifeExpectancy : item.endAge;
      return currentAge >= start && currentAge < end;
    })
    .reduce((sum, item) => {
      const amount = item.freq === 'monthly' ? item.amount * 12 : item.amount;
      return sum + amount;
    }, 0);

  const totalAnnual = Math.max(0, baseAnnual);
  const totalMonthly = totalAnnual / 12;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-100">{isIncome ? 'Take-home Pay' : 'Expenses'}</h2>
          <p className="text-sm text-slate-500">{isIncome ? 'Model all after-tax income across your lifetime' : 'Plan spending over your lifetime'}</p>
        </div>
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-emerald-400 text-slate-900 font-black tracking-tight text-sm rounded-xl hover:bg-emerald-300 transition-all shadow-[0_0_12px_rgba(52,211,153,0.3)]"
        >
          + Add {isIncome ? 'Pay Stream' : 'Expense'}
        </button>
      </div>

      {isIncome && <PensionCalculator />}

      <div className="p-6 rounded-2xl border border-border bg-surface overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">{isIncome ? 'Source' : 'Category'}</th>
              <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Amount</th>
              <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Freq</th>
              {isIncome && <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Growth/yr</th>}
              <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Age Range</th>
              <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Annual</th>
              <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const annual = item.freq === 'monthly' ? item.amount * 12 : item.amount;
              
              const gr = isIncome ? (item as Income).growthRate : inflationRate;
              const grColor = gr > 0 ? 'text-emerald-400' : gr < 0 ? 'text-red-400' : 'text-slate-500';
              
              return (
                <tr key={item.id} className={`group hover:bg-white/5 transition-colors ${item.isHidden ? 'opacity-40 grayscale' : ''}`}>
                  <td className="p-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{item.name}</span>
                      {!isIncome && (item as Expense).duringRetirement && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-bold uppercase tracking-widest">Retirement</span>
                      )}
                    </div>
                  </td>
                  <td className={`p-3 border-b border-slate-800 font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                    <div className="flex flex-col">
                      <span>{fmtUSD(item.amount)}</span>
                      {item.isFixed && <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Fixed</span>}
                    </div>
                  </td>
                  <td className="p-3 border-b border-slate-800">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.freq === 'monthly' 
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {item.freq === 'monthly' ? 'Monthly' : 'Annual'}
                    </span>
                  </td>
                  {isIncome && (
                    <td className={`p-3 border-b border-slate-800 font-mono font-bold ${grColor}`}>
                      {gr > 0 ? '+' : ''}{gr}%
                    </td>
                  )}
                  <td className="p-3 border-b border-slate-800 text-slate-400 text-sm">
                    {(item as Expense).duringRetirement 
                      ? `${retirementAge} – ${lifeExpectancy}` 
                      : `${item.startAge} – ${item.isUntilDeath ? lifeExpectancy : item.endAge}`}
                    {item.isUntilDeath && !((item as Expense).duringRetirement) && (
                      <span className="ml-1 text-[8px] font-bold text-slate-600 uppercase tracking-tighter">(Life Exp)</span>
                    )}
                  </td>
                  <td className={`p-3 border-b border-slate-800 font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtUSD(annual)}
                  </td>
                  <td className="p-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onToggle(item.id)}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title={item.isHidden ? "Show item" : "Hide item"}
                      >
                        {item.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button 
                        onClick={() => onEdit(item.id)}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-surface flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Total Monthly {isIncome ? 'Take-home' : 'Expenses'}</p>
          <p className={`text-2xl font-black font-mono tracking-tighter ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtUSD(totalMonthly)}
          </p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-surface flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Total Annual {isIncome ? 'Take-home' : 'Expenses'}</p>
          <p className={`text-2xl font-black font-mono tracking-tighter ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtUSD(totalAnnual)}
          </p>
        </div>
      </div>
    </div>
  );
};
