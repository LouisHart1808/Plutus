export type CurrencyEntry = {
  code: string; // ISO 4217, e.g. USD
  name: string; // Human readable name
  symbol?: string; // Optional symbol, e.g. $ or €
};

/**
 * Minimal-but-useful currency directory for search/typeahead.
 * You can extend this list anytime (ISO 4217 has ~170 active codes).
 */
export const CURRENCIES: CurrencyEntry[] = [
  // Base / common
  { code: "SGD", name: "Singapore Dollar", symbol: "$" },
  { code: "USD", name: "United States Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound Sterling", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "$" },

  // Asia
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs" },

  // Middle East
  { code: "AED", name: "United Arab Emirates Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },

  // Europe
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "RON", name: "Romanian Leu" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "HRK", name: "Croatian Kuna" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr" },

  // Americas
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$" },

  // Africa
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "TND", name: "Tunisian Dinar" },

  // Crypto (optional)
  { code: "BTC", name: "Bitcoin", symbol: "₿" },
  { code: "ETH", name: "Ethereum", symbol: "Ξ" },
];

const CODE_TO_ENTRY = new Map<string, CurrencyEntry>(
  CURRENCIES.map((c) => [c.code.toUpperCase(), { ...c, code: c.code.toUpperCase() }])
);

export function normalizeCurrencyQuery(q: string): string {
  return q.trim().toUpperCase();
}

export function getCurrencyByCode(code: string): CurrencyEntry | null {
  const k = normalizeCurrencyQuery(code);
  return CODE_TO_ENTRY.get(k) ?? null;
}

export type CurrencySuggestion = CurrencyEntry & {
  score: number;
};

/**
 * Simple search: ranks by
 *  0) exact code match
 *  1) code prefix
 *  2) code contains
 *  3) name contains
 */
export function searchCurrencies(params: {
  query: string;
  excludeCodes?: string[];
  limit?: number;
}): CurrencySuggestion[] {
  const { query, excludeCodes = [], limit = 8 } = params;
  const q = normalizeCurrencyQuery(query);
  if (!q) return [];

  const excluded = new Set(excludeCodes.map((c) => normalizeCurrencyQuery(c)));

  const results: CurrencySuggestion[] = [];

  for (const c of CURRENCIES) {
    const code = c.code.toUpperCase();
    if (excluded.has(code)) continue;

    const nameUp = c.name.toUpperCase();

    let score = -1;
    if (code === q) score = 0;
    else if (code.startsWith(q)) score = 1;
    else if (code.includes(q)) score = 2;
    else if (nameUp.includes(q)) score = 3;

    if (score >= 0) results.push({ ...c, code, score });
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.code.localeCompare(b.code);
  });

  return results.slice(0, Math.max(1, Math.min(20, limit)));
}
