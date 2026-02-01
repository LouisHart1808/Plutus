"use client";

import { useEffect, useMemo, useState } from "react";
import { searchCurrencies } from "../lib/currencies";

import type { WatchlistItem } from "../lib/types";
import { formatDateTimeSGT, secondsSince, stalenessLevel, timeAgoLabel } from "../lib/time";

type Props = {
  watchlist: WatchlistItem[];
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;

  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;

  refreshSeconds: number;
  setRefreshSeconds: (n: number) => void;

  lastUpdated: string | null;
  onManualRefresh: () => void;

  status: "idle" | "loading" | "loaded" | "error";

  // SGD amount calculator (manual input)
  sgdAmountInput: string;
  setSgdAmountInput: (v: string) => void;
  sgdAmountError: string | null;
};

const PRESET_REFRESH_SECONDS = [15, 30, 60];

export default function WatchlistControls(props: Props) {
  const {
    watchlist,
    onAdd,
    onRemove,
    autoRefresh,
    setAutoRefresh,
    refreshSeconds,
    setRefreshSeconds,
    lastUpdated,
    onManualRefresh,
    status,
    sgdAmountInput,
    setSgdAmountInput,
    sgdAmountError,
  } = props;

  const [input, setInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const normalizedInput = useMemo(() => input.trim().toUpperCase(), [input]);

  const suggestions = useMemo(() => {
    if (!normalizedInput) return [] as Array<{ code: string; name: string; symbol?: string }>;
    return searchCurrencies({
      query: normalizedInput,
      excludeCodes: watchlist.map((w) => w.code),
      limit: 8,
    });
  }, [normalizedInput, watchlist]);

  useEffect(() => {
    // Auto-open when there is input and we have suggestions.
    if (!normalizedInput) {
      setIsSuggestOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (suggestions.length > 0) {
      setIsSuggestOpen(true);
      setActiveIndex(-1);
    } else {
      setIsSuggestOpen(false);
      setActiveIndex(-1);
    }
  }, [normalizedInput, suggestions.length]);

  function validate(code: string): string | null {
    if (!code) return "Enter a currency code (e.g., USD)";
    if (code.length < 3 || code.length > 5) return "Code must be 3–5 characters";
    if (!/^[A-Z]+$/.test(code)) return "Code must be letters only";
    if (watchlist.some((w) => w.code === code)) return "Already in watchlist";
    return null;
  }

  function acceptSuggestion(code: string) {
    const cleaned = code.trim().toUpperCase();
    const err = validate(cleaned);
    setInputError(err);
    if (err) return;

    onAdd(cleaned);
    setInput("");
    setInputError(null);
    setIsSuggestOpen(false);
    setActiveIndex(-1);
  }

  function handleAdd() {
    if (isSuggestOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
      acceptSuggestion(suggestions[activeIndex].code);
      return;
    }

    const err = validate(normalizedInput);
    setInputError(err);
    if (err) return;

    onAdd(normalizedInput);
    setInput("");
    setInputError(null);
    setIsSuggestOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setIsSuggestOpen(true);
        setActiveIndex((i) => {
          const next = i + 1;
          return next >= suggestions.length ? 0 : next;
        });
      }
      return;
    }

    if (e.key === "ArrowUp") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setIsSuggestOpen(true);
        setActiveIndex((i) => {
          const next = i - 1;
          return next < 0 ? suggestions.length - 1 : next;
        });
      }
      return;
    }

    if (e.key === "Escape") {
      setIsSuggestOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "—";
    const d = new Date(lastUpdated);
    if (Number.isNaN(d.getTime())) return lastUpdated;
    return formatDateTimeSGT(d);
  }, [lastUpdated]);

  const ageSeconds = useMemo(() => secondsSince(lastUpdated), [lastUpdated]);
  const ageLabel = useMemo(() => timeAgoLabel(ageSeconds), [ageSeconds]);
  const stale = useMemo(() => stalenessLevel(ageSeconds), [ageSeconds]);

  const dotClass =
    stale === "fresh"
      ? "bg-emerald-400"
      : stale === "warm"
        ? "bg-amber-400"
        : stale === "stale"
          ? "bg-rose-400"
          : "bg-neutral-600";

  const dotGlowClass =
    stale === "fresh"
      ? "shadow-[0_0_10px_rgba(52,211,153,0.35)]"
      : stale === "warm"
        ? "shadow-[0_0_10px_rgba(251,191,36,0.30)]"
        : stale === "stale"
          ? "shadow-[0_0_10px_rgba(244,63,94,0.28)]"
          : "";

  return (
    <div className="relative z-50 isolate rounded-2xl border border-neutral-800/70 bg-neutral-950/40 p-4 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-sm text-neutral-300">Watchlist</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>{watchlist.length} currencies</span>
            <span className="text-neutral-700">•</span>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass} ${dotGlowClass}`} aria-hidden />
              <span>
                Updated {ageLabel}
                <span className="text-neutral-700"> • </span>
                <span className="text-neutral-600">{lastUpdatedLabel}</span>
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onManualRefresh}
            className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={status === "loading"}
            aria-disabled={status === "loading"}
          >
            <span className="inline-flex items-center gap-2">
              {status === "loading" && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300" aria-hidden />
              )}
              {status === "loading" ? "Refreshing…" : "Refresh"}
            </span>
          </button>

          <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-200">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 accent-neutral-200"
            />
            Auto
          </label>


          <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-200">
            <span className="text-neutral-400">Every</span>
            <select
              value={refreshSeconds}
              onChange={(e) => setRefreshSeconds(Number(e.target.value))}
              disabled={!autoRefresh}
              className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {PRESET_REFRESH_SECONDS.map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="text-xs text-neutral-400">Amount (SGD)</div>

        <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2">
          <input
            value={sgdAmountInput}
            onChange={(e) => setSgdAmountInput(e.target.value)}
            inputMode="decimal"
            placeholder="1,000.00"
            className="w-32 bg-transparent text-xs font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            aria-invalid={!!sgdAmountError}
          />
          <span className="text-xs text-neutral-500">SGD</span>
        </div>

        {sgdAmountError && (
          <div className="text-[11px] text-rose-300">{sgdAmountError}</div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="text-xs text-neutral-400">Add currency</div>
          <div className="relative z-[9999]">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setIsSuggestOpen(true);
                  if (inputError) setInputError(null);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsSuggestOpen(suggestions.length > 0)}
                onBlur={() => {
                  // Allow click selection before closing
                  window.setTimeout(() => setIsSuggestOpen(false), 120);
                }}
                placeholder="Search (e.g. KRW / yen / dollar)"
                className="w-52 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Add
              </button>
            </div>

            {isSuggestOpen && suggestions.length > 0 && (
              <div className="absolute z-[9999] mt-2 w-[320px] rounded-xl border border-neutral-800 bg-neutral-950/95 p-1 shadow-lg backdrop-blur">
                {suggestions.map((s, idx) => (
                  <button
                    key={s.code}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => acceptSuggestion(s.code)}
                    className={
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition " +
                      (idx === activeIndex
                        ? "bg-neutral-900 text-neutral-100"
                        : "text-neutral-200 hover:bg-neutral-900/60")
                    }
                  >
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-neutral-100">{s.code}</div>
                        {s.symbol && <div className="text-xs text-neutral-500">{s.symbol}</div>}
                      </div>
                      <div className="truncate text-[11px] text-neutral-500">{s.name}</div>
                    </div>
                    <div className="text-xs text-neutral-600">↵</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {inputError && <div className="text-xs text-red-300">{inputError}</div>}
        </div>

        <div className="flex flex-wrap gap-2">
          {watchlist.map((w) => (
            <button
              key={w.code}
              type="button"
              onClick={() => onRemove(w.code)}
              className="group rounded-full border border-neutral-800 bg-neutral-900/40 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
              title="Remove"
            >
              <span className="mr-1 text-neutral-400 group-hover:text-neutral-300">×</span>
              {w.code}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 text-[11px] text-neutral-600">
        Tip: click a currency card to expand its time-series chart.
      </div>
    </div>
  );
}
