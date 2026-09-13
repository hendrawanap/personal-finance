import {
  Account,
  AccountType,
  Budget,
  BudgetPeriod,
  FinancialProfile,
  Friend,
  SplitBill,
  SplitBillStatus,
  SplitMethod,
  SplitParticipantStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "./finance";

export interface ProfileRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  currency_symbol: string;
  currency_code: string;
  monthly_savings_target: number;
  created_at: string;
  updated_at: string;
}

export interface AccountRow {
  id: string;
  user_id: string | null;
  name: string;
  institution: string;
  type: AccountType;
  account_number: string;
  balance: number;
  currency: string;
  accent: "moss" | "brass" | "info" | "stone";
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string | null;
  date: string;
  description: string;
  category: string;
  account_id: string | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetRow {
  id: string;
  user_id: string | null;
  category: string;
  allocated: number;
  period: BudgetPeriod;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface SplitBillRow {
  id: string;
  user_id: string | null;
  title: string;
  date: string;
  category: string;
  total_amount: number;
  paid_by: string;
  paid_by_current_user: boolean;
  payer_account_id: string | null;
  linked_transaction_id: string | null;
  split_method: SplitMethod;
  notes: string | null;
  tax: number | null;
  tip: number | null;
  status: SplitBillStatus;
  created_at: string;
  updated_at: string;
}

export interface SplitBillParticipantRow {
  id: string;
  bill_id: string;
  user_id?: string | null;
  name: string;
  email: string | null;
  is_current_user: boolean;
  share_amount: number;
  percentage: number | null;
  shares: number | null;
  status: SplitParticipantStatus;
  settled_at: string | null;
}

export interface FriendRow {
  id: string;
  user_id: string;
  friend_user_id: string | null;
  name: string;
  email: string;
  avatar_url: string | null;
  status: "accepted" | "pending";
  created_at: string;
  updated_at: string;
}

export interface SplitBillItemRow {
  id: string;
  bill_id: string;
  name: string;
  amount: number;
  assigned_to: string[];
}

// ── Converters: DB Row <-> App Domain Model ──

export function accountFromRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    type: row.type,
    accountNumber: row.account_number,
    balance: Number(row.balance),
    currency: row.currency,
    accent: row.accent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function accountToRow(acc: Account, userId?: string | null): AccountRow {
  return {
    id: acc.id,
    user_id: userId ?? null,
    name: acc.name,
    institution: acc.institution,
    type: acc.type,
    account_number: acc.accountNumber,
    balance: acc.balance,
    currency: acc.currency,
    accent: acc.accent,
    created_at: acc.createdAt,
    updated_at: acc.updatedAt || new Date().toISOString(),
  };
}

export function transactionFromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    category: row.category,
    accountId: row.account_id || "",
    amount: Number(row.amount),
    type: row.type,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function transactionToRow(
  tx: Transaction,
  userId?: string | null,
): TransactionRow {
  return {
    id: tx.id,
    user_id: userId ?? null,
    date: tx.date,
    description: tx.description,
    category: tx.category,
    account_id: tx.accountId || null,
    amount: tx.amount,
    type: tx.type,
    status: tx.status,
    notes: tx.notes ?? null,
    created_at: tx.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export function budgetFromRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    category: row.category,
    allocated: Number(row.allocated),
    period: row.period,
    color: row.color ?? undefined,
  };
}

export function budgetToRow(
  b: Budget,
  userId?: string | null,
): BudgetRow {
  return {
    id: b.id,
    user_id: userId ?? null,
    category: b.category,
    allocated: b.allocated,
    period: b.period,
    color: b.color ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function splitBillFromRow(
  row: SplitBillRow,
  participants: SplitBillParticipantRow[],
  items: SplitBillItemRow[] = [],
  currentUser?: { id?: string | null; email?: string | null; name?: string | null },
): SplitBill {
  const normCurrentEmail = currentUser?.email?.trim().toLowerCase();
  const normCurrentName = currentUser?.name?.trim().toLowerCase();
  const currentUserId = currentUser?.id;

  const isCurrent = (
    pName: string,
    pEmail?: string | null,
    pUserId?: string | null,
    isFlag?: boolean,
  ): boolean => {
    if (currentUserId && pUserId && pUserId === currentUserId) return true;
    const cleanEmail = pEmail?.trim().toLowerCase();
    // If email exists on either side, match using email ONLY
    if (cleanEmail || normCurrentEmail) {
      return Boolean(cleanEmail && normCurrentEmail && cleanEmail === normCurrentEmail);
    }
    if (normCurrentName && pName && pName.trim().toLowerCase() === normCurrentName) return true;
    if (currentUserId && row.user_id && row.user_id !== currentUserId) {
      // Viewing a shared bill created by someone else: do not trust creator's is_current_user flag
      return false;
    }
    return Boolean(isFlag);
  };

  // Locate payer participant to resolve email if available
  const payerClean = row.paid_by.trim().toLowerCase();
  const payerParticipant = participants.find((p) => {
    const pEmail = p.email?.trim().toLowerCase();
    if (pEmail && payerClean.includes("@")) {
      return pEmail === payerClean;
    }
    return p.name.trim().toLowerCase() === payerClean;
  });
  const payerEmail = payerParticipant?.email?.trim().toLowerCase() || (payerClean.includes("@") ? payerClean : undefined);

  // Determine if the current viewer is the payer
  const isPayerCurrentUser = Boolean(
    currentUser
      ? (currentUserId && row.user_id === currentUserId && row.paid_by_current_user) ||
        (payerEmail
          ? Boolean(normCurrentEmail && payerEmail === normCurrentEmail)
          : Boolean(normCurrentName && payerClean === normCurrentName))
      : row.paid_by_current_user,
  );

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    title: row.title,
    date: row.date,
    category: row.category,
    totalAmount: Number(row.total_amount),
    paidBy: row.paid_by,
    paidByCurrentUser: isPayerCurrentUser,
    payerAccountId: row.payer_account_id ?? undefined,
    linkedTransactionId: row.linked_transaction_id ?? undefined,
    splitMethod: row.split_method,
    notes: row.notes ?? undefined,
    tax: row.tax ? Number(row.tax) : undefined,
    tip: row.tip ? Number(row.tip) : undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    participants: participants.map((p) => ({
      id: p.id,
      userId: p.user_id ?? undefined,
      name: p.name,
      email: p.email ?? undefined,
      isCurrentUser: isCurrent(p.name, p.email, p.user_id, p.is_current_user),
      shareAmount: Number(p.share_amount),
      percentage: p.percentage ? Number(p.percentage) : undefined,
      shares: p.shares ? Number(p.shares) : undefined,
      status: p.status,
      settledAt: p.settled_at ?? undefined,
    })),
    items: items.map((it) => ({
      id: it.id,
      name: it.name,
      amount: Number(it.amount),
      assignedTo: it.assigned_to || [],
    })),
  };
}

export function splitBillToRow(
  bill: SplitBill,
  userId?: string | null,
): {
  bill: SplitBillRow;
  participants: SplitBillParticipantRow[];
  items: SplitBillItemRow[];
} {
  const billRow: SplitBillRow = {
    id: bill.id,
    user_id: userId ?? bill.userId ?? null,
    title: bill.title,
    date: bill.date,
    category: bill.category,
    total_amount: bill.totalAmount,
    paid_by: bill.paidBy,
    paid_by_current_user: bill.paidByCurrentUser,
    payer_account_id: bill.payerAccountId ?? null,
    linked_transaction_id: bill.linkedTransactionId ?? null,
    split_method: bill.splitMethod,
    notes: bill.notes ?? null,
    tax: bill.tax ?? 0,
    tip: bill.tip ?? 0,
    status: bill.status,
    created_at: bill.createdAt,
    updated_at: bill.updatedAt || new Date().toISOString(),
  };

  const participantRows: SplitBillParticipantRow[] = bill.participants.map(
    (p) => ({
      id: p.id,
      bill_id: bill.id,
      user_id: p.userId ?? (p.isCurrentUser ? (userId ?? null) : null),
      name: p.name,
      email: p.email ?? null,
      is_current_user: p.isCurrentUser,
      share_amount: p.shareAmount,
      percentage: p.percentage ?? null,
      shares: p.shares ?? null,
      status: p.status,
      settled_at: p.settledAt ?? null,
    }),
  );

  const itemRows: SplitBillItemRow[] = (bill.items || []).map((it) => ({
    id: it.id,
    bill_id: bill.id,
    name: it.name,
    amount: it.amount,
    assigned_to: it.assignedTo || [],
  }));

  return { bill: billRow, participants: participantRows, items: itemRows };
}

export function friendFromRow(row: FriendRow): Friend {
  return {
    id: row.id,
    userId: row.friend_user_id ?? undefined,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function friendToRow(friend: Friend, currentUserId: string): FriendRow {
  return {
    id: friend.id,
    user_id: currentUserId,
    friend_user_id: friend.userId ?? null,
    name: friend.name,
    email: friend.email,
    avatar_url: friend.avatarUrl ?? null,
    status: friend.status || "accepted",
    created_at: friend.createdAt || new Date().toISOString(),
    updated_at: friend.updatedAt || new Date().toISOString(),
  };
}

export function profileFromRow(row: ProfileRow): FinancialProfile {
  return {
    name: row.name,
    email: row.email || "",
    currencySymbol: row.currency_symbol,
    currencyCode: row.currency_code,
    monthlySavingsTarget: Number(row.monthly_savings_target),
  };
}

export function profileToRow(
  profile: FinancialProfile,
  userId?: string | null,
): Partial<ProfileRow> {
  return {
    user_id: userId ?? null,
    name: profile.name,
    email: profile.email || null,
    currency_symbol: profile.currencySymbol,
    currency_code: profile.currencyCode,
    monthly_savings_target: profile.monthlySavingsTarget,
    updated_at: new Date().toISOString(),
  };
}
