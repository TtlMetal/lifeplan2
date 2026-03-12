import { AppData } from './types';

export const EXPENSE_CATS = [
  'Housing / Rent',
  'Food & Groceries',
  'Dining Out',
  'Transportation',
  'Healthcare / Medical',
  'Insurance',
  'Utilities',
  'Entertainment',
  'Travel & Vacation',
  'Clothing & Personal',
  'Childcare / Education',
  'Subscriptions',
  'Gym & Fitness',
  'Home Maintenance',
  'Charitable Giving',
  'Other'
];

export const DEFAULT_DATA: AppData = {
  profile: {
    name: 'My Plan',
    currentAge: 32,
    retirementAge: 55,
    lifeExpectancy: 90,
    marketReturn: 7,
    inflationRate: 3
  },
  retirement: {
    expenseRatio: 80,
    customMonthly: null,
    useCustom: false,
    withdrawalRate: 4,
    investLeftoverRate: 50
  },
  accounts: [
    { id: '1', name: '401(k)', type: 'tax_deferred', balance: 85000, contribution: 1500, match: 500 },
    { id: '2', name: 'Roth IRA', type: 'tax_free', balance: 22000, contribution: 583, match: 0 },
    { id: '3', name: 'Taxable Brokerage', type: 'taxable', balance: 45000, contribution: 1000, match: 0 },
    { id: '4', name: 'Emergency Fund', type: 'cash', balance: 18000, contribution: 0, match: 0 },
  ],
  income: [
    { id: '1', name: 'Salary', amount: 8500, freq: 'monthly', startAge: 32, endAge: 55, growthRate: 3 },
    { id: '2', name: 'Side Income', amount: 1200, freq: 'monthly', startAge: 32, endAge: 45, growthRate: 0 },
    { id: '3', name: 'Social Security', amount: 2400, freq: 'monthly', startAge: 67, endAge: 90, growthRate: 2 },
  ],
  expenses: [
    { id: '1', name: 'Housing / Rent', amount: 2200, freq: 'monthly', startAge: 32, endAge: 90, duringRetirement: false },
    { id: '2', name: 'Food & Groceries', amount: 1200, freq: 'monthly', startAge: 32, endAge: 90, duringRetirement: false },
    { id: '3', name: 'Transportation', amount: 600, freq: 'monthly', startAge: 32, endAge: 80, duringRetirement: false },
    { id: '4', name: 'Healthcare / Medical', amount: 400, freq: 'monthly', startAge: 32, endAge: 65, duringRetirement: false },
    { id: '5', name: 'Healthcare / Medical', amount: 900, freq: 'monthly', startAge: 65, endAge: 90, duringRetirement: true },
    { id: '6', name: 'Entertainment', amount: 500, freq: 'monthly', startAge: 32, endAge: 85, duringRetirement: false },
  ],
  milestones: [
    { id: '1', name: 'Buy Home', age: 35, impact: -80000 },
    { id: '2', name: 'College Fund', age: 40, impact: -50000 },
    { id: '3', name: 'Inheritance', age: 60, impact: 120000 },
  ],
};
