"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckmarkCircle02Icon,
  Mail01Icon,
  Search01Icon,
  UserAdd01Icon,
  UserIcon,
} from "hugeicons-react";

import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import { Field, TextInput } from "@/components/molecules/inputs/form";
import { Buttons } from "@/components/atoms/buttons";
import { PillTabs } from "@/components/atoms/pillTabs";
import { useFinanceStore } from "@/store/useFinanceStore";
import { searchRegisteredUsers } from "@/services/finance/finance.service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Friend } from "@/types/finance";

interface FriendModalProps {
  open: boolean;
  onClose: () => void;
  onFriendAdded?: (friend: Friend) => void;
}

export function FriendModal({ open, onClose, onFriendAdded }: FriendModalProps) {
  const friends = useFinanceStore((s) => s.friends);
  const profile = useFinanceStore((s) => s.profile);
  const addFriend = useFinanceStore((s) => s.addFriend);

  const supabaseActive = isSupabaseConfigured();
  const [tab, setTab] = useState<"search" | "manual">(() =>
    supabaseActive ? "search" : "manual",
  );

  // Manual Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // User Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; userId: string; name: string; email: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleClose = () => {
    setName("");
    setEmail("");
    setSearchQuery("");
    setSearchResults([]);
    setErrors({});
    onClose();
  };

  // Debounced search for registered users
  useEffect(() => {
    if (!supabaseActive || tab !== "search" || !searchQuery.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchRegisteredUsers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search users error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, tab, supabaseActive]);

  const handleAddExistingUser = (user: {
    userId: string;
    name: string;
    email: string;
  }) => {
    // Check if already a friend
    const existing = friends.find(
      (f) =>
        f.email.toLowerCase() === user.email.toLowerCase() ||
        (f.userId && f.userId === user.userId),
    );

    if (existing) {
      toast.error(`${user.name} is already in your friends list`);
      return;
    }

    const newFriend = addFriend({
      userId: user.userId,
      name: user.name,
      email: user.email,
      status: "accepted",
    });

    toast.success(`Added ${user.name} to your friends!`);
    onFriendAdded?.(newFriend);
    handleClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      newErrors.email = "Please enter a valid email address";
    } else if (profile.email && cleanEmail === profile.email.toLowerCase()) {
      newErrors.email = "You cannot add yourself as a friend";
    }

    const existing = friends.find(
      (f) => f.email.toLowerCase() === cleanEmail,
    );
    if (existing) {
      newErrors.email = "This email is already in your friends list";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newFriend = addFriend({
      name: name.trim(),
      email: cleanEmail,
      status: "accepted",
    });

    toast.success(`Added ${name.trim()} to your friends!`);
    onFriendAdded?.(newFriend);
    handleClose();
  };

  return (
    <DialogShell
      open={open}
      onClose={handleClose}
      title="Add Friend"
      description="Connect with other users to split bills, share expense records, and track balances."
      size="md"
    >
      <div className="space-y-4">
        {supabaseActive && (
          <PillTabs
            options={[
              { value: "search", label: "Search Registered Users" },
              { value: "manual", label: "Add by Name & Email" },
            ]}
            value={tab}
            onChange={(val) => {
              setTab(val as "search" | "manual");
              setSearchQuery("");
              setSearchResults([]);
            }}
          />
        )}

        {tab === "search" && supabaseActive ? (
          <div className="space-y-3">
            <Field
              label="Find User"
              hint="Search by name or email address of registered users"
            >
              <div className="relative">
                <TextInput
                  placeholder="e.g. sarah.j@techcorp.com or Marcus"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      setSearchResults([]);
                    }
                  }}
                  className="pl-9"
                />
                <Search01Icon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xenia-stone-400"
                />
              </div>
            </Field>

            {isSearching && (
              <p className="text-xs text-xenia-stone-500 text-center py-4">
                Searching users...
              </p>
            )}

            {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
              <div className="rounded-lg border border-dashed border-xenia-border p-5 text-center bg-xenia-sand-50/50">
                <p className="text-xs font-medium text-xenia-ink-900">
                  No registered users found
                </p>
                <p className="text-[11px] text-xenia-stone-500 mt-1">
                  You can also add them directly by entering their name and email.
                </p>
                <div className="mt-3">
                  <Buttons
                    style="second"
                    size="sm"
                    onClick={() => {
                      setEmail(searchQuery);
                      setTab("manual");
                    }}
                  >
                    Add by Email
                  </Buttons>
                </div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <span className="block text-xs font-medium uppercase tracking-wide text-xenia-stone-500">
                  Search Results ({searchResults.length})
                </span>
                {searchResults.map((user) => {
                  const isAlreadyFriend = friends.some(
                    (f) =>
                      f.email.toLowerCase() === user.email.toLowerCase() ||
                      (f.userId && f.userId === user.userId),
                  );

                  return (
                    <div
                      key={user.userId || user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-xenia-divider bg-xenia-sand-50 hover:bg-xenia-sand-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-xenia-moss-100 text-xenia-moss-700 font-semibold text-xs shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-xenia-ink-900 truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-xenia-stone-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {isAlreadyFriend ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-xenia-moss-600 px-2.5 py-1 rounded-full bg-xenia-moss-50">
                          <CheckmarkCircle02Icon size={14} />
                          Friend
                        </span>
                      ) : (
                        <Buttons
                          style="main"
                          size="sm"
                          icon={<UserAdd01Icon size={14} />}
                          onClick={() => handleAddExistingUser(user)}
                        >
                          Add Friend
                        </Buttons>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Field label="Friend's Full Name" required error={errors.name}>
              <div className="relative">
                <TextInput
                  placeholder="e.g. Marcus Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  invalid={Boolean(errors.name)}
                  className="pl-9"
                />
                <UserIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xenia-stone-400"
                />
              </div>
            </Field>

            <Field
              label="Email Address"
              required
              error={errors.email}
              hint="Bills shared with this email will appear on their dashboard when they sign in"
            >
              <div className="relative">
                <TextInput
                  type="email"
                  placeholder="e.g. marcus.v@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  invalid={Boolean(errors.email)}
                  className="pl-9"
                />
                <Mail01Icon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xenia-stone-400"
                />
              </div>
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-xenia-divider">
              <Buttons style="second" size="md" onClick={handleClose} type="button">
                Cancel
              </Buttons>
              <Buttons
                style="main"
                size="md"
                type="submit"
                icon={<UserAdd01Icon size={16} />}
              >
                Save Friend
              </Buttons>
            </div>
          </form>
        )}
      </div>
    </DialogShell>
  );
}
