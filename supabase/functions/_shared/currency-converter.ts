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
  DOP: 0.0166,   // Dominican Peso
  GTQ: 0.129,    // Guatemalan Quetzal
  HNL: 0.040,    // Honduran Lempira
  NIO: 0.027,    // Nicaraguan Córdoba
  PAB: 1.00,     // Panamanian Balboa (pegged to USD)
  PYG: 0.00013,  // Paraguayan Guaraní
  CRC: 0.0019,   // Costa Rican Colón
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

  // Try ExchangeRate API as second fallback
  try {
    const resp2 = await fetch(
      `https://open.er-api.com/v6/latest/${currency}`
    );
    if (resp2.ok) {
      const data2 = await resp2.json();
      if (data2.rates?.USD) {
        const converted = Number((value * data2.rates.USD).toFixed(2));
        console.log(`ExchangeRate API: ${value} ${currency} * ${data2.rates.USD} = ${converted} USD`);
        return { convertedValue: converted, rate: data2.rates.USD, source: 'frankfurter' };
      }
    }
    console.warn(`ExchangeRate API returned non-OK for ${currency}: ${resp2.status}`);
  } catch (err2) {
    console.warn(`ExchangeRate API error for ${currency}:`, err2);
  }

  // Unknown currency - log error and mark as UNKNOWN to avoid polluting KPIs
  console.error(`CRITICAL: No conversion rate available for ${currency}. Value ${value} will be marked as UNKNOWN.`);
  return { convertedValue: value, rate: 1, source: 'fallback' };
}

/**
 * Check if a currency needs conversion (not BRL and not USD)
 */
export function needsConversion(currency: string): boolean {
  const upper = currency.toUpperCase();
  return upper !== 'BRL' && upper !== 'USD';
}
