export type Frequency = 'monthly' | 'annual';
export type AccountType = 'tax_deferred' | 'tax_free' | 'taxable' | 'cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  contribution: number;
  contributionFreq?: 'monthly' | 'annual';
  match: number;
  annualIncrease?: number;
  annualIncreaseType?: 'amount' | 'percent';
  annualIncreaseInterval?: number;
  isHidden?: boolean;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  freq: Frequency;
  startAge: number;
  endAge: number;
  isUntilDeath?: boolean;
  growthRate: number;
  isFixed?: boolean;
  duringRetirement?: boolean;
  isWorkingYears?: boolean;
  isHidden?: boolean;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  freq: Frequency;
  startAge: number;
  endAge: number;
  isUntilDeath?: boolean;
  duringRetirement: boolean;
  isFixed?: boolean;
  isHidden?: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  age: number;
  impact: number;
  isHidden?: boolean;
}

export interface Profile {
  name: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  marketReturn: number;
  inflationRate: number;
}

export interface RetirementConfig {
  expenseRatio: number;
  customMonthly: number | null;
  useCustom: boolean;
  withdrawalRate: number;
  investLeftoverRate: number;
}

export interface AppData {
  profile: Profile;
  retirement: RetirementConfig;
  accounts: Account[];
  income: Income[];
  expenses: Expense[];
  milestones: Milestone[];
}

export interface Plan extends AppData {
  id: string;
}

export interface PlansState {
  currentPlanId: string;
  plans: Plan[];
}

export type MonteCarloMode = 'standard' | 'historical' | 'allocation';

export interface ProjectionRow {
  age: number;
  retired: boolean;
  annIncome: number;
  annualIncome: number;
  annualExpenses: number;
  netCF: number;
  annualContributions: number;
  mImpact: number;
  netWorth: number;
  fireTarget?: number;
  p5?: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  p95?: number;
  survived?: number;
  sampleRuns?: number[];
  sampleRunYears?: number[];
}
