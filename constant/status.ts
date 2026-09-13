/**
 * Peta status → tone badge. Satu tempat untuk semua chip status di dashboard
 * (room, booking, article, event, voucher, member, user, …). Tambahkan nilai
 * baru di sini, bukan `STATUS_BADGE` lokal di halaman.
 */
export type BadgeTone = "ok" | "warn" | "danger" | "info" | "idle" | "brass" | "moss";

export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
    ok: "bg-xenia-ok-bg text-xenia-ok-ink",
    warn: "bg-xenia-warn-bg text-xenia-warn-ink",
    danger: "bg-xenia-danger-soft text-xenia-danger-ink",
    info: "bg-xenia-info-bg text-xenia-info-ink",
    idle: "bg-xenia-idle-bg text-xenia-idle-ink",
    brass: "bg-xenia-brass-500/15 text-xenia-brass-500",
    moss: "bg-xenia-moss-600/10 text-xenia-moss-600",
};

/** Status yang sudah dikenal (case-insensitive). Nilai lain jatuh ke `idle`. */
export const STATUS_TONE: Record<string, BadgeTone> = {
    // generic
    active: "ok",
    inactive: "idle",
    hidden: "danger",
    enabled: "ok",
    disabled: "idle",
    verified: "ok",
    unverified: "warn",
    pending: "warn",
    default: "moss",
    featured: "brass",
    // content
    draft: "idle",
    scheduled: "info",
    published: "ok",
    archived: "idle",
    // booking
    confirmed: "ok",
    "checked-in": "info",
    "checked-out": "idle",
    cancelled: "danger",
    canceled: "danger",
    "no-show": "danger",
    upcoming: "ok",
    ongoing: "ok",
    finished: "idle",
    // loyalty / payment
    expired: "danger",
    redeemed: "info",
    fulfilled: "ok",
    usable: "ok",
    used: "idle",
    failed: "danger",
    paid: "ok",
    unpaid: "warn",
    refunded: "info",
    // maintenance
    available: "ok",
    occupied: "info",
    maintenance: "warn",
    "out-of-order": "danger",
};

export function toneForStatus(status: string | null | undefined): BadgeTone {
    if (!status) return "idle";
    const key = status.toLowerCase().replace(/[\s_]+/g, "-");
    return STATUS_TONE[key] ?? "idle";
}
