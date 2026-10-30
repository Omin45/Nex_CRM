/**
 * NexERP — Global constants
 * ---------------------------------------------------------------------------
 * API route definitions, status vocabularies, pagination defaults and the
 * navigation model. These values mirror the Spring Boot REST contract:
 * every `apiRoutes.*` path here should have a matching `@RequestMapping` on
 * the backend.
 */

/* ---------------------------------------------------------------------------
 * ENVIRONMENT
 * Vite inlines VITE_* variables at build time. `apiBaseUrl` is the Spring
 * Boot server root, e.g. "https://api.nexerp.io/api".
 * ------------------------------------------------------------------------- */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/** When true, RTK Query serves fixtures instead of hitting the network. */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCKS !== 'false';

/** WebSocket endpoint appended to the API origin by SocketContext. */
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'ws://localhost:8080/ws';

/* ---------------------------------------------------------------------------
 * API ROUTES
 * Grouped by domain so a feature slice only ever imports its own group.
 * Dynamic segments use `:id` (Spring's path-variable syntax).
 * ------------------------------------------------------------------------- */
export const apiRoutes = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    me: '/auth/me',
  },
  vendors: {
    list: '/vendors',
    detail: (id) => `/vendors/${id}`,
    suspend: (id) => `/vendors/${id}/suspend`,
    activate: (id) => `/vendors/${id}/activate`,
    stats: '/vendors/stats',
    onboards: '/vendors/onboarding',
  },
  customers: {
    list: '/customers',
    detail: (id) => `/customers/${id}`,
    create: '/customers',
    update: (id) => `/customers/${id}`,
    remove: (id) => `/customers/${id}`,
    financialSummary: (id) => `/customers/${id}/financial-summary`,
    activity: (id) => `/customers/${id}/activity`,
  },
  products: {
    list: '/products',
    detail: (id) => `/products/${id}`,
    create: '/products',
    update: (id) => `/products/${id}`,
    remove: (id) => `/products/${id}`,
    lowStock: '/products/low-stock',
  },
  inventory: {
    overview: '/inventory/overview',
    stockMovements: '/inventory/movements',
    adjust: '/inventory/adjustments',
    transfer: '/inventory/transfers',
    transferHistory: '/inventory/transfers',
  },
  warehouses: {
    list: '/warehouses',
    detail: (id) => `/warehouses/${id}`,
    create: '/warehouses',
    update: (id) => `/warehouses/${id}`,
  },
  sales: {
    leads: '/sales/leads',
    lead: (id) => `/sales/leads/${id}`,
    moveLead: (id) => `/sales/leads/${id}/stage`,
    quotes: '/sales/quotes',
    quote: (id) => `/sales/quotes/${id}`,
    orders: '/sales/orders',
    order: (id) => `/sales/orders/${id}`,
    convertQuote: (id) => `/sales/quotes/${id}/convert`,
    pipelineValue: '/sales/pipeline/value',
  },
  accounting: {
    invoices: '/accounting/invoices',
    invoice: (id) => `/accounting/invoices/${id}`,
    recordPayment: (id) => `/accounting/invoices/${id}/payments`,
    sendInvoice: (id) => `/accounting/invoices/${id}/send`,
    receivables: '/accounting/receivables',
    payables: '/accounting/payables',
    expenses: '/accounting/expenses',
    expense: (id) => `/accounting/expenses/${id}`,
    approveExpense: (id) => `/accounting/expenses/${id}/approve`,
    ledger: '/accounting/ledger',
    trialBalance: '/accounting/trial-balance',
  },
  hr: {
    employees: '/hr/employees',
    employee: (id) => `/hr/employees/${id}`,
    attendance: '/hr/attendance',
    attendanceSummary: '/hr/attendance/summary',
    checkIn: '/hr/attendance/check-in',
    checkOut: '/hr/attendance/check-out',
    leaves: '/hr/leaves',
    leave: (id) => `/hr/leaves/${id}`,
    approveLeave: (id) => `/hr/leaves/${id}/decision`,
  },
  projects: {
    list: '/projects',
    detail: (id) => `/projects/${id}`,
    create: '/projects',
    update: (id) => `/projects/${id}`,
    tasks: (id) => `/projects/${id}/tasks`,
    task: (taskId) => `/projects/tasks/${taskId}`,
    moveTask: (taskId) => `/projects/tasks/${taskId}/status`,
    milestones: (id) => `/projects/${id}/milestones`,
  },
  support: {
    tickets: '/support/tickets',
    ticket: (id) => `/support/tickets/${id}`,
    reply: (id) => `/support/tickets/${id}/messages`,
    assign: (id) => `/support/tickets/${id}/assign`,
    close: (id) => `/support/tickets/${id}/close`,
    sla: '/support/sla',
  },
  reports: {
    profitAndLoss: '/reports/profit-loss',
    balanceSheet: '/reports/balance-sheet',
    cashFlow: '/reports/cash-flow',
    taxSummary: '/reports/tax-summary',
    vendorPerformance: '/reports/vendor-performance',
    export: '/reports/export',
  },
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },
  /* Platform administration. Deliberately a separate namespace from the
     vendor-scoped groups above — nothing here is reachable from a tenant
     session, and the prefix makes that visible at a glance. */
  platform: {
    users: '/platform/users',
    subscriptions: '/platform/subscriptions',
    transactions: '/platform/transactions',
    audit: '/platform/audit-log',
    onboarding: '/platform/onboarding',
    system: '/platform/system',
  },
  search: {
    global: '/search',
    suggestions: '/search/suggestions',
  },
  file: {
    upload: '/files/upload',
    download: (key) => `/files/${key}`,
  },
};

/* ---------------------------------------------------------------------------
 * PAGINATION
 * ------------------------------------------------------------------------- */
export const PAGINATION = {
  defaultPage: 1,
  defaultSize: 10,
  sizeOptions: [10, 25, 50, 100],
  /* Guards against a client asking for the entire table in one page. */
  maxSize: 200,
};

/* ---------------------------------------------------------------------------
 * STATUS VOCABULARY
 * `tone` maps to a Badge variant defined in Badge.jsx.
 * ------------------------------------------------------------------------- */
export const INVOICE_STATUS = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SENT: { label: 'Sent', tone: 'info' },
  VIEWED: { label: 'Viewed', tone: 'info' },
  PARTIALLY_PAID: { label: 'Part paid', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const PAYMENT_STATUS = {
  PENDING: { label: 'Pending', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'info' },
};

export const EXPENSE_STATUS = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  REIMBURSED: { label: 'Reimbursed', tone: 'info' },
};

export const LEAD_STAGES = [
  { id: 'new', label: 'New Lead', tone: 'info', probability: 10 },
  { id: 'contacted', label: 'Contacted', tone: 'info', probability: 25 },
  { id: 'qualified', label: 'Qualified', tone: 'accent', probability: 45 },
  { id: 'proposal', label: 'Proposal', tone: 'warning', probability: 65 },
  { id: 'negotiation', label: 'Negotiation', tone: 'violet', probability: 80 },
  { id: 'won', label: 'Won', tone: 'success', probability: 100 },
  { id: 'lost', label: 'Lost', tone: 'danger', probability: 0 },
];

export const PRODUCT_STATUS = {
  IN_STOCK: { label: 'In stock', tone: 'success' },
  LOW_STOCK: { label: 'Low stock', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'danger' },
  DISCONTINUED: { label: 'Discontinued', tone: 'neutral' },
};

export const VENDOR_STATUS = {
  PENDING: { label: 'Pending review', tone: 'warning' },
  ACTIVE: { label: 'Active', tone: 'success' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  REJECTED: { label: 'Rejected', tone: 'neutral' },
};

export const EMPLOYEE_STATUS = {
  ACTIVE: { label: 'Active', tone: 'success' },
  ON_LEAVE: { label: 'On leave', tone: 'warning' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  TERMINATED: { label: 'Terminated', tone: 'neutral' },
};

export const ATTENDANCE_STATUS = {
  PRESENT: { label: 'Present', tone: 'success' },
  ABSENT: { label: 'Absent', tone: 'danger' },
  LATE: { label: 'Late', tone: 'warning' },
  HALF_DAY: { label: 'Half day', tone: 'warning' },
  ON_LEAVE: { label: 'On leave', tone: 'info' },
  HOLIDAY: { label: 'Holiday', tone: 'neutral' },
};

export const LEAVE_STATUS = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const PROJECT_STATUS = {
  PLANNING: { label: 'Planning', tone: 'info' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  ON_HOLD: { label: 'On hold', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const TASK_STATUS = {
  TODO: { label: 'To do', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  REVIEW: { label: 'In review', tone: 'warning' },
  DONE: { label: 'Done', tone: 'success' },
};

export const TICKET_STATUS = {
  OPEN: { label: 'Open', tone: 'info' },
  PENDING: { label: 'Pending customer', tone: 'warning' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};

export const TICKET_PRIORITY = {
  LOW: { label: 'Low', tone: 'neutral' },
  MEDIUM: { label: 'Medium', tone: 'info' },
  HIGH: { label: 'High', tone: 'warning' },
  URGENT: { label: 'Urgent', tone: 'danger' },
};

/* ---------------------------------------------------------------------------
 * REPORT RANGES — shared by every date-filtered view.
 * ------------------------------------------------------------------------- */
export const DATE_RANGES = [
  { id: 'today', label: 'Today', days: 1 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last quarter', days: 90 },
  { id: 'ytd', label: 'Year to date', days: 365 },
  { id: 'custom', label: 'Custom range', days: null },
];

/* ---------------------------------------------------------------------------
 * TOAST VARIANTS — consumed by NotificationToast via useNotification().
 * ------------------------------------------------------------------------- */
export const TOAST_VARIANTS = {
  success: { label: 'Success', icon: 'check' },
  error: { label: 'Error', icon: 'alert' },
  warning: { label: 'Warning', icon: 'alert' },
  info: { label: 'Information', icon: 'info' },
};

/* ---------------------------------------------------------------------------
 * STORAGE KEYS — namespaced to avoid collisions with other apps on the
 * same origin.
 * ------------------------------------------------------------------------- */
export const STORAGE_KEYS = {
  accessToken: 'nexerp.auth.accessToken',
  refreshToken: 'nexerp.auth.refreshToken',
  activeUser: 'nexerp.auth.user',
  activeVendor: 'nexerp.tenant.vendor',
  theme: 'nexerp.ui.theme',
  sidebarCollapsed: 'nexerp.ui.sidebarCollapsed',
  tablePreferences: 'nexerp.ui.tablePreferences',
};

/* ---------------------------------------------------------------------------
 * EMPTY / LOADING PLACEHOLDER ROW COUNTS — keeps layout from collapsing
 * while a table's first page loads.
 * ------------------------------------------------------------------------- */
export const SKELETON_ROWS = 8;
