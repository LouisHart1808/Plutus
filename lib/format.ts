/**
 * Formatting + parsing utilities for the UI.
 *
 * Design goals:
 * - Allow manual typing without fighting the user.
 * - Support commas in input (e.g. "1,000.50").
 * - Provide consistent display formatting across cards/tooltips.
 */

export type ParseNumberResult =
  | { ok: true; value: number }
  | { ok: false; error: string }
  | { ok: false; error: null };

export function normalizeNumberInput(raw: string): string {
  return raw.trim().replace(/,/g, "");
}

/**
 * Parses a user-typed decimal input.
 *
 * - Returns `{ ok:false, error:null }` for in-progress inputs like "" or ".".
 * - Returns `{ ok:false, error:string }` for invalid formats.
 */
export function parseDecimalInput(raw: string): ParseNumberResult {
  const trimmed = raw.trim();

  // Allow empty / in-progress inputs
  if (trimmed === "" || trimmed === ".") {
    return { ok: false, error: null };
  }

  const normalized = normalizeNumberInput(trimmed);

  // Basic safety: digits with at most one decimal point
  if (!/^[0-9]*\.?[0-9]*$/.test(normalized)) {
    return { ok: false, error: "Enter a number (e.g. 1000 or 1,000.50)" };
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Invalid number" };
  }

  return { ok: true, value: n };
}

export function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type FormatNumberOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatNumber(n: number, opts: FormatNumberOptions = {}): string {
  if (!Number.isFinite(n)) return "—";

  const {
    locale = "en-SG",
    minimumFractionDigits,
    maximumFractionDigits,
  } = opts;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(n);
}

/**
 * Adaptive decimals for FX display.
 * - Big values look cleaner with fewer decimals
 * - Small values keep precision
 */
export function formatFxAmount(value: number, locale = "en-SG"): string {
  if (!Number.isFinite(value)) return "—";

  const abs = Math.abs(value);
  const maxFractionDigits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;

  return formatNumber(value, {
    locale,
    minimumFractionDigits: Math.min(2, maxFractionDigits),
    maximumFractionDigits: maxFractionDigits,
  });
}

/**
 * SGD amounts typically look best with up to 2 decimals.
 */
export function formatSgdAmount(value: number, locale = "en-SG"): string {
  return formatNumber(value, { locale, maximumFractionDigits: 2 });
}
