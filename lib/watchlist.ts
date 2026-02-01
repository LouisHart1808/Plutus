import type { CurrencyCode, WatchlistItem } from "./types";

const STORAGE_KEY = "plutus:watchlist";

/**
 * Default currencies to monitor on first load.
 * Keep this small and sensible.
 */
export const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { code: "USD" },
  { code: "EUR" },
  { code: "JPY" },
  { code: "GBP" },
  { code: "AUD" },
];

/**
 * Reads the watchlist from localStorage.
 * Falls back to DEFAULT_WATCHLIST if unavailable or invalid.
 */
export function readWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") {
    // Server-side render safety
    return DEFAULT_WATCHLIST;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST;

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_WATCHLIST;

    const validated = parsed
      .filter((item): item is WatchlistItem => isValidWatchlistItem(item))
      .map((item) => ({ code: item.code.toUpperCase() }));

    return validated.length > 0 ? validated : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

/**
 * Persists the watchlist to localStorage.
 */
export function writeWatchlist(items: WatchlistItem[]): void {
  if (typeof window === "undefined") return;

  const normalized = items
    .filter((item): item is WatchlistItem => isValidWatchlistItem(item))
    .map((item) => ({ code: item.code.toUpperCase() }));

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Fail silently; storage quota or private mode
  }
}

/**
 * Checks whether an arbitrary value is a valid WatchlistItem.
 */
function isValidWatchlistItem(value: unknown): value is WatchlistItem {
  if (typeof value !== "object" || value === null) return false;
  const code = (value as any).code;
  return typeof code === "string" && code.length >= 3 && code.length <= 5;
}

/**
 * Utility to add a currency code if it does not already exist.
 */
export function addToWatchlist(
  items: WatchlistItem[],
  code: CurrencyCode
): WatchlistItem[] {
  const upper = code.toUpperCase();
  if (items.some((i) => i.code === upper)) return items;
  return [...items, { code: upper }];
}

/**
 * Utility to remove a currency code from the watchlist.
 */
export function removeFromWatchlist(
  items: WatchlistItem[],
  code: CurrencyCode
): WatchlistItem[] {
  const upper = code.toUpperCase();
  return items.filter((i) => i.code !== upper);
}
