import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Account } from '../types';
import { fmtUSD, typeBadgeClass, typeLabel } from '../utils';

interface AccountItemProps {
  key?: string;
  account: Account;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const AccountItem = ({ account, onEdit, onDelete, onToggle }: AccountItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`group hover:bg-white/5 transition-colors ${account.isHidden ? 'opacity-40 grayscale' : ''}`}>
      <td className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400"
          >
            <GripVertical size={16} />
          </button>
          <span className="font-bold text-slate-200">{account.name}</span>
        </div>
      </td>
      <td className="p-3 border-b border-slate-800">
        <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadgeClass(account.type)}`}>
          {typeLabel(account.type)}
        </span>
      </td>
      <td className="p-3 border-b border-slate-800 font-mono font-bold text-emerald-400">
        {fmtUSD(account.balance)}
      </td>
      <td className="p-3 border-b border-l border-slate-800 font-mono text-sky-400">
        {fmtUSD(account.contributionFreq === 'annual' ? account.contribution / 12 : account.contribution)}
      </td>
      <td className="p-3 border-b border-slate-800 font-mono text-sky-400">
        {fmtUSD(account.contributionFreq === 'annual' ? account.contribution : account.contribution * 12)}
      </td>
      <td className="p-3 border-b border-slate-800 font-mono text-emerald-400">
        {account.annualIncrease ? `+${account.annualIncreaseType === 'percent' ? `${account.annualIncrease}%` : fmtUSD(account.annualIncrease)}${(account.annualIncreaseInterval || 1) > 1 ? ` every ${account.annualIncreaseInterval} yrs` : '/yr'}` : '—'}
      </td>
      <td className="p-3 border-b border-slate-800 font-mono text-amber-400">
        {fmtUSD(account.match)}
      </td>
      <td className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onToggle(account.id)}
            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
            title={account.isHidden ? "Show item" : "Hide item"}
          >
            {account.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button 
            onClick={() => onEdit(account.id)}
            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={() => onDelete(account.id)}
            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};
