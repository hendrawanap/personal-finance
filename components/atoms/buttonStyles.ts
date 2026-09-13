/**
 * Satu sumber kelas untuk `Buttons` (button) dan `Links` (anchor) supaya
 * keduanya selalu identik secara visual.
 *
 * style:
 * - main    — aksi utama (hijau solid)
 * - second  — aksi sekunder (outline netral)
 * - outline — outline hijau (mis. "Create" kedua di list booking)
 * - ghost   — tanpa border, untuk aksi ringan/teks-link
 * - third   — destruktif outline (Delete di detail)
 * - fourth  — destruktif solid (konfirmasi hapus)
 */
export type ButtonStyle = "main" | "second" | "outline" | "ghost" | "third" | "fourth";
export type ButtonSize = "sm" | "md" | "icon";

export const BUTTON_BASE =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xenia-moss-600/40 " +
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_STYLE: Record<ButtonStyle, string> = {
    main: "bg-xenia-moss-600 text-white hover:bg-xenia-moss-700",
    second:
        "border border-xenia-border bg-white/60 text-xenia-moss-600 hover:border-xenia-moss-600/40 hover:bg-white",
    outline:
        "border border-xenia-moss-600 bg-transparent text-xenia-moss-600 hover:bg-xenia-moss-600/10",
    ghost: "text-xenia-stone-700 hover:bg-xenia-cream hover:text-xenia-ink-900",
    third:
        "border border-xenia-danger-line bg-white text-xenia-danger hover:border-xenia-danger/50 hover:bg-xenia-danger-soft",
    fourth: "bg-xenia-danger text-white hover:bg-xenia-danger-ink",
};

export const BUTTON_SIZE: Record<ButtonSize, string> = {
    md: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    icon: "h-9 w-9 p-0",
};

export function buttonClass(
    style: ButtonStyle = "main",
    size: ButtonSize = "md",
    className?: string,
) {
    return `${BUTTON_BASE} ${BUTTON_STYLE[style]} ${BUTTON_SIZE[size]} ${className ?? ""}`;
}
