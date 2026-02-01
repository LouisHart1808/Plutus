"use client";

import { useMemo, useRef, useState } from "react";

import type { TimeRange, TimeSeries } from "../lib/types";

import TimeSeriesChart from "./TimeSeriesChart";
import FullscreenPortal from "./FullscreenPortal";

type Props = {
  code: string;
  /** 1 SGD -> rate in `code` */
  rate?: number;
  /** User-entered SGD amount for calculator */
  sgdAmount: number;
};

type SeriesState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: TimeSeries }
  | { status: "error"; message: string };

const DEFAULT_RANGE: TimeRange = "1M";

export default function CurrencyCard({ code, rate, sgdAmount }: Props) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [range, setRange] = useState<TimeRange>(DEFAULT_RANGE);
  const [series, setSeries] = useState<SeriesState>({ status: "idle" });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  async function ensureSeriesLoaded(nextRange: TimeRange) {
    // If already loaded for some range, we still refetch on explicit range change elsewhere.
    // Here we only make sure we have data at least once.
    if (series.status === "idle" || series.status === "error") {
      await loadSeries(nextRange);
    }
  }

  const cardRef = useRef<HTMLDivElement | null>(null);

  const rateLabel = useMemo(() => {
    if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";

    // Adaptive decimals: big numbers (e.g., JPY/KRW) look cleaner with fewer decimals.
    const abs = Math.abs(rate);
    const maxFractionDigits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;

    return new Intl.NumberFormat("en-SG", {
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: Math.min(2, maxFractionDigits),
    }).format(rate);
  }, [rate]);

  const convertedLabel = useMemo(() => {
    if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";
    if (typeof sgdAmount !== "number" || !Number.isFinite(sgdAmount)) return "—";

    const value = sgdAmount * rate;

    // Use adaptive decimals for display
    const abs = Math.abs(value);
    const maxFractionDigits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;

    return new Intl.NumberFormat("en-SG", {
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: Math.min(2, maxFractionDigits),
    }).format(value);
  }, [rate, sgdAmount]);

  const sgdLabel = useMemo(() => {
    if (typeof sgdAmount !== "number" || !Number.isFinite(sgdAmount)) return "—";
    return new Intl.NumberFormat("en-SG", {
      maximumFractionDigits: 2,
    }).format(sgdAmount);
  }, [sgdAmount]);

  async function loadSeries(nextRange: TimeRange) {
    try {
      setSeries({ status: "loading" });
      const res = await fetch(
        `/api/fx/timeseries?symbol=${encodeURIComponent(code)}&range=${encodeURIComponent(nextRange)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load time series (${res.status}): ${text || res.statusText}`);
      }

      const data = (await res.json()) as TimeSeries;
      setSeries({ status: "loaded", data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSeries({ status: "error", message });
    }
  }

  async function toggle() {
    const next = !expanded;
    setExpanded(next);

    if (next) {
      // Scroll into view for a "terminal" feel when expanding.
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      // Lazy-load series only on first expand.
      if (series.status === "idle") {
        await loadSeries(range);
      }
    }
  }

  async function onRangeChange(nextRange: TimeRange) {
    setRange(nextRange);
    if (expanded || isFullscreen) {
      await loadSeries(nextRange);
    }
  }

  return (
    <div
      ref={cardRef}
      className={
        "glass-panel hud-border noise crt-flicker group w-full h-full transition " +
        "hover:border-neutral-600 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.18),0_0_24px_rgba(34,197,94,0.08)] " +
        "active:shadow-[0_0_0_1px_rgba(245,158,11,0.16),0_0_18px_rgba(245,158,11,0.06)]" +
        (expanded ? " neon-border md:col-span-2 xl:col-span-2" : "")
      }
    >
      <button
        type="button"
        onClick={() => void toggle()}
        className="w-full text-left transition active:scale-[0.99]"
        aria-expanded={expanded}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                <span className="rounded-md border border-neutral-800 bg-neutral-950/40 px-2 py-0.5 font-mono text-neutral-300">
                  PAIR
                </span>
                <span className="font-mono text-neutral-300">SGD/{code}</span>
                <span className="text-neutral-600">•</span>
                <span className="truncate">spot</span>
              </div>

              <div className="mt-2 text-xs text-neutral-400">1 SGD →</div>

              <div className="mt-1 flex items-baseline gap-2">
                <div className="font-mono text-3xl font-semibold tracking-tight text-neutral-100">
                  {rateLabel}
                </div>
                <div className="font-mono text-sm text-neutral-400">{code}</div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
                <span className="rounded-md border border-neutral-800 bg-neutral-950/40 px-2 py-0.5 font-mono text-neutral-300">
                  CALC
                </span>
                <span className="font-mono text-neutral-300">{sgdLabel}</span>
                <span>SGD</span>
                <span className="text-neutral-700">→</span>
                <span className="font-mono text-neutral-200">{convertedLabel}</span>
                <span className="font-mono text-neutral-400">{code}</span>
              </div>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsFullscreen(true);
                  await ensureSeriesLoaded(range);
                }}
                className="rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1 text-[11px] text-neutral-200 hover:bg-neutral-900 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.18)]"
                title="Open fullscreen"
              >
                Fullscreen
              </button>
              <div
                className={
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] " +
                  (expanded
                    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                    : "border-neutral-800 bg-neutral-950/40 text-neutral-300")
                }
              >
                <span
                  className={
                    "h-1.5 w-1.5 rounded-full " +
                    (expanded
                      ? "bg-emerald-300 shadow-[0_0_10px_rgba(34,197,94,0.35)]"
                      : "bg-neutral-500")
                  }
                  aria-hidden
                />
                {expanded ? "OPEN" : "VIEW"}
              </div>

              <div
                className={
                  "hidden sm:inline-flex rounded-full border px-2 py-1 text-[10px] font-mono " +
                  (expanded
                    ? "border-amber-400/25 bg-amber-500/10 text-amber-200"
                    : "border-neutral-800 bg-neutral-950/40 text-neutral-500")
                }
              >
                {expanded ? "DETAIL" : "BRIEF"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-neutral-600">
            <div>
              {expanded ? "Expanded" : "Collapsed"} • click to {expanded ? "hide" : "view"} time-series
            </div>
            <div className="hidden sm:block font-mono text-neutral-500">
              ID:{code}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="scanlines border-t border-neutral-800/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs text-neutral-500">
              <span className="rounded-md border border-neutral-800 bg-neutral-950/40 px-2 py-0.5 font-mono text-[10px] text-neutral-300">
                TELEMETRY
              </span>
              <span className="ml-2 text-neutral-600">time-series</span> •{" "}
              <span className="font-mono text-neutral-300">{code}</span>
            </div>

            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsFullscreen(true);
                await ensureSeriesLoaded(range);
              }}
              disabled={series.status === "loading"}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-900 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
              title={series.status === "loaded" ? "Open fullscreen" : "Load chart to enable"}
            >
              Fullscreen
            </button>
          </div>
          {series.status === "loading" && (
            <div className="flex flex-col gap-3">
              <div className="h-3 w-40 animate-pulse rounded bg-neutral-800/70" />
              <div className="h-[180px] w-full animate-pulse rounded-lg bg-neutral-900/50" />
              <div className="flex gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-neutral-800/70" />
                <div className="h-3 w-32 animate-pulse rounded bg-neutral-800/70" />
              </div>
            </div>
          )}

          {series.status === "error" && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
              {series.message}
            </div>
          )}

          {series.status === "loaded" && (
            <TimeSeriesChart
              symbol={code}
              range={range}
              onRangeChange={(r) => void onRangeChange(r as TimeRange)}
              points={series.data.points}
              mode="inline"
            />
          )}
        </div>
      )}

      <FullscreenPortal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        ariaLabel={`Fullscreen chart for ${code}`}
      >
        {series.status === "loaded" ? (
          <div className="h-full w-full">
            <TimeSeriesChart
              symbol={code}
              range={range}
              onRangeChange={(r) => void onRangeChange(r as TimeRange)}
              points={series.data.points}
              mode="fullscreen"
            />
          </div>
        ) : series.status === "loading" ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-300">
            Loading chart…
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-300">
            Chart is not ready yet.
          </div>
        )}
      </FullscreenPortal>
    </div>
  );
}
