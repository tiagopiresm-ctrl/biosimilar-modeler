// ============================================================
// ECB Historical FX Rates & Country Currency Mapping
// ============================================================
// Annual average exchange rates: 1 EUR = X local currency units.
// Source: ECB Statistical Data Warehouse (approximate annual averages).
// EUR-zone countries return rate 1.0 for all periods.
// ============================================================

/** Maps predefined country name → ISO 4217 currency code. */
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'United States': 'USD',
  'Germany': 'EUR',
  'France': 'EUR',
  'United Kingdom': 'GBP',
  'Italy': 'EUR',
  'Spain': 'EUR',
  'Japan': 'JPY',
  'China': 'CNY',
  'Brazil': 'BRL',
  'Canada': 'CAD',
  'Australia': 'AUD',
  'South Korea': 'KRW',
  'Switzerland': 'CHF',
  'Netherlands': 'EUR',
  'Sweden': 'SEK',
};

/**
 * ECB annual average exchange rates: 1 EUR = X local currency.
 * Years 2018–2025 (2025 is an estimate based on early-year data).
 * EUR-zone currencies are not included — they always return 1.0.
 */
export const ECB_ANNUAL_FX: Record<number, Record<string, number>> = {
  2018: {
    USD: 1.1810, GBP: 0.8847, JPY: 130.40, CHF: 1.1550,
    CNY: 7.8081, BRL: 4.3085, CAD: 1.5294, AUD: 1.5797,
    KRW: 1299.26, SEK: 10.2583,
  },
  2019: {
    USD: 1.1195, GBP: 0.8778, JPY: 122.01, CHF: 1.1124,
    CNY: 7.7355, BRL: 4.4134, CAD: 1.4855, AUD: 1.6109,
    KRW: 1305.32, SEK: 10.5891,
  },
  2020: {
    USD: 1.1422, GBP: 0.8897, JPY: 121.85, CHF: 1.0705,
    CNY: 7.8747, BRL: 5.8935, CAD: 1.5300, AUD: 1.6549,
    KRW: 1345.58, SEK: 10.4867,
  },
  2021: {
    USD: 1.1827, GBP: 0.8596, JPY: 129.88, CHF: 1.0811,
    CNY: 7.6282, BRL: 6.3779, CAD: 1.4826, AUD: 1.5749,
    KRW: 1354.06, SEK: 10.1465,
  },
  2022: {
    USD: 1.0530, GBP: 0.8528, JPY: 138.03, CHF: 1.0047,
    CNY: 7.0788, BRL: 5.4399, CAD: 1.3695, AUD: 1.5167,
    KRW: 1358.07, SEK: 10.6317,
  },
  2023: {
    USD: 1.0813, GBP: 0.8698, JPY: 151.99, CHF: 0.9717,
    CNY: 7.6600, BRL: 5.4013, CAD: 1.4596, AUD: 1.6289,
    KRW: 1412.84, SEK: 11.4788,
  },
  2024: {
    USD: 1.0813, GBP: 0.8454, JPY: 163.57, CHF: 0.9410,
    CNY: 7.6711, BRL: 5.7846, CAD: 1.4811, AUD: 1.6359,
    KRW: 1470.18, SEK: 11.3859,
  },
  2025: {
    USD: 1.0500, GBP: 0.8400, JPY: 160.00, CHF: 0.9400,
    CNY: 7.6000, BRL: 6.2000, CAD: 1.5200, AUD: 1.6600,
    KRW: 1500.00, SEK: 11.2000,
  },
};

/**
 * Build an FX rate array for a given country over the model's period range.
 *
 * - For EUR-zone countries → all 1.0.
 * - For known currencies → uses ECB historical rates where available,
 *   falls back to the last known rate for future years.
 * - For unknown countries → all 1.0 (user can edit manually).
 *
 * @param countryName - Name of the country (must match COUNTRY_CURRENCY_MAP keys)
 * @param numPeriods  - Number of periods in the model
 * @param startYear   - Calendar year of the first period
 */
export function getEcbFxRates(
  countryName: string,
  numPeriods: number,
  startYear: number,
): number[] {
  const currency = COUNTRY_CURRENCY_MAP[countryName];
  if (!currency || currency === 'EUR') {
    return Array(numPeriods).fill(1);
  }

  // Find the latest year we have data for this currency
  const availableYears = Object.keys(ECB_ANNUAL_FX)
    .map(Number)
    .sort((a, b) => a - b);
  const lastAvailableYear = availableYears[availableYears.length - 1];

  // Find fallback rate: last available year's rate for this currency
  const fallbackRate = ECB_ANNUAL_FX[lastAvailableYear]?.[currency] ?? 1;

  return Array.from({ length: numPeriods }, (_, i) => {
    const year = startYear + i;
    return ECB_ANNUAL_FX[year]?.[currency] ?? fallbackRate;
  });
}
