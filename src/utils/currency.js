/**
 * ArkCRM — Currency helpers
 * ---------------------------------------------------------------------------
 * Formatting, conversion and compact display for tenant amounts. The tenant's
 * base currency is resolved by useTenant() and passed in explicitly, so these
 * functions stay pure and testable.
 */

import { CURRENCIES, DEFAULT_CURRENCY, USD_RATES } from '@/config/currencies.config';

/**
 * Converts an amount between currencies using the static rate table.
 * Rates are "units per 1 USD", so the pivot is: amount / fromRate * toRate.
 *
 * @param {number} amount
 * @param {string} from  ISO code, e.g. 'NGN'
 * @param {string} to    ISO code
 * @returns {number} converted amount, rounded to 2 decimals
 */
export function convertCurrency(amount, from = DEFAULT_CURRENCY, to = DEFAULT_CURRENCY) {
  if (from === to) return round(amount);
  const fromRate = USD_RATES[from];
  const toRate = USD_RATES[to];
  if (!fromRate || !toRate) return round(amount);
  return round((amount / fromRate) * toRate);
}

/** Rounds to 2 decimals, guarding against NaN/undefined. */
export function round(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

/**
 * Full currency formatting.
 *
 * @param {number} value
 * @param {object} [options]
 * @param {string} [options.currency='NGN'] target ISO code
 * @param {number} [options.decimals] override the currency's precision
 * @param {boolean} [options.showSymbol=true]
 * @param {boolean} [options.showCode=false] append e.g. "NGN" after the number
 * @param {boolean} [options.compact=false] shorten to 1.2M / 45.3k
 * @param {'auto'|'always'} [options.sign='auto'] force a leading + on positives
 * @returns {string}
 */
export function formatCurrency(value, options = {}) {
  const {
    currency = DEFAULT_CURRENCY,
    decimals,
    showSymbol = true,
    showCode = false,
    compact = false,
    sign = 'auto',
  } = options;

  const meta = CURRENCIES[currency] ?? CURRENCIES[DEFAULT_CURRENCY];
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;

  const precision = decimals ?? meta.decimals ?? 2;
  const prefix = sign === 'always' && safe > 0 ? '+' : '';

  let body;
  if (compact) {
    body = formatCompactNumber(safe, precision);
  } else {
    body = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(safe);
  }

  if (!showSymbol) return `${prefix}${body}${showCode ? ` ${meta.code}` : ''}`;

  // Naira and Rand read better with the symbol tight against the number.
  const glued = meta.code === 'NGN' || meta.code === 'ZAR';
  const rendered =
    meta.symbolPosition === 'before'
      ? glued
        ? `${prefix}${meta.symbol}${body}`
        : `${prefix}${meta.symbol}${body}`
      : `${prefix}${body} ${meta.symbol}`;

  return showCode ? `${rendered} ${meta.code}` : rendered;
}

/**
 * Compact notation for dashboard tiles: 1.24B / 45.6M / 12.3k / 940.
 */
export function formatCompactNumber(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  const units = [
    { limit: 1e12, suffix: 'T' },
    { limit: 1e9, suffix: 'B' },
    { limit: 1e6, suffix: 'M' },
    { limit: 1e3, suffix: 'k' },
  ];

  const match = units.find((u) => abs >= u.limit);
  if (!match) {
    return `${sign}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)}`;
  }

  const scaled = abs / match.limit;
  return `${sign}${scaled.toFixed(scaled >= 100 ? 0 : decimals)}${match.suffix}`;
}

/** Money without a symbol — used inside dense table cells with a header unit. */
export function formatAmount(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Percentage with a sign — for trend badges (+12.4% / -3.1%). */
export function formatPercent(value, decimals = 1, withSign = true) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  const body = `${Math.abs(n).toFixed(decimals)}%`;
  if (!withSign || n === 0) return body;
  return `${n > 0 ? '+' : '-'}${body}`;
}

/** Percentage change between two periods. Returns 0 when the base is 0. */
export function percentChange(current, previous) {
  const prev = Number(previous);
  const curr = Number(current);
  if (!Number.isFinite(prev) || prev === 0) return 0;
  return round(((curr - prev) / Math.abs(prev)) * 100, 1);
}

/** Renders a currency symbol only, for column headers ("Amount (₦)"). */
export function currencySymbol(currency = DEFAULT_CURRENCY) {
  return CURRENCIES[currency]?.symbol ?? CURRENCIES[DEFAULT_CURRENCY].symbol;
}

/** True when the value is a usable, finite, non-negative number. */
export function isValidAmount(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

/* ---------------------------------------------------------------------------
 * TAX / LINE-TOTAL MATH
 * Shared by the invoice builder, quote builder and order form so totals are
 * calculated identically everywhere. The backend recalculates on save.
 * ------------------------------------------------------------------------- */

/** Applies a tax rate to a net amount. */
export function addTax(netAmount, taxRate = 0) {
  return round(Number(netAmount) * (1 + Number(taxRate || 0)));
}

/** Extracts the tax portion from a gross amount. */
export function extractTax(grossAmount, taxRate = 0) {
  const gross = Number(grossAmount) || 0;
  const rate = Number(taxRate || 0);
  return round(gross - gross / (1 + rate));
}

/**
 * Sums an order's line items into a document total breakdown.
 *
 * @param {Array<{quantity:number, unitPrice:number, taxRate?:number, discount?:number}>} items
 * @returns {{subtotal:number, discountTotal:number, taxTotal:number, grandTotal:number, itemCount:number}}
 */
export function calculateDocumentTotals(items = []) {
  const result = items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const lineNet = qty * price;
      const discount = Number(item.discount) || 0;
      /* Discount is a percentage of the line, per the quote builder UI. */
      const afterDiscount = lineNet - lineNet * (discount / 100);
      const tax = afterDiscount * (Number(item.taxRate) || 0);

      acc.subtotal = round(acc.subtotal + lineNet);
      acc.discountTotal = round(acc.discountTotal + (lineNet - afterDiscount));
      acc.taxTotal = round(acc.taxTotal + tax);
      acc.grandTotal = round(acc.grandTotal + afterDiscount + tax);
      acc.itemCount += 1;
      return acc;
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0, itemCount: 0 },
  );

  return result;
}

/** Splits a payment across the oldest invoices first (FIFO allocation). */
export function allocatePayment(amount, invoices = []) {
  let remaining = Number(amount) || 0;
  const allocations = [];
  const sorted = [...invoices].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  for (const invoice of sorted) {
    if (remaining <= 0) break;
    const outstanding = round((invoice.total ?? 0) - (invoice.amountPaid ?? 0));
    if (outstanding <= 0) continue;
    const applied = round(Math.min(remaining, outstanding));
    allocations.push({ invoiceId: invoice.id, applied, remainingAfter: round(outstanding - applied) });
    remaining = round(remaining - applied);
  }

  return { allocations, unallocated: Math.max(0, remaining) };
}

/** Aging bucket (0/30/60/90+ days past due) for AR/AP tables. */
export function agingBucket(dueDate) {
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(due)) return 0;
  const days = Math.floor((Date.now() - due) / 86400000);
  if (days <= 0) return 0;
  if (days <= 30) return 30;
  if (days <= 60) return 60;
  if (days <= 90) return 90;
  return 120; // 90+ collapses to a single bucket
}

export const AGING_BUCKETS = [
  { id: 0, label: 'Current', tone: 'success' },
  { id: 30, label: '1–30 days', tone: 'info' },
  { id: 60, label: '31–60 days', tone: 'warning' },
  { id: 90, label: '61–90 days', tone: 'warning' },
  { id: 120, label: '90+ days', tone: 'danger' },
];
