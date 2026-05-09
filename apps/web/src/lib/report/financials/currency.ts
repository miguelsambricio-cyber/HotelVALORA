// Currency contract.
//
// Keeps locale + symbol + currency code in one place so a single switch
// (e.g. driven by hotel.market.country) flips the whole report. No string
// concatenation with `$` or `€` anywhere outside this module.

export type Currency = "EUR" | "USD" | "GBP";

interface CurrencyConfig {
  code: Currency;
  symbol: string;
  /** Intl.NumberFormat locale */
  locale: string;
  /** Symbol position relative to the value */
  symbolPosition: "prefix" | "suffix";
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  EUR: { code: "EUR", symbol: "€", locale: "es-ES", symbolPosition: "suffix" },
  USD: { code: "USD", symbol: "$", locale: "en-US", symbolPosition: "prefix" },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", symbolPosition: "prefix" },
};

/**
 * Resolve the default currency for a hotel given its country code.
 * Future: route market metadata → currency. Today: ES/EU → EUR, GB → GBP,
 * US → USD; everything else falls back to EUR.
 */
export function defaultCurrencyForCountry(countryCode: string): Currency {
  const upper = countryCode.toUpperCase();
  if (upper === "GB" || upper === "UK") return "GBP";
  if (upper === "US") return "USD";
  return "EUR";
}
