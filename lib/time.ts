/**
 * Returns a time-of-day greeting based on Singapore local time.
 * Morning: 05:00–11:59
 * Afternoon: 12:00–17:59
 * Evening: 18:00–04:59
 */
export function getGreetingSGT(date: Date = new Date()): string {
  const hour = getSingaporeHour(date);
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 18) return "Good Afternoon";
  return "Good Evening";
}

/**
 * Formats the date in Singapore time.
 * Example: "Sunday, 1 February 2026"
 */
export function formatDateSGT(date: Date = new Date()): string {
  // Use Intl with explicit timeZone to avoid relying on server locale/timezone.
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(date);
}

/**
 * Formats a date+time stamp in Singapore time.
 * Example: "1 Feb 2026, 19:45:12"
 */
export function formatDateTimeSGT(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  }).format(date);
}

/**
 * Extracts the current hour in Singapore time from an arbitrary Date.
 */
function getSingaporeHour(date: Date): number {
  // Using formatToParts so we can reliably read the hour in the target timezone.
  const parts = new Intl.DateTimeFormat("en-SG", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  }).formatToParts(date);

  const hourPart = parts.find((p) => p.type === "hour")?.value;
  const hour = hourPart ? Number(hourPart) : NaN;
  return Number.isFinite(hour) ? hour : date.getHours();
}

/**
 * Returns the difference in seconds between now and an ISO timestamp.
 * If the timestamp is invalid, returns null.
 */
export function secondsSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 1000);
}

/**
 * Human‑friendly "time ago" label for UI.
 * Examples: "just now", "45s ago", "3m ago", "2h ago"
 */
export function timeAgoLabel(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

/**
 * Returns a staleness level for UI indicators based on age.
 * - fresh: < 60s
 * - warm: 1–5 min
 * - stale: > 5 min
 */
export function stalenessLevel(seconds: number | null): "fresh" | "warm" | "stale" | "unknown" {
  if (seconds === null) return "unknown";
  if (seconds < 60) return "fresh";
  if (seconds < 300) return "warm";
  return "stale";
}
