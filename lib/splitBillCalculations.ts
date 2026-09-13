import {
  FinancialProfile,
  ParticipantBillDetail,
  ParticipantDebtDirection,
  ParticipantSummary,
  SplitBill,
} from "@/types/finance";

/**
 * Normalizes participant name for lookup and grouping.
 */
function normalizeKey(name: string, email?: string): string {
  if (email && email.trim()) {
    return email.trim().toLowerCase();
  }
  return name.trim().toLowerCase();
}

/**
 * Computes individual debt summaries and net balances for all friends/participants
 * across all split bills relative to the current user.
 */
export function computeParticipantSummaries(
  bills: SplitBill[],
  currentUserName: string = "Alex Morgan",
  currentUserEmail?: string,
): ParticipantSummary[] {
  const normCurrentName = currentUserName.trim().toLowerCase();
  const normCurrentEmail = currentUserEmail?.trim().toLowerCase();

  const isCurrent = (name: string, email?: string, isFlag?: boolean): boolean => {
    if (isFlag) return true;
    if (normCurrentEmail && email && email.trim().toLowerCase() === normCurrentEmail) {
      return true;
    }
    return name.trim().toLowerCase() === normCurrentName;
  };

  const map = new Map<
    string,
    {
      name: string;
      email?: string;
      owedToYou: number;
      youOweThem: number;
      totalHistoricalSpent: number;
      billsCountSet: Set<string>;
      unpaidBillsCountSet: Set<string>;
      bills: ParticipantBillDetail[];
    }
  >();

  const getOrCreate = (name: string, email?: string) => {
    const key = normalizeKey(name, email);
    if (!map.has(key)) {
      map.set(key, {
        name: name.trim(),
        email: email?.trim(),
        owedToYou: 0,
        youOweThem: 0,
        totalHistoricalSpent: 0,
        billsCountSet: new Set<string>(),
        unpaidBillsCountSet: new Set<string>(),
        bills: [],
      });
    }
    const entry = map.get(key)!;
    if (email && !entry.email) entry.email = email.trim();
    return entry;
  };

  for (const bill of bills) {
    const billPaidByMe = bill.paidByCurrentUser || isCurrent(bill.paidBy);
    const myParticipant = bill.participants.find((p) =>
      isCurrent(p.name, p.email, p.isCurrentUser),
    );

    if (billPaidByMe) {
      // Current user fronted the bill: check each participant's share
      for (const p of bill.participants) {
        if (isCurrent(p.name, p.email, p.isCurrentUser)) continue;

        const entry = getOrCreate(p.name, p.email);
        entry.billsCountSet.add(bill.id);
        entry.totalHistoricalSpent += p.shareAmount;

        let direction: ParticipantDebtDirection;
        if (p.status === "unpaid") {
          entry.owedToYou += p.shareAmount;
          entry.unpaidBillsCountSet.add(bill.id);
          direction = "they_owe_you";
        } else {
          direction = "settled_with_you";
        }

        entry.bills.push({
          billId: bill.id,
          billTitle: bill.title,
          date: bill.date,
          category: bill.category,
          shareAmount: p.shareAmount,
          status: p.status,
          direction,
          paidBy: bill.paidBy,
          paidByCurrentUser: true,
        });
      }
    } else {
      // Someone else fronted the bill
      const payerEntry = getOrCreate(bill.paidBy);
      payerEntry.billsCountSet.add(bill.id);

      if (myParticipant) {
        // Did current user pay their share to payer?
        let direction: ParticipantDebtDirection;
        if (myParticipant.status === "unpaid") {
          payerEntry.youOweThem += myParticipant.shareAmount;
          payerEntry.unpaidBillsCountSet.add(bill.id);
          direction = "you_owe_them";
        } else {
          direction = "settled_with_you";
        }

        payerEntry.bills.push({
          billId: bill.id,
          billTitle: bill.title,
          date: bill.date,
          category: bill.category,
          shareAmount: myParticipant.shareAmount,
          status: myParticipant.status,
          direction,
          paidBy: bill.paidBy,
          paidByCurrentUser: false,
        });
      }

      // Other participants in this bill
      for (const p of bill.participants) {
        if (isCurrent(p.name, p.email, p.isCurrentUser)) continue;
        if (normalizeKey(p.name, p.email) === normalizeKey(bill.paidBy)) continue;

        const entry = getOrCreate(p.name, p.email);
        entry.billsCountSet.add(bill.id);
        entry.totalHistoricalSpent += p.shareAmount;

        entry.bills.push({
          billId: bill.id,
          billTitle: bill.title,
          date: bill.date,
          category: bill.category,
          shareAmount: p.shareAmount,
          status: p.status,
          direction: "other_payer",
          paidBy: bill.paidBy,
          paidByCurrentUser: false,
        });
      }
    }
  }

  const summaries: ParticipantSummary[] = [];

  for (const [key, val] of map.entries()) {
    const owed = Math.round(val.owedToYou * 100) / 100;
    const youOwe = Math.round(val.youOweThem * 100) / 100;
    const net = Math.round((owed - youOwe) * 100) / 100;

    let status: "owes_you" | "you_owe" | "settled";
    if (net > 0.005) {
      status = "owes_you";
    } else if (net < -0.005) {
      status = "you_owe";
    } else {
      status = "settled";
    }

    // Sort bills latest date first
    const sortedBills = val.bills.sort((a, b) => b.date.localeCompare(a.date));

    summaries.push({
      id: key,
      name: val.name,
      email: val.email,
      owedToYou: owed,
      youOweThem: youOwe,
      netBalance: net,
      totalHistoricalSpent: Math.round(val.totalHistoricalSpent * 100) / 100,
      billsCount: val.billsCountSet.size,
      unpaidBillsCount: val.unpaidBillsCountSet.size,
      status,
      bills: sortedBills,
    });
  }

  // Sort summaries:
  // 1. Owes you (highest amount first)
  // 2. You owe (highest debt first)
  // 3. Settled alphabetically
  return summaries.sort((a, b) => {
    if (a.status === "owes_you" && b.status !== "owes_you") return -1;
    if (b.status === "owes_you" && a.status !== "owes_you") return 1;
    if (a.status === "you_owe" && b.status === "settled") return -1;
    if (b.status === "you_owe" && a.status === "settled") return 1;

    if (a.status === "owes_you" && b.status === "owes_you") {
      return b.netBalance - a.netBalance;
    }
    if (a.status === "you_owe" && b.status === "you_owe") {
      return a.netBalance - b.netBalance;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Generates a formatted, polite reminder message for WhatsApp / SMS / Email.
 */
export function generateParticipantReminder(
  participant: ParticipantSummary,
  formatCurrency: (amount: number) => string,
  userProfile?: FinancialProfile,
): string {
  const unpaidBills = participant.bills.filter(
    (b) => b.direction === "they_owe_you" && b.status === "unpaid",
  );

  const lines = [
    `Hi ${participant.name},`,
    "",
    unpaidBills.length === 1
      ? "Here is a quick reminder for your shared bill:"
      : `Here is a quick reminder for your ${unpaidBills.length} shared bills:`,
  ];

  for (const b of unpaidBills) {
    lines.push(`• ${b.billTitle} (${b.date}): ${formatCurrency(b.shareAmount)}`);
  }

  lines.push("");
  lines.push(`💰 Total outstanding: ${formatCurrency(participant.owedToYou)}`);

  if (userProfile?.name) {
    const contact = userProfile.email ? ` (${userProfile.email})` : "";
    lines.push(`💳 Please transfer to: ${userProfile.name}${contact}`);
  }

  lines.push("", "Thanks a lot!");

  return lines.join("\n");
}
