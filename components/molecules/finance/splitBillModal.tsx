"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Add01Icon, CheckmarkCircle02Icon, Delete02Icon, UserIcon } from "hugeicons-react";

import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import {
  Field,
  NativeSelect,
  Switch,
  TextArea,
  TextInput,
} from "@/components/molecules/inputs/form";
import { Buttons } from "@/components/atoms/buttons";
import { PillTabs } from "@/components/atoms/pillTabs";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  EXPENSE_CATEGORIES,
  Friend,
  SplitBill,
  SplitItem,
  SplitMethod,
  SplitParticipant,
} from "@/types/finance";
import { useCurrency } from "@/lib/currency";
import { matchesParticipant } from "@/lib/splitBillCalculations";

interface SplitBillModalProps {
  open: boolean;
  onClose: () => void;
  billToEdit?: SplitBill | null;
}

interface ParticipantDraft {
  id: string;
  userId?: string;
  name: string;
  email: string;
  isCurrentUser: boolean;
  exactAmount: string;
  percentage: string;
  shares: string;
}

interface ItemDraft {
  id: string;
  name: string;
  amount: string;
  assignedTo: string[];
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

export function SplitBillModal({
  open,
  onClose,
  billToEdit,
}: SplitBillModalProps) {
  const isEditing = Boolean(billToEdit);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Split Bill" : "Create Split Bill"}
      description={
        isEditing
          ? "Update details, participants, or allocations for this shared bill."
          : "Divide an expense among friends, roommates, or team members."
      }
      size="lg"
    >
      <SplitBillForm
        key={open ? (billToEdit?.id ?? "new-split-bill") : "closed"}
        billToEdit={billToEdit}
        onClose={onClose}
      />
    </DialogShell>
  );
}

function SplitBillForm({
  billToEdit,
  onClose,
}: {
  billToEdit?: SplitBill | null;
  onClose: () => void;
}) {
  const accounts = useFinanceStore((s) => s.accounts);
  const profile = useFinanceStore((s) => s.profile);
  const friends = useFinanceStore((s) => s.friends);
  const addFriend = useFinanceStore((s) => s.addFriend);
  const addSplitBill = useFinanceStore((s) => s.addSplitBill);
  const updateSplitBill = useFinanceStore((s) => s.updateSplitBill);

  const isEditing = Boolean(billToEdit);
  const { format, symbol } = useCurrency();
  const currentUserName = profile.name || "Alex Morgan";

  // Form Fields
  const [title, setTitle] = useState(() => billToEdit?.title ?? "");
  const [date, setDate] = useState(
    () => billToEdit?.date ?? new Date().toISOString().split("T")[0],
  );
  const [category, setCategory] = useState(
    () => billToEdit?.category ?? EXPENSE_CATEGORIES[4], // Dining Out & Entertainment
  );
  const [rawTotalAmount, setRawTotalAmount] = useState(() =>
    billToEdit ? String(billToEdit.totalAmount) : "",
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    () => billToEdit?.splitMethod ?? "equal",
  );
  const [payerType, setPayerType] = useState<"you" | "other">(() =>
    billToEdit ? (billToEdit.paidByCurrentUser ? "you" : "other") : "you",
  );
  const [otherPayerName, setOtherPayerName] = useState(() =>
    billToEdit && !billToEdit.paidByCurrentUser ? billToEdit.paidBy : "",
  );
  const [selectedFriendPayerId, setSelectedFriendPayerId] = useState<string>(() => {
    if (billToEdit && !billToEdit.paidByCurrentUser) {
      const payerParticipant = billToEdit.participants.find(
        (p) => !p.isCurrentUser && p.status === "paid",
      );
      const payerEmail = payerParticipant?.email || (billToEdit.paidBy.includes("@") ? billToEdit.paidBy : undefined);
      const f = friends.find((fr) =>
        matchesParticipant(
          { name: billToEdit.paidBy, email: payerEmail, userId: payerParticipant?.userId },
          { name: fr.name, email: fr.email, userId: fr.userId },
        ),
      );
      return f?.id || "";
    }
    return "";
  });
  const [otherPayerEmail, setOtherPayerEmail] = useState(() => {
    if (billToEdit && !billToEdit.paidByCurrentUser) {
      const payerParticipant = billToEdit.participants.find(
        (p) => !p.isCurrentUser && p.status === "paid",
      );
      return payerParticipant?.email || (billToEdit.paidBy.includes("@") ? billToEdit.paidBy : "");
    }
    return "";
  });
  const [payerAccountId, setPayerAccountId] = useState(
    () => billToEdit?.payerAccountId ?? "",
  );
  const [recordExpenseTx, setRecordExpenseTx] = useState(
    () => Boolean(billToEdit?.payerAccountId && billToEdit?.linkedTransactionId),
  );
  const [notes, setNotes] = useState(() => billToEdit?.notes ?? "");

  // Participants
  const [participants, setParticipants] = useState<ParticipantDraft[]>(() => {
    if (billToEdit && billToEdit.participants.length > 0) {
      return billToEdit.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.email ?? "",
        isCurrentUser: p.isCurrentUser,
        exactAmount: String(p.shareAmount),
        percentage: p.percentage ? String(p.percentage) : "",
        shares: p.shares ? String(p.shares) : "1",
      }));
    }
    return [
      {
        id: "p-me",
        name: currentUserName,
        email: profile.email || "",
        isCurrentUser: true,
        exactAmount: "",
        percentage: "50",
        shares: "1",
      },
      {
        id: `p-${Date.now()}-1`,
        name: "",
        email: "",
        isCurrentUser: false,
        exactAmount: "",
        percentage: "50",
        shares: "1",
      },
    ];
  });

  // Friends not yet added to this bill
  const availableFriends = useMemo(() => {
    const participantEmails = new Set(
      participants
        .map((p) => p.email.trim().toLowerCase())
        .filter(Boolean),
    );
    const participantNames = new Set(
      participants.map((p) => p.name.trim().toLowerCase()).filter(Boolean),
    );
    const participantUserIds = new Set(
      participants.map((p) => p.userId).filter(Boolean),
    );

    return friends.filter((f) => {
      if (f.userId && participantUserIds.has(f.userId)) return false;
      const fEmail = f.email?.trim().toLowerCase();
      if (fEmail) {
        return !participantEmails.has(fEmail);
      }
      return !participantNames.has(f.name.trim().toLowerCase());
    });
  }, [friends, participants]);

  const handleAddFriendAsParticipant = (friend: Friend) => {
    const newId = generateId("p");
    const newDraft: ParticipantDraft = {
      id: newId,
      userId: friend.userId,
      name: friend.name,
      email: friend.email,
      isCurrentUser: false,
      exactAmount: "",
      percentage: "0",
      shares: "1",
    };
    setParticipants((prev) => [...prev, newDraft]);
    toast.success(`Added ${friend.name} to bill`);
  };

  const handleSelectFriendAsPayer = (friendId: string) => {
    if (!friendId) {
      setSelectedFriendPayerId("");
      setOtherPayerName("");
      setOtherPayerEmail("");
      return;
    }
    const friend = friends.find((f) => f.id === friendId);
    if (!friend) return;

    setSelectedFriendPayerId(friendId);
    setOtherPayerName(friend.name);
    setOtherPayerEmail(friend.email || "");

    // Also ensure the friend is added as a participant if not already present
    const alreadyParticipant = participants.some((p) =>
      matchesParticipant(
        { name: p.name, email: p.email, userId: p.userId },
        { name: friend.name, email: friend.email, userId: friend.userId },
      ),
    );
    if (!alreadyParticipant) {
      handleAddFriendAsParticipant(friend);
    }
  };

  const handleSelectFriendForParticipant = (participantId: string, friendId: string) => {
    const selected = friends.find((f) => f.id === friendId);
    if (!selected) return;
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId
          ? {
              ...p,
              userId: selected.userId,
              name: selected.name,
              email: selected.email,
            }
          : p,
      ),
    );
  };

  const handleSaveParticipantAsFriend = (p: ParticipantDraft) => {
    if (!p.name.trim() || !p.email.trim()) {
      toast.error("Both name and email are required to save as friend");
      return;
    }
    const cleanEmail = p.email.trim().toLowerCase();
    const existing = friends.find((f) => f.email.toLowerCase() === cleanEmail);
    if (existing) {
      toast.error("This friend is already saved");
      return;
    }
    const newFriend = addFriend({
      userId: p.userId,
      name: p.name.trim(),
      email: cleanEmail,
      status: "accepted",
    });
    if (newFriend.userId) {
      setParticipants((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, userId: newFriend.userId } : item,
        ),
      );
    }
    toast.success(`Saved ${p.name} to your friends!`);
  };

  // Itemized Fields
  const [items, setItems] = useState<ItemDraft[]>(() => {
    if (billToEdit?.items && billToEdit.items.length > 0) {
      return billToEdit.items.map((it) => ({
        id: it.id,
        name: it.name,
        amount: String(it.amount),
        assignedTo: it.assignedTo,
      }));
    }
    return [
      {
        id: `item-${Date.now()}-1`,
        name: "",
        amount: "",
        assignedTo: ["p-me"],
      },
    ];
  });
  const [tax, setTax] = useState(() =>
    billToEdit?.tax ? String(billToEdit.tax) : "",
  );
  const [tip, setTip] = useState(() =>
    billToEdit?.tip ? String(billToEdit.tip) : "",
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Computed Itemized Sum
  const itemizedTotal = useMemo(() => {
    const itemsSum = items.reduce((sum, item) => {
      const val = parseFloat(item.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const taxVal = parseFloat(tax) || 0;
    const tipVal = parseFloat(tip) || 0;
    return Math.round((itemsSum + taxVal + tipVal) * 100) / 100;
  }, [items, tax, tip]);

  // Effective Total based on method
  const effectiveTotal =
    splitMethod === "itemized" ? itemizedTotal : parseFloat(rawTotalAmount) || 0;

  // Participants management
  const handleAddParticipant = () => {
    const newId = generateId("p");
    const newDraft: ParticipantDraft = {
      id: newId,
      name: "",
      email: "",
      isCurrentUser: false,
      exactAmount: "",
      percentage: "0",
      shares: "1",
    };
    setParticipants((prev) => [...prev, newDraft]);
  };

  const handleRemoveParticipant = (id: string) => {
    if (participants.length <= 2) {
      toast.error("At least two participants are required to split a bill");
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    // Also remove from any itemized items
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((pId) => pId !== id),
      })),
    );
  };

  const updateParticipant = (
    id: string,
    field: keyof ParticipantDraft,
    value: string | boolean,
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  // Itemized management
  const handleAddItem = () => {
    const allParticipantIds = participants.map((p) => p.id);
    setItems((prev) => [
      ...prev,
      {
        id: generateId("item"),
        name: "",
        amount: "",
        assignedTo: allParticipantIds,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("At least one item is required for an itemized bill");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof ItemDraft,
    value: string | string[],
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );
  };

  const toggleItemAssignment = (itemId: string, participantId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const exists = it.assignedTo.includes(participantId);
        const assignedTo = exists
          ? it.assignedTo.filter((p) => p !== participantId)
          : [...it.assignedTo, participantId];
        return { ...it, assignedTo };
      }),
    );
  };

  // Compute live breakdown based on current split method
  const computedBreakdown = useMemo(() => {
    const total = effectiveTotal;
    const count = participants.length;
    if (count === 0 || total <= 0) return [];

    if (splitMethod === "equal") {
      const baseShare = Math.floor((total / count) * 100) / 100;
      const remainder = Math.round((total - baseShare * count) * 100) / 100;
      return participants.map((p, idx) => {
        const share = idx === 0 ? baseShare + remainder : baseShare;
        return {
          ...p,
          calculatedShare: Math.round(share * 100) / 100,
        };
      });
    }

    if (splitMethod === "exact") {
      return participants.map((p) => {
        const amt = parseFloat(p.exactAmount) || 0;
        return {
          ...p,
          calculatedShare: amt,
        };
      });
    }

    if (splitMethod === "percentage") {
      return participants.map((p) => {
        const pct = parseFloat(p.percentage) || 0;
        const share = Math.round(((total * pct) / 100) * 100) / 100;
        return {
          ...p,
          calculatedShare: share,
        };
      });
    }

    if (splitMethod === "shares") {
      const totalShares = participants.reduce((sum, p) => {
        const sh = parseFloat(p.shares) || 1;
        return sum + sh;
      }, 0);
      return participants.map((p) => {
        const sh = parseFloat(p.shares) || 1;
        const share =
          totalShares > 0
            ? Math.round(((total * sh) / totalShares) * 100) / 100
            : 0;
        return {
          ...p,
          calculatedShare: share,
        };
      });
    }

    if (splitMethod === "itemized") {
      const itemsSum = items.reduce(
        (sum, it) => sum + (parseFloat(it.amount) || 0),
        0,
      );
      const taxVal = parseFloat(tax) || 0;
      const tipVal = parseFloat(tip) || 0;
      const extra = taxVal + tipVal;

      return participants.map((p) => {
        let personalItemSum = 0;
        for (const it of items) {
          const itAmt = parseFloat(it.amount) || 0;
          if (it.assignedTo.includes(p.id) && it.assignedTo.length > 0) {
            personalItemSum += itAmt / it.assignedTo.length;
          }
        }
        const ratio = itemsSum > 0 ? personalItemSum / itemsSum : 1 / count;
        const shareWithTaxTip = personalItemSum + ratio * extra;
        return {
          ...p,
          calculatedShare: Math.round(shareWithTaxTip * 100) / 100,
        };
      });
    }

    return [];
  }, [effectiveTotal, participants, splitMethod, items, tax, tip]);

  // Validation details for exact / percentage
  const sumOfCalculated = computedBreakdown.reduce(
    (sum, p) => sum + p.calculatedShare,
    0,
  );
  const exactDifference =
    Math.round((effectiveTotal - sumOfCalculated) * 100) / 100;
  const totalPercentage = participants.reduce(
    (sum, p) => sum + (parseFloat(p.percentage) || 0),
    0,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = "Bill title is required";
    }
    const numTotal = effectiveTotal;
    if (numTotal <= 0) {
      newErrors.totalAmount = "Please enter a valid total amount greater than 0";
    }
    if (payerType === "other" && !otherPayerName.trim()) {
      newErrors.otherPayerName = "Please enter who paid the bill";
    }

    // Check participants have names
    const emptyName = participants.some((p) => !p.name.trim());
    if (emptyName) {
      newErrors.participants = "All participants must have a name";
    }

    // Validate methods
    if (splitMethod === "exact" && Math.abs(exactDifference) > 0.01) {
      newErrors.exact = `The sum of shares (${format(sumOfCalculated)}) must equal total bill (${format(numTotal)}). Difference: ${format(exactDifference)}`;
    }

    if (splitMethod === "percentage" && Math.abs(totalPercentage - 100) > 0.5) {
      newErrors.percentage = `Percentages must sum to 100%. Current total: ${totalPercentage}%`;
    }

    if (splitMethod === "itemized") {
      const emptyItem = items.some(
        (it) =>
          !it.name.trim() ||
          isNaN(parseFloat(it.amount)) ||
          parseFloat(it.amount) <= 0,
      );
      if (emptyItem) {
        newErrors.items = "Please enter valid names and amounts for all items";
      }
      const unassigned = items.some((it) => it.assignedTo.length === 0);
      if (unassigned) {
        newErrors.items = "Each item must be assigned to at least one person";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const paidBy = payerType === "you" ? currentUserName : otherPayerName.trim();
    const paidByCurrentUser = payerType === "you";
    const payerCleanEmail = payerType === "you" ? (profile.email || "") : otherPayerEmail.trim();

    const payerTarget = {
      name: paidBy,
      email: payerCleanEmail || (paidBy.includes("@") ? paidBy : undefined),
    };

    // Build final participants list
    const finalParticipants: SplitParticipant[] = computedBreakdown.map((p) => {
      const existing = billToEdit?.participants.find((ep) => ep.id === p.id);
      const isPayer = paidByCurrentUser
        ? p.isCurrentUser
        : matchesParticipant(
            { name: p.name, email: p.email, userId: p.userId },
            payerTarget,
          );
      const initialStatus = isPayer ? "paid" : existing?.status ?? "unpaid";

      const matchingFriend = friends.find((f) =>
        matchesParticipant(
          { name: p.name, email: p.email, userId: p.userId },
          { name: f.name, email: f.email, userId: f.userId },
        ),
      );

      const effectiveEmail =
        p.email.trim() ||
        (isPayer && payerCleanEmail ? payerCleanEmail : matchingFriend?.email) ||
        undefined;

      return {
        id: p.id,
        userId: p.userId || matchingFriend?.userId,
        name: p.name.trim(),
        email: effectiveEmail,
        isCurrentUser: p.isCurrentUser,
        shareAmount: p.calculatedShare,
        percentage:
          splitMethod === "percentage"
            ? parseFloat(p.percentage) || 0
            : undefined,
        shares:
          splitMethod === "shares" ? parseFloat(p.shares) || 1 : undefined,
        status: initialStatus,
        settledAt:
          initialStatus === "paid"
            ? existing?.settledAt ?? new Date().toISOString()
            : undefined,
      };
    });

    // Determine initial bill status
    const nonPayerParticipants = finalParticipants.filter((p) =>
      paidByCurrentUser
        ? !p.isCurrentUser
        : !matchesParticipant(
            { name: p.name, email: p.email, userId: p.userId },
            payerTarget,
          ),
    );
    const allPaid =
      nonPayerParticipants.length > 0 &&
      nonPayerParticipants.every((p) => p.status === "paid");
    const anyPaid = nonPayerParticipants.some((p) => p.status === "paid");
    const billStatus = allPaid ? "settled" : anyPaid ? "partial" : "pending";

    // Itemized data
    const finalItems: SplitItem[] | undefined =
      splitMethod === "itemized"
        ? items.map((it) => ({
            id: it.id,
            name: it.name.trim(),
            amount: parseFloat(it.amount) || 0,
            assignedTo: it.assignedTo,
          }))
        : undefined;

    const effectivePayerAccountId =
      paidByCurrentUser && recordExpenseTx && payerAccountId.trim()
        ? payerAccountId.trim()
        : undefined;

    if (isEditing && billToEdit) {
      updateSplitBill(billToEdit.id, {
        title: title.trim(),
        date,
        category,
        totalAmount: numTotal,
        paidBy,
        paidByCurrentUser,
        payerAccountId: effectivePayerAccountId,
        splitMethod,
        notes: notes.trim() || undefined,
        participants: finalParticipants,
        items: finalItems,
        tax: tax ? parseFloat(tax) : undefined,
        tip: tip ? parseFloat(tip) : undefined,
        status: billStatus,
      });
      toast.success("Split bill updated successfully");
    } else {
      addSplitBill(
        {
          title: title.trim(),
          date,
          category,
          totalAmount: numTotal,
          paidBy,
          paidByCurrentUser,
          payerAccountId: effectivePayerAccountId,
          splitMethod,
          notes: notes.trim() || undefined,
          participants: finalParticipants,
          items: finalItems,
          tax: tax ? parseFloat(tax) : undefined,
          tip: tip ? parseFloat(tip) : undefined,
          status: billStatus,
        },
        effectivePayerAccountId
          ? { accountId: effectivePayerAccountId }
          : undefined,
      );
      toast.success("Split bill created successfully");
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── 1. Basic Info ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Bill Title" required error={errors.title}>
          <TextInput
            placeholder="e.g. Dinner at Osteria, Cabin Rental"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            invalid={Boolean(errors.title)}
          />
        </Field>

        <Field label="Date" required error={errors.date}>
          <TextInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" required>
          <NativeSelect
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field
          label={`Total Bill Amount (${symbol})`}
          required
          error={errors.totalAmount}
          hint={
            splitMethod === "itemized"
              ? "Calculated from receipt items + tax & tip below"
              : undefined
          }
        >
          <TextInput
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={
              splitMethod === "itemized"
                ? effectiveTotal.toFixed(2)
                : rawTotalAmount
            }
            onChange={(e) => setRawTotalAmount(e.target.value)}
            readOnly={splitMethod === "itemized"}
            invalid={Boolean(errors.totalAmount)}
          />
        </Field>
      </div>

      {/* ── 2. Who Paid ── */}
      <div className="rounded-xl border border-xenia-border bg-xenia-sand-100/30 p-4 space-y-3">
        <span className="block text-xs font-medium uppercase tracking-wide text-xenia-stone-500">
          Who Paid the Bill?
        </span>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-xenia-ink-900 cursor-pointer">
            <input
              type="radio"
              name="payerType"
              checked={payerType === "you"}
              onChange={() => {
                setPayerType("you");
                setSelectedFriendPayerId("");
              }}
              className="text-xenia-moss-600 focus:ring-xenia-moss-600"
            />
            <span>You paid ({currentUserName})</span>
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-xenia-ink-900 cursor-pointer">
            <input
              type="radio"
              name="payerType"
              checked={payerType === "other"}
              onChange={() => setPayerType("other")}
              className="text-xenia-moss-600 focus:ring-xenia-moss-600"
            />
            <span>Someone else paid</span>
          </label>
        </div>

        {payerType === "other" && (
          <div className="pt-2 space-y-3">
            {friends.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-xenia-stone-700 mb-1.5">
                  Select Friend as Payer
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {friends.map((fr) => {
                    const isSelected = selectedFriendPayerId === fr.id;
                    return (
                      <button
                        key={fr.id}
                        type="button"
                        onClick={() => handleSelectFriendAsPayer(isSelected ? "" : fr.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-xenia-moss-600 text-white border-xenia-moss-600 shadow-2xs"
                            : "bg-white text-xenia-stone-700 border-xenia-border hover:border-xenia-moss-600/40 hover:bg-xenia-sand-50"
                        }`}
                      >
                        <UserIcon
                          size={12}
                          className={isSelected ? "text-white" : "text-xenia-stone-400"}
                        />
                        <span>{fr.name}</span>
                        {fr.email && (
                          <span
                            className={`text-[10px] ${
                              isSelected ? "text-white/80" : "text-xenia-stone-400"
                            }`}
                          >
                            ({fr.email})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Payer's Name"
                required
                error={errors.otherPayerName}
                hint="Name of the person who paid"
              >
                <TextInput
                  placeholder="e.g. Marcus Vance"
                  value={otherPayerName}
                  onChange={(e) => {
                    setOtherPayerName(e.target.value);
                    if (selectedFriendPayerId) setSelectedFriendPayerId("");
                  }}
                  invalid={Boolean(errors.otherPayerName)}
                />
              </Field>

              <Field
                label="Payer's Email"
                hint="Optional — used for exact participant matching"
              >
                <TextInput
                  type="email"
                  placeholder="e.g. marcus.v@gmail.com"
                  value={otherPayerEmail}
                  onChange={(e) => {
                    setOtherPayerEmail(e.target.value);
                    if (selectedFriendPayerId) setSelectedFriendPayerId("");
                  }}
                />
              </Field>
            </div>
          </div>
        )}

        {payerType === "you" && !isEditing && (
          <div className="pt-2 space-y-3 border-t border-xenia-divider">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-xenia-ink-900">
                  Record as Expense in Transactions (Optional)
                </p>
                <p className="text-[11px] text-xenia-stone-500">
                  {accounts.length > 0
                    ? "Optionally deduct total amount from one of your financial accounts"
                    : "No accounts created. Split bills work independently without accounts."}
                </p>
              </div>
              {accounts.length > 0 && (
                <Switch
                  checked={recordExpenseTx}
                  onChange={setRecordExpenseTx}
                  aria-label="Record expense"
                />
              )}
            </div>

            {recordExpenseTx && accounts.length > 0 && (
              <Field label="Paid From Account (Optional)">
                <NativeSelect
                  value={payerAccountId}
                  onChange={(e) => setPayerAccountId(e.target.value)}
                >
                  <option value="">None (Don&apos;t link to an account)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution}) - Balance:{" "}
                      {format(acc.balance)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
        )}
      </div>

      {/* ── 3. Split Method Selector ── */}
      <div className="space-y-2">
        <span className="block text-xs font-medium uppercase tracking-wide text-xenia-stone-500">
          Split Method
        </span>
        <PillTabs
          options={[
            { value: "equal", label: "Equal" },
            { value: "exact", label: "Exact" },
            { value: "percentage", label: "Percentage" },
            { value: "shares", label: "Shares" },
            { value: "itemized", label: "Itemized Receipt" },
          ]}
          value={splitMethod}
          onChange={(val) => setSplitMethod(val as SplitMethod)}
        />
      </div>

      {/* ── 4. Itemized Receipt Builder (if itemized) ── */}
      {splitMethod === "itemized" && (
        <div className="rounded-xl border border-xenia-border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-xenia-ink-900">
                Receipt Items
              </p>
              <p className="text-xs text-xenia-stone-500">
                Add line items and assign who ordered what
              </p>
            </div>
            <Buttons
              style="second"
              size="sm"
              icon={<Add01Icon size={14} />}
              onClick={handleAddItem}
            >
              Add Item
            </Buttons>
          </div>

          {errors.items && (
            <p className="text-xs text-xenia-danger">{errors.items}</p>
          )}

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-lg border border-xenia-divider p-3 space-y-2.5 bg-xenia-sand-50"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <TextInput
                      placeholder={`Item #${idx + 1} (e.g. Truffle Pasta)`}
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, "name", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-24 sm:w-28 shrink-0">
                    <TextInput
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) =>
                        updateItem(item.id, "amount", e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 rounded text-xenia-stone-400 hover:text-xenia-danger hover:bg-xenia-danger-soft transition-colors cursor-pointer shrink-0"
                    title="Remove item"
                  >
                    <Delete02Icon size={16} />
                  </button>
                </div>

                {/* Participant badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-xenia-stone-500 mr-1">
                    Assigned to:
                  </span>
                  {participants.map((p) => {
                    const isSelected = item.assignedTo.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleItemAssignment(item.id, p.id)}
                        className={`px-2 py-0.5 rounded-full text-xs transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-xenia-moss-600 text-white border-xenia-moss-600"
                            : "bg-white text-xenia-stone-600 border-xenia-border hover:border-xenia-stone-400"
                        }`}
                      >
                        {p.name.trim() ||
                          (p.isCurrentUser ? "You" : "Participant")}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Tax & Tip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-xenia-divider">
            <Field label={`Tax (${symbol})`} hint="Distributed proportionally">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </Field>
            <Field label={`Tip / Service (${symbol})`} hint="Distributed proportionally">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}

      {/* ── 5. Participants & Shares ── */}
      <div className="rounded-xl border border-xenia-border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-xenia-ink-900">
              Participants ({participants.length})
            </p>
            <p className="text-xs text-xenia-stone-500">
              Specify who is splitting this bill
            </p>
          </div>
          <Buttons
            style="second"
            size="sm"
            icon={<Add01Icon size={14} />}
            onClick={handleAddParticipant}
          >
            Add Person
          </Buttons>
        </div>

        {errors.participants && (
          <p className="text-xs text-xenia-danger">{errors.participants}</p>
        )}
        {errors.exact && (
          <p className="text-xs text-xenia-danger">{errors.exact}</p>
        )}
        {errors.percentage && (
          <p className="text-xs text-xenia-danger">{errors.percentage}</p>
        )}

        {availableFriends.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-xenia-sand-50 border border-xenia-border/60">
            <span className="text-[11px] font-medium text-xenia-stone-500">
              Add Friend:
            </span>
            {availableFriends.map((fr) => (
              <button
                key={fr.id}
                type="button"
                onClick={() => handleAddFriendAsParticipant(fr)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-white hover:bg-xenia-moss-50 hover:text-xenia-moss-700 hover:border-xenia-moss-600 text-xenia-ink-900 border border-xenia-border transition-colors cursor-pointer font-medium"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-xenia-moss-600" />
                <span>{fr.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {computedBreakdown.map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 rounded-lg border border-xenia-divider p-2.5 bg-xenia-sand-50/60"
            >
              {/* Row 1 on mobile: Avatar, Name & Email, and Mobile Delete Button */}
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-xenia-sand-100 text-xenia-stone-600 shrink-0 mt-0.5">
                  <UserIcon size={16} />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <TextInput
                        placeholder={p.isCurrentUser ? "Your Name" : "Friend's Name"}
                        value={p.name}
                        onChange={(e) =>
                          updateParticipant(p.id, "name", e.target.value)
                        }
                        className="text-xs py-1.5"
                      />
                    </div>
                    {!p.isCurrentUser && friends.length > 0 && (
                      <select
                        aria-label="Select from friends"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectFriendForParticipant(p.id, e.target.value);
                          }
                        }}
                        className="text-[11px] py-1.5 px-2 rounded-lg border border-xenia-border bg-white text-xenia-stone-600 hover:text-xenia-ink-900 hover:border-xenia-moss-600 cursor-pointer shrink-0 max-w-[120px] truncate"
                      >
                        <option value="">Friend...</option>
                        {friends.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!p.isCurrentUser && (
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        placeholder="Email (optional, shares bill with user)"
                        value={p.email}
                        onChange={(e) =>
                          updateParticipant(p.id, "email", e.target.value)
                        }
                        className="text-[11px] px-2.5 py-1 rounded-md border border-xenia-divider bg-white text-xenia-stone-600 placeholder:text-xenia-stone-400 focus:outline-none focus:border-xenia-moss-600 w-full"
                      />
                      {p.email && friends.some((f) => f.email.toLowerCase() === p.email.trim().toLowerCase()) ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-xenia-moss-700 bg-xenia-moss-100/70 px-1.5 py-0.5 rounded shrink-0">
                          <CheckmarkCircle02Icon size={12} />
                          Friend
                        </span>
                      ) : p.email.trim() && p.name.trim() ? (
                        <button
                          type="button"
                          onClick={() => handleSaveParticipantAsFriend(p)}
                          className="text-[10px] font-medium text-xenia-moss-700 hover:text-xenia-moss-800 hover:underline shrink-0 cursor-pointer"
                        >
                          + Save Friend
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {!p.isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="sm:hidden p-1.5 rounded text-xenia-stone-400 hover:text-xenia-danger hover:bg-xenia-danger-soft transition-colors cursor-pointer shrink-0 mt-0.5"
                    title="Remove person"
                  >
                    <Delete02Icon size={16} />
                  </button>
                )}
              </div>

              {/* Row 2 on mobile / Inline on desktop: Method Input + Calculated Share + Desktop Delete Button */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t border-xenia-divider/60 sm:border-0">
                {/* Input for Exact Method */}
                {splitMethod === "exact" && (
                  <div className="w-28">
                    <TextInput
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Amount (${symbol})`}
                      value={p.exactAmount}
                      onChange={(e) =>
                        updateParticipant(p.id, "exactAmount", e.target.value)
                      }
                      className="text-xs py-1.5 text-right font-mono"
                    />
                  </div>
                )}

                {/* Input for Percentage Method */}
                {splitMethod === "percentage" && (
                  <div className="w-24">
                    <div className="relative">
                      <TextInput
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        placeholder="%"
                        value={p.percentage}
                        onChange={(e) =>
                          updateParticipant(p.id, "percentage", e.target.value)
                        }
                        className="text-xs py-1.5 pr-6 text-right font-mono"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-xenia-stone-400">
                        %
                      </span>
                    </div>
                  </div>
                )}

                {/* Input for Shares Method */}
                {splitMethod === "shares" && (
                  <div className="w-24">
                    <div className="relative">
                      <TextInput
                        type="number"
                        step="1"
                        min="1"
                        placeholder="Shares"
                        value={p.shares}
                        onChange={(e) =>
                          updateParticipant(p.id, "shares", e.target.value)
                        }
                        className="text-xs py-1.5 pr-8 text-right font-mono"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-xenia-stone-400">
                        share
                      </span>
                    </div>
                  </div>
                )}

                {/* Calculated Share display */}
                <div className="w-28 text-right shrink-0">
                  <span className="font-mono text-xs font-semibold text-xenia-ink-900">
                    {format(p.calculatedShare)}
                  </span>
                  <p className="text-[10px] text-xenia-stone-400">
                    {p.isCurrentUser ? "Your share" : "Their share"}
                  </p>
                </div>

                {/* Desktop delete button */}
                {!p.isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="hidden sm:block p-1 rounded text-xenia-stone-400 hover:text-xenia-danger hover:bg-xenia-danger-soft transition-colors cursor-pointer shrink-0"
                    title="Remove person"
                  >
                    <Delete02Icon size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live Balance Difference Footer */}
        {splitMethod === "exact" && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-xenia-stone-500">
              Allocated: {format(sumOfCalculated)} of {format(effectiveTotal)}
            </span>
            <span
              className={`font-medium ${
                Math.abs(exactDifference) < 0.01
                  ? "text-xenia-moss-600"
                  : "text-xenia-danger"
              }`}
            >
              {Math.abs(exactDifference) < 0.01
                ? "Exact Match ✓"
                : exactDifference > 0
                ? `${format(exactDifference)} remaining to assign`
                : `${format(Math.abs(exactDifference))} over allocated`}
            </span>
          </div>
        )}

        {splitMethod === "percentage" && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-xenia-stone-500">
              Total Percentage: {totalPercentage}%
            </span>
            <span
              className={`font-medium ${
                Math.abs(totalPercentage - 100) < 0.1
                  ? "text-xenia-moss-600"
                  : "text-xenia-danger"
              }`}
            >
              {Math.abs(totalPercentage - 100) < 0.1
                ? "100% Total ✓"
                : `${(100 - totalPercentage).toFixed(0)}% remaining`}
            </span>
          </div>
        )}
      </div>

      {/* ── 6. Notes ── */}
      <Field label="Notes (Optional)">
        <TextArea
          placeholder="Add details, Venmo/Zelle handles, or event description..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </Field>

      {/* ── Footer ── */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 border-t border-xenia-divider">
        <Buttons
          style="second"
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto justify-center"
        >
          Cancel
        </Buttons>
        <Buttons
          style="main"
          type="submit"
          className="w-full sm:w-auto justify-center"
        >
          {isEditing ? "Update Split Bill" : "Save Split Bill"}
        </Buttons>
      </div>
    </form>
  );
}
