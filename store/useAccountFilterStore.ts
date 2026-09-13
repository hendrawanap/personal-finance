import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AccountFilterStore {
  selectedAccountId: string | "all";
  setSelectedAccountId: (id: string | "all") => void;
}

/**
 * Account context that persists across pages.
 */
export const useAccountFilterStore = create<AccountFilterStore>()(
  persist(
    (set) => ({
      selectedAccountId: "all",
      setSelectedAccountId: (id) => set({ selectedAccountId: id }),
    }),
    {
      name: "finance-active-account",
      skipHydration: true,
    },
  ),
);
