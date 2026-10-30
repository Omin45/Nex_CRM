/**
 * NexERP — Deterministic fixture data
 * ---------------------------------------------------------------------------
 * Seed records used by mockBackend.js while VITE_USE_MOCKS is true. The goal
 * is not realism for its own sake — it is exercising every UI state: long
 * names that must truncate, zero-value rows, overdue invoices, empty
 * collections, and status variety across all badge tones.
 *
 * Data is generated from a fixed-seed PRNG so screenshots and tests are
 * reproducible between reloads.
 *
 * DELETE this file (and flip VITE_USE_MOCKS=false) once the Spring Boot API
 * is live. Nothing else in the app imports it directly.
 */

import { demoAccounts } from '@/config/demoAccounts';
import {
  INVOICE_STATUS,
  EXPENSE_STATUS,
  PAYMENT_STATUS,
  LEAD_STAGES,
  PRODUCT_STATUS,
  VENDOR_STATUS,
  EMPLOYEE_STATUS,
  ATTENDANCE_STATUS,
  LEAVE_STATUS,
  PROJECT_STATUS,
  TASK_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
} from '@/config/constants';

/* ---------------------------------------------------------------------------
 * DETERMINISTIC PRNG (mulberry32) — replaces Math.random so the dataset is
 * byte-identical on every reload.
 * ------------------------------------------------------------------------- */
function makeRandom(seed = 20260928) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRandom();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickMany = (arr, n) =>
  Array.from({ length: n }, () => pick(arr)).filter((v, i, a) => a.indexOf(v) === i);
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p) => rand() < p;

const DAY = 86400000;
const now = Date.now();
const daysAgo = (n) => new Date(now - n * DAY).toISOString();
const daysAhead = (n) => new Date(now + n * DAY).toISOString();
const money = (min, max) => Math.round((min + rand() * (max - min)) * 100) / 100;
const round2 = (n) => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------------------
 * REFERENCE LISTS
 * ------------------------------------------------------------------------- */
const FIRST_NAMES = [
  'Adaeze', 'Chidi', 'Ngozi', 'Tunde', 'Aisha', 'Emeka', 'Bola', 'Yewande', 'Kofi', 'Zainab',
  'Obinna', 'Amara', 'Femi', 'Halima', 'Segun', 'Ijeoma', 'Bayo', 'Nneka', 'Sola', 'Damilola',
  'Marcus', 'Priya', 'Daniel', 'Sofia', 'James', 'Elena', 'Omar', 'Grace', 'Leo', 'Amina',
];
const LAST_NAMES = [
  'Okonkwo', 'Balogun', 'Adeyemi', 'Nwachukwu', 'Okafor', 'Eze', 'Ibrahim', 'Mensah', 'Obi',
  'Lawal', 'Chukwu', 'Abiodun', 'Salami', 'Uche', 'Bello', 'Danjuma', 'Ojo', 'Adebayo', 'Sani',
  'Whitfield', 'Raman', 'Okafor', 'Delgado', 'Hartley', 'Bergstrom', 'Fitzgerald',
];
const COMPANY_PREFIX = [
  'Adunni', 'Baze', 'Crestline', 'Dangote', 'Eko', 'Firstbank', 'Greenfield', 'Highgate',
  'Ibara', 'Jubilee', 'Kano', 'Lagos', 'Meridian', 'Nollywood', 'Orchid', 'Prime',
  'Quantum', 'Riverside', 'Sahel', 'Trident', 'Unity', 'Vantage', 'Zenith',
];
const COMPANY_SUFFIX = [
  'Holdings', 'Industries', 'Logistics', 'Ventures', 'Nigeria Ltd', 'Global', 'Systems',
  'Trading', 'Services', 'Group', 'Enterprises', 'Pharma',
];
const PRODUCTS = [
  ['Wireless Barcode Scanner', 'ELEC-1042', 'Electronics', 48500, 31200],
  ['Thermal Receipt Printer', 'ELEC-1180', 'Electronics', 67500, 44900],
  ['POS Terminal 15"', 'ELEC-1290', 'Electronics', 285000, 198000],
  ['A4 Thermal Paper (5 rolls)', 'CONS-2011', 'Consumables', 9800, 5400],
  ['Receipt Paper Roll 80mm', 'CONS-2054', 'Consumables', 3200, 1450],
  ['Label Printer Ribbon', 'CONS-2100', 'Consumables', 6500, 2900],
  ['Card Reader NFC', 'ELEC-1400', 'Electronics', 92000, 63000],
  ['Cash Drawer Steel', 'ELEC-1455', 'Hardware', 118000, 82000],
  ['Receipt Book 3-part', 'CONS-2200', 'Consumables', 4400, 2100],
  ['Inventory Tag Set (100)', 'CONS-2250', 'Consumables', 7600, 3200],
  ['Barcode Generator Software', 'SOFT-3001', 'Software', 145000, 0],
  ['Cloud Sync Licence (1yr)', 'SOFT-3020', 'Software', 320000, 0],
  ['Server Rack 12U', 'HARD-4001', 'Hardware', 890000, 640000],
  ['UPS 6kVA Online', 'HARD-4050', 'Hardware', 1250000, 940000],
  ['Cat6 Patch Cable 5m', 'NETW-5001', 'Networking', 4200, 2100],
  ['Network Switch 24-Port', 'NETW-5040', 'Networking', 285000, 205000],
  ['Standing Desk 140cm', 'FURN-6001', 'Furniture', 385000, 248000],
  ['Ergonomic Task Chair', 'FURN-6030', 'Furniture', 245000, 152000],
  ['Filing Cabinet 4-Drawer', 'FURN-6060', 'Furniture', 178000, 118000],
  ['Cleaning Consumables Pack', 'CONS-2300', 'Consumables', 18500, 9600],
  ['Water Dispenser 50L', 'FURN-6100', 'Appliances', 320000, 224000],
  ['Air Conditioner 1.5HP', 'FURN-6150', 'Appliances', 685000, 498000],
];
const WAREHOUSES = [
  { id: 'WH-001', name: 'Lagos Central Hub', code: 'LOS-CEN', city: 'Lagos', manager: 'Chidi Balogun' },
  { id: 'WH-002', name: 'Abuja Depot', code: 'ABJ-DEP', city: 'Abuja', manager: 'Aisha Ibrahim' },
  { id: 'WH-003', name: 'Port Harcourt Store', code: 'PHC-STO', city: 'Port Harcourt', manager: 'Emeka Okafor' },
  { id: 'WH-004', name: 'Ibadan Annex', code: 'IBD-ANX', city: 'Ibadan', manager: 'Tunde Adeyemi' },
];
const DEPARTMENTS = [
  'Finance', 'Sales', 'Operations', 'Human Resources', 'Customer Support', 'IT', 'Marketing',
];
const LEAD_SOURCES = [
  'Website', 'Referral', 'Trade show', 'Cold outreach', 'Social media', 'Existing customer',
];
const INVOICE_CUSTOMERS = [
  'Baze Trading Ltd', 'Highgate Industries', 'Orchid Ventures', 'Quantum Systems',
  'Riverside Group', 'Adunni Holdings', 'Jubilee Nigeria Ltd', 'Trident Global',
  'Meridian Services', 'Vantage Enterprises', 'Kano Logistics', 'Zenith Pharma',
];
const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City'];

/** Builds a person name and email pair. */
function person(i) {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length];
  return {
    firstName: first,
    lastName: last,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@${pick(
      ['gmail.com', 'outlook.com', 'yahoo.com', 'nexerp.io'],
    )}`,
  };
}

function company(i) {
  return `${COMPANY_PREFIX[i % COMPANY_PREFIX.length]} ${
    COMPANY_SUFFIX[(i * 3) % COMPANY_SUFFIX.length]
  }`;
}

/* ---------------------------------------------------------------------------
 * SESSION / AUTH
 * ------------------------------------------------------------------------- */
export const session = {
  user: {
    id: 'USR-1001',
    firstName: 'Adaeze',
    lastName: 'Okonkwo',
    fullName: 'Adaeze Okonkwo',
    email: 'adaeze.okonkwo@nexerp.io',
    phone: '+234 803 551 0192',
    role: 'VENDOR_OWNER',
    avatar: null,
    jobTitle: 'Chief Executive Officer',
    vendorId: 'VND-0001',
    lastLoginAt: daysAgo(0),
    mfaEnabled: true,
  },
  tenant: {
    id: 'VND-0001',
    name: 'Meridian Systems Nigeria',
    shortName: 'Meridian',
    registrationNumber: 'RC-1482093',
    taxNumber: 'TIN-20984711',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    country: 'NG',
    plan: 'ENTERPRISE',
    logo: null,
    createdAt: daysAgo(742),
    seats: { used: 24, total: 50 },
  },
};

/**
 * Session payload for every demo identity in config/demoAccounts.js.
 *
 * Built rather than typed out so a role can never drift from its roster entry:
 * the account table owns the person, this block owns the shape the auth slice
 * expects (`{ user, tenant }`).
 *
 * Platform accounts carry no tenant at all — they are scoped to the whole
 * platform, and ProtectedRoute uses that to keep them out of the vendor shell.
 */
const demoSessions = new Map(
  demoAccounts.map((account) => [
    account.email.toLowerCase(),
    {
      user: {
        id: `USR-${account.key.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)}-1`,
        firstName: account.firstName,
        lastName: account.lastName,
        fullName: `${account.firstName} ${account.lastName}`,
        email: account.email,
        phone: `+234 ${int(800, 899)} ${int(100, 999)} ${int(1000, 9999)}`,
        role: account.role,
        avatar: null,
        jobTitle: account.jobTitle,
        vendorId: account.scope === 'platform' ? null : session.user.vendorId,
        lastLoginAt: daysAgo(0),
        mfaEnabled: account.scope === 'platform',
      },
      tenant: account.scope === 'platform' ? null : { ...session.tenant },
    },
  ]),
);

/** @returns {{user, tenant}|null} the session a demo email signs in as. */
export function findDemoSession(email) {
  const key = String(email ?? '').trim().toLowerCase();
  return demoSessions.get(key) ?? null;
}

/* ---------------------------------------------------------------------------
 * VENDORS (platform-level tenants)
 * ------------------------------------------------------------------------- */
export const vendors = Array.from({ length: 18 }, (_, i) => {
  const p = person(i);
  const statuses = [
    VENDOR_STATUS.ACTIVE, VENDOR_STATUS.ACTIVE, VENDOR_STATUS.ACTIVE, VENDOR_STATUS.PENDING,
    VENDOR_STATUS.ACTIVE, VENDOR_STATUS.SUSPENDED, VENDOR_STATUS.ACTIVE, VENDOR_STATUS.PENDING,
  ];
  return {
    id: `VND-${String(i + 1).padStart(4, '0')}`,
    name: company(i),
    contactName: p.name,
    email: p.email,
    phone: `+234 ${int(800, 899)} ${int(100, 999)} ${int(1000, 9999)}`,
    country: 'NG',
    city: CITIES[i % CITIES.length],
    currency: chance(0.75) ? 'NGN' : pick(['USD', 'GBP', 'EUR']),
    plan: pick(['STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE']),
    status: statuses[i % statuses.length],
    employees: int(3, 180),
    modules: pickMany(['sales', 'accounting', 'inventory', 'hr', 'projects', 'support'], int(3, 5)),
    mrr: money(45_000, 1_450_000),
    invoicesIssued: int(12, 4800),
    createdAt: daysAgo(int(20, 900)),
    lastActiveAt: daysAgo(int(0, 40)),
    onboardingStep: chance(0.3) ? int(1, 4) : 5,
  };
});

/* ---------------------------------------------------------------------------
 * CUSTOMERS
 * ------------------------------------------------------------------------- */
export const customers = Array.from({ length: 64 }, (_, i) => {
  const p = person(i);
  const c = company(i);
  const totalBilled = money(250_000, 18_500_000);
  const paidRatio = rand() * 0.95;
  return {
    id: `CUS-${String(1000 + i)}`,
    code: `C-${String(1000 + i)}`,
    name: c,
    contactName: p.name,
    email: p.email,
    phone: `+234 ${int(800, 899)} ${int(100, 999)} ${int(1000, 9999)}`,
    city: CITIES[i % CITIES.length],
    country: 'NG',
    status: chance(0.86) ? 'ACTIVE' : pick(['INACTIVE', 'ON_HOLD', 'BLOCKED']),
    segment: pick(['Enterprise', 'SMB', 'Retail', 'Distributor', 'Government']),
    taxNumber: `TIN-${int(10000000, 99999999)}`,
    creditLimit: money(500_000, 25_000_000),
    totalBilled: round2(totalBilled),
    totalPaid: round2(totalBilled * paidRatio),
    outstanding: round2(totalBilled * (1 - paidRatio)),
    invoiceCount: int(1, 84),
    lastInvoiceAt: daysAgo(int(1, 220)),
    lastActivityAt: daysAgo(int(0, 60)),
    owner: person(i + 40).name,
    notes: chance(0.3) ? 'Requires purchase order reference on all invoices.' : '',
  };
});

/* ---------------------------------------------------------------------------
 * PRODUCTS & INVENTORY
 * ------------------------------------------------------------------------- */
export const products = Array.from({ length: 42 }, (_, i) => {
  const [name, skuCode, category, price, costPrice] = PRODUCTS[i % PRODUCTS.length];
  const onHand = chance(0.12) ? 0 : int(0, 640);
  const reorderLevel = int(10, 80);
  return {
    id: `PRD-${String(2000 + i)}`,
    name,
    sku: i < PRODUCTS.length ? skuCode : `${skuCode}-${i}`,
    category,
    unit: pick(['Unit', 'Box', 'Pack', 'Carton', 'Set']),
    price: round2(price),
    costPrice: round2(costPrice),
    margin: price > 0 ? round2(((price - costPrice) / price) * 100) : 0,
    onHand,
    reorderLevel,
    /* Derived status — the Inventory page colours rows from this. */
    status:
      onHand === 0
        ? PRODUCT_STATUS.OUT_OF_STOCK
        : onHand <= reorderLevel
          ? PRODUCT_STATUS.LOW_STOCK
          : PRODUCT_STATUS.IN_STOCK,
    warehouseId: WAREHOUSES[i % WAREHOUSES.length].id,
    supplier: company(i + 5),
    barcode: `50${int(100000000, 999999999)}`,
    createdAt: daysAgo(int(30, 800)),
    updatedAt: daysAgo(int(0, 45)),
  };
});

export const warehouses = WAREHOUSES.map((w, i) => ({
  ...w,
  capacity: int(2000, 14000),
  utilisation: int(28, 96),
  skuCount: int(120, 1400),
  totalValue: money(12_000_000, 480_000_000),
  isPrimary: i === 0,
  status: i === 2 ? 'OFFLINE' : 'ONLINE',
}));

const MOVE_TYPES = ['RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN'];
export const stockMovements = Array.from({ length: 70 }, (_, i) => {
  const p = products[i % products.length];
  const type = MOVE_TYPES[i % MOVE_TYPES.length];
  const qty = int(1, 240);
  return {
    id: `MOV-${String(5000 + i)}`,
    reference: `${type.slice(0, 3)}-${String(10000 + i)}`,
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    type,
    quantity: type === 'ISSUE' ? -qty : qty,
    fromWarehouse: WAREHOUSES[i % WAREHOUSES.length].name,
    toWarehouse: WAREHOUSES[(i + 1) % WAREHOUSES.length].name,
    reason: pick(['Purchase receipt', 'Sales issue', 'Cycle count', 'Damaged goods', 'Customer return', 'Internal transfer']),
    performedBy: person(i + 12).name,
    createdAt: daysAgo(int(0, 90)),
  };
});

/* ---------------------------------------------------------------------------
 * SALES: leads, quotes, orders
 * ------------------------------------------------------------------------- */
export const leads = Array.from({ length: 48 }, (_, i) => {
  const p = person(i);
  const stage = LEAD_STAGES[i % LEAD_STAGES.length];
  return {
    id: `LD-${String(3000 + i)}`,
    name: p.name,
    company: chance(0.8) ? company(i) : '',
    email: p.email,
    phone: `+234 ${int(800, 899)} ${int(100, 999)} ${int(1000, 9999)}`,
    stage: stage.id,
    stageLabel: stage.label,
    value: money(150_000, 12_000_000),
    probability: stage.probability,
    source: pick(LEAD_SOURCES),
    owner: person(i + 25).name,
    expectedCloseDate: daysAhead(int(3, 90)),
    score: int(12, 98),
    tags: pickMany(['hot', 'enterprise', 'referral', 'follow-up', 'renewal', 'demo-done'], int(1, 3)),
    notes: chance(0.4) ? 'Wants net-30 payment terms. Compare against incumbent supplier.' : '',
    createdAt: daysAgo(int(1, 120)),
    updatedAt: daysAgo(int(0, 20)),
  };
});

export const quotes = Array.from({ length: 32 }, (_, i) => {
  const c = INVOICE_CUSTOMERS[i % INVOICE_CUSTOMERS.length];
  const total = money(120_000, 9_500_000);
  return {
    id: `QT-${String(4000 + i)}`,
    number: `QT-2026-${String(1000 + i)}`,
    customer: c,
    customerId: `CUS-${1000 + (i % 60)}`,
    issueDate: daysAgo(int(1, 90)),
    validUntil: daysAhead(int(-5, 30)),
    total: round2(total),
    status: pick(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED']),
    owner: person(i + 8).name,
    items: int(1, 9),
    probability: int(10, 95),
  };
});

export const orders = Array.from({ length: 38 }, (_, i) => {
  const c = INVOICE_CUSTOMERS[i % INVOICE_CUSTOMERS.length];
  const total = money(200_000, 14_000_000);
  return {
    id: `SO-${String(5000 + i)}`,
    number: `SO-2026-${String(2000 + i)}`,
    customer: c,
    customerId: `CUS-${1000 + (i % 60)}`,
    orderDate: daysAgo(int(1, 120)),
    deliveryDate: daysAhead(int(-3, 45)),
    total: round2(total),
    status: pick(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    fulfilment: int(0, 100),
    warehouse: WAREHOUSES[i % WAREHOUSES.length].name,
    owner: person(i + 15).name,
    items: int(1, 14),
  };
});

/* ---------------------------------------------------------------------------
 * ACCOUNTING
 * ------------------------------------------------------------------------- */
const INVOICE_STATUS_KEYS = Object.keys(INVOICE_STATUS);

export const invoices = Array.from({ length: 56 }, (_, i) => {
  const total = money(85_000, 11_000_000);
  const status = i < INVOICE_STATUS_KEYS.length * 3
    ? INVOICE_STATUS_KEYS[i % INVOICE_STATUS_KEYS.length]
    : pick(['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'SENT']);
  const paidRatio =
    status === 'PAID' ? 1 : status === 'PARTIALLY_PAID' ? 0.4 + rand() * 0.4 : 0;
  const dueOffset = status === 'OVERDUE' ? -int(5, 75) : int(-10, 60);
  return {
    id: `INV-${String(6000 + i)}`,
    number: `INV-2026-${String(3000 + i)}`,
    customer: INVOICE_CUSTOMERS[i % INVOICE_CUSTOMERS.length],
    customerId: `CUS-${1000 + (i % 60)}`,
    issueDate: daysAgo(int(2, 180)),
    dueDate: daysAhead(dueOffset),
    total: round2(total),
    amountPaid: round2(total * paidRatio),
    balance: round2(total * (1 - paidRatio)),
    status: INVOICE_STATUS[status],
    statusKey: status,
    currency: 'NGN',
    taxTotal: round2(total * 0.075),
    items: int(1, 12),
    paymentTerms: pick(['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60']),
    owner: person(i + 30).name,
  };
});

const EXPENSE_CATEGORIES = [
  'Payroll', 'Rent & utilities', 'Marketing', 'Travel', 'Software subscriptions',
  'Equipment', 'Professional fees', 'Logistics', 'Maintenance', 'Tax & duties',
];
export const expenses = Array.from({ length: 44 }, (_, i) => {
  const status = i < 15 ? pick(Object.keys(EXPENSE_STATUS)) : 'APPROVED';
  return {
    id: `EXP-${String(7000 + i)}`,
    reference: `EX-2026-${String(4000 + i)}`,
    description: pick([
      'Fuel reimbursement — client visit',
      'Monthly warehouse rent',
      'Annual software renewals',
      'Consulting fee — tax advisory',
      'Diesel for delivery fleet',
      'Office internet and power',
      'Trade association subscription',
      'Equipment repair — forklift',
    ]),
    category: pick(EXPENSE_CATEGORIES),
    amount: money(15_000, 2_400_000),
    expenseDate: daysAgo(int(1, 120)),
    vendorName: company(i + 20),
    status: EXPENSE_STATUS[status],
    statusKey: status,
    submittedBy: person(i + 18).name,
    approver: chance(0.7) ? person(i + 50).name : null,
    receiptUrl: chance(0.5) ? `/files/receipt-${i}.pdf` : null,
  };
});

export const ledger = Array.from({ length: 40 }, (_, i) => {
  const debit = money(50_000, 4_000_000);
  const credit = chance(0.5) ? money(50_000, 4_000_000) : 0;
  return {
    id: `LG-${String(8000 + i)}`,
    date: daysAgo(int(0, 90)),
    account: pick(['4000 — Sales Revenue', '1100 — Accounts Receivable', '2100 — Accounts Payable', '5000 — Cost of Goods Sold', '6100 — Operating Expenses', '1200 — Inventory', '2100 — VAT Payable']),
    reference: `JE-2026-${String(5000 + i)}`,
    description: pick(['Sales invoice issued', 'Customer payment received', 'Supplier invoice booked', 'Stock purchase', 'Payroll posting', 'Bank charge']),
    debit: round2(debit),
    credit: round2(credit),
    currency: 'NGN',
  };
});

/* ---------------------------------------------------------------------------
 * HR
 * ------------------------------------------------------------------------- */
export const employees = Array.from({ length: 26 }, (_, i) => {
  const p = person(i + 3);
  const status = i < 20 ? pick(Object.keys(EMPLOYEE_STATUS)) : 'ACTIVE';
  return {
    id: `EMP-${String(100 + i)}`,
    ...p,
    employeeNo: `NX-${String(1000 + i)}`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    role: pick(['Administrator', 'Manager', 'Analyst', 'Officer', 'Executive', 'Lead']),
    status: EMPLOYEE_STATUS[status],
    statusKey: status,
    phone: `+234 ${int(800, 899)} ${int(100, 999)} ${int(1000, 9999)}`,
    joinDate: daysAgo(int(30, 2200)),
    salary: money(85_000, 1_850_000),
    location: CITIES[i % CITIES.length],
    manager: person(i + 20).name,
    contractType: pick(['Full-time', 'Part-time', 'Contract', 'Intern']),
  };
});

export const attendance = Array.from({ length: 40 }, (_, i) => {
  const e = employees[i % employees.length];
  const status = i < 20 ? pick(Object.keys(ATTENDANCE_STATUS)) : 'PRESENT';
  const clockIn = status === 'PRESENT' ? `${int(7, 9)}:${pick(['02', '15', '30', '45'])}` : '—';
  return {
    id: `ATT-${String(9000 + i)}`,
    employeeId: e.id,
    employee: e.name,
    department: e.department,
    date: daysAgo(int(0, 14)),
    status: ATTENDANCE_STATUS[status],
    statusKey: status,
    clockIn,
    clockOut: status === 'PRESENT' ? `${int(16, 19)}:${pick(['05', '20', '40'])}` : '—',
    hours: status === 'PRESENT' ? int(7, 10) : 0,
    overtimeHours: chance(0.25) ? int(1, 4) : 0,
  };
});

export const leaves = Array.from({ length: 22 }, (_, i) => {
  const e = employees[i % employees.length];
  const status = i < 12 ? pick(Object.keys(LEAVE_STATUS)) : 'APPROVED';
  return {
    id: `LV-${String(9500 + i)}`,
    employeeId: e.id,
    employee: e.name,
    department: e.department,
    leaveType: pick(['Annual', 'Sick', 'Maternity', 'Bereavement', 'Unpaid', 'Study']),
    startDate: daysAhead(int(-10, 45)),
    endDate: daysAhead(int(11, 60)),
    days: int(1, 21),
    status: LEAVE_STATUS[status],
    statusKey: status,
    reason: pick(['Family event', 'Medical appointment', 'Planned holiday', 'Personal matters', 'Professional development']),
    approver: person(i + 60).name,
    appliedAt: daysAgo(int(1, 30)),
  };
});

/* ---------------------------------------------------------------------------
 * PROJECTS
 * ------------------------------------------------------------------------- */
export const projects = Array.from({ length: 14 }, (_, i) => {
  const p = person(i + 5);
  const status = i < 8 ? pick(Object.keys(PROJECT_STATUS)) : 'IN_PROGRESS';
  return {
    id: `PRJ-${String(200 + i)}`,
    code: `PRJ-${String(2026 - Math.floor(i / 2))}${String(i).padStart(2, '0')}`,
    name: pick([
      'Warehouse Automation Rollout',
      'ERP Data Migration — Finance',
      'Retail POS Deployment',
      'Fleet Tracking Modernisation',
      'Customer Portal Revamp',
      'Annual Audit Preparation',
      'ISO 9001 Certification',
      'Branch Expansion — Abuja',
    ]) + (i > 7 ? ` Phase ${i - 6}` : ''),
    description: 'Cross-functional delivery plan tracked against the vendor SLA schedule.',
    customer: company(i),
    status: PROJECT_STATUS[status],
    statusKey: status,
    progress: int(5, 100),
    budget: money(2_000_000, 90_000_000),
    spent: money(500_000, 40_000_000),
    startDate: daysAgo(int(30, 300)),
    endDate: daysAhead(int(10, 180)),
    manager: p.name,
    teamSize: int(3, 22),
    tasksDone: int(4, 90),
    tasksTotal: int(10, 110),
    health: pick(['ON_TRACK', 'AT_RISK', 'OFF_TRACK']),
  };
});

export const tasks = Array.from({ length: 36 }, (_, i) => {
  const p = person(i + 9);
  const status = i < 24 ? pick(Object.keys(TASK_STATUS)) : 'IN_PROGRESS';
  return {
    id: `TSK-${String(1100 + i)}`,
    projectId: `PRJ-${200 + (i % 14)}`,
    projectName: projects[i % 14].name,
    title: pick([
      'Finalise data migration mapping',
      'Configure approval workflows',
      'UAT with finance team',
      'Warehouse scanner rollout',
      'Train regional sales staff',
      'Reconcile opening balances',
      'Integrate payment gateway',
      'Draft SOP documentation',
      'Load-test the reporting API',
      'Sign off tax configuration',
    ]),
    description: 'Deliverable tracked against the phase milestone schedule.',
    status: TASK_STATUS[status],
    statusKey: status,
    priority: pick(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    assignee: p.name,
    dueDate: daysAhead(int(-4, 60)),
    estimateHours: int(2, 80),
    loggedHours: int(1, 90),
    labels: pickMany(['backend', 'frontend', 'migrations', 'docs', 'qa', 'infra'], int(1, 3)),
    order: i,
  };
});

/* ---------------------------------------------------------------------------
 * SUPPORT
 * ------------------------------------------------------------------------- */
export const tickets = Array.from({ length: 30 }, (_, i) => {
  const c = INVOICE_CUSTOMERS[i % INVOICE_CUSTOMERS.length];
  const status = i < 15 ? pick(Object.keys(TICKET_STATUS)) : 'IN_PROGRESS';
  const created = daysAgo(int(0, 40));
  return {
    id: `TKT-${String(1200 + i)}`,
    number: `TKT-${String(3000 + i)}`,
    subject: pick([
      'Invoice PDF will not download',
      'Payment recorded but invoice still shows unpaid',
      'Unable to add a second warehouse',
      'Stock count differs from dashboard',
      'Request to change payment terms to net 45',
      'Login portal returns 403 error',
      'Duplicate customer records created',
      'Monthly report totals look wrong',
      'API token rotation request',
      'Feature request: bulk invoice upload',
    ]),
    customer: c,
    customerId: `CUS-${1000 + (i % 60)}`,
    status: TICKET_STATUS[status],
    statusKey: status,
    priority: TICKET_PRIORITY[pick(Object.keys(TICKET_PRIORITY))],
    channel: pick(['Email', 'Portal', 'Phone', 'Chat']),
    assignee: chance(0.85) ? person(i + 33).name : null,
    slaBreached: chance(0.2),
    slaDueAt: daysAhead(int(-2, 20)),
    messageCount: int(1, 9),
    createdAt: created,
    updatedAt: daysAgo(int(0, 20)),
  };
});

export const ticketMessages = [
  {
    id: 'MSG-1',
    ticketId: 'TKT-1200',
    author: 'Customer Success Team',
    authorRole: 'customer',
    body: 'The invoice PDF stops at 60% and then shows a blank page. I have tried three browsers and cleared the cache each time.',
    createdAt: daysAgo(2),
  },
  {
    id: 'MSG-2',
    ticketId: 'TKT-1200',
    author: 'Adaeze Okonkwo',
    authorRole: 'agent',
    body: 'Thanks for flagging this. I have reproduced it on a 30,000-row invoice — it is a pagination bug in the export service. Escalating to engineering now.',
    createdAt: daysAgo(2),
  },
  {
    id: 'MSG-3',
    ticketId: 'TKT-1200',
    author: 'Engineering',
    authorRole: 'internal',
    body: 'Fix deployed to staging. Verifying with the tenant sandbox before we roll it to production.',
    createdAt: daysAgo(1),
  },
];

/* ---------------------------------------------------------------------------
 * NOTIFICATIONS
 * ------------------------------------------------------------------------- */
export const notifications = [
  { id: 'NTF-1', type: 'payment', title: 'Payment received', body: '₦2,450,000 received against INV-2026-3001.', createdAt: daysAgo(0.2), read: false, tone: 'success' },
  { id: 'NTF-2', type: 'stock', title: 'Low stock alert', body: 'A4 Thermal Paper (5 rolls) dropped below reorder level.', createdAt: daysAgo(0.5), read: false, tone: 'warning' },
  { id: 'NTF-3', type: 'invoice', title: 'Invoice overdue', body: '3 invoices are now past their due date.', createdAt: daysAgo(1), read: false, tone: 'danger' },
  { id: 'NTF-4', type: 'lead', title: 'Lead won', body: 'Quantum Systems moved to Won — ₦8,400,000.', createdAt: daysAgo(1.4), read: true, tone: 'success' },
  { id: 'NTF-5', type: 'system', title: 'Payroll export ready', body: 'September payroll CSV has finished generating.', createdAt: daysAgo(2), read: true, tone: 'info' },
  { id: 'NTF-6', type: 'ticket', title: 'Ticket assigned to you', body: 'TKT-3021 was assigned to you by the support lead.', createdAt: daysAgo(2.6), read: true, tone: 'info' },
];

/* ---------------------------------------------------------------------------
 * DASHBOARD AGGREGATES
 * Composed from the collections above so the KPI row, charts and activity
 * feed agree with the underlying tables.
 * ------------------------------------------------------------------------- */
export const dashboard = {
  metrics: {
    sales: {
      value: 148_420_000,
      change: 12.4,
      spark: [32, 38, 35, 44, 41, 52, 49, 61, 58, 70, 66, 78],
    },
    expenses: {
      value: 76_180_000,
      change: -4.1,
      spark: [58, 61, 55, 60, 57, 52, 55, 49, 51, 47, 44, 46],
    },
    grossProfit: {
      value: 72_240_000,
      change: 21.7,
      margin: 48.7,
      spark: [22, 26, 24, 31, 29, 36, 34, 42, 39, 48, 45, 54],
    },
    receivables: {
      value: 41_960_000,
      change: 8.3,
      spark: [28, 31, 33, 30, 36, 34, 39, 37, 42, 40, 44, 46],
    },
    payables: {
      value: 23_450_000,
      change: -2.6,
      spark: [40, 38, 42, 39, 36, 38, 34, 33, 35, 31, 29, 28],
    },
  },
  revenueTrend: [
    { month: 'Oct', revenue: 96_000_000, expenses: 58_000_000, profit: 38_000_000 },
    { month: 'Nov', revenue: 104_500_000, expenses: 61_000_000, profit: 43_500_000 },
    { month: 'Dec', revenue: 92_800_000, expenses: 64_000_000, profit: 28_800_000 },
    { month: 'Jan', revenue: 112_400_000, expenses: 59_500_000, profit: 52_900_000 },
    { month: 'Feb', revenue: 121_900_000, expenses: 63_200_000, profit: 58_700_000 },
    { month: 'Mar', revenue: 118_600_000, expenses: 68_400_000, profit: 50_200_000 },
    { month: 'Apr', revenue: 129_300_000, expenses: 66_100_000, profit: 63_200_000 },
    { month: 'May', revenue: 134_800_000, expenses: 70_500_000, profit: 64_300_000 },
    { month: 'Jun', revenue: 138_200_000, expenses: 69_800_000, profit: 68_400_000 },
    { month: 'Jul', revenue: 141_600_000, expenses: 72_300_000, profit: 69_300_000 },
    { month: 'Aug', revenue: 145_100_000, expenses: 74_100_000, profit: 71_000_000 },
    { month: 'Sep', revenue: 148_420_000, expenses: 76_180_000, profit: 72_240_000 },
  ],
  expenseBreakdown: [
    { name: 'Payroll', value: 24_400_000, color: '#38bdf8' },
    { name: 'Cost of goods', value: 19_800_000, color: '#818cf8' },
    { name: 'Rent & utilities', value: 12_600_000, color: '#22d3ee' },
    { name: 'Marketing', value: 8_900_000, color: '#a78bfa' },
    { name: 'Logistics', value: 6_200_000, color: '#34d399' },
    { name: 'Other', value: 4_280_000, color: '#64748b' },
  ],
  receivablesAging: [
    { bucket: 'Current', amount: 22_100_000, tone: 'success' },
    { bucket: '1–30 days', amount: 9_400_000, tone: 'info' },
    { bucket: '31–60 days', amount: 6_100_000, tone: 'warning' },
    { bucket: '61–90 days', amount: 2_800_000, tone: 'warning' },
    { bucket: '90+ days', amount: 1_560_000, tone: 'danger' },
  ],
  quickActions: [
    { id: 'invoice', label: 'Create invoice', description: 'Bill a customer in under a minute', icon: 'invoice', permission: 'accounting:create_invoices' },
    { id: 'payment', label: 'Record payment', description: 'Log an incoming transfer', icon: 'payment', permission: 'accounting:record_payments' },
    { id: 'customer', label: 'Add customer', description: 'Create a new client record', icon: 'customer', permission: 'customers:create' },
    { id: 'expense', label: 'Log expense', description: 'Submit a claim for approval', icon: 'expense', permission: 'accounting:create_expenses' },
  ],
  activity: [
    { id: 'AC-1', actor: 'Adaeze Okonkwo', action: 'issued invoice', target: 'INV-2026-3001', meta: '₦4,250,000 · Baze Trading Ltd', at: daysAgo(0.1), tone: 'info' },
    { id: 'AC-2', actor: 'System', action: 'low-stock alert raised for', target: 'A4 Thermal Paper (5 rolls)', meta: 'Lagos Central Hub', at: daysAgo(0.4), tone: 'warning' },
    { id: 'AC-3', actor: 'Chidi Balogun', action: 'recorded payment against', target: 'INV-2026-2984', meta: '₦1,120,000 received', at: daysAgo(0.7), tone: 'success' },
    { id: 'AC-4', actor: 'Aisha Ibrahim', action: 'moved lead to Won', target: 'Quantum Systems', meta: '₦8,400,000 closed-won', at: daysAgo(1.1), tone: 'success' },
    { id: 'AC-5', actor: 'Emeka Okafor', action: 'adjusted stock for', target: 'Barcode Scanner ELEC-1042', meta: '−4 units · cycle count', at: daysAgo(1.4), tone: 'neutral' },
    { id: 'AC-6', actor: 'Tunde Adeyemi', action: 'approved expense', target: 'EX-2026-4021', meta: '₦840,000 · Professional fees', at: daysAgo(2), tone: 'info' },
  ],
};

/* ---------------------------------------------------------------------------
 * REPORTS
 * ------------------------------------------------------------------------- */
export const profitAndLoss = {
  revenue: { current: 148_420_000, previous: 131_900_000 },
  costOfGoodsSold: { current: 76_180_000, previous: 68_400_000 },
  grossProfit: { current: 72_240_000, previous: 63_500_000 },
  operatingExpenses: { current: 41_900_000, previous: 39_200_000 },
  netProfit: { current: 30_340_000, previous: 24_300_000 },
  lines: [
    { label: 'Revenue', current: 148_420_000, previous: 131_900_000, group: 'Income' },
    { label: 'Cost of goods sold', current: -76_180_000, previous: -68_400_000, group: 'Income' },
    { label: 'Gross profit', current: 72_240_000, previous: 63_500_000, group: 'Income', emphasis: true },
    { label: 'Salaries & wages', current: -24_400_000, previous: -22_800_000, group: 'Expenses' },
    { label: 'Rent & utilities', current: -8_600_000, previous: -8_100_000, group: 'Expenses' },
    { label: 'Marketing', current: -5_200_000, previous: -5_600_000, group: 'Expenses' },
    { label: 'Software & subscriptions', current: -3_700_000, previous: -2_700_000, group: 'Expenses' },
    { label: 'Net profit', current: 30_340_000, previous: 24_300_000, group: 'Result', emphasis: true },
  ],
};

export const taxSummary = {
  outputVat: 10_031_500,
  inputVat: 6_482_300,
  netPayable: 3_549_200,
  period: 'September 2026',
  filings: [
    { period: 'September 2026', dueDate: daysAhead(10), status: 'DRAFT', outputVat: 10_031_500, inputVat: 6_482_300 },
    { period: 'August 2026', dueDate: daysAgo(20), status: 'FILED', outputVat: 9_218_400, inputVat: 5_910_200 },
    { period: 'July 2026', dueDate: daysAgo(50), status: 'FILED', outputVat: 8_642_100, inputVat: 5_204_800 },
  ],
};

export const vendorPerformance = vendors.slice(0, 8).map((v) => ({
  id: v.id,
  name: v.name,
  mrr: v.mrr,
  invoices: v.invoicesIssued,
  adoption: int(38, 96),
  supportTickets: int(0, 14),
  nps: int(-10, 72),
  status: v.status,
}));

/* ---------------------------------------------------------------------------
 * PLATFORM (super-admin) DATA
 * Tenants, their money and their audit trail are platform concerns, so they
 * are modelled apart from the vendor collections above: a vendor admin must
 * never reach these, because the guard is the role, not the endpoint.
 * ------------------------------------------------------------------------- */
const SUBSCRIPTION_STATUS = {
  ACTIVE: { label: 'Active', tone: 'success' },
  TRIALING: { label: 'Trial', tone: 'info' },
  PAST_DUE: { label: 'Past due', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const subscriptions = vendors.map((vendor, i) => {
  const statusKey = vendor.status.label === 'Suspended'
    ? 'PAST_DUE'
    : vendor.status.label === 'Pending review'
      ? 'TRIALING'
      : 'ACTIVE';
  const seats = Math.max(3, Math.round(vendor.employees / 3));
  return {
    id: `SUB-${String(i + 1).padStart(4, '0')}`,
    vendorId: vendor.id,
    vendor: vendor.name,
    plan: vendor.plan,
    seatsUsed: seats,
    seatsTotal: seats + int(1, 12),
    mrr: vendor.mrr,
    billingCycle: chance(0.6) ? 'MONTHLY' : 'ANNUAL',
    statusKey,
    status: SUBSCRIPTION_STATUS[statusKey],
    method: pick(['Card', 'Bank transfer', 'Direct debit']),
    startedAt: vendor.createdAt,
    renewsAt: daysAhead(int(3, 330)),
  };
});

const TRANSACTION_STATUS_KEYS = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'];

export const transactions = Array.from({ length: 64 }, (_, i) => {
  const vendor = vendors[i % vendors.length];
  const statusKey = pick(TRANSACTION_STATUS_KEYS);
  const amount = money(4_500, 240_000);
  return {
    id: `TXN-${String(90_000 + i)}`,
    reference: `NX-${String(100_000 + i)}`,
    date: daysAgo(int(0, 180)),
    vendorId: vendor.id,
    vendor: vendor.name,
    type: pick(['Subscription', 'Usage', 'Seat top-up', 'Refund']),
    method: pick(['Card', 'Bank transfer', 'Direct debit', 'USSD']),
    amount,
    currency: 'NGN',
    fees: round2(amount * 0.014),
    statusKey,
    status: PAYMENT_STATUS[statusKey],
  };
});

const PLATFORM_USER_STATUS = {
  ACTIVE: { label: 'Active', tone: 'success' },
  INVITED: { label: 'Invited', tone: 'info' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
};

const PLATFORM_USER_STATUS_KEYS = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INVITED', 'ACTIVE', 'SUSPENDED'];

export const platformUsers = Array.from({ length: 38 }, (_, i) => {
  const p = person(i + 5);
  const vendor = vendors[i % vendors.length];
  const statusKey = PLATFORM_USER_STATUS_KEYS[i % PLATFORM_USER_STATUS_KEYS.length];
  return {
    id: `USR-${String(2000 + i)}`,
    firstName: p.firstName,
    lastName: p.lastName,
    fullName: p.name,
    email: p.email,
    role: pick([
      'VENDOR_OWNER', 'VENDOR_ADMIN', 'ACCOUNTANT', 'SALES_MANAGER',
      'SALES_REP', 'SUPPORT_AGENT', 'HR_MANAGER', 'WAREHOUSE_MANAGER',
    ]),
    tenantId: vendor.id,
    tenant: vendor.name,
    statusKey,
    status: PLATFORM_USER_STATUS[statusKey],
    mfaEnabled: chance(0.6),
    lastActiveAt: daysAgo(int(0, 60)),
    createdAt: daysAgo(int(30, 700)),
  };
});

const AUDIT_ACTIONS = [
  ['auth', 'Signed in', 'info'],
  ['auth', 'Failed sign-in attempt', 'warning'],
  ['vendor', 'Tenant plan changed', 'info'],
  ['vendor', 'Tenant suspended', 'critical'],
  ['billing', 'Invoice paid', 'info'],
  ['billing', 'Payment method updated', 'info'],
  ['data', 'Exported customer records', 'warning'],
  ['data', 'Imported product catalogue', 'info'],
  ['security', 'MFA disabled for a user', 'critical'],
  ['security', 'Role permissions updated', 'warning'],
];

export const auditLog = Array.from({ length: 60 }, (_, i) => {
  const actor = person(i + 40);
  const vendor = vendors[i % vendors.length];
  const [category, action, severity] = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length];
  return {
    id: `LOG-${String(5000 + i)}`,
    timestamp: daysAgo(i * 2 + int(0, 3)),
    actor: actor.name,
    actorEmail: actor.email,
    category,
    action,
    severity,
    severityLabel: severity,
    tenantId: vendor.id,
    tenant: vendor.name,
    ip: `102.89.${int(1, 254)}.${int(1, 254)}`,
    userAgent: pick([
      'Chrome 141 · macOS', 'Firefox 146 · Windows', 'Safari 18 · iOS',
      'Edge 141 · Windows', 'Chrome 141 · Android',
    ]),
  };
});

/**
 * The tenant's own activity trail, served to the workspace audit log and the
 * shared activity feed. Kept separate from the platform `auditLog` above so a
 * vendor session can never be handed another tenant's events — the two are
 * different data sets, not a filtered view of one.
 */
const WORKSPACE_EVENTS = [
  ['sales', 'Quote QT-{n} accepted', 'info'],
  ['sales', 'Order OR-{n} fulfilled', 'success'],
  ['sales', 'Lead moved to Qualified', 'info'],
  ['accounting', 'Invoice INV-{n} sent to the customer', 'info'],
  ['accounting', 'Payment received against INV-{n}', 'success'],
  ['accounting', 'Expense EX-{n} approved', 'success'],
  ['inventory', 'Stock adjusted on ELEC-1042', 'warning'],
  ['inventory', 'Transfer TRF-{n} dispatched', 'info'],
  ['inventory', 'Product price list updated', 'info'],
  ['hr', 'Leave request approved', 'success'],
  ['hr', 'Employee EMP-{n} onboarding started', 'info'],
  ['support', 'Ticket TCK-{n} resolved', 'success'],
  ['settings', 'Team member role changed', 'warning'],
  ['security', 'MFA reset for a team member', 'warning'],
];

export const workspaceAuditLog = Array.from({ length: 60 }, (_, i) => {
  const actor = person(i + 12);
  const [category, template, severity] = WORKSPACE_EVENTS[i % WORKSPACE_EVENTS.length];
  const ticket = 1000 + i;
  return {
    id: `WAL-${String(7000 + i)}`,
    timestamp: daysAgo(Math.floor(i / 3) + int(0, 1)),
    actor: actor.name,
    actorEmail: actor.email,
    category,
    action: template.replace(/\{(n|num)\}/g, String(ticket)),
    severity,
    severityLabel: severity,
    tenantId: session.user.vendorId,
    tenant: session.tenant.name,
    ip: `197.210.${int(1, 254)}.${int(1, 254)}`,
    userAgent: pick([
      'Chrome 141 · macOS', 'Firefox 146 · Windows', 'Safari 18 · iOS',
      'Edge 141 · Windows', 'Chrome 141 · Android',
    ]),
  };
});

const ONBOARDING_STEPS = ['Verify business', 'Add team', 'Configure modules', 'Import data', 'Go live'];

export const onboardingQueue = vendors
  .filter((vendor) =>
    vendor.onboardingStep < 5
    || vendor.status.label === 'Pending review'
    /* Tenants still inside their first year are legitimately still in the
       queue even if they marked the checklist complete — go-live needs a
       human, and that is the work this screen exists to track. */
    || now - Date.parse(vendor.createdAt) < 300 * DAY,
  )
  .map((vendor, i) => {
    const currentStep = Math.min(vendor.onboardingStep, 4);
    const statusKey = currentStep >= 4 ? 'READY' : 'IN_PROGRESS';
    return {
      id: `ONB-${String(i + 1).padStart(4, '0')}`,
      vendorId: vendor.id,
      vendor: vendor.name,
      contact: vendor.contactName,
      email: vendor.email,
      currentStep,
      stepLabel: ONBOARDING_STEPS[currentStep - 1] ?? ONBOARDING_STEPS[0],
      steps: ONBOARDING_STEPS,
      progress: Math.round((currentStep / 5) * 100),
      owner: person(i + 60).name,
      startedAt: daysAgo(int(2, 30)),
      dueAt: daysAhead(int(1, 21)),
      statusKey,
      status: statusKey === 'READY'
        ? { label: 'Ready to launch', tone: 'success' }
        : { label: 'In progress', tone: 'info' },
      blockers: currentStep < 3
        ? pickMany(
            ['Tax ID missing', 'No admin added', 'Awaiting KYC docs', 'Payment method pending'],
            int(0, 2),
          )
        : [],
    };
  });

export const systemHealth = {
  status: 'operational',
  checkedAt: daysAgo(0),
  metrics: {
    requestsPerMinute: 18_420,
    errorRate: 0.07,
    activeSessions: 1_284,
    queueDepth: 24,
    p95LatencyMs: 182,
  },
  services: [
    { name: 'API gateway', statusKey: 'operational', uptime: 99.98, latencyMs: 42, region: 'eu-west-1' },
    { name: 'PostgreSQL primary', statusKey: 'operational', uptime: 99.99, latencyMs: 8, region: 'eu-west-1' },
    { name: 'Redis cache', statusKey: 'operational', uptime: 99.97, latencyMs: 3, region: 'eu-west-1' },
    { name: 'Background workers', statusKey: 'degraded', uptime: 99.71, latencyMs: 460, region: 'eu-west-1' },
    { name: 'Email delivery', statusKey: 'operational', uptime: 99.95, latencyMs: 310, region: 'us-east-1' },
    { name: 'File storage', statusKey: 'operational', uptime: 99.99, latencyMs: 55, region: 'eu-west-1' },
    { name: 'WebSocket hub', statusKey: 'operational', uptime: 99.93, latencyMs: 19, region: 'eu-west-1' },
    { name: 'Scheduled reports', statusKey: 'maintenance', uptime: 98.4, latencyMs: 0, region: 'eu-west-1' },
  ],
  incidents: [
    {
      id: 'INC-1042',
      title: 'Report generation queue draining slowly',
      statusKey: 'monitoring',
      openedAt: daysAgo(1),
      resolvedAt: null,
      impact: 'Scheduled PDF exports delayed by up to 40 minutes.',
    },
    {
      id: 'INC-1041',
      title: 'Elevated 5xx rate on the invoice endpoint',
      statusKey: 'resolved',
      openedAt: daysAgo(6),
      resolvedAt: daysAgo(6),
      impact: 'Roughly 2% of invoice requests failed for 18 minutes.',
    },
  ],
};

/* ---------------------------------------------------------------------------
 * GLOBAL SEARCH INDEX
 * ------------------------------------------------------------------------- */
export const searchIndex = [
  ...customers.slice(0, 12).map((c) => ({
    id: c.id, type: 'Customer', title: c.name, subtitle: `${c.city} · ${c.code}`,
    to: `/customers/${c.id}`, meta: c.code, tone: 'info',
  })),
  ...products.slice(0, 12).map((p) => ({
    id: p.id, type: 'Product', title: p.name, subtitle: `${p.sku} · ${p.category}`,
    to: `/inventory/products/${p.id}`, meta: p.sku, tone: 'accent',
  })),
  ...invoices.slice(0, 10).map((inv) => ({
    id: inv.id, type: 'Invoice', title: inv.number, subtitle: `${inv.customer} · ${inv.status.label}`,
    to: `/accounting/invoices/${inv.id}`, meta: inv.number, tone: 'warning',
  })),
  ...projects.slice(0, 8).map((p) => ({
    id: p.id, type: 'Project', title: p.name, subtitle: `${p.code} · ${p.status.label}`,
    to: `/projects/${p.id}`, meta: p.code, tone: 'violet',
  })),
  ...tickets.slice(0, 8).map((t) => ({
    id: t.id, type: 'Ticket', title: t.subject, subtitle: `${t.number} · ${t.customer}`,
    to: `/support/${t.id}`, meta: t.number, tone: 'danger',
  })),
  ...employees.slice(0, 8).map((e) => ({
    id: e.id, type: 'Employee', title: e.name, subtitle: `${e.department} · ${e.employeeNo}`,
    to: `/hr/employees/${e.id}`, meta: e.employeeNo, tone: 'neutral',
  })),
];

export const peopleIndex = employees.map((e) => ({
  id: e.id, name: e.name, email: e.email, role: e.role, department: e.department,
  initials: e.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
}));

export const companiesIndex = customers.map((c) => ({
  id: c.id, name: c.name, industry: c.segment, location: c.city,
}));

/* ---------------------------------------------------------------------------
 * COLLECTION REGISTRY
 * mockBackend.js looks a path up here by its final non-id segment, so a
 * generic GET /{resource} handler can serve it.
 * ------------------------------------------------------------------------- */
export const collections = {
  customers, products, warehouses, movements: stockMovements, stockMovements,
  leads, quotes, orders, invoices, expenses, ledger,
  employees, attendance, leaves, projects, tasks, tickets, notifications, vendors,
  subscriptions, transactions, platformUsers, auditLog, onboardingQueue,
  workspaceAuditLog,
};

/** Per-resource searchable text fields, used by the generic `search` param. */
export const searchableFields = {
  customers: ['name', 'code', 'contactName', 'email', 'city', 'segment'],
  products: ['name', 'sku', 'category', 'supplier'],
  vendors: ['name', 'contactName', 'email', 'city'],
  leads: ['name', 'company', 'email', 'stageLabel', 'source'],
  quotes: ['number', 'customer', 'owner'],
  orders: ['number', 'customer', 'warehouse'],
  invoices: ['number', 'customer', 'owner'],
  expenses: ['reference', 'description', 'category', 'vendorName'],
  employees: ['name', 'email', 'employeeNo', 'department', 'role'],
  attendance: ['employee', 'department'],
  leaves: ['employee', 'leaveType', 'department'],
  projects: ['name', 'code', 'customer', 'manager'],
  tasks: ['title', 'projectName', 'assignee'],
  tickets: ['number', 'subject', 'customer', 'assignee'],
  notifications: ['title', 'body'],
  warehouses: ['name', 'code', 'city', 'manager'],
  stockMovements: ['reference', 'productName', 'sku', 'reason'],
  ledger: ['reference', 'account', 'description'],
  subscriptions: ['vendor', 'vendorId', 'plan', 'method'],
  transactions: ['reference', 'vendor', 'type', 'method'],
  platformUsers: ['fullName', 'email', 'role', 'tenant'],
  auditLog: ['actor', 'action', 'category', 'tenant', 'ip'],
  workspaceAuditLog: ['actor', 'action', 'category', 'ip'],
  onboardingQueue: ['vendor', 'contact', 'owner', 'stepLabel'],
};
