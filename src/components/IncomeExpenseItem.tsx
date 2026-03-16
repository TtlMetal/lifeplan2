import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Income, Expense } from '../types';
import { fmtUSD } from '../utils';

interface IncomeExpenseItemProps {
  key?: string;
  item: Income | Expense;
  isIncome: boolean;
  inflationRate: number;
  retirementAge: number;
  lifeExpectancy: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const IncomeExpenseItem = ({ 
  item, 
  isIncome, 
  inflationRate, 
  retirementAge, 
  lifeExpectancy, 
  onEdit, 
  onDelete, 
  onToggle 
}: IncomeExpenseItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const annual = item.freq === 'monthly' ? item.amount * 12 : item.amount;
  const gr = isIncome ? (item as Income).growthRate : inflationRate;
  const grColor = gr > 0 ? 'text-emerald-400' : gr < 0 ? 'text-red-400' : 'text-slate-500';

  return (
    <tr ref={setNodeRef} style={style} className={`group hover:bg-white/5 transition-colors ${item.isHidden ? 'opacity-40 grayscale' : ''}`}>
      <td className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400"
          >
            <GripVertical size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">{item.name}</span>
            {!isIncome && (item as Expense).duringRetirement && (
              <span className="inline-block whitespace-nowrap px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-bold uppercase tracking-widest">Retirement</span>
            )}
            {!isIncome && (item as Expense).flexibility === 'essential' && (
              <span className="inline-block whitespace-nowrap px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase tracking-widest">Need</span>
            )}
            {!isIncome && (item as Expense).flexibility === 'discretionary' && (
              <span className="inline-block whitespace-nowrap px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest">Want</span>
            )}
          </div>
        </div>
      </td>
      <td className={`p-3 border-b border-slate-800 font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
        <div className="flex flex-col">
          <span>{fmtUSD(item.amount)}</span>
          {item.isFixed && <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Fixed</span>}
        </div>
      </td>
      <td className="p-3 border-b border-slate-800">
        <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold border ${
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
};
