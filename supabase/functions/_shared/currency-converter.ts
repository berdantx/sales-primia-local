// Shared currency conversion utility for edge functions
// Converts exotic currencies to USD using Frankfurter API with fallback rates

// Fallback rates (approximate, updated periodically) for currencies not supported by Frankfurter
const FALLBACK_RATES_TO_USD: Record<string, number> = {
  CVE: 0.0097,   // Cape Verdean Escudo
  AED: 0.2723,   // UAE Dirham
  BOB: 0.1449,   // Bolivian Boliviano
  CHF: 1.13,     // Swiss Franc
  EUR: 1.08,     // Euro
  GBP: 1.27,     // British Pound
  SEK: 0.095,    // Swedish Krona
  ARS: 0.00094,  // Argentine Peso
  CLP: 0.00105,  // Chilean Peso
  COP: 0.00024,  // Colombian Peso
  MXN: 0.058,    // Mexican Peso
  PEN: 0.27,     // Peruvian Sol
  UYU: 0.024,    // Uruguayan Peso
};

interface ConversionResult {
  convertedValue: number;
  rate: number;
  source: 'frankfurter' | 'fallback';
}

export async function convertToUSD(
  value: number,
  fromCurrency: string
): Promise<ConversionResult> {
  const currency = fromCurrency.toUpperCase();

  // No conversion needed
  if (currency === 'USD') {
    return { convertedValue: value, rate: 1, source: 'fallback' };
  }

  // Try Frankfurter API first
  try {
    const resp = await fetch(
      `https://api.frankfurter.app/latest?from=${currency}&to=USD&amount=${value}`
    );

    if (resp.ok) {
      const data = await resp.json();
      if (data.rates?.USD) {
        console.log(`Frankfurter: ${value} ${currency} = ${data.rates.USD} USD`);
        return {
          convertedValue: Number(data.rates.USD.toFixed(2)),
          rate: data.rates.USD / value,
          source: 'frankfurter',
        };
      }
    }
    console.warn(`Frankfurter API returned non-OK for ${currency}: ${resp.status}`);
  } catch (err) {
    console.warn(`Frankfurter API error for ${currency}:`, err);
  }

  // Fallback to static rates
  const rate = FALLBACK_RATES_TO_USD[currency];
  if (rate) {
    const converted = Number((value * rate).toFixed(2));
    console.log(`Fallback rate: ${value} ${currency} * ${rate} = ${converted} USD`);
    return { convertedValue: converted, rate, source: 'fallback' };
  }

  // Unknown currency - log warning and return original value as USD estimate
  console.error(`No conversion rate available for ${currency}, storing value as-is with USD`);
  return { convertedValue: value, rate: 1, source: 'fallback' };
}

/**
 * Check if a currency needs conversion (not BRL and not USD)
 */
export function needsConversion(currency: string): boolean {
  const upper = currency.toUpperCase();
  return upper !== 'BRL' && upper !== 'USD';
}
