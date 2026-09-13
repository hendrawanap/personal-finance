export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "cash";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  accountNumber: string;
  balance: number;
  currency: string;
  accent: "moss" | "brass" | "info" | "stone";
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  accountId: string;
  amount: number; // positive number; type determines if income or expense
  type: TransactionType;
  status: TransactionStatus;
  notes?: string;
  createdAt: string;
}

export type BudgetPeriod = "Monthly" | "Weekly" | "Yearly";

export interface Budget {
  id: string;
  category: string;
  allocated: number;
  period: BudgetPeriod;
  color?: string;
}

export interface FinancialProfile {
  name: string;
  email: string;
  currencySymbol: string;
  currencyCode: string;
  monthlySavingsTarget: number;
}

export type SplitMethod =
  | "equal"
  | "exact"
  | "percentage"
  | "shares"
  | "itemized";

export interface Friend {
  id: string;
  userId?: string;
  friendUserId?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: "accepted" | "pending";
  createdAt: string;
  updatedAt?: string;
}

export type SplitParticipantStatus = "unpaid" | "paid";

export interface SplitParticipant {
  id: string;
  name: string;
  email?: string;
  userId?: string;
  isCurrentUser: boolean;
  shareAmount: number;
  percentage?: number;
  shares?: number;
  status: SplitParticipantStatus;
  settledAt?: string;
}

export interface SplitItem {
  id: string;
  name: string;
  amount: number;
  assignedTo: string[]; // participant IDs
}

export type SplitBillStatus = "pending" | "partial" | "settled";

export interface SplitBill {
  id: string;
  userId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: string;
  totalAmount: number;
  paidBy: string; // Participant name or ID
  paidByCurrentUser: boolean;
  payerAccountId?: string;
  linkedTransactionId?: string;
  splitMethod: SplitMethod;
  notes?: string;
  participants: SplitParticipant[];
  items?: SplitItem[];
  tax?: number;
  tip?: number;
  status: SplitBillStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ParticipantDebtDirection =
  | "they_owe_you"
  | "you_owe_them"
  | "settled_with_you"
  | "other_payer";

export interface ParticipantBillDetail {
  billId: string;
  billTitle: string;
  date: string;
  category: string;
  shareAmount: number;
  status: SplitParticipantStatus;
  direction: ParticipantDebtDirection;
  paidBy: string;
  paidByCurrentUser: boolean;
}

export interface ParticipantSummary {
  id: string; // unique identifier (email or normalized name)
  name: string;
  email?: string;
  owedToYou: number;   // Unpaid amount they owe the current user
  youOweThem: number;  // Unpaid amount the current user owes them
  netBalance: number;  // owedToYou - youOweThem (>0: owes you, <0: you owe)
  totalHistoricalSpent: number; // Sum of all their shares across all bills
  billsCount: number;
  unpaidBillsCount: number;
  status: "owes_you" | "you_owe" | "settled";
  bills: ParticipantBillDetail[];
}

export interface StoredFinanceData {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  splitBills: SplitBill[];
  friends?: Friend[];
  profile: FinancialProfile;
  version: number;
}

export const INCOME_CATEGORIES = [
  "Salary & Income",
  "Freelance & Consulting",
  "Investments & Dividends",
  "Bonus & Rewards",
  "Rental Income",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Housing & Rent",
  "Groceries & Food",
  "Utilities & Bills",
  "Transportation & Gas",
  "Dining Out & Entertainment",
  "Healthcare & Wellness",
  "Shopping & Personal Care",
  "Subscriptions & Software",
  "Education",
  "Other Expense",
] as const;

export const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
] as const;
