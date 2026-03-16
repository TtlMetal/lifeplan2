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
import { Income, Expense, Milestone } from '../types';
import { fmtUSD } from '../utils';
import { PensionCalculator } from './PensionCalculator';
import { IncomeExpenseItem } from './IncomeExpenseItem';

interface IncomeExpensesPageProps {
  type: 'income' | 'expense';
  items: (Income | Expense)[];
  setItems: (items: (Income | Expense)[]) => void;
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

export const IncomeExpensesPage = ({ 
  type, 
  items, 
  setItems,
  milestones, 
  onAdd, 
  onEdit, 
  onDelete, 
  onToggle, 
  inflationRate, 
  currentAge, 
  retirementAge, 
  lifeExpectancy 
}: IncomeExpensesPageProps) => {
  const isIncome = type === 'income';
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  };

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

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
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
              <SortableContext 
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <IncomeExpenseItem 
                    key={item.id}
                    item={item}
                    isIncome={isIncome}
                    inflationRate={inflationRate}
                    retirementAge={retirementAge}
                    lifeExpectancy={lifeExpectancy}
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
