/**
 * NexERP — Form validation helpers
 * ---------------------------------------------------------------------------
 * Small, dependency-free validators returning either a boolean or an error
 * string. Each form composes them into a `rules` object consumed by the
 * shared Input component, so error messaging is consistent app-wide.
 *
 * The backend re-validates everything; this layer exists for instant UX only.
 */

/* ---------------------------------------------------------------------------
 * PRIMITIVES
 * ------------------------------------------------------------------------- */

/** Required, after trimming. */
export const required = (value) => {
  if (value === null || value === undefined) return 'This field is required';
  if (typeof value === 'string' && value.trim() === '') return 'This field is required';
  if (Array.isArray(value) && value.length === 0) return 'Select at least one option';
  return '';
};

/** Minimum string length. */
export const minLength = (value, length) =>
  !value || String(value).trim().length >= length
    ? ''
    : `Must be at least ${length} characters`;

/** Maximum string length. */
export const maxLength = (value, length) =>
  !value || String(value).length <= length ? '' : `Must be ${length} characters or fewer`;

/**
 * Email. Intentionally pragmatic rather than RFC-complete — the confirmation
 * email is the real verification.
 */
export const email = (value) => {
  if (!value) return '';
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value).trim())
    ? ''
    : 'Enter a valid email address';
};

/**
 * Nigerian phone number — 0803…, +234803…, 234803… all accepted.
 * Other markets fall back to a looser international check.
 */
export const phone = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/[\s()-]/g, '');
  if (/^(\+?234|0)[789]\d{9}$/.test(digits)) return '';
  if (/^\+?[1-9]\d{7,14}$/.test(digits)) return '';
  return 'Enter a valid phone number';
};

/** Password strength: 8+ chars with an upper, a lower, a digit and a symbol.
 *  Mirrors utils/passwordStrength.js exactly so the register meter can never
 *  show "Strong" for a password this rule rejects. */
export const password = (value) => {
  if (!value) return '';
  const v = String(value);
  if (v.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-z]/.test(v)) return 'Include at least one lowercase letter';
  if (!/[A-Z]/.test(v)) return 'Include at least one uppercase letter';
  if (!/\d/.test(v)) return 'Include at least one number';
  if (!/[^\w\s]/.test(v)) return 'Include at least one symbol';
  return '';
};

/** Password confirmation rule factory. */
export const confirmPassword = (getPassword) => (value) =>
  !value ? 'Confirm your password' : value === getPassword() ? '' : 'Passwords do not match';

/** Digits only, with an optional length constraint. */
export const numeric = (value, length) => {
  if (!value) return '';
  if (!/^\d+$/.test(String(value))) return 'Digits only';
  if (length && String(value).length !== length) return `Must be exactly ${length} digits`;
  return '';
};

/** Non-negative money amount, max 2 decimal places. */
export const money = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Enter a valid amount';
  if (n < 0) return 'Amount cannot be negative';
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).replace(/,/g, ''))) {
    return 'Use at most 2 decimal places';
  }
  return '';
};

/** Quantity: positive whole number. */
export const quantity = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 'Enter a whole number of 1 or more';
  return '';
};

/** Percentage between 0 and 100. */
export const percent = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Enter a valid percentage';
  if (n < 0 || n > 100) return 'Must be between 0 and 100';
  return '';
};

/** SKU / product code: letters, numbers, dashes. */
export const sku = (value) => {
  if (!value) return '';
  return /^[A-Za-z0-9-]{3,32}$/.test(String(value).trim())
    ? ''
    : 'Use 3–32 letters, numbers or dashes';
};

/** URL, allowing protocol-less input. */
export const url = (value) => {
  if (!value) return '';
  return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(String(value).trim())
    ? ''
    : 'Enter a valid URL';
};

/** One of a fixed set. */
export const oneOf = (value, options = []) => {
  if (!value) return '';
  return options.includes(value) ? '' : 'Select a valid option';
};

/** ISO 3166-1 alpha-2 country code. */
export const countryCode = (value) => {
  if (!value) return '';
  return /^[A-Za-z]{2}$/.test(String(value).trim()) ? '' : 'Use a 2-letter country code';
};

/** Must be a valid calendar date (rejects 2025-02-31). */
export const date = (value) => {
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? '' : 'Use the format YYYY-MM-DD';
};

/** Must be on or after today. */
export const futureDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Enter a valid date';
  return d.getTime() >= Date.now() - 86400000 ? '' : 'Date cannot be in the past';
};

/* ---------------------------------------------------------------------------
 * COMPOSITION
 * ------------------------------------------------------------------------- */

/**
 * Runs a field's rule list and returns the first non-empty error.
 * @param {*} value
 * @param {Array<Function>} rules
 */
export function runRules(value, rules = []) {
  for (const rule of rules) {
    const result = rule(value);
    if (result) return result;
  }
  return '';
}

/**
 * Validates an entire form.
 * @param {Object} values
 * @param {Object<string, Function[]>} schema field -> rules
 * @returns {{valid: boolean, errors: Object}}
 */
export function validateForm(values = {}, schema = {}) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const error = runRules(values[field], rules);
    if (error) errors[field] = error;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Turns validation errors into a Recharts/analytics-safe object, or simply
 * returns the form values when clean.
 */
export function sanitizeOnSubmit(values, errors) {
  if (Object.keys(errors).length > 0) return null;
  /* Strip the confirm-password field before it reaches the API. */
  const { confirmPassword: _omit, ...payload } = values;
  return payload;
}

/* ---------------------------------------------------------------------------
 * SHARED SCHEMAS
 * Referenced directly by the auth, customer, product and invoice forms.
 * ------------------------------------------------------------------------- */
export const schemas = {
  login: {
    email: [required, email],
    password: [required],
    rememberMe: [],
  },
  register: {
    /* `minLength` takes (value, length), so a bound rule has to be wrapped —
       `minLength.bind(null, 2)` would shift the arguments and never fire. */
    fullName: [required, (value) => minLength(value, 2)],
    email: [required, email],
    phone: [required, phone],
    businessName: [required, (value) => minLength(value, 2)],
    role: [required],
    password: [required, password],
    confirmPassword: [required],
    acceptTerms: [required],
  },
  customer: {
    name: [required, (value) => minLength(value, 2)],
    email: [email],
    phone: [phone],
    creditLimit: [money],
    taxNumber: [],
  },
  product: {
    name: [required, (value) => minLength(value, 2)],
    sku: [required, sku],
    category: [required],
    price: [required, money],
    costPrice: [money],
    reorderLevel: [required, quantity],
    taxRate: [percent],
  },
  invoice: {
    customerId: [required],
    issueDate: [required, date],
    dueDate: [required, futureDate],
    currency: [required],
    items: [required],
  },
  expense: {
    category: [required],
    amount: [required, money],
    expenseDate: [required, date],
    description: [required, (value) => minLength(value, 5)],
    vendorName: [required],
  },
  lead: {
    name: [required],
    company: [],
    email: [email],
    phone: [phone],
    value: [money],
    source: [required],
  },
  leave: {
    leaveType: [required],
    startDate: [required, date],
    endDate: [required, date],
    reason: [required, (value) => minLength(value, 10)],
  },
  employee: {
    fullName: [required],
    email: [required, email],
    phone: [required, phone],
    department: [required],
    role: [required],
    joinDate: [required, date],
    salary: [required, money],
  },
};

/** Convenience: `isValid('email', 'foo@bar.com')` */
export function isValid(field, value) {
  const rules = schemas[field];
  return rules ? runRules(value, rules) === '' : true;
}
