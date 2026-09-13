/**
 * Palet warna untuk chart.js (dataset borderColor/backgroundColor, tooltip,
 * grid). chart.js butuh nilai literal — tidak bisa memakai className — jadi
 * ini SATU-SATUNYA tempat hex boleh ditulis di luar `app/globals.css`.
 * Nilainya harus sama dengan token `xenia-*` di globals.css.
 */
// palette: chart
export const CHART_PALETTE = {
  moss: "#4F6B52", // xenia-moss-600
  brass: "#B4884F", // xenia-brass-500
  sand: "#E2D9C2", // xenia-border
  ink: "#1D1B16", // xenia-ink-900
  stone: "#8A8271", // xenia-stone-500
  danger: "#B3452E", // xenia-danger
  info: "#2F6B6B", // xenia-info-ink
  // chrome (tooltip/grid)
  forest: "#142219", // xenia-forest-950
  cream: "#FAF7EF", // xenia-surface-hover
  sandSoft: "#EAE3D2", // xenia-sand-100
  divider: "#EFE8D8", // xenia-divider
  white: "#FFFFFF",
} as const;

export type ChartPaletteKey = keyof typeof CHART_PALETTE;

/** `#RRGGBB` → `rgba(r, g, b, alpha)` untuk gradien area chart. */
export function chartAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Opsi tooltip chart.js yang seragam untuk seluruh dashboard. */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: CHART_PALETTE.forest,
  titleColor: CHART_PALETTE.cream,
  bodyColor: CHART_PALETTE.sandSoft,
  borderColor: CHART_PALETTE.moss,
  borderWidth: 1,
  padding: 12,
  cornerRadius: 10,
} as const;

/** Warna teks tick dan garis grid sumbu. */
export const CHART_AXIS_STYLE = {
  tickColor: CHART_PALETTE.stone,
  gridColor: CHART_PALETTE.divider,
} as const;
