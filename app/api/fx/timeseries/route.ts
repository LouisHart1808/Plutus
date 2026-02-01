import { NextResponse } from "next/server";

import { computeRangeDates, fetchTimeSeries } from "../../../../lib/fx";
import type { CurrencyCode, TimeRange } from "../../../../lib/types";

export const runtime = "edge";

/**
 * GET /api/fx/timeseries
 * Query params:
 * - symbol=JPY (required)
 * - range=1M  (optional; default 1M; supports 1D,1W,1M,3M,6M,1Y)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const symbolParam = (searchParams.get("symbol") || "").trim().toUpperCase();
    const rangeParam = (searchParams.get("range") || "1M").trim().toUpperCase();

    if (!symbolParam) {
      return NextResponse.json(
        { error: "Missing required query param: symbol" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Basic sanity validation (ISO 4217 codes are typically 3 letters, but allow 3–5).
    if (symbolParam.length < 3 || symbolParam.length > 5) {
      return NextResponse.json(
        { error: "Invalid symbol" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const symbol: CurrencyCode = symbolParam;
    const allowedRanges: TimeRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];
    const range: TimeRange = allowedRanges.includes(rangeParam as TimeRange)
      ? (rangeParam as TimeRange)
      : "1M";

    // If user provided an invalid range explicitly, return 400 instead of silently defaulting.
    if (searchParams.get("range") && rangeParam !== range) {
      return NextResponse.json(
        { error: "Invalid range" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { from, to } = computeRangeDates(range);

    const data = await fetchTimeSeries({
      base: "SGD",
      symbol,
      from,
      to,
      range,
    });

    // Cache at the edge briefly; timeseries is relatively stable for a given range.
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
