import { NextResponse } from "next/server";

import { fetchLatestRates } from "../../../../lib/fx";
import { DEFAULT_WATCHLIST } from "../../../../lib/watchlist";
import type { CurrencyCode } from "../../../../lib/types";

export const runtime = "edge";

/**
 * GET /api/fx/latest
 * Optional query:
 * - symbols=USD,EUR,JPY
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get("symbols") || "";

    let symbols: CurrencyCode[] = symbolsParam
      ? Array.from(
          new Set(
            symbolsParam
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          )
        )
      : DEFAULT_WATCHLIST.map((w) => w.code);

    // Cap symbols to prevent abuse
    symbols = symbols.slice(0, 20);

    // If user explicitly passed symbols but none are valid, reject
    if (symbolsParam && symbols.length === 0) {
      return NextResponse.json(
        { error: "No valid symbols provided" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const data = await fetchLatestRates({ base: "SGD", symbols });

    // Cache at the edge for a short time to reduce upstream calls.
    // Adjust as desired; Frankfurter itself updates on working days.
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
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
