import React from 'react';
import { Milestone } from '../types';
import { fmtUSD } from '../utils';
import { Edit2, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

interface MilestonesPageProps {
  milestones: Milestone[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const MilestonesPage = ({ milestones, onAdd, onEdit, onDelete, onToggle }: MilestonesPageProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-100">Life Milestones</h2>
          <p className="text-sm text-slate-500">One-time financial events</p>
        </div>
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-emerald-400 text-slate-900 font-black tracking-tight text-sm rounded-xl hover:bg-emerald-300 transition-all shadow-[0_0_12px_rgba(52,211,153,0.3)]"
        >
          + Add Milestone
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {milestones.map((m) => (
          <div key={m.id} className={`p-6 rounded-2xl border border-border bg-surface flex flex-col group hover:border-emerald-500/30 transition-all ${m.isHidden ? 'opacity-40 grayscale' : ''}`}>
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-black tracking-tight text-slate-100 mb-1">{m.name}</h3>
            <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-widest">At age {m.age}</p>
            <div className="space-y-1 mb-6">
              <p className={`text-2xl font-black font-mono tracking-tighter ${m.impact < 0 ? 'text-red-400' : m.impact > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {fmtUSD(m.impact)}
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2">
              <button 
                onClick={() => onToggle(m.id)}
                className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all"
                title={m.isHidden ? "Show item" : "Hide item"}
              >
                {m.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button 
                onClick={() => onEdit(m.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 bg-slate-800 rounded-lg hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button 
                onClick={() => onDelete(m.id)}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <button 
          onClick={onAdd}
          className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[200px]"
        >
          <div className="p-3 rounded-full bg-slate-800 text-slate-500 group-hover:text-emerald-400 transition-colors">
            <Plus size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500">Add Milestone</p>
        </button>
      </div>
    </div>
  );
};
