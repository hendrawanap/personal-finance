import { useCallback } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  label: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah (IDR / Rp)", decimals: 0 },
  { code: "USD", symbol: "$", label: "US Dollar (USD / $)", decimals: 2 },
  { code: "EUR", symbol: "€", label: "Euro (EUR / €)", decimals: 2 },
  { code: "GBP", symbol: "£", label: "British Pound (GBP / £)", decimals: 2 },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (SGD / S$)", decimals: 2 },
  { code: "JPY", symbol: "¥", label: "Japanese Yen (JPY / ¥)", decimals: 0 },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (AUD / A$)", decimals: 2 },
];

export function findCurrency(codeOrSymbol: string): CurrencyInfo | undefined {
  const query = codeOrSymbol.trim().toUpperCase();
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === query) ||
    SUPPORTED_CURRENCIES.find((c) => c.symbol.toUpperCase() === query)
  );
}

/**
 * Format a numeric amount using the given currency symbol and decimals.
 * Examples:
 * - formatMoney(150000, "Rp") => "Rp 150,000"
 * - formatMoney(1500.5, "$") => "$1,500.50"
 * - formatMoney(-45000, "Rp") => "-Rp 45,000"
 */
export function formatMoney(
  amount: number,
  symbol: string = "$",
  decimals?: number,
): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  const matched = findCurrency(symbol);
  const defaultDecimals = matched ? matched.decimals : symbol === "Rp" || symbol === "¥" ? 0 : 2;
  const fractionDigits = decimals !== undefined ? decimals : defaultDecimals;

  const formattedNumber = absVal.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const spacing = symbol.length > 1 ? " " : "";
  const sign = isNegative ? "-" : "";

  return `${sign}${symbol}${spacing}${formattedNumber}`;
}

/**
 * Format money with explicit +/- sign indicator (useful for income/expense displays).
 * Examples:
 * - formatMoneyWithSign(250000, true, "Rp") => "+Rp 250,000"
 * - formatMoneyWithSign(50.25, false, "$") => "-$50.25"
 */
export function formatMoneyWithSign(
  amount: number,
  isPositive: boolean,
  symbol: string = "$",
  decimals?: number,
): string {
  const sign = isPositive ? "+" : "-";
  const absFormatted = formatMoney(Math.abs(amount), symbol, decimals);
  return `${sign}${absFormatted}`;
}

/**
 * SSR-safe hook to access current active profile currency and formatted helpers.
 */
export function useCurrency() {
  const profile = useFinanceStore((s) => s.profile);
  const symbol = profile?.currencySymbol || "$";
  const code = profile?.currencyCode || "USD";

  const format = useCallback(
    (amount: number, decimals?: number) => {
      return formatMoney(amount, symbol, decimals);
    },
    [symbol],
  );

  const formatWithSign = useCallback(
    (amount: number, isPositive: boolean, decimals?: number) => {
      return formatMoneyWithSign(amount, isPositive, symbol, decimals);
    },
    [symbol],
  );

  return {
    symbol,
    code,
    format,
    formatWithSign,
  };
}
