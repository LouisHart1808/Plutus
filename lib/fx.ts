import type { CurrencyCode, LatestRates, TimeRange, TimeSeries, TimeSeriesPoint } from "./types";

const FRANKFURTER_BASE_URL = "https://api.frankfurter.app";

type FrankfurterLatestResponse = {
  amount: number;
  base: string;
  date: string; // YYYY-MM-DD
  rates: Record<string, number>;
};

type FrankfurterTimeSeriesResponse = {
  amount: number;
  base: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  rates: Record<string, Record<string, number>>; // { "YYYY-MM-DD": { "JPY": 114.3 } }
};

function assertOk(res: Response): void {
  if (!res.ok) {
    throw new Error(`FX provider error: ${res.status} ${res.statusText}`);
  }
}

function toQueryParam(codes: CurrencyCode[]): string {
  // Frankfurter expects comma-separated symbols.
  return codes
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
}

/**
 * Fetches the latest rates for a set of symbols.
 * Interpreted as: 1 <base> converts to <rates[symbol]> <symbol>.
 */
export async function fetchLatestRates(params: {
  base: CurrencyCode;
  symbols: CurrencyCode[];
  signal?: AbortSignal;
}): Promise<LatestRates> {
  const { base, symbols, signal } = params;

  const symbolsParam = toQueryParam(symbols);
  const url = new URL(`${FRANKFURTER_BASE_URL}/latest`);
  url.searchParams.set("from", base.toUpperCase());
  if (symbolsParam) url.searchParams.set("to", symbolsParam);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    // Next.js (Node runtime) can cache fetches; we keep provider fetch uncached here.
    // Cache should be handled in our API route via response headers.
    cache: "no-store",
    signal,
  });

  assertOk(res);
  const data = (await res.json()) as FrankfurterLatestResponse;

  return {
    base: (data.base || base).toUpperCase(),
    asOf: new Date().toISOString(),
    providerDate: data.date,
    symbols: symbols.map((s) => s.trim().toUpperCase()).filter(Boolean),
    rates: Object.fromEntries(
      Object.entries(data.rates || {}).map(([k, v]) => [k.toUpperCase(), v])
    ),
  };
}

/**
 * Fetches a time-series for a single symbol between from/to (inclusive, YYYY-MM-DD).
 */
export async function fetchTimeSeries(params: {
  base: CurrencyCode;
  symbol: CurrencyCode;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  range?: TimeRange;
  signal?: AbortSignal;
}): Promise<TimeSeries> {
  const { base, symbol, from, to, range, signal } = params;

  const url = new URL(`${FRANKFURTER_BASE_URL}/${from}..${to}`);
  url.searchParams.set("from", base.toUpperCase());
  url.searchParams.set("to", symbol.toUpperCase());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  assertOk(res);
  const data = (await res.json()) as FrankfurterTimeSeriesResponse;

  const upperSymbol = symbol.toUpperCase();

  const points: TimeSeriesPoint[] = Object.entries(data.rates || {})
    .map(([date, rateMap]) => {
      const raw = (rateMap as any)?.[upperSymbol];
      const v = typeof raw === "number" ? raw : Number(raw);
      return { t: date, v };
    })
    // Reject NaN/Infinity and any non-positive values (FX rates should never be <= 0).
    .filter((p) => Number.isFinite(p.v) && p.v > 0)
    .sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));

  return {
    base: (data.base || base).toUpperCase(),
    symbol: upperSymbol,
    asOf: new Date().toISOString(),
    range,
    from,
    to,
    points,
  };
}

/**
 * Helper to compute YYYY-MM-DD strings for a given range ending today (Singapore time).
 * Ranges supported: 1D, 1W, 1M, 3M, 6M, 1Y
 */
export function computeRangeDates(range: TimeRange | string, now: Date = new Date()): {
  from: string;
  to: string;
} {
  const normalized = range.toUpperCase();
  const to = toISODateSGT(now);

  const d = new Date(now.getTime());
  // Move back in time based on range.
  if (normalized === "1D") d.setDate(d.getDate() - 1);
  else if (normalized === "1W") d.setDate(d.getDate() - 7);
  else if (normalized === "1M") d.setMonth(d.getMonth() - 1);
  else if (normalized === "3M") d.setMonth(d.getMonth() - 3);
  else if (normalized === "6M") d.setMonth(d.getMonth() - 6);
  else if (normalized === "1Y") d.setFullYear(d.getFullYear() - 1);
  else d.setMonth(d.getMonth() - 1); // default 1M

  const from = toISODateSGT(d);
  return { from, to };
}

/**
 * Formats a Date into YYYY-MM-DD in Asia/Singapore timezone.
 */
function toISODateSGT(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;

  if (!y || !m || !d) {
    // Fallback: local date (still in YYYY-MM-DD)
    return date.toISOString().slice(0, 10);
  }

  return `${y}-${m}-${d}`;
}
