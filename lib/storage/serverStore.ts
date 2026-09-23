import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_FRIENDS,
  INITIAL_PROFILE,
  INITIAL_SPLIT_BILLS,
  INITIAL_TRANSACTIONS,
} from "../../constant/initialData";
import type {
  Account,
  Budget,
  FinancialProfile,
  Friend,
  SplitBill,
  StoredFinanceData,
  Transaction,
} from "../../types/finance";

// In-memory server fallback data for offline / dev mock user
interface UserDataStore {
  profile: FinancialProfile;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  splitBills: SplitBill[];
  friends: Friend[];
}

const mockStores = new Map<string, UserDataStore>();

export function getFallbackStore(userId: string): UserDataStore {
  let store = mockStores.get(userId);
  if (!store) {
    store = {
      profile: { ...INITIAL_PROFILE },
      accounts: [...INITIAL_ACCOUNTS],
      transactions: [...INITIAL_TRANSACTIONS],
      budgets: [...INITIAL_BUDGETS],
      splitBills: [...INITIAL_SPLIT_BILLS],
      friends: [...INITIAL_FRIENDS],
    };
    mockStores.set(userId, store);
  }
  return store;
}

export function setFallbackStore(userId: string, data: Partial<StoredFinanceData>): void {
  const current = getFallbackStore(userId);
  if (data.profile) current.profile = { ...current.profile, ...data.profile };
  if (Array.isArray(data.accounts)) current.accounts = [...data.accounts];
  if (Array.isArray(data.transactions)) current.transactions = [...data.transactions];
  if (Array.isArray(data.budgets)) current.budgets = [...data.budgets];
  if (Array.isArray(data.splitBills)) current.splitBills = [...data.splitBills];
  if (Array.isArray(data.friends)) current.friends = [...data.friends];
}

export function resetFallbackStore(userId: string): void {
  mockStores.delete(userId);
}
