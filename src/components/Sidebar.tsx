import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Wallet, 
  CreditCard, 
  Target, 
  Palmtree, 
  LineChart, 
  Dices, 
  Flame, 
  Settings,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

const NavItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all border-l-2 ${
      active 
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

export const Sidebar = ({ activePage, setActivePage, onExport, onImport, onReset }: SidebarProps) => {
  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col overflow-y-auto custom-scrollbar">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
        <h1 className="text-lg font-black tracking-tighter text-emerald-400">LifePlan</h1>
      </div>

      <div className="py-4">
        <p className="px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Overview</p>
        <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} active={activePage === 'dashboard'} onClick={setActivePage} />
        
        <p className="px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-6 mb-2">Plan</p>
        <NavItem id="accounts" label="Accounts" icon={Building2} active={activePage === 'accounts'} onClick={setActivePage} />
        <NavItem id="income" label="Income" icon={Wallet} active={activePage === 'income'} onClick={setActivePage} />
        <NavItem id="expenses" label="Expenses" icon={CreditCard} active={activePage === 'expenses'} onClick={setActivePage} />
        <NavItem id="milestones" label="Milestones" icon={Target} active={activePage === 'milestones'} onClick={setActivePage} />
        <NavItem id="retirement" label="Retirement" icon={Palmtree} active={activePage === 'retirement'} onClick={setActivePage} />

        <p className="px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-6 mb-2">Analyze</p>
        <NavItem id="projection" label="Projection" icon={LineChart} active={activePage === 'projection'} onClick={setActivePage} />
        <NavItem id="montecarlo" label="Monte Carlo" icon={Dices} active={activePage === 'montecarlo'} onClick={setActivePage} />
        <NavItem id="fire" label="FIRE Calc" icon={Flame} active={activePage === 'fire'} onClick={setActivePage} />

        <p className="px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-6 mb-2">Config</p>
        <NavItem id="settings" label="Settings" icon={Settings} active={activePage === 'settings'} onClick={setActivePage} />
      </div>

      <div className="mt-auto p-6 border-t border-border flex flex-col gap-2">
        <p className="text-[10px] text-slate-500 mb-2">Data saved in browser localStorage.</p>
        <button onClick={onExport} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-300 border border-border-2 rounded-lg hover:border-emerald-500/50 hover:text-emerald-400 transition-all">
          <Download size={14} /> Export JSON
        </button>
        <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-300 border border-border-2 rounded-lg hover:border-emerald-500/50 hover:text-emerald-400 transition-all cursor-pointer">
          <Upload size={14} /> Import JSON
          <input type="file" accept=".json" className="hidden" onChange={onImport} />
        </label>
        <button onClick={onReset} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-400/70 border border-border-2 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-all">
          <RotateCcw size={14} /> Reset Demo
        </button>
      </div>
    </div>
  );
};
