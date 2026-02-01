"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { TimeRange, TimeSeriesPoint } from "../lib/types";

type Props = {
  symbol: string;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  points: TimeSeriesPoint[];
  mode?: "inline" | "fullscreen";
};

const RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];

type HoverState = {
  idx: number;
  // Cursor in SVG/viewBox coordinates
  vx: number;
  vy: number;
  // Cursor in pixels relative to the plot container
  px: number;
  py: number;
};

export default function TimeSeriesChart({
  symbol,
  range,
  onRangeChange,
  points,
  mode = "inline",
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);

  const pad = 24;

  // Plot area dimensions (driven by container)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 640, h: 220 });

  // Observe plot container for responsive sizing
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const w = Math.max(320, Math.floor(el.clientWidth));
      const h = Math.max(mode === "fullscreen" ? 420 : 220, Math.floor(el.clientHeight));
      setDims({ w, h });
    });

    ro.observe(el);

    // initial
    const w = Math.max(320, Math.floor(el.clientWidth));
    const h = Math.max(mode === "fullscreen" ? 420 : 220, Math.floor(el.clientHeight));
    setDims({ w, h });

    return () => ro.disconnect();
  }, [mode]);

  const width = dims.w;
  const height = dims.h;

  const [hover, setHover] = useState<HoverState | null>(null);

  const values = useMemo(() => points.map((p) => p.v), [points]);
  const minV = useMemo(() => (values.length ? Math.min(...values) : 0), [values]);
  const maxV = useMemo(() => (values.length ? Math.max(...values) : 0), [values]);

  const safeMin = useMemo(() => {
    if (minV === maxV) return minV - 0.01;
    const spread = maxV - minV;
    return minV - spread * 0.05;
  }, [minV, maxV]);

  const safeMax = useMemo(() => {
    if (minV === maxV) return maxV + 0.01;
    const spread = maxV - minV;
    return maxV + spread * 0.05;
  }, [minV, maxV]);

  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const xFor = (i: number) => pad + (i / Math.max(points.length - 1, 1)) * innerW;
  const yFor = (v: number) => {
    const t = (v - safeMin) / (safeMax - safeMin);
    return pad + (1 - t) * innerH;
  };

  const pathD = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M ${xFor(0)} ${yFor(points[0].v)}`;
    for (let i = 1; i < points.length; i++) d += ` L ${xFor(i)} ${yFor(points[i].v)}`;
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, safeMin, safeMax, width, height]);

  const hoverPoint = hover ? points[hover.idx] : null;

  const hoverPointXY = useMemo(() => {
    if (!hover || points.length < 2) return null;
    return { x: xFor(hover.idx), y: yFor(points[hover.idx].v) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, points, safeMin, safeMax, width, height]);

  function hoverFromEvent(e: React.MouseEvent<SVGSVGElement>): HoverState | null {
    if (!svgRef.current || points.length === 0) return null;

    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // ViewBox coords for crosshair
    const vx = (px / rect.width) * width;
    const vy = (py / rect.height) * height;

    // Clamp only for selecting nearest point; keep vx/vy UNCLAMPED for perfect cursor alignment.
    const left = pad;
    const right = pad + innerW;
    const clampedX = Math.min(Math.max(vx, left), right);

    const t = xToT(left, right, clampedX);
    const idx = Math.round(t * (points.length - 1));
    const clampedIdx = Math.min(Math.max(idx, 0), points.length - 1);

    return { idx: clampedIdx, vx, vy, px, py };
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    setHover(hoverFromEvent(e));
  }

  function onLeave() {
    setHover(null);
  }

  const minLabel = useMemo(() => formatRate(minV), [minV]);
  const maxLabel = useMemo(() => formatRate(maxV), [maxV]);

  const first = points.length ? points[0] : null;
  const last = points.length ? points[points.length - 1] : null;

  const delta = useMemo(() => {
    if (!first || !last) return null;
    const abs = last.v - first.v;
    const pct = first.v !== 0 ? (abs / first.v) * 100 : 0;
    return { abs, pct };
  }, [first, last]);

  const deltaSign = delta && delta.abs > 0 ? "+" : "";
  const deltaClass = !delta
    ? "text-neutral-500"
    : delta.abs > 0
      ? "text-emerald-300"
      : delta.abs < 0
        ? "text-rose-300"
        : "text-neutral-300";

  return (
    <div className={mode === "fullscreen" ? "flex h-full w-full flex-col gap-3" : "flex flex-col gap-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-neutral-400">
          <span className="text-neutral-500">1 SGD →</span> <span className="font-mono text-neutral-200">{symbol}</span>
        </div>

        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={
                "rounded-lg border px-3 py-1 text-xs font-mono tracking-wide transition " +
                (r === range
                  ? "border-neutral-600 bg-neutral-900/60 text-neutral-100"
                  : "border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:bg-neutral-900/40")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/30 px-3 py-2">
          <div className="text-neutral-600">Start</div>
          <div className="mt-1 font-mono text-neutral-200">{first ? formatRate(first.v) : "—"}</div>
        </div>
        <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/30 px-3 py-2">
          <div className="text-neutral-600">End</div>
          <div className="mt-1 font-mono text-neutral-200">{last ? formatRate(last.v) : "—"}</div>
        </div>
        <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/30 px-3 py-2">
          <div className="text-neutral-600">Δ</div>
          <div className={`mt-1 font-mono ${deltaClass}`}>{delta ? `${deltaSign}${formatRate(delta.abs)}` : "—"}</div>
        </div>
        <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/30 px-3 py-2">
          <div className="text-neutral-600">Δ%</div>
          <div className={`mt-1 font-mono ${deltaClass}`}>{delta ? `${deltaSign}${delta.pct.toFixed(2)}%` : "—"}</div>
        </div>
      </div>

      <div
        className={
          (mode === "fullscreen"
            ? "flex-1 rounded-xl border border-neutral-800/70 bg-neutral-950/30 p-2 md:p-3"
            : "rounded-xl border border-neutral-800/70 bg-neutral-950/30 p-3") +
          " flex flex-col"
        }
      >
        {points.length < 2 ? (
          <div className="text-xs text-neutral-400">Not enough data to plot.</div>
        ) : (
          <div
            ref={plotRef}
            className={
              mode === "fullscreen"
                ? "relative flex-1 w-full"
                : "relative h-[220px] w-full"
            }
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="h-full w-full"
              onMouseMove={onMove}
              onMouseLeave={onLeave}
              role="img"
              aria-label={`${symbol} exchange rate chart`}
            >
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.22)" />
                  <stop offset="55%" stopColor="rgba(34,197,94,0.08)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0.00)" />
                </linearGradient>

                <filter id="crtGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.6" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="crtGlowStrong" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g opacity={0.5}>
                <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="currentColor" className="text-neutral-800" />
                <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="currentColor" className="text-neutral-800" />
                {Array.from({ length: 3 }).map((_, i) => {
                  const y = pad + ((i + 1) / 4) * (height - pad * 2);
                  return (
                    <line
                      key={i}
                      x1={pad}
                      y1={y}
                      x2={width - pad}
                      y2={y}
                      stroke="currentColor"
                      className="text-neutral-800"
                    />
                  );
                })}
              </g>

              <path
                d={
                  pathD
                    ? `${pathD} L ${pad + innerW} ${height - pad} L ${pad} ${height - pad} Z`
                    : ""
                }
                fill="url(#areaFill)"
                opacity={0.55}
              />

              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                className="text-emerald-200"
                strokeWidth={2.2}
                filter="url(#crtGlow)"
              />

              {renderMinMaxMarkers(points, minV, maxV, xFor, yFor, formatRate, width)}

              {hover && (
                <g>
                  <line
                    x1={hover.vx}
                    y1={pad}
                    x2={hover.vx}
                    y2={height - pad}
                    stroke="currentColor"
                    className="text-neutral-800"
                    strokeDasharray="4 4"
                  />
                  {hoverPointXY && (
                    <circle cx={hoverPointXY.x} cy={hoverPointXY.y} r={5} fill="currentColor" className="text-emerald-200" filter="url(#crtGlowStrong)" />
                  )}
                </g>
              )}

              <text x={pad} y={14} className="fill-neutral-500" fontSize={10}>
                max {maxLabel}
              </text>
              <text x={pad} y={height - 8} className="fill-neutral-600" fontSize={10}>
                min {minLabel}
              </text>
            </svg>

            {/* Tooltip (pixel-perfect under cursor) */}
            {hoverPoint && hover && (
              <div
                className="pointer-events-none absolute left-0 top-0 rounded-lg border border-neutral-800 bg-neutral-950/95 px-3 py-2 text-xs text-neutral-200 shadow-[0_0_0_1px_rgba(34,197,94,0.12),0_10px_30px_rgba(0,0,0,0.55)]"
                style={{
                  transform: `translate(${hover.px}px, ${hover.py}px)`,
                }}
              >
                <div className="text-neutral-400">{hoverPoint.t}</div>
                <div className="mt-1">
                  <span className="text-neutral-500">1 SGD → </span>
                  <span className="font-mono font-semibold">{formatRate(hoverPoint.v)}</span>
                  <span className="text-neutral-500"> {symbol}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
          <div>
            {points[0]?.t} → {last?.t}
          </div>
          {last && (
            <div>
              Latest: <span className="font-mono text-neutral-300">{formatRate(last.v)}</span> {symbol}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRate(n: number): string {
  if (!Number.isFinite(n)) return "—";

  const abs = Math.abs(n);
  const maxFractionDigits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;

  return new Intl.NumberFormat("en-SG", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: Math.min(2, maxFractionDigits),
  }).format(n);
}

function renderMinMaxMarkers(
  points: TimeSeriesPoint[],
  minV: number,
  maxV: number,
  xFor: (i: number) => number,
  yFor: (v: number) => number,
  fmt: (n: number) => string,
  width: number
) {
  if (points.length < 2) return null;

  const minIdx = points.findIndex((p) => p.v === minV);
  const maxIdx = points.findIndex((p) => p.v === maxV);

  const minX = minIdx >= 0 ? xFor(minIdx) : null;
  const minY = minIdx >= 0 ? yFor(minV) : null;
  const maxX = maxIdx >= 0 ? xFor(maxIdx) : null;
  const maxY = maxIdx >= 0 ? yFor(maxV) : null;

  const clampTextX = (x: number) => Math.min(x, Math.max(16, width - 90));

  return (
    <g>
      {minIdx >= 0 && minX !== null && minY !== null && (
        <g>
          <circle cx={minX} cy={minY} r={3} fill="currentColor" className="text-emerald-200" />
          <text x={clampTextX(minX + 8)} y={Math.max(minY + 4, 14)} className="fill-emerald-200" fontSize={10}>
            {fmt(minV)}
          </text>
        </g>
      )}

      {maxIdx >= 0 && maxX !== null && maxY !== null && (
        <g>
          <circle cx={maxX} cy={maxY} r={3} fill="currentColor" className="text-amber-200" />
          <text x={clampTextX(maxX + 8)} y={Math.max(maxY - 6, 14)} className="fill-amber-200" fontSize={10}>
            {fmt(maxV)}
          </text>
        </g>
      )}
    </g>
  );
}

function xToT(left: number, right: number, x: number): number {
  if (right <= left) return 0;
  return (x - left) / (right - left);
}
