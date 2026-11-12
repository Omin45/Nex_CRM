/**
 * ArkCRM — Navigation model
 * ---------------------------------------------------------------------------
 * One source of truth for three consumers: the sidebar, the breadcrumb trail
 * and the route table in AppRoutes. Adding a page means adding it here once.
 *
 * Every entry carries the `permission` it needs. The sidebar hides entries the
 * user cannot use, and `filterNavigation` also drops whole groups that end up
 * empty — so a Warehouse Manager never sees an "Accounting" heading with
 * nothing under it.
 *
 * `match` is the prefix used to mark a group active, which is why a group's
 * first child and its own path share a prefix.
 */

import {
  FiActivity, FiArchive, FiBarChart2, FiBell, FiBriefcase, FiCheckCircle,
  FiClipboard, FiClock, FiCreditCard, FiDollarSign, FiEdit3, FiFileText,
  FiFolder, FiGrid, FiHelpCircle, FiHome, FiLayers, FiLifeBuoy, FiList,
  FiLock, FiMapPin, FiPackage, FiPieChart, FiSettings, FiShield, FiShoppingBag,
  FiShoppingCart, FiStar, FiTool, FiTrendingUp, FiTruck, FiUserCheck, FiUserPlus,
  FiUsers, FiZap,
} from 'react-icons/fi';
import { PERMISSIONS } from './permissions.config';

/* ---------------------------------------------------------------------------
 * UI ROUTES
 * Frontend paths. The API contract lives in `apiRoutes` (constants.js); these
 * are what the router and the navigation use.
 * ------------------------------------------------------------------------- */
export const appRoutes = {
  // Public
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',

  // Marketing
  features: '/features',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',

  // Shared (inside either shell)
  profile: '/profile',
  notifications: '/notifications',
  activity: '/activity',
  help: '/help',
  forbidden: '/forbidden',

  // Vendor shell
  //
  // NOTE: every value here is a *suffix*, not a full path. The spec mounts the
  // whole vendor workspace under /vendor/:vendorId, and the id is only known at
  // runtime (it comes from the session). Keeping the suffixes bare means one
  // resolver — vendorPath() — turns them into real hrefs, so a change to the
  // URL shape is a one-file change.
  vendor: {
    dashboard: 'dashboard',
    sales: {
      index: 'sales',
      leads: 'sales/leads',
      quotes: 'sales/quotes',
      orders: 'sales/orders',
    },
    customers: {
      index: 'customers',
      detail: (id) => `customers/${id}`,
    },
    inventory: {
      index: 'inventory',
      products: 'inventory/products',
      warehouses: 'inventory/warehouses',
      movements: 'inventory/movements',
      adjustments: 'inventory/adjustments',
      transfers: 'inventory/transfers',
    },
    accounting: {
      index: 'accounting',
      invoices: 'accounting/invoices',
      receivables: 'accounting/receivables',
      payables: 'accounting/payables',
      expenses: 'accounting/expenses',
      ledger: 'accounting/ledger',
    },
    projects: {
      index: 'projects',
      detail: (id) => `projects/${id}`,
    },
    hr: {
      index: 'hr',
      employees: 'hr/employees',
      attendance: 'hr/attendance',
      leave: 'hr/leave',
    },
    support: {
      index: 'support',
      tickets: 'support/tickets',
    },
    reports: {
      index: 'reports',
      profitAndLoss: 'reports/profit-loss',
      balanceSheet: 'reports/balance-sheet',
      cashFlow: 'reports/cash-flow',
      tax: 'reports/tax',
    },
    settings: {
      index: 'settings',
      company: 'settings/company',
      team: 'settings/team',
      preferences: 'settings/preferences',
      billing: 'settings/billing',
      audit: 'settings/audit-log',
    },
  },

  // Super admin shell
  admin: {
    index: '/admin',
    vendors: '/admin/vendors',
    vendorDetail: (id) => `/admin/vendors/${id}`,
    users: '/admin/users',
    subscriptions: '/admin/subscriptions',
    transactions: '/admin/transactions',
    onboarding: '/admin/onboarding',
    reports: '/admin/reports',
    audit: '/admin/audit-log',
    system: '/admin/system',
  },
};

/* ---------------------------------------------------------------------------
 * VENDOR PATH RESOLUTION
 * ---------------------------------------------------------------------------
 * The vendor workspace is mounted at /vendor/:vendorId, so a suffix like
 * 'sales/leads' becomes `/vendor/VND-0001/sales/leads`.
 *
 * `vendorPath` is the single place that knows this. Anything that needs an href
 * — the sidebar, dashboard quick actions, post-login redirects — goes through
 * it (or the useVendorPath hook, which supplies the current id for you).
 * ------------------------------------------------------------------------- */

/** The mount point for a tenant's workspace. */
export const vendorBase = (vendorId) => `/vendor/${vendorId}`;

/**
 * @param {string} vendorId Tenant id from the session.
 * @param {string} suffix   A value from `appRoutes.vendor` (no leading slash).
 * @returns {string} An absolute path, safe to hand to <Link to> or navigate().
 */
export const vendorPath = (vendorId, suffix = '') => {
  const base = vendorBase(vendorId ?? 'unknown');
  if (!suffix) return base;
  return `${base}/${String(suffix).replace(/^\//, '')}`;
};

/**
 * Turns the static `vendorNavigation` model into one with real hrefs by
 * prefixing every suffix with the tenant's base. Items whose `to` is already
 * absolute (the shared `/help`, `/activity` pages) are left untouched, so a
 * mix of tenant-scoped and root-scoped entries can live in the same groups.
 *
 * @param {string} vendorId
 * @returns {Array} a new navigation array; the input is never mutated
 */
export const resolveVendorNavigation = (vendorId) =>
  vendorNavigation.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      to: item.to.startsWith('/') ? item.to : vendorPath(vendorId, item.to),
    })),
  }));

/* ---------------------------------------------------------------------------
 * VENDOR NAVIGATION
 * ------------------------------------------------------------------------- */
export const vendorNavigation = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: appRoutes.vendor.dashboard,
        icon: FiGrid,
        end: true,
      },
      {
        label: 'Activity feed',
        to: appRoutes.activity,
        icon: FiActivity,
        permission: PERMISSIONS.AUDIT_VIEW,
      },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      {
        label: 'Sales pipeline',
        to: appRoutes.vendor.sales.leads,
        icon: FiTrendingUp,
        permission: PERMISSIONS.LEAD_VIEW,
      },
      {
        label: 'Quotes',
        to: appRoutes.vendor.sales.quotes,
        icon: FiFileText,
        permission: PERMISSIONS.QUOTE_VIEW,
      },
      {
        label: 'Orders',
        to: appRoutes.vendor.sales.orders,
        icon: FiShoppingCart,
        permission: PERMISSIONS.ORDER_VIEW,
      },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    items: [
      {
        label: 'Customers',
        to: appRoutes.vendor.customers.index,
        icon: FiUsers,
        permission: PERMISSIONS.CUSTOMER_VIEW,
      },
      {
        label: 'Products',
        to: appRoutes.vendor.inventory.products,
        icon: FiPackage,
        permission: PERMISSIONS.PRODUCT_VIEW,
      },
      {
        label: 'Inventory',
        to: appRoutes.vendor.inventory.index,
        icon: FiArchive,
        permission: PERMISSIONS.INVENTORY_VIEW,
      },
      {
        label: 'Warehouses',
        to: appRoutes.vendor.inventory.warehouses,
        icon: FiMapPin,
        permission: PERMISSIONS.INVENTORY_VIEW,
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        label: 'Invoices',
        to: appRoutes.vendor.accounting.invoices,
        icon: FiFileText,
        permission: PERMISSIONS.INVOICE_VIEW,
      },
      {
        label: 'Receivables',
        to: appRoutes.vendor.accounting.receivables,
        icon: FiClock,
        permission: PERMISSIONS.AR_VIEW,
      },
      {
        label: 'Payables',
        to: appRoutes.vendor.accounting.payables,
        icon: FiCreditCard,
        permission: PERMISSIONS.AP_VIEW,
      },
      {
        label: 'Expenses',
        to: appRoutes.vendor.accounting.expenses,
        icon: FiDollarSign,
        permission: PERMISSIONS.EXPENSE_VIEW,
      },
      {
        label: 'General ledger',
        to: appRoutes.vendor.accounting.ledger,
        icon: FiClipboard,
        permission: PERMISSIONS.LEDGER_VIEW,
      },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      {
        label: 'Projects',
        to: appRoutes.vendor.projects.index,
        icon: FiBriefcase,
        permission: PERMISSIONS.PROJECT_VIEW,
      },
      {
        label: 'People',
        to: appRoutes.vendor.hr.employees,
        icon: FiUserCheck,
        permission: PERMISSIONS.EMPLOYEE_VIEW,
      },
      {
        label: 'Attendance',
        to: appRoutes.vendor.hr.attendance,
        icon: FiClock,
        permission: PERMISSIONS.ATTENDANCE_VIEW,
      },
      {
        label: 'Support',
        to: appRoutes.vendor.support.tickets,
        icon: FiLifeBuoy,
        permission: PERMISSIONS.TICKET_VIEW,
      },
    ],
  },
  {
    id: 'insight',
    label: 'Insight',
    items: [
      {
        label: 'Reports',
        to: appRoutes.vendor.reports.index,
        icon: FiBarChart2,
        permission: PERMISSIONS.REPORT_VIEW,
      },
      {
        label: 'Reports: P&L',
        to: appRoutes.vendor.reports.profitAndLoss,
        icon: FiPieChart,
        permission: PERMISSIONS.REPORT_VIEW,
        /* Keep the reports section from repeating the parent in the sidebar. */
        hiddenWhenActive: true,
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        label: 'Settings',
        to: appRoutes.vendor.settings.index,
        icon: FiSettings,
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        label: 'Help centre',
        to: '/help',
        icon: FiHelpCircle,
      },
    ],
  },
];

/* ---------------------------------------------------------------------------
 * SUPER ADMIN NAVIGATION
 * ------------------------------------------------------------------------- */
export const superAdminNavigation = [
  {
    id: 'platform',
    label: 'Platform',
    items: [
      {
        label: 'Overview',
        to: appRoutes.admin.index,
        icon: FiGrid,
        end: true,
      },
      {
        label: 'Vendors',
        to: appRoutes.admin.vendors,
        icon: FiLayers,
        permission: PERMISSIONS.VENDOR_VIEW,
      },
      {
        label: 'Onboarding queue',
        to: appRoutes.admin.onboarding,
        icon: FiClipboard,
        permission: PERMISSIONS.VENDOR_VIEW,
        badge: 'new',
      },
      {
        label: 'Users',
        to: appRoutes.admin.users,
        icon: FiUserPlus,
        permission: PERMISSIONS.USER_MANAGE,
      },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    items: [
      {
        label: 'Subscriptions',
        to: appRoutes.admin.subscriptions,
        icon: FiCreditCard,
        permission: PERMISSIONS.AP_VIEW,
      },
      {
        label: 'Transactions',
        to: appRoutes.admin.transactions,
        icon: FiDollarSign,
        permission: PERMISSIONS.AR_VIEW,
      },
      {
        label: 'Platform reports',
        to: appRoutes.admin.reports,
        icon: FiBarChart2,
        permission: PERMISSIONS.REPORT_VIEW,
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    items: [
      {
        label: 'Audit log',
        to: appRoutes.admin.audit,
        icon: FiShield,
        permission: PERMISSIONS.AUDIT_VIEW,
      },
      {
        label: 'System health',
        to: appRoutes.admin.system,
        icon: FiActivity,
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
];

/* ---------------------------------------------------------------------------
 * BREADCRUMB LABELS
 * Path segment -> display label. Segments that carry an id are resolved
 * dynamically by the Breadcrumb component (e.g. "CUS-1042").
 * ------------------------------------------------------------------------- */
export const SEGMENT_LABELS = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  leads: 'Pipeline',
  quotes: 'Quotes',
  orders: 'Orders',
  customers: 'Customers',
  inventory: 'Inventory',
  products: 'Products',
  warehouses: 'Warehouses',
  movements: 'Stock movements',
  adjustments: 'Adjustments',
  transfers: 'Transfers',
  accounting: 'Accounting',
  invoices: 'Invoices',
  receivables: 'Receivables',
  payables: 'Payables',
  expenses: 'Expenses',
  ledger: 'General ledger',
  projects: 'Projects',
  hr: 'People',
  employees: 'Employees',
  attendance: 'Attendance',
  leave: 'Leave',
  support: 'Support',
  tickets: 'Tickets',
  reports: 'Reports',
  'profit-loss': 'Profit & loss',
  'balance-sheet': 'Balance sheet',
  'cash-flow': 'Cash flow',
  tax: 'Tax summary',
  settings: 'Settings',
  company: 'Company',
  team: 'Team',
  preferences: 'Preferences',
  billing: 'Billing',
  'audit-log': 'Audit log',
  activity: 'Activity feed',
  profile: 'My profile',
  notifications: 'Notifications',
  admin: 'Admin',
  vendors: 'Vendors',
  users: 'Users',
  subscriptions: 'Subscriptions',
  transactions: 'Transactions',
  onboarding: 'Onboarding',
  system: 'System health',
  help: 'Help centre',
  forbidden: 'Access denied',
};

/* ---------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------- */

/**
 * Removes nav entries the user has no permission for, and any group left with
 * no visible children.
 *
 * @param {Array} groups      a NAVIGATION constant
 * @param {Function} hasPermission  (permission) => boolean
 * @returns {Array} a filtered copy; the input is never mutated
 */
export function filterNavigation(groups, hasPermission) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Flattens nav groups to a single list, for search indexing and lookups. */
export function flattenNavigation(groups) {
  return groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label })),
  );
}

/** Is `pathname` inside this nav item? Uses the longest-prefix-safe rule so
 *  `/sales/leads` does not light up `/sales/orders`. */
export function isNavItemActive(item, pathname) {
  if (item.end) return pathname === item.to;
  if (pathname === item.to) return true;
  return pathname.startsWith(`${item.to}/`);
}

/** The nav group containing the current path, or null. */
export function findActiveGroup(groups, pathname) {
  return (
    groups.find((group) => group.items.some((item) => isNavItemActive(item, pathname))) ?? null
  );
}

/** Human label for a URL segment, falling back to a title-cased slug. */
export function labelForSegment(segment) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Unused icon imports are stripped by the bundler, but keeping the registry
 *  explicit documents which glyphs the design leans on. */
export const NAV_ICONS = {
  dashboard: FiHome,
  sales: FiTrendingUp,
  commerce: FiShoppingBag,
  finance: FiCreditCard,
  work: FiBriefcase,
  insight: FiBarChart2,
  workspace: FiSettings,
  list: FiList,
  support: FiLifeBuoy,
  edit: FiEdit3,
  secure: FiLock,
  success: FiCheckCircle,
  star: FiStar,
  zap: FiZap,
  tool: FiTool,
  bell: FiBell,
  truck: FiTruck,
  folder: FiFolder,
  clipboard: FiClipboard,
};
