"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { LatestRates, WatchlistItem } from "../lib/types";
import { addToWatchlist, readWatchlist, removeFromWatchlist, writeWatchlist } from "../lib/watchlist";
import { clampNumber, parseDecimalInput } from "../lib/format";

import WatchlistControls from "./WatchlistControls";
import CurrencyCard from "./CurrencyCard";

const DEFAULT_REFRESH_SECONDS = 30;
const MIN_REFRESH_SECONDS = 15;

export default function FxDashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [refreshSeconds, setRefreshSeconds] = useState<number>(DEFAULT_REFRESH_SECONDS);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [latest, setLatest] = useState<LatestRates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SGD amount input (raw text) + parsed numeric value for calculations
  const [sgdAmountInput, setSgdAmountInput] = useState<string>("1");
  const [sgdAmount, setSgdAmount] = useState<number>(1);
  const [sgdAmountError, setSgdAmountError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);


  const symbolsParam = useMemo(() => {
    return watchlist.map((w) => w.code).join(",");
  }, [watchlist]);

  // Load watchlist from localStorage on mount.
  useEffect(() => {
    setWatchlist(readWatchlist());
  }, []);

  // Persist watchlist whenever it changes.
  useEffect(() => {
    if (watchlist.length > 0) writeWatchlist(watchlist);
  }, [watchlist]);

  // Keep parsed SGD amount in sync with the raw input.
  useEffect(() => {
    const parsed = parseDecimalInput(sgdAmountInput);

    if (parsed.ok) {
      const capped = clampNumber(parsed.value, 0, 10_000_000);
      setSgdAmount(capped);
      setSgdAmountError(null);
    } else {
      // error may be null for in-progress inputs like "" or "."
      setSgdAmountError(parsed.error);
    }
  }, [sgdAmountInput]);

  async function loadLatest() {
    if (!symbolsParam) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch(
        `/api/fx/latest?symbols=${encodeURIComponent(symbolsParam)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load latest rates (${res.status}): ${text || res.statusText}`);
      }

      const data = (await res.json()) as LatestRates;
      setLatest(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Unknown error";
      // Keep last good data on screen; just surface the error.
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  // Load once when symbols change.
  useEffect(() => {
    if (watchlist.length === 0) return;
    void loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsParam]);

  // Auto refresh.
  useEffect(() => {
    if (!autoRefresh) return;
    if (watchlist.length === 0) return;

    const intervalMs = Math.max(refreshSeconds, MIN_REFRESH_SECONDS) * 1000;
    const id = window.setInterval(() => {
      void loadLatest();
    }, intervalMs);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshSeconds, symbolsParam]);

  function onAdd(code: string) {
    setWatchlist((prev) => addToWatchlist(prev, code));
  }

  function onRemove(code: string) {
    setWatchlist((prev) => removeFromWatchlist(prev, code));
  }

  const lastUpdated = latest?.asOf ?? null;
  const rates = latest?.rates ?? null;

  const status: "idle" | "loading" | "loaded" | "error" =
    isLoading && !latest ? "loading" :
    errorMessage && !latest ? "error" :
    latest ? "loaded" :
    "idle";

  return (
    <section className="w-full max-w-none px-4 md:px-8">
      <div className="glass-panel scanlines hud-border crt-flicker flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1">
              <span
                className={
                  "h-1.5 w-1.5 rounded-full " +
                  (errorMessage
                    ? "bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.25)]"
                    : isLoading
                      ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.22)]"
                      : "bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.22)]")
                }
                aria-hidden
              />
              <span className="text-neutral-300">
                {errorMessage ? "DEGRADED" : isLoading ? "SYNCING" : "LIVE"}
              </span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1">
              <span className="text-neutral-500">BASE</span>
              <span className="font-mono text-neutral-200">SGD</span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1">
              <span className="text-neutral-500">FEED</span>
              <span className="text-neutral-200">Frankfurter</span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1">
              <span className="text-neutral-500">TRACKING</span>
              <span className="font-mono text-neutral-200">{watchlist.length}</span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1">
              <span className="text-neutral-500">AUTO</span>
              <span className="font-mono text-neutral-200">{autoRefresh ? `${refreshSeconds}s` : "OFF"}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1">
              <span className="text-neutral-500">AMOUNT</span>
              <span className="font-mono text-neutral-200">{sgdAmount.toLocaleString("en-SG", { maximumFractionDigits: 2 })}</span>
              <span className="text-neutral-500">SGD</span>
            </span>
          </div>

          <div className="text-[11px] text-neutral-500">
            {lastUpdated ? (
              <span>
                last sync <span className="font-mono text-neutral-300">{new Date(lastUpdated).toLocaleTimeString("en-SG", { hour12: false })}</span>
              </span>
            ) : (
              <span>last sync —</span>
            )}
          </div>
        </div>
        <WatchlistControls
          watchlist={watchlist}
          onAdd={onAdd}
          onRemove={onRemove}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          refreshSeconds={refreshSeconds}
          setRefreshSeconds={setRefreshSeconds}
          lastUpdated={lastUpdated}
          onManualRefresh={() => void loadLatest()}
          status={status}
          sgdAmountInput={sgdAmountInput}
          setSgdAmountInput={setSgdAmountInput}
          sgdAmountError={sgdAmountError}
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {watchlist.length === 0 && (
          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/40 p-6 text-sm text-neutral-300 backdrop-blur">
            <div className="text-base font-semibold text-neutral-100">No currencies yet</div>
            <div className="mt-1 text-neutral-500">Add a currency code above (e.g., USD, EUR, JPY) to start tracking.</div>
          </div>
        )}

        {watchlist.length > 0 && (
          <>
            {/* Currency cards grid — spans full container width for dashboard feel */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {watchlist.map((w) => (
                <CurrencyCard
                  key={w.code}
                  code={w.code}
                  rate={rates?.[w.code]}
                  sgdAmount={sgdAmount}
                />
              ))}
            </div>
          </>
        )}

        {isLoading && latest && watchlist.length > 0 && (
          <div className="flex items-center justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1 text-[11px] text-neutral-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300" aria-hidden />
              Refreshing…
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
