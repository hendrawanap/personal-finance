import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_PROFILE,
  INITIAL_SPLIT_BILLS,
  INITIAL_TRANSACTIONS,
} from "@/constant/initialData";
import { StoredFinanceData } from "@/types/finance";

export const STORAGE_KEY = "personal_finance_storage_v1";
export const STORAGE_EVENT = "personal_finance_storage_updated";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getDefaultFinanceData(): StoredFinanceData {
  return {
    accounts: INITIAL_ACCOUNTS,
    transactions: INITIAL_TRANSACTIONS,
    budgets: INITIAL_BUDGETS,
    splitBills: INITIAL_SPLIT_BILLS,
    profile: INITIAL_PROFILE,
    version: 1,
  };
}

export function readFinanceDataFromLocalStorage(): StoredFinanceData {
  if (!isBrowser()) {
    return getDefaultFinanceData();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultFinanceData();
      writeFinanceDataToLocalStorage(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<StoredFinanceData>;
    if (!parsed || typeof parsed !== "object") {
      const initial = getDefaultFinanceData();
      writeFinanceDataToLocalStorage(initial);
      return initial;
    }

    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : INITIAL_ACCOUNTS,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : INITIAL_TRANSACTIONS,
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : INITIAL_BUDGETS,
      splitBills: Array.isArray(parsed.splitBills) ? parsed.splitBills : INITIAL_SPLIT_BILLS,
      profile: parsed.profile && typeof parsed.profile === "object" ? parsed.profile : INITIAL_PROFILE,
      version: parsed.version ?? 1,
    };
  } catch (err) {
    console.error("Failed to read finance data from localStorage:", err);
    return getDefaultFinanceData();
  }
}

export function writeFinanceDataToLocalStorage(data: StoredFinanceData): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent(STORAGE_EVENT, { detail: { timestamp: Date.now() } }),
    );
  } catch (err) {
    console.error("Failed to write finance data to localStorage:", err);
  }
}

export function exportFinanceDataAsJson(): string {
  const data = readFinanceDataFromLocalStorage();
  return JSON.stringify(data, null, 2);
}

export function importFinanceDataFromJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString) as Partial<StoredFinanceData>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.accounts) ||
      !Array.isArray(parsed.transactions)
    ) {
      throw new Error("Invalid backup format: missing accounts or transactions.");
    }

    const nextData: StoredFinanceData = {
      accounts: parsed.accounts,
      transactions: parsed.transactions,
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : INITIAL_BUDGETS,
      splitBills: Array.isArray(parsed.splitBills) ? parsed.splitBills : INITIAL_SPLIT_BILLS,
      profile: parsed.profile && typeof parsed.profile === "object" ? parsed.profile : INITIAL_PROFILE,
      version: parsed.version ?? 1,
    };

    writeFinanceDataToLocalStorage(nextData);
    return true;
  } catch (err) {
    console.error("Failed to import finance data:", err);
    throw err;
  }
}

export function resetFinanceDataToDefaults(): StoredFinanceData {
  const initial = getDefaultFinanceData();
  writeFinanceDataToLocalStorage(initial);
  return initial;
}

export function clearFinanceData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent(STORAGE_EVENT, { detail: { timestamp: Date.now() } }),
  );
}
