/**
 * NexERP — Mock backend
 * ---------------------------------------------------------------------------
 * An RTK Query baseQuery that answers requests from the in-memory fixtures in
 * fixtures.js instead of the network. It exists for one reason: the Spring
 * Boot backend is built in parallel, and the UI has to be fully navigable
 * before it lands.
 *
 * It implements the subset of REST semantics the app actually uses:
 *   GET    /resource            -> paginated, searchable, sortable, filterable
 *   GET    /resource/:id        -> single record
 *   POST   /resource            -> creates (assigns an id, echoes the body)
 *   PUT    /resource/:id        -> merges the body into the record
 *   DELETE /resource/:id        -> removes the record
 *   POST   /resource/:id/action -> the small set of domain actions used
 *
 * DELETE THIS FILE and set VITE_USE_MOCKS=false when the API is live —
 * services/api.js falls back to the real fetchBaseQuery automatically.
 */

import {
  session, dashboard, customers, products, invoices, leads, tasks, tickets,
  ticketMessages, notifications, expenses, employees, attendance, leaves,
  projects, vendors, searchIndex, peopleIndex, companiesIndex, profitAndLoss,
  taxSummary, vendorPerformance, collections, searchableFields, warehouses,
  systemHealth, findDemoSession,
} from './fixtures';
import { LEAD_STAGES, STORAGE_KEYS } from '@/config/constants';
import { ROLES, ROLE_LABELS } from '@/config/permissions.config';

/** Simulated latency so loading skeletons are actually exercised. */
const LATENCY_MS = 260;

/** In-memory store; mutated by POST/PUT/DELETE during the session. */
const db = Object.fromEntries(
  Object.entries(collections).map(([key, rows]) => [key, [...rows]]),
);
db.ticketMessages = [...ticketMessages];
db.notifications = [...notifications];

/* ---------------------------------------------------------------------------
 * URL -> COLLECTION
 * The API groups resources under a domain prefix (`/accounting/invoices`)
 * while the store is flat (`invoices`), and the flat resolution used to guess
 * "second-to-last segment" only worked for unprefixed paths — so every
 * prefixed list endpoint silently answered `null` and its page rendered empty.
 *
 * Resolution walks the path from the longest candidate down, which handles
 * all three shapes in one pass:
 *   /accounting/invoices          -> collection `invoices`, no id
 *   /accounting/expenses/EXP-4001 -> collection `expenses`, id EXP-4001
 *   /customers/CUS-1000           -> collection `customers`, id CUS-1000
 * ------------------------------------------------------------------------- */
const COLLECTION_PATHS = new Map(
  Object.keys(db).map((key) => [key, key]),
);

for (const [path, key] of [
  ['accounting/invoices', 'invoices'],
  ['accounting/expenses', 'expenses'],
  ['accounting/ledger', 'ledger'],
  ['sales/leads', 'leads'],
  ['sales/quotes', 'quotes'],
  ['sales/orders', 'orders'],
  ['hr/employees', 'employees'],
  ['hr/attendance', 'attendance'],
  ['hr/leaves', 'leaves'],
  ['support/tickets', 'tickets'],
  ['inventory/movements', 'stockMovements'],
  ['projects/tasks', 'tasks'],
  ['platform/users', 'platformUsers'],
  ['platform/subscriptions', 'subscriptions'],
  ['platform/transactions', 'transactions'],
  ['platform/audit-log', 'auditLog'],
  ['platform/onboarding', 'onboardingQueue'],
  ['settings/audit-log', 'workspaceAuditLog'],
  ['activity', 'workspaceAuditLog'],
]) {
  COLLECTION_PATHS.set(path, key);
}

/** @returns {{key: string, id: string|null}|null} */
function resolveCollection(path) {
  const segments = path.split('/').filter(Boolean);
  for (let take = segments.length; take >= 1; take -= 1) {
    const key = COLLECTION_PATHS.get(segments.slice(0, take).join('/'));
    if (key && db[key]) {
      return { key, id: take < segments.length ? segments[take] : null };
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------- */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ok = (data, meta) => ({ data, meta });

const fail = (status, data) => ({
  error: {
    status,
    data: data ?? { message: 'Request failed', status },
  },
});

/** Matches /resource/:id, returning the resource name and the id. */
function parsePath(url) {
  const clean = url.split('?')[0].replace(/^\/+|\/+$/g, '');
  const segments = clean.split('/');
  return { segments, resource: segments[segments.length - 2] ?? segments[0] };
}

/** Case-insensitive substring match across the resource's text fields. */
function matchesSearch(row, term, fields) {
  if (!term) return true;
  const needle = String(term).toLowerCase();
  return fields.some((f) => String(row[f] ?? '').toLowerCase().includes(needle));
}

/**
 * Generic collection query: search -> filter -> sort -> paginate.
 * Sorting understands the `field.asc` / `field.desc` convention the
 * TableColumnHeader component emits.
 */
function queryCollection(resource, params = {}) {
  const rows = db[resource] ?? db[resource.replace(/s$/, '')] ?? [];
  const fields = searchableFields[resource] ?? Object.keys(rows[0] ?? {});

  let result = rows.filter((row) => matchesSearch(row, params.search, fields));

  /* Any remaining query param is treated as an exact-match filter, except the
     control params consumed below. */
  const reserved = new Set(['page', 'pageSize', 'search', 'sortBy', 'sortOrder', '_end', '_start']);
  for (const [key, value] of Object.entries(params)) {
    if (reserved.has(key) || value === undefined || value === null || value === '') continue;
    result = result.filter((row) => String(row[key]) === String(value));
  }

  if (params.sortBy) {
    const dir = params.sortOrder === 'desc' ? -1 : 1;
    const field = params.sortBy;
    result = [...result].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 10);
  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return ok({
    items: result.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  });
}

function findById(resource, id) {
  const rows = db[resource];
  if (!rows) return undefined;
  return rows.find((row) => String(row.id) === String(id));
}

/** Appends a new record with an auto-incrementing id. */
function createRecord(resource, body) {
  const rows = db[resource];
  if (!rows) return undefined;
  const prefix = String(resource).slice(0, 3).toUpperCase();
  const nextNum = 9000 + rows.length;
  const record = { id: `${prefix}-${nextNum}`, ...body, createdAt: new Date().toISOString() };
  rows.unshift(record);
  return record;
}

function updateRecord(resource, id, body) {
  const rows = db[resource];
  if (!rows) return undefined;
  const index = rows.findIndex((row) => String(row.id) === String(id));
  if (index === -1) return undefined;
  rows[index] = { ...rows[index], ...body, id: rows[index].id };
  return rows[index];
}

function deleteRecord(resource, id) {
  const rows = db[resource];
  if (!rows) return false;
  const index = rows.findIndex((row) => String(row.id) === String(id));
  if (index === -1) return false;
  rows.splice(index, 1);
  return true;
}

/* ---------------------------------------------------------------------------
 * DERIVED / COMPUTED ENDPOINTS
 * These mirror the aggregate queries the Spring Boot service will expose, so
 * the dashboard does not have to download whole tables to draw a chart.
 * ------------------------------------------------------------------------- */

/** Recomputes the KPI row from the live invoice/expense rows. */
function computeMetrics() {
  const sales = invoices
    .filter((i) => i.statusKey !== 'DRAFT' && i.statusKey !== 'CANCELLED')
    .reduce((sum, i) => sum + i.total, 0);
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const receivables = invoices.reduce((sum, i) => sum + i.balance, 0);
  const payables = expenses
    .filter((e) => e.statusKey === 'APPROVED')
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    sales: { value: sales, change: 12.4 },
    expenses: { value: expensesTotal, change: -4.1 },
    grossProfit: { value: sales - expensesTotal, change: 21.7, margin: sales ? ((sales - expensesTotal) / sales) * 100 : 0 },
    receivables: { value: receivables, change: 8.3 },
    payables: { value: payables, change: -2.6 },
  };
}

/** Top customers by lifetime revenue, with their share of the total. */
function topCustomers(limit = 5) {
  const ranked = [...customers]
    .sort((a, b) => b.totalBilled - a.totalBilled)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      revenue: c.totalBilled,
      outstanding: c.outstanding,
      segment: c.segment,
    }));

  const total = ranked.reduce((sum, c) => sum + c.revenue, 0);
  return ranked.map((c) => ({ ...c, share: total ? (c.revenue / total) * 100 : 0 }));
}

/**
 * The "needs you today" queue, derived from live rows so it stays consistent
 * with the tables behind it. Each entry is self-describing: the panel maps
 * `kind` to an icon, and `to` is the deep link that resolves the exception.
 */
function attentionQueue() {
  const now = Date.now();
  const items = [];

  for (const invoice of invoices) {
    if (invoice.statusKey === 'PAID' || invoice.balance <= 0) continue;
    const daysLate = Math.floor((now - new Date(invoice.dueDate).getTime()) / 86400000);
    if (daysLate <= 0) continue;

    items.push({
      id: `AR-${invoice.id}`,
      kind: 'overdue_invoice',
      title: `${invoice.number} · ${invoice.customer}`,
      meta: `${daysLate} day${daysLate === 1 ? '' : 's'} past due · ${invoice.status?.label ?? 'Unpaid'}`,
      amount: invoice.balance,
      to: `/accounting/invoices/${invoice.id}`,
    });
  }

  for (const product of products) {
    if (product.onHand > product.reorderLevel) continue;

    items.push({
      id: `STK-${product.id}`,
      kind: 'low_stock',
      title: product.name,
      meta:
        product.onHand === 0
          ? 'Out of stock · reorder level ' + product.reorderLevel
          : `${product.onHand} left · reorder level ${product.reorderLevel}`,
      to: `/inventory/products/${product.id}`,
    });
  }

  for (const leave of leaves) {
    if (leave.statusKey !== 'PENDING' && leave.statusKey !== 'SUBMITTED') continue;

    items.push({
      id: `LV-${leave.id}`,
      kind: 'pending_leave',
      title: `${leave.employee} · ${leave.leaveType}`,
      meta: `${leave.days} day${leave.days === 1 ? '' : 's'} from ${leave.startDate}`,
      to: `/hr/leave`,
    });
  }

  /* Overdue money first, then stock-outs, then approvals. */
  const rank = { overdue_invoice: 0, low_stock: 1, pending_leave: 2 };
  return items.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

/** Full overview payload consumed by the Executive Dashboard in one request. */
function dashboardOverview() {
  const computed = computeMetrics();
  const open = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');

  return ok({
    currency: 'NGN',

    /* Merged per-metric, not spread wholesale — the computed values replace the
       headline number while the fixture's sparkline survives. */
    metrics: Object.fromEntries(
      Object.keys(dashboard.metrics).map((key) => [
        key,
        { ...dashboard.metrics[key], ...computed[key] },
      ]),
    ),

    revenueTrend: dashboard.revenueTrend,
    expenseBreakdown: dashboard.expenseBreakdown,
    receivablesAging: dashboard.receivablesAging,
    quickActions: dashboard.quickActions,
    activity: dashboard.activity,
    topCustomers: topCustomers(),
    attention: attentionQueue(),

    pipeline: {
      totalValue: open.reduce((sum, l) => sum + l.value, 0),
      openDeals: open.length,
      wonThisMonth: leads.filter((l) => l.stage === 'won').length,
      stages: LEAD_STAGES.map((s) => ({
        ...s,
        count: leads.filter((l) => l.stage === s.id).length,
        value: leads.filter((l) => l.stage === s.id).reduce((sum, l) => sum + l.value, 0),
      })),
    },
  });
}

/** AR/AP aged buckets, recomputed from the invoice table. */
function agingReport(kind) {
  const rows = kind === 'payables' ? expenses.filter((e) => e.statusKey === 'APPROVED') : invoices.filter((i) => i.balance > 0);
  const buckets = { Current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

  for (const row of rows) {
    const amount = kind === 'payables' ? row.amount : row.balance;
    const due = new Date(row.dueDate ?? row.expenseDate).getTime();
    const days = Math.floor((Date.now() - due) / 86400000);
    if (days <= 0) buckets.Current += amount;
    else if (days <= 30) buckets['1-30'] += amount;
    else if (days <= 60) buckets['31-60'] += amount;
    else if (days <= 90) buckets['61-90'] += amount;
    else buckets['90+'] += amount;
  }

  const tone = { Current: 'success', '1-30': 'info', '31-60': 'warning', '61-90': 'warning', '90+': 'danger' };
  return ok({
    buckets: Object.entries(buckets).map(([label, amount]) => ({ label, amount, tone: tone[label] })),
    total: Object.values(buckets).reduce((a, b) => a + b, 0),
  });
}

/* ---------------------------------------------------------------------------
 * AUTH
 * The mock has no user table, so the *email* selects the identity and the
 * password is only checked for a minimum length. That is what makes the demo
 * tiles on the sign-in page work: pick a tile, sign in as that person, and the
 * role/permissions/sidebar all follow from the account record.
 * ------------------------------------------------------------------------- */
const TOKENS = { accessToken: 'mock.jwt.access', refreshToken: 'mock.jwt.refresh' };

/**
 * Accounts created through the sign-up form. The mock has no database, so
 * registrations are kept in localStorage (keyed by lower-cased email) to make
 * "sign up, then sign back in" behave the way a real backend would. The
 * password is stored verbatim only because this is a client-side mock — never
 * a pattern to copy into real code.
 */
const REGISTERED_STORAGE_KEY = 'nexerp.mock.registeredAccounts';

function loadRegisteredAccounts() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(REGISTERED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistRegisteredAccounts(accounts) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    /* Storage may be unavailable (private mode); auth still works this tab. */
  }
}

function authenticate(body) {
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '');

  const identity = findDemoSession(email);
  if (identity) {
    if (password.length < 6) {
      return fail(401, { message: 'Password must be at least 6 characters.' });
    }
    return ok({ ...identity, ...TOKENS });
  }

  /* An account created via the sign-up form: match it case-insensitively and
     check the password that was set at registration. */
  const registered = loadRegisteredAccounts()[email.toLowerCase()];
  if (registered) {
    if (password !== registered.password) {
      return fail(401, { message: 'That password does not match this account.' });
    }
    return ok({ user: registered.user, tenant: registered.tenant, ...TOKENS });
  }

  return fail(401, {
    message: email
      ? 'No account matches that email. Pick one of the demo accounts on the sign-in page.'
      : 'Enter your email address.',
  });
}

/** Registration mints a fresh owner session for the submitted workspace. */
function registerAccount(body) {
  const fullName = String(body?.fullName ?? '').trim();
  const [firstName = 'New', ...rest] = fullName.split(/\s+/).filter(Boolean);
  const lastName = rest.join(' ') || 'User';
  const businessName = String(body?.businessName ?? '').trim();
  const shortName = businessName.split(/\s+/)[0] || 'Workspace';
  const email = String(body?.email ?? '').trim();

  /* The sign-up form lets the visitor pick a tenant role; anything unknown
     (or the platform role, which is not self-served) falls back to owner. */
  const requestedRole = String(body?.role ?? '').trim();
  const role =
    Object.values(ROLES).includes(requestedRole) && requestedRole !== ROLES.SUPER_ADMIN
      ? requestedRole
      : ROLES.VENDOR_OWNER;

  const user = {
    id: 'USR-NEW-1',
    firstName,
    lastName,
    fullName: fullName || `${firstName} ${lastName}`,
    email,
    phone: String(body?.phone ?? '').trim(),
    role,
    avatar: null,
    jobTitle: ROLE_LABELS[role] ?? 'Owner',
    vendorId: session.user.vendorId,
    lastLoginAt: new Date().toISOString(),
    mfaEnabled: false,
  };
  const tenant = {
    ...session.tenant,
    name: businessName || session.tenant.name,
    shortName,
    plan: 'TRIAL',
    seats: { used: 1, total: 3 },
  };

  /* Remember the credentials so the account can sign in again later. */
  if (email) {
    const accounts = loadRegisteredAccounts();
    accounts[email.toLowerCase()] = {
      user,
      tenant,
      password: String(body?.password ?? ''),
    };
    persistRegisteredAccounts(accounts);
  }

  return ok({ user, tenant, ...TOKENS });
}

/**
 * GET /auth/me answers for whoever is persisted in localStorage, not always
 * for the default fixture — otherwise a hard refresh would silently demote a
 * signed-in admin back to the vendor-owner seed session.
 */
function resolvePersistedSession() {
  let raw = null;
  try {
    raw = typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(STORAGE_KEYS.activeUser);
  } catch {
    raw = null;
  }
  if (!raw) return session;

  try {
    const user = JSON.parse(raw);
    const identity = findDemoSession(user?.email);
    if (identity) return identity;
    const registered = user?.email
      ? loadRegisteredAccounts()[String(user.email).toLowerCase()]
      : null;
    if (registered) {
      return { ...session, user: registered.user, tenant: registered.tenant };
    }
    return { ...session, user: { ...session.user, ...user } };
  } catch {
    return session;
  }
}

/* ---------------------------------------------------------------------------
 * ROUTE HANDLERS
 * Ordered most-specific first. Each receives (method, segments, params, body).
 * ------------------------------------------------------------------------- */
const handlers = [
  /* ---- auth ---- */
  [/^auth\/login$/, (method, segments, params, body) => authenticate(body)],
  [/^auth\/register$/, (method, segments, params, body) => registerAccount(body)],
  [/^auth\/refresh$/, () => ok({ ...TOKENS })],
  [/^auth\/logout$/, () => ok({ message: 'Signed out' })],
  [/^auth\/forgot-password$/, () => ok({ message: 'Reset link sent if the account exists' })],
  [/^auth\/reset-password$/, () => ok({ message: 'Password updated' })],
  [/^auth\/me$/, () => ok(resolvePersistedSession())],

  /* ---- dashboard & reports ---- */
  [/^dashboard\/overview$/, () => dashboardOverview()],
  [/^dashboard\/metrics$/, () => ok(computeMetrics())],
  [/^reports\/profit-loss$/, () => ok(profitAndLoss)],
  [/^reports\/tax-summary$/, () => ok(taxSummary)],
  [/^reports\/vendor-performance$/, () => ok(vendorPerformance)],
  [/^reports\/balance-sheet$/, () =>
    ok({
      assets: [
        { label: 'Cash & bank', current: 18_400_000, previous: 15_200_000 },
        { label: 'Accounts receivable', current: 41_960_000, previous: 38_700_000 },
        { label: 'Inventory', current: 27_400_000, previous: 26_100_000 },
        { label: 'Property & equipment', current: 34_800_000, previous: 33_900_000 },
      ],
      liabilities: [
        { label: 'Accounts payable', current: 23_450_000, previous: 24_100_000 },
        { label: 'Accrued expenses', current: 6_200_000, previous: 5_800_000 },
        { label: 'VAT payable', current: 3_549_200, previous: 3_308_200 },
        { label: 'Long-term loans', current: 12_000_000, previous: 14_000_000 },
      ],
      equity: [
        { label: 'Share capital', current: 20_000_000, previous: 20_000_000 },
        { label: 'Retained earnings', current: 57_361_800, previous: 46_600_600 },
      ],
    }),
  ],
  [/^reports\/export$/, (method, segments, params, body) =>
    ok({
      report: body?.report ?? params?.report ?? 'unknown',
      format: body?.format ?? params?.format ?? 'pdf',
      generatedAt: new Date().toISOString(),
      /* The mock has no file store; the link is a no-op the UI can render. */
      downloadUrl: '#',
    })],
  [/^reports\/cash-flow$/, () =>
    ok({
      operating: [12_400_000, 14_800_000, 11_200_000, 18_600_000, 16_400_000, 21_200_000],
      investing: [-4_200_000, -6_800_000, -2_400_000, -8_200_000, -3_600_000, -5_100_000],
      financing: [2_000_000, -1_400_000, 3_200_000, -2_600_000, 1_800_000, -1_200_000],
      labels: dashboard.revenueTrend.map((r) => r.month),
    }),
  ],

  /* ---- search ---- */
  [/^search$/, (method, segments, params) => {
    const term = (params.q ?? params.search ?? '').toLowerCase();
    const results = searchIndex
      .filter((r) => !term || `${r.title} ${r.subtitle}`.toLowerCase().includes(term))
      .slice(0, Number(params.limit) || 12);
    return ok({ results, query: params.q ?? '' });
  }],
  [/^search\/suggestions$/, (method, segments, params) => {
    const term = (params.q ?? '').toLowerCase();
    return ok({
      people: peopleIndex.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 5),
      companies: companiesIndex.filter((c) => c.name.toLowerCase().includes(term)).slice(0, 5),
    });
  }],

  /* ---- notifications ---- */
  [/^notifications\/unread-count$/, () => ok({ count: db.notifications.filter((n) => !n.read).length })],
  [/^notifications\/read-all$/, () => {
    db.notifications.forEach((n) => { n.read = true; });
    return ok({ updated: db.notifications.length });
  }],
  [/^notifications\/([^/]+)\/read$/, (method, segments) => {
    const n = db.notifications.find((x) => x.id === segments[1]);
    if (n) n.read = true;
    return ok(n ?? { id: segments[1], read: true });
  }],

  /* ---- platform administration ---- */
  [/^platform\/system$/, () => ok(systemHealth)],
  [/^platform\/onboarding\/([^/]+)$/, (method, segments, params, body) => {
    const item = findById('onboardingQueue', segments[1]);
    if (!item) return fail(404, { message: `Onboarding item ${segments[1]} not found` });
    if (method === 'put' || method === 'patch') return ok(updateRecord('onboardingQueue', segments[1], body ?? {}));
    return ok(item);
  }],

  /* ---- customers: 360-degree detail ----
     These two live here rather than falling through to the generic resource
     router, because `/customers/CUS-1000/financial-summary` has three segments:
     the generic path would read `CUS-1000` as the resource name and return
     null. The 360 view is the one screen that needs them. */
  [/^customers\/([^/]+)\/financial-summary$/, (method, segments) => {
    const id = segments[1];
    const customer = findById('customers', id);
    if (!customer) return fail(404, { message: 'Customer not found' });

    /* The customer's own invoices, newest first. */
    const mine = db.invoices
      .filter((invoice) => invoice.customerId === id)
      .sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)));

    const paid = mine.reduce((sum, invoice) => sum + (invoice.amountPaid ?? 0), 0);
    const outstanding = mine.reduce((sum, invoice) => sum + (invoice.balance ?? 0), 0);

    return ok({
      customerId: id,
      totalBilled: mine.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0),
      totalPaid: paid,
      outstanding,
      creditLimit: customer.creditLimit ?? 0,
      /* How much of the limit the outstanding balance already consumes. Capped
         at 100 so a single over-limit customer cannot render a 340% bar. */
      creditUsedPct: customer.creditLimit
        ? Math.min(100, Math.round((outstanding / customer.creditLimit) * 100))
        : 0,
      invoiceCount: mine.length,
      averageInvoiceValue: mine.length ? Math.round(mine.reduce((s, i) => s + i.total, 0) / mine.length) : 0,
      /* Six months of billed-vs-collected, oldest first, for the sparkline. */
      monthly: Array.from({ length: 6 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (5 - i));
        const key = month.toISOString().slice(0, 7);
        const billed = mine
          .filter((invoice) => String(invoice.issueDate).startsWith(key))
          .reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
        const collected = mine
          .filter((invoice) => String(invoice.issueDate).startsWith(key))
          .reduce((sum, invoice) => sum + (invoice.amountPaid ?? 0), 0);
        return { month: key, billed, collected };
      }),
      /* Payment-terms mix rather than top products: the invoice fixture stores
         `items` as a line count, not as line records, so there is no honest
         per-product revenue to report here. */
      termsMix: Object.entries(
        mine.reduce((acc, invoice) => {
          const key = invoice.paymentTerms ?? 'Unspecified';
          return { ...acc, [key]: (acc[key] ?? 0) + 1 };
        }, {}),
      )
        .sort(([, a], [, b]) => b - a)
        .map(([terms, count]) => ({ terms, count })),
    });
  }],
  [/^customers\/([^/]+)\/activity$/, (method, segments, params) => {
    const id = segments[1];
    const customer = findById('customers', id);
    if (!customer) return fail(404, { message: 'Customer not found' });

    /* A plausible trail assembled from the customer's own records, newest
       first. Realistic ordering matters more here than volume: a timeline that
       runs backwards is the first thing anyone notices. */
    const events = [
      ...db.invoices
        .filter((invoice) => invoice.customerId === id)
        .map((invoice) => ({
          id: `act-inv-${invoice.id}`,
          type: 'invoice',
          title: `Invoice ${invoice.number} issued`,
          detail: `${invoice.items?.length ?? 0} line items`,
          amount: invoice.total,
          at: invoice.issueDate,
        })),
      {
        id: `act-created-${id}`,
        type: 'customer',
        title: 'Customer record created',
        detail: `Segment: ${customer.segment}`,
        at: customer.createdAt ?? customer.lastActivityAt,
      },
      {
        id: `act-note-${id}`,
        type: 'note',
        title: 'Account review',
        detail: customer.notes || `Reviewed by ${customer.owner}.`,
        at: customer.lastActivityAt,
      },
    ]
      .filter((event) => event.at)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 20);

    return ok(events);
  }],

  /* ---- sales: kanban stage move ---- */
  [/^sales\/leads\/([^/]+)\/stage$/, (method, segments, params, body) => {
    const lead = updateRecord('leads', segments[1], { stage: body?.stage, updatedAt: new Date().toISOString() });
    return lead ? ok(lead) : fail(404, { message: 'Lead not found' });
  }],
  [/^sales\/pipeline\/value$/, () => {
    const open = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
    return ok({
      totalValue: open.reduce((s, l) => s + l.value, 0),
      weightedValue: open.reduce((s, l) => s + l.value * (l.probability / 100), 0),
      openDeals: open.length,
      byStage: LEAD_STAGES.map((s) => ({
        ...s,
        count: leads.filter((l) => l.stage === s.id).length,
        value: leads.filter((l) => l.stage === s.id).reduce((sum, l) => sum + l.value, 0),
      })),
    });
  }],
  [/^sales\/quotes\/([^/]+)\/convert$/, (method, segments) => {
    const quote = findById('quotes', segments[1]);
    if (!quote) return fail(404, { message: 'Quote not found' });
    return ok({ id: `SO-${5200 + db.orders.length}`, number: `SO-2026-${2100 + db.orders.length}`, quoteNumber: quote.number });
  }],

  /* ---- accounting ---- */
  [/^accounting\/invoices\/([^/]+)\/payments$/, (method, segments, params, body) => {
    const invoice = findById('invoices', segments[1]);
    if (!invoice) return fail(404, { message: 'Invoice not found' });
    const amount = Number(body?.amount) || 0;
    invoice.amountPaid = Math.round((invoice.amountPaid + amount) * 100) / 100;
    invoice.balance = Math.round((invoice.total - invoice.amountPaid) * 100) / 100;
    invoice.statusKey = invoice.balance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    invoice.status = { label: invoice.balance <= 0 ? 'Paid' : 'Part paid', tone: invoice.balance <= 0 ? 'success' : 'warning' };
    return ok(invoice);
  }],
  [/^accounting\/invoices\/([^/]+)\/send$/, (method, segments) => {
    const invoice = updateRecord('invoices', segments[1], { statusKey: 'SENT', status: { label: 'Sent', tone: 'info' }, sentAt: new Date().toISOString() });
    return invoice ? ok(invoice) : fail(404, { message: 'Invoice not found' });
  }],
  [/^accounting\/receivables$/, (method, segments, params) => {
    const report = agingReport('receivables');
    return ok({ ...report.data, items: db.invoices.filter((i) => i.balance > 0) });
  }],
  [/^accounting\/payables$/, (method, segments, params) => {
    const report = agingReport('payables');
    return ok({ ...report.data, items: db.expenses.filter((e) => e.statusKey === 'APPROVED') });
  }],
  [/^accounting\/expenses\/([^/]+)\/approve$/, (method, segments, params, body) => {
    const approved = body?.decision !== 'REJECTED';
    const expense = updateRecord('expenses', segments[1], {
      statusKey: approved ? 'APPROVED' : 'REJECTED',
      status: approved ? { label: 'Approved', tone: 'success' } : { label: 'Rejected', tone: 'danger' },
    });
    return expense ? ok(expense) : fail(404, { message: 'Expense not found' });
  }],
  [/^accounting\/trial-balance$/, () => ok({ debits: 176_240_000, credits: 176_240_000, balanced: true })],

  /* ---- products ---- */
  [/^products\/low-stock$/, (method, segments, params) => {
    /* `low-stock` would be read as a record id by the generic path, so the
       filter is applied here instead: at or below reorder level, or out. */
    const items = db.products.filter((p) => (p.onHand ?? 0) <= (p.reorderLevel ?? 0));
    const pageSize = Math.max(1, Number(params.pageSize) || items.length || 1);
    return ok({ items, total: items.length, page: 1, pageSize, totalPages: 1 });
  }],

  /* ---- inventory ---- */
  [/^inventory\/overview$/, () => {
    const totalValue = products.reduce((sum, p) => sum + p.onHand * p.costPrice, 0);
    return ok({
      totalSkus: products.length,
      totalUnits: products.reduce((s, p) => s + p.onHand, 0),
      stockValue: totalValue,
      lowStock: products.filter((p) => p.statusKey === 'LOW_STOCK' || p.status.label === 'Low stock').length,
      outOfStock: products.filter((p) => p.status.label === 'Out of stock').length,
      warehouses: db.warehouses,
      movements: db.stockMovements.slice(0, 12),
      byCategory: Object.values(
        products.reduce((acc, p) => {
          acc[p.category] = acc[p.category] || { name: p.category, value: 0, units: 0 };
          acc[p.category].value += p.onHand * p.costPrice;
          acc[p.category].units += p.onHand;
          return acc;
        }, {}),
      ).sort((a, b) => b.value - a.value),
    });
  }],
  [/^inventory\/adjustments$/, (method, segments, params, body) => {
    if (method === 'post') {
      const product = findById('products', body?.productId);
      if (product && body?.delta) product.onHand = Math.max(0, product.onHand + Number(body.delta));
      return ok({ id: `ADJ-${Date.now()}`, ...body, createdAt: new Date().toISOString() });
    }
    return queryCollection('stockMovements', params);
  }],
  [/^inventory\/transfers$/, (method, segments, params, body) => {
    if (method === 'post') {
      return ok({ id: `TRF-${Date.now()}`, ...body, status: 'IN_TRANSIT', createdAt: new Date().toISOString() });
    }
    return queryCollection('stockMovements', { ...params, type: 'TRANSFER' });
  }],

  /* ---- hr ---- */
  [/^hr\/attendance\/summary$/, () =>
    ok({
      present: db.attendance.filter((a) => a.statusKey === 'PRESENT').length,
      absent: db.attendance.filter((a) => a.statusKey === 'ABSENT').length,
      late: db.attendance.filter((a) => a.statusKey === 'LATE').length,
      onLeave: db.attendance.filter((a) => a.statusKey === 'ON_LEAVE').length,
      rate: 92.4,
    }),
  ],
  [/^hr\/attendance\/check-in$/, () => ok({ id: `ATT-${Date.now()}`, clockIn: new Date().toISOString(), statusKey: 'PRESENT' })],
  [/^hr\/attendance\/check-out$/, () => ok({ id: `ATT-${Date.now()}`, clockOut: new Date().toISOString() })],
  [/^hr\/leaves\/([^/]+)\/decision$/, (method, segments, params, body) => {
    const approved = body?.decision === 'APPROVED';
    const leave = updateRecord('leaves', segments[1], {
      statusKey: approved ? 'APPROVED' : 'REJECTED',
      status: approved ? { label: 'Approved', tone: 'success' } : { label: 'Rejected', tone: 'danger' },
    });
    return leave ? ok(leave) : fail(404, { message: 'Leave request not found' });
  }],

  /* ---- projects ---- */
  [/^projects\/tasks\/([^/]+)\/status$/, (method, segments, params, body) => {
    const task = updateRecord('tasks', segments[1], { statusKey: body?.status, order: body?.order });
    return task ? ok(task) : fail(404, { message: 'Task not found' });
  }],
  [/^projects\/([^/]+)\/tasks$/, (method, segments, params) => {
    const result = queryCollection('tasks', params);
    return ok({ ...result.data, items: result.data.items.filter((t) => t.projectId === segments[1]) });
  }],
  [/^projects\/([^/]+)\/milestones$/, (method, segments) =>
    ok([
      { id: 'MS-1', name: 'Discovery complete', status: 'DONE', dueDate: daysAgoP(30) },
      { id: 'MS-2', name: 'Configuration signed off', status: 'DONE', dueDate: daysAgoP(10) },
      { id: 'MS-3', name: 'Go-live', status: 'IN_PROGRESS', dueDate: daysAgoP(-18) },
      { id: 'MS-4', name: 'Hypercare ends', status: 'PENDING', dueDate: daysAgoP(-45) },
    ]),
  ],

  /* ---- support ---- */
  [/^support\/tickets\/([^/]+)\/messages$/, (method, segments) => ok(db.ticketMessages)],
  [/^support\/tickets\/([^/]+)\/assign$/, (method, segments, params, body) => {
    const ticket = updateRecord('tickets', segments[1], { assignee: body?.assignee });
    return ticket ? ok(ticket) : fail(404, { message: 'Ticket not found' });
  }],
  [/^support\/tickets\/([^/]+)\/close$/, (method, segments) => {
    const ticket = updateRecord('tickets', segments[1], { statusKey: 'CLOSED', status: { label: 'Closed', tone: 'neutral' } });
    return ticket ? ok(ticket) : fail(404, { message: 'Ticket not found' });
  }],
  [/^support\/sla$/, () =>
    ok({ withinSla: 94.2, breached: db.tickets.filter((t) => t.slaBreached).length, avgFirstResponse: 42, avgResolution: 340 }),
  ],

  /* ---- super admin ---- */
  [/^vendors\/stats$/, () =>
    ok({
      total: vendors.length,
      active: vendors.filter((v) => v.status.label === 'Active').length,
      pending: vendors.filter((v) => v.status.label === 'Pending review').length,
      suspended: vendors.filter((v) => v.status.label === 'Suspended').length,
      mrr: vendors.reduce((s, v) => s + v.mrr, 0),
      signups: vendors.map((v) => ({ month: v.createdAt.slice(0, 7), count: 1 })),
    }),
  ],
  [/^vendors\/([^/]+)\/suspend$/, (method, segments) => {
    const v = updateRecord('vendors', segments[1], { statusKey: 'SUSPENDED', status: { label: 'Suspended', tone: 'danger' } });
    return v ? ok(v) : fail(404, { message: 'Vendor not found' });
  }],
  [/^vendors\/([^/]+)\/activate$/, (method, segments) => {
    const v = updateRecord('vendors', segments[1], { statusKey: 'ACTIVE', status: { label: 'Active', tone: 'success' } });
    return v ? ok(v) : fail(404, { message: 'Vendor not found' });
  }],
];

/** Small helper so the milestone handler can express future/past dates. */
function daysAgoP(n) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

/* ---------------------------------------------------------------------------
 * THE BASE QUERY
 * Mirrors the RTK Query baseQuery contract: ({ url, method, body, params },
 * api, extraOptions) => Promise<{ data } | { error }>.
 * ------------------------------------------------------------------------- */
export async function mockBaseQuery(args, api, extraOptions) {
  const { url, method = 'GET', body, params = {} } = typeof args === 'string' ? { url: args } : args;

  await wait(LATENCY_MS);

  /* Surface a realistic failure when a form is submitted empty, so error
     styling is reachable in the mock as well. */
  if (body && typeof body === 'object' && Object.keys(body).length === 0) {
    return fail(400, { message: 'Validation failed: request body is empty' });
  }

  const [pathname, searchString] = url.split('?');
  const query = { ...params };
  if (searchString) {
    new URLSearchParams(searchString).forEach((value, key) => { query[key] = value; });
  }

  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
  const segments = cleanPath.split('/').filter(Boolean);
  const lowerMethod = method.toLowerCase();

  /* 1. Specific routes. */
  for (const [pattern, handler] of handlers) {
    const match = cleanPath.match(pattern);
    if (match) {
      const result = handler(lowerMethod, segments.filter((_, i) => match[i]), query, body);
      return { ...result, meta: { mock: true, ...(result.meta ?? {}) } };
    }
  }

  /* 2. Generic resource routes.
        /accounting/invoices          -> the collection
        /customers/CUS-1000           -> one record
     Which store key a URL maps to is decided by resolveCollection above;
     record ids are strings like "CUS-1000", so the shape of the id itself
     still cannot tell a collection from a record. */
  const resolved = resolveCollection(cleanPath);

  if (resolved) {
    const { key: resource, id } = resolved;
    if (lowerMethod === 'get' && !id) return { ...queryCollection(resource, query), meta: { mock: true } };
    if (lowerMethod === 'get' && id) {
      const record = findById(resource, id);
      return record
        ? { data: record, meta: { mock: true } }
        : fail(404, { message: `${resource} ${id} not found` });
    }
    if (lowerMethod === 'post') {
      const created = createRecord(resource, body ?? {});
      return created ? { data: created, meta: { mock: true } } : fail(400, { message: 'Could not create record' });
    }
    if (lowerMethod === 'put' || lowerMethod === 'patch') {
      const updated = updateRecord(resource, id, body ?? {});
      return updated ? { data: updated, meta: { mock: true } } : fail(404, { message: `${resource} ${id} not found` });
    }
    if (lowerMethod === 'delete') {
      return deleteRecord(resource, id)
        ? { data: { id, deleted: true }, meta: { mock: true } }
        : fail(404, { message: `${resource} ${id} not found` });
    }
  }

  /* 3. Unknown route — echo it so an unmigrated screen still renders. */
  return { data: null, meta: { mock: true, unmatched: cleanPath } };
}

/** Reset helper used by the dev toolbar / Storybook-style harnesses. */
export function __resetMockDb() {
  Object.keys(db).forEach((key) => {
    const source = collections[key] ?? (key === 'ticketMessages' ? ticketMessages : null);
    if (source) db[key] = [...source];
  });
}

/** Read-only access for tests. */
export function __getMockDb() {
  return db;
}

export { parsePath };
