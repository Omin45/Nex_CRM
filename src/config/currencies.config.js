/**
 * NexERP — Supported currencies
 * ---------------------------------------------------------------------------
 * Every tenant picks a base currency at onboarding; the symbol and decimal
 * precision differ per market. Formatting is centralised in utils/currency.js,
 * which consumes this map.
 */

export const CURRENCIES = {
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    decimals: 2,
    /* Symbol sits before the amount: ₦1,250,000.00 */
    symbolPosition: 'before',
    locale: 'en-NG',
    flag: '🇳🇬',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'before',
    locale: 'en-US',
    flag: '🇺🇸',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    /* Trailing symbol: 1.250.000,00 € */
    symbolPosition: 'after',
    locale: 'de-DE',
    flag: '🇪🇺',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    symbolPosition: 'before',
    locale: 'en-GB',
    flag: '🇬🇧',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    decimals: 2,
    symbolPosition: 'before',
    locale: 'en-ZA',
    flag: '🇿🇦',
  },
  GHS: {
    code: 'GHS',
    symbol: '₵',
    name: 'Ghanaian Cedi',
    decimals: 2,
    symbolPosition: 'before',
    locale: 'en-GH',
    flag: '🇬🇭',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    decimals: 2,
    symbolPosition: 'before',
    locale: 'en-KE',
    flag: '🇰🇪',
  },
};

export const DEFAULT_CURRENCY = 'NGN';

export const CURRENCY_CODES = Object.keys(CURRENCIES);

/**
 * Static indicative rates, expressed relative to USD (1 USD = X).
 * In production these are fetched daily from the FX service the Spring Boot
 * backend proxies, and cached in the tenant settings table.
 */
export const USD_RATES = {
  USD: 1,
  NGN: 1540.5,
  EUR: 0.92,
  GBP: 0.79,
  ZAR: 18.4,
  GHS: 15.2,
  KES: 129.8,
};

/** Currencies offered in the onboarding wizard, in display order. */
export const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code,
  label: `${CURRENCIES[code].symbol}  ${code} — ${CURRENCIES[code].name}`,
  short: CURRENCIES[code],
}));

/** Payment rails offered per currency — shown on invoice payment dialogs. */
export const PAYMENT_METHODS = {
  NGN: [
    { id: 'bank_transfer', label: 'Bank transfer' },
    { id: 'pos', label: 'POS terminal' },
    { id: 'cash', label: 'Cash' },
    { id: 'mobile_money', label: 'Mobile money' },
  ],
  USD: [
    { id: 'bank_transfer', label: 'Wire transfer' },
    { id: 'card', label: 'Card' },
    { id: 'cash', label: 'Cash' },
  ],
  EUR: [
    { id: 'sepa', label: 'SEPA transfer' },
    { id: 'card', label: 'Card' },
  ],
  GBP: [
    { id: 'faster_payments', label: 'Faster Payments' },
    { id: 'card', label: 'Card' },
  ],
};

export const DEFAULT_PAYMENT_METHODS = PAYMENT_METHODS.USD;

/** VAT/GST rate presets offered per market. */
export const TAX_PRESETS = {
  NGN: [
    { id: 'vat_075', label: 'VAT 7.5%', rate: 0.075 },
    { id: 'vat_zero', label: 'VAT exempt', rate: 0 },
  ],
  USD: [{ id: 'none', label: 'No tax', rate: 0 }],
  EUR: [
    { id: 'vat_19', label: 'VAT 19%', rate: 0.19 },
    { id: 'vat_7', label: 'VAT 7%', rate: 0.07 },
    { id: 'vat_zero', label: 'Zero rated', rate: 0 },
  ],
  GBP: [
    { id: 'vat_20', label: 'VAT 20%', rate: 0.2 },
    { id: 'vat_zero', label: 'Zero rated', rate: 0 },
  ],
};
