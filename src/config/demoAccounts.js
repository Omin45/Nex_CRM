/**
 * ArkCRM — Demo accounts
 * ---------------------------------------------------------------------------
 * The roster: the people who can sign in, the role each one carries, and the
 * copy the login page shows next to them.
 *
 * These are the identities seeded into MySQL by the Spring Boot backend's
 * DataSeeder. Every account here exists in the database with the password
 * below, so picking a tile and signing in really does authenticate — the
 * backend checks the password with BCrypt and refuses anything else.
 *
 * It is deliberately split from fixtures.js. AuthPage imports *only* this
 * file, so the sign-in screen does not drag the whole fixture dataset (every
 * customer, invoice and chart series) into its chunk.
 *
 * One password for every demo account. This is the string the tiles on the
 * login page fill in, so it is the one worth remembering.
 */

/**
 * The fallback password for an account that does not carry one of its own.
 * Every seeded account has its own; this is only here so a hand-added entry
 * still has something to fill in.
 */
export const DEMO_PASSWORD = 'Admin@123';

/**
 * Ordered the way the login page lists them: platform first, then the tenant
 * owner, then progressively narrower roles inside the same tenant.
 *
 * `blurb` is what each tile shows — a one-line answer to "what will I see if I
 * sign in as this person?".
 */
export const demoAccounts = [
  {
    key: 'nexcrm-super-admin',
    password: 'Omashola@2026',
    email: 'admin@nexcrm.com',
    firstName: 'Omashola',
    lastName: 'Adeyinka',
    role: 'SUPER_ADMIN',
    jobTitle: 'Platform Administrator',
    scope: 'platform',
    blurb: 'All tenants, billing, platform audit log',
  },
  {
    key: 'nexcrm-admin',
    password: 'Kingsley@2026',
    email: 'manager@nexcrm.com',
    firstName: 'Kingsley',
    lastName: 'Chukwu',
    role: 'ADMIN',
    jobTitle: 'Administrator',
    scope: 'tenant',
    blurb: 'Team, settings and every module',
  },
  {
    key: 'nexcrm-sales-manager',
    password: 'Chinenye@2026',
    email: 'sales.manager@nexcrm.com',
    firstName: 'Chinenye',
    lastName: 'Eze',
    role: 'SALES_MANAGER',
    jobTitle: 'Sales Manager',
    scope: 'tenant',
    blurb: 'Full pipeline, quotes and orders',
  },
  {
    key: 'nexcrm-finance-manager',
    password: 'Bola@2026',
    email: 'finance.manager@nexcrm.com',
    firstName: 'Bola',
    lastName: 'Adeyemi',
    role: 'FINANCE_MANAGER',
    jobTitle: 'Finance Manager',
    scope: 'tenant',
    blurb: 'Invoices, receivables, payables, ledger',
  },
  {
    key: 'nexcrm-sales-agent',
    password: 'Chidi@2026',
    email: 'sales.agent@nexcrm.com',
    firstName: 'Chidi',
    lastName: 'Nwosu',
    role: 'SALES_AGENT',
    jobTitle: 'Sales Agent',
    scope: 'tenant',
    blurb: 'Own leads and customers only',
  },
  {
    key: 'nexcrm-accountant',
    password: 'Emeka@2026',
    email: 'accountant@nexcrm.com',
    firstName: 'Emeka',
    lastName: 'Obi',
    role: 'ACCOUNTANT',
    jobTitle: 'Accountant',
    scope: 'tenant',
    blurb: 'Invoices, receivables, payables, ledger',
  },
  {
    key: 'nexcrm-support-manager',
    password: 'Halima@2026',
    email: 'support.manager@nexcrm.com',
    firstName: 'Halima',
    lastName: 'Yusuf',
    role: 'SUPPORT_MANAGER',
    jobTitle: 'Support Manager',
    scope: 'tenant',
    blurb: 'Ticket queue, team and escalation',
  },
  {
    key: 'nexcrm-support-agent',
    password: 'Ifeoma@2026',
    email: 'support.agent@nexcrm.com',
    firstName: 'Ifeoma',
    lastName: 'Nwankwo',
    role: 'SUPPORT_AGENT',
    jobTitle: 'Support Agent',
    scope: 'tenant',
    blurb: 'Ticket queue and customer replies',
  },
  {
    key: 'nexcrm-staff-manager',
    password: 'Daniel@2026',
    email: 'staff.manager@nexcrm.com',
    firstName: 'Daniel',
    lastName: 'Ojo',
    role: 'MANAGER',
    jobTitle: 'Manager',
    scope: 'tenant',
    blurb: 'Everything in the tenant workspace',
  },
  {
    key: 'nexcrm-customer',
    password: 'Grace@2026',
    email: 'customer@nexcrm.com',
    firstName: 'Grace',
    lastName: 'Ihuoma',
    role: 'CUSTOMER',
    jobTitle: 'Customer',
    scope: 'tenant',
    blurb: 'Own quotes, invoices and support tickets',
  },
];

/** Case-insensitive lookup used by the mock login and the login tiles. */
export function findDemoAccount(email) {
  const needle = String(email ?? '').trim().toLowerCase();
  return demoAccounts.find((account) => account.email.toLowerCase() === needle) ?? null;
}

export default demoAccounts;
