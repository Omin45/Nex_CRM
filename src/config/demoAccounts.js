/**
 * NexERP — Demo accounts
 * ---------------------------------------------------------------------------
 * The mock backend has no user table, so this file is the roster: the emails
 * that resolve to a real identity, the role each one carries, and the copy the
 * login page shows next to them.
 *
 * It is deliberately split from fixtures.js. AuthPage imports *only* this
 * file, so the sign-in screen does not drag the whole fixture dataset (every
 * customer, invoice and chart series) into its chunk. The session payloads
 * those accounts resolve to are built in fixtures.js, which owns the tenant
 * shape.
 *
 * One password for every demo account. Anything of 6+ characters is accepted —
 * the *email* is what selects the identity — but this is the string the tiles
 * on the login page fill in, so it is the one worth remembering.
 */

export const DEMO_PASSWORD = 'Password123!';

/**
 * Ordered the way the login page lists them: platform first, then the tenant
 * owner, then progressively narrower roles inside the same tenant.
 *
 * `blurb` is what each tile shows — a one-line answer to "what will I see if I
 * sign in as this person?".
 */
export const demoAccounts = [
  {
    key: 'platform-admin',
    email: 'tunde.aluko@nexerp.io',
    firstName: 'Tunde',
    lastName: 'Aluko',
    role: 'SUPER_ADMIN',
    jobTitle: 'Platform Administrator',
    scope: 'platform',
    blurb: 'All tenants, billing, platform audit log',
  },
  {
    key: 'owner',
    email: 'adaeze.okonkwo@nexerp.io',
    firstName: 'Adaeze',
    lastName: 'Okonkwo',
    role: 'VENDOR_OWNER',
    jobTitle: 'Chief Executive Officer',
    scope: 'tenant',
    blurb: 'Everything in the tenant, including billing',
  },
  {
    key: 'tenant-admin',
    email: 'ngozi.balogun@nexerp.io',
    firstName: 'Ngozi',
    lastName: 'Balogun',
    role: 'VENDOR_ADMIN',
    jobTitle: 'Operations Director',
    scope: 'tenant',
    blurb: 'Team, settings and every module',
  },
  {
    key: 'accountant',
    email: 'femi.adeyemi@nexerp.io',
    firstName: 'Femi',
    lastName: 'Adeyemi',
    role: 'ACCOUNTANT',
    jobTitle: 'Financial Controller',
    scope: 'tenant',
    blurb: 'Invoices, receivables, payables, ledger',
  },
  {
    key: 'sales-manager',
    email: 'amara.eze@nexerp.io',
    firstName: 'Amara',
    lastName: 'Eze',
    role: 'SALES_MANAGER',
    jobTitle: 'Sales Manager',
    scope: 'tenant',
    blurb: 'Full pipeline, quotes and orders',
  },
  {
    key: 'sales-rep',
    email: 'segun.nwachukwu@nexerp.io',
    firstName: 'Segun',
    lastName: 'Nwachukwu',
    role: 'SALES_REP',
    jobTitle: 'Account Executive',
    scope: 'tenant',
    blurb: 'Own leads and customers only',
  },
  {
    key: 'warehouse',
    email: 'chidi.okafor@nexerp.io',
    firstName: 'Chidi',
    lastName: 'Okafor',
    role: 'WAREHOUSE_MANAGER',
    jobTitle: 'Warehouse Manager',
    scope: 'tenant',
    blurb: 'Stock, movements, transfers, counts',
  },
  {
    key: 'hr',
    email: 'yewande.ibrahim@nexerp.io',
    firstName: 'Yewande',
    lastName: 'Ibrahim',
    role: 'HR_MANAGER',
    jobTitle: 'Human Resources Manager',
    scope: 'tenant',
    blurb: 'Employees, attendance and leave',
  },
  {
    key: 'support',
    email: 'aisha.uche@nexerp.io',
    firstName: 'Aisha',
    lastName: 'Uche',
    role: 'SUPPORT_AGENT',
    jobTitle: 'Support Agent',
    scope: 'tenant',
    blurb: 'Ticket queue and customer replies',
  },
  {
    key: 'auditor',
    email: 'kofi.mensah@nexerp.io',
    firstName: 'Kofi',
    lastName: 'Mensah',
    role: 'AUDITOR',
    jobTitle: 'Internal Auditor',
    scope: 'tenant',
    blurb: 'Read-only across finance and audit log',
  },
  {
    key: 'employee',
    email: 'emeka.danjuma@nexerp.io',
    firstName: 'Emeka',
    lastName: 'Danjuma',
    role: 'EMPLOYEE',
    jobTitle: 'Operations Associate',
    scope: 'tenant',
    blurb: 'Self-service HR and projects',
  },
];

/** Case-insensitive lookup used by the mock login and the login tiles. */
export function findDemoAccount(email) {
  const needle = String(email ?? '').trim().toLowerCase();
  return demoAccounts.find((account) => account.email.toLowerCase() === needle) ?? null;
}

export default demoAccounts;
