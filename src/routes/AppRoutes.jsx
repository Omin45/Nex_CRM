/**
 * NexERP — AppRoutes
 * ---------------------------------------------------------------------------
 * The route tree. Deliberately *data*, not a router: this file exports the
 * `routes` array only, and the browser router is constructed where it belongs,
 * in the app entry (App.jsx).
 *
 * That split is not incidental. `createBrowserRouter()` reads `window.history`
 * the moment it runs, so calling it at module scope makes this file
 * unimportable outside a browser — which breaks the Node render smoke test and
 * would break any future SSR or route-inspection tooling. Keeping the tree pure
 * means the exact same routes can be mounted on a memory router in Node, a
 * browser router in the app, or a static router at build time.
 *
 * Four shells, each owning its own guard:
 *
 *   PublicLayout      marketing   — /, /features, /pricing, /about, /contact
 *   AuthShell         auth        — /login, /register, /forgot-password, …
 *   VendorLayout      tenant      — /vendor/:vendorId/*
 *   SuperAdminLayout  platform    — /admin/*
 *
 * ProtectedRoute wraps the two authenticated shells here, which is where a
 * session check genuinely belongs: it can redirect to /login while remembering
 * where the user was.
 *
 * Vendor children are *relative*, so they resolve under the /vendor/:vendorId
 * parent rather than repeating it on every leaf.
 */

import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import VendorLayout from '@/layouts/VendorLayout';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import AuthShell from '@/layouts/AuthShell';
import SharedShell from '@/layouts/SharedShell';
import ProtectedRoute from '@/routes/ProtectedRoute';

/* Lazily loaded so the marketing bundle does not carry the whole ERP. */
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const FeaturesPage = lazy(() => import('@/features/home/pages/FeaturesPage'));
const PricingPage = lazy(() => import('@/features/home/pages/PricingPage'));
const AboutPage = lazy(() => import('@/features/home/pages/AboutPage'));
const ContactPage = lazy(() => import('@/features/home/pages/ContactPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const AuthPage = lazy(() => import('@/features/auth/pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const CustomerListPage = lazy(() => import('@/features/customers/pages/CustomerListPage'));
const Customer360Page = lazy(() => import('@/features/customers/pages/Customer360Page'));
const InventoryOverviewPage = lazy(() => import('@/features/inventory/pages/InventoryOverviewPage'));
const ProductListPage = lazy(() => import('@/features/inventory/pages/ProductListPage'));
const SalesPipelinePage = lazy(() => import('@/features/sales/pages/SalesPipelinePage'));
const InvoiceListPage = lazy(() => import('@/features/accounting/pages/InvoiceListPage'));
const QuoteListPage = lazy(() => import('@/features/sales/pages/QuoteListPage'));
const OrderListPage = lazy(() => import('@/features/sales/pages/OrderListPage'));

const WarehouseListPage = lazy(() => import('@/features/inventory/pages/WarehouseListPage'));
const StockMovementPage = lazy(() => import('@/features/inventory/pages/StockMovementPage'));
const StockAdjustmentPage = lazy(() => import('@/features/inventory/pages/StockAdjustmentPage'));
const StockTransferPage = lazy(() => import('@/features/inventory/pages/StockTransferPage'));

const ReceivablesPage = lazy(() => import('@/features/accounting/pages/ReceivablesPage'));
const PayablesPage = lazy(() => import('@/features/accounting/pages/PayablesPage'));
const ExpenseListPage = lazy(() => import('@/features/accounting/pages/ExpenseListPage'));
const GeneralLedgerPage = lazy(() => import('@/features/accounting/pages/GeneralLedgerPage'));

const ProjectListPage = lazy(() => import('@/features/projects/pages/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('@/features/projects/pages/ProjectDetailPage'));

const EmployeeListPage = lazy(() => import('@/features/hr/pages/EmployeeListPage'));
const AttendancePage = lazy(() => import('@/features/hr/pages/AttendancePage'));
const LeaveListPage = lazy(() => import('@/features/hr/pages/LeaveListPage'));

const TicketListPage = lazy(() => import('@/features/support/pages/TicketListPage'));

const ReportsIndexPage = lazy(() => import('@/features/reports/pages/ReportsIndexPage'));
const ProfitLossPage = lazy(() => import('@/features/reports/pages/ProfitLossPage'));
const BalanceSheetPage = lazy(() => import('@/features/reports/pages/BalanceSheetPage'));
const CashFlowPage = lazy(() => import('@/features/reports/pages/CashFlowPage'));
const TaxSummaryPage = lazy(() => import('@/features/reports/pages/TaxSummaryPage'));

const SettingsIndexPage = lazy(() => import('@/features/settings/pages/SettingsIndexPage'));
const CompanySettingsPage = lazy(() => import('@/features/settings/pages/CompanySettingsPage'));
const TeamSettingsPage = lazy(() => import('@/features/settings/pages/TeamSettingsPage'));
const PreferencesSettingsPage = lazy(
  () => import('@/features/settings/pages/PreferencesSettingsPage'),
);
const BillingSettingsPage = lazy(() => import('@/features/settings/pages/BillingSettingsPage'));
const WorkspaceAuditLogPage = lazy(
  () => import('@/features/settings/pages/WorkspaceAuditLogPage'),
);

/* Shared chrome: these four live outside /vendor and /admin, so they ride the
   SharedShell that picks the right navigation model from the session. */
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const ActivityPage = lazy(() => import('@/pages/ActivityPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));
const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'));

const VendorListPage = lazy(() => import('@/features/super-admin/pages/VendorListPage'));
const AdminVendorDetailPage = lazy(
  () => import('@/features/super-admin/pages/AdminVendorDetailPage'),
);
const PlatformUsersPage = lazy(() => import('@/features/super-admin/pages/PlatformUsersPage'));
const SubscriptionsPage = lazy(() => import('@/features/super-admin/pages/SubscriptionsPage'));
const TransactionsPage = lazy(() => import('@/features/super-admin/pages/TransactionsPage'));
const OnboardingQueuePage = lazy(
  () => import('@/features/super-admin/pages/OnboardingQueuePage'),
);
const PlatformReportsPage = lazy(
  () => import('@/features/super-admin/pages/PlatformReportsPage'),
);
const AdminAuditLogPage = lazy(() => import('@/features/super-admin/pages/AdminAuditLogPage'));
const SystemHealthPage = lazy(() => import('@/features/super-admin/pages/SystemHealthPage'));

const SuperAdminDashboardPage = lazy(
  () => import('@/features/super-admin/pages/SuperAdminDashboardPage'),
);

export const routes = [
  /* ---------------- public / marketing ---------------- */
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'features', element: <FeaturesPage /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
    ],
  },

  /* ---------------- auth ----------------
     One AuthPage serves both /login and /register; the mode prop is derived
     from the path by the component itself so the shared brand panel is not
     torn down and re-created on a swap. */
  {
    element: <AuthShell />,
    children: [
      { path: 'login', element: <AuthPage mode="login" /> },
      { path: 'register', element: <AuthPage mode="register" /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
    ],
  },

  /* ---------------- vendor workspace ----------------
     Child paths are relative, so they resolve under /vendor/:vendorId. */
  {
    element: (
      <ProtectedRoute>
        <VendorLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'vendor/:vendorId',
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },

          /* Sales — the pipeline is both the `sales` and `sales/leads` href in
             the nav model (the lead board is the sales home), with quotes and
             orders as sibling lists off the same group. */
          { path: 'sales', element: <SalesPipelinePage /> },
          { path: 'sales/leads', element: <SalesPipelinePage /> },
          { path: 'sales/quotes', element: <QuoteListPage /> },
          { path: 'sales/orders', element: <OrderListPage /> },

          { path: 'customers', element: <CustomerListPage /> },
          { path: 'customers/:customerId', element: <Customer360Page /> },

          { path: 'inventory', element: <InventoryOverviewPage /> },
          { path: 'inventory/products', element: <ProductListPage /> },
          { path: 'inventory/warehouses', element: <WarehouseListPage /> },
          { path: 'inventory/movements', element: <StockMovementPage /> },
          { path: 'inventory/adjustments', element: <StockAdjustmentPage /> },
          { path: 'inventory/transfers', element: <StockTransferPage /> },

          /* `invoices` is the legacy href the first dashboard shipped with;
             accounting/invoices is the nav-model one. Same page, no redirect
             chain in between so old links do not flash. */
          { path: 'invoices', element: <InvoiceListPage /> },
          { path: 'accounting', element: <Navigate to="invoices" replace /> },
          { path: 'accounting/invoices', element: <InvoiceListPage /> },
          { path: 'accounting/receivables', element: <ReceivablesPage /> },
          { path: 'accounting/payables', element: <PayablesPage /> },
          { path: 'accounting/expenses', element: <ExpenseListPage /> },
          { path: 'accounting/ledger', element: <GeneralLedgerPage /> },

          { path: 'projects', element: <ProjectListPage /> },
          { path: 'projects/:projectId', element: <ProjectDetailPage /> },

          { path: 'hr', element: <Navigate to="employees" replace /> },
          { path: 'hr/employees', element: <EmployeeListPage /> },
          { path: 'hr/attendance', element: <AttendancePage /> },
          { path: 'hr/leave', element: <LeaveListPage /> },

          { path: 'support', element: <Navigate to="tickets" replace /> },
          { path: 'support/tickets', element: <TicketListPage /> },

          { path: 'reports', element: <ReportsIndexPage /> },
          { path: 'reports/profit-loss', element: <ProfitLossPage /> },
          { path: 'reports/balance-sheet', element: <BalanceSheetPage /> },
          { path: 'reports/cash-flow', element: <CashFlowPage /> },
          { path: 'reports/tax', element: <TaxSummaryPage /> },

          { path: 'settings', element: <SettingsIndexPage /> },
          { path: 'settings/company', element: <CompanySettingsPage /> },
          { path: 'settings/team', element: <TeamSettingsPage /> },
          { path: 'settings/preferences', element: <PreferencesSettingsPage /> },
          { path: 'settings/billing', element: <BillingSettingsPage /> },
          { path: 'settings/audit-log', element: <WorkspaceAuditLogPage /> },
        ],
      },
    ],
  },

  /* ---------------- shared authenticated routes ----------------
     Absolute paths, so they sit outside the vendor parent (a tenant change
     must not rewrite /profile). SharedShell renders the right sidebar. */
  {
    element: (
      <ProtectedRoute>
        <SharedShell />
      </ProtectedRoute>
    ),
    children: [
      { path: 'profile', element: <ProfilePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: 'forbidden', element: <ForbiddenPage /> },
    ],
  },

  /* ---------------- platform administration ---------------- */
  {
    element: (
      <ProtectedRoute requirePlatformAdmin>
        <SuperAdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'admin',
        children: [
          { index: true, element: <SuperAdminDashboardPage /> },
          { path: 'vendors', element: <VendorListPage /> },
          { path: 'vendors/:vendorId', element: <AdminVendorDetailPage /> },
          { path: 'users', element: <PlatformUsersPage /> },
          { path: 'subscriptions', element: <SubscriptionsPage /> },
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'onboarding', element: <OnboardingQueuePage /> },
          { path: 'reports', element: <PlatformReportsPage /> },
          { path: 'audit-log', element: <AdminAuditLogPage /> },
          { path: 'system', element: <SystemHealthPage /> },
        ],
      },
    ],
  },

  /* ---------------- 404 ---------------- */
  { path: '*', element: <NotFoundPage /> },
];


