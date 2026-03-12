export const fmtUSD = (n: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const fmtK = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return sign + '$' + (a / 1e3).toFixed(0) + 'K';
  return fmtUSD(n);
};

export const fmtPct = (n: number) => n.toFixed(1) + '%';

export const typeLabel = (t: string) => ({
  tax_deferred: 'Tax-Deferred',
  tax_free: 'Tax-Free (Roth)',
  taxable: 'Taxable',
  cash: 'Cash/Savings'
}[t] || t);

export const typeBadgeClass = (t: string) => ({
  tax_deferred: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  tax_free: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  taxable: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cash: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
}[t] || 'bg-slate-500/10 text-slate-400 border-slate-500/20');
