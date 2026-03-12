import React from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Account } from '../types';
import { AccountItem } from './AccountItem';
import { fmtK, fmtUSD } from '../utils';

interface AccountsPageProps {
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const AccountsPage = ({ accounts, setAccounts, onAdd, onEdit, onDelete, onToggle }: AccountsPageProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = accounts.findIndex((a) => a.id === active.id);
      const newIndex = accounts.findIndex((a) => a.id === over.id);
      setAccounts(arrayMove(accounts, oldIndex, newIndex));
    }
  };

  const activeAccounts = accounts.filter(a => !a.isHidden);
  const totalBalance = activeAccounts.reduce((s, a) => s + a.balance, 0);
  const totalMonthlyContrib = activeAccounts.reduce((s, a) => s + (a.contributionFreq === 'annual' ? a.contribution / 12 : a.contribution), 0);
  const totalYearlyContrib = activeAccounts.reduce((s, a) => s + (a.contributionFreq === 'annual' ? a.contribution : a.contribution * 12), 0);
  const totalMatch = activeAccounts.reduce((s, a) => s + a.match, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-100">Accounts</h2>
          <p className="text-sm text-slate-500">Investment & savings accounts</p>
        </div>
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-emerald-400 text-slate-900 font-black tracking-tight text-sm rounded-xl hover:bg-emerald-300 transition-all shadow-[0_0_12px_rgba(52,211,153,0.3)]"
        >
          + Add Account
        </button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="p-6 rounded-2xl border border-border bg-surface overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Account</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Type</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Balance</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border border-l">Monthly Contrib.</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Yearly Contrib.</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Contrib Increase</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Employer Match</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext 
                items={accounts.map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {accounts.map((account) => (
                  <AccountItem 
                    key={account.id} 
                    account={account} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    onToggle={onToggle}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-emerald-500/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Total Balance</p>
          <p className="text-2xl font-black font-mono tracking-tighter text-emerald-400">{fmtK(totalBalance)}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-sky-500/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Monthly Contributions</p>
          <p className="text-2xl font-black font-mono tracking-tighter text-sky-400">{fmtUSD(totalMonthlyContrib)}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-sky-500/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Yearly Contributions</p>
          <p className="text-2xl font-black font-mono tracking-tighter text-sky-400">{fmtUSD(totalYearlyContrib)}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-amber-500/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Employer Match</p>
          <p className="text-2xl font-black font-mono tracking-tighter text-amber-400">{fmtUSD(totalMatch * 12)}<span className="text-sm text-slate-500 ml-1">/yr</span></p>
        </div>
      </div>
    </div>
  );
};
