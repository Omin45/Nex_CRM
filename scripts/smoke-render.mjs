/**
 * Dev-time render smoke test.
 *
 * Renders the real route tree to static markup and asserts every route produces
 * visible content. This is the guard against the "dev server runs but the page
 * is blank" class of bug: a route that renders `null` — a shell waiting on
 * `auth.isBootstrapping`, a guard that returns nothing, a provider that throws
 * — produces an empty string here, exactly as it produces an empty page in the
 * browser.
 *
 * Notes on the setup:
 *
 *   - The app's `routes` array is imported as pure data, not as a router. It is
 *     mounted on a `createMemoryRouter`, so no browser `window.history` is
 *     needed. Everything under test (shells, role guards, redirects, pages) is
 *     identical to production.
 *
 *   - Rendering uses `renderToPipeableStream` and waits for `onAllReady`, not
 *     `renderToString`. Every screen is a `React.lazy` chunk, and
 *     `renderToString` does not wait for suspended lazy components — it would
 *     emit the Suspense fallback and the assertions would be meaningless. The
 *     stream only completes once every lazy route has resolved.
 *
 *   - Effects still do not run on the server, so the session bootstrap never
 *     fires and `isBootstrapping` would stay true — a blank page in every case.
 *     The store is therefore seeded directly to emulate the state that exists
 *     *after* mount.
 *
 * Run: node scripts/run-render-smoke.mjs
 */
import { renderToPipeableStream } from 'react-dom/server';
import { createElement } from 'react';
import { Writable } from 'node:stream';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

/* ---- shims: storage, and a window for the optional-chained media query ---- */
const memory = new Map();
const shimStorage = {
  getItem: (k) => (memory.has(String(k)) ? memory.get(String(k)) : null),
  setItem: (k, v) => memory.set(String(k), String(v)),
  removeItem: (k) => memory.delete(String(k)),
  clear: () => memory.clear(),
};
globalThis.localStorage = shimStorage;
globalThis.sessionStorage = shimStorage;
globalThis.window = { matchMedia: undefined, addEventListener() {}, removeEventListener() {} };
globalThis.ResizeObserver = class {
  observe() {}

  unobserve() {}

  disconnect() {}
};
globalThis.IntersectionObserver = globalThis.ResizeObserver;
/* Imported by the socket service; never instantiated because effects don't run. */
globalThis.WebSocket = class {
  close() {}
};

/* React Router's <Link> calls useLayoutEffect, which is meaningless on the
   server. Silence just that message — real errors must still surface. */
const realError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('useLayoutEffect does nothing on the server')) return;
  realError(...args);
};

let failures = 0;
function check(label, condition, detail = '') {
  if (condition) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` \u2014 ${detail}` : ''}`);
  }
}

/** Strips tags so assertions match user-visible text, not markup. */
function text(markup) {
  return markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* Imported after the shims exist: the auth slice rehydrates from localStorage
   at import time. */
const { store } = await import('../src/store/store.js');
const { setCredentials, finishBootstrap, logout } = await import(
  '../src/features/auth/slices/authSlice.js'
);
const { session } = await import('../src/services/fixtures.js');
const { ThemeProvider } = await import('../src/context/ThemeContext.jsx');
const { NotificationProvider } = await import(
  '../src/components/feedback/NotificationToast.jsx'
);
/* Required: the Topbar reads socket status, so every shell depends on this
   provider being mounted. */
const { SocketProvider } = await import('../src/context/SocketContext.jsx');
const { routes } = await import('../src/routes/AppRoutes.jsx');

function signedOut() {
  store.dispatch(logout());
  store.dispatch(finishBootstrap());
}

function signedInAsVendor() {
  store.dispatch(setCredentials({ ...session, accessToken: 'smoke-token' }));
}

function signedInAsPlatformAdmin() {
  store.dispatch(
    setCredentials({
      ...session,
      accessToken: 'smoke-token',
      user: { ...session.user, role: 'SUPER_ADMIN' },
    }),
  );
}

/**
 * Renders the route tree at `path` and resolves with the full HTML once every
 * lazy boundary has settled. `onAllReady` is what makes lazy routes work here;
 * `renderToString` would return only the fallbacks.
 */
function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _enc, cb) {
        html += chunk;
        cb();
      },
    });
    sink.on('finish', () => resolve(html));

    const { pipe } = renderToPipeableStream(
      createElement(
        Provider,
        { store },
        createElement(
          ThemeProvider,
          null,
          createElement(
            NotificationProvider,
            null,
            createElement(
              SocketProvider,
              null,
              createElement(RouterProvider, { router }),
            ),
          ),
        ),
      ),
      {
        onAllReady() {
          pipe(sink);
        },
        onError(error) {
          reject(error);
        },
      },
    );
  });
}

const VENDOR_DASHBOARD = '/vendor/VND-0001/dashboard';

console.log('\nsigned out \u2014 / (home page)');
signedOut();
const landing = await renderAt('/');
const landingText = text(landing);
check('is not a blank page', landingText.length > 200, `${landingText.length} chars of text`);
check('renders the marketing navbar', /nexerp/i.test(landingText), landingText.slice(0, 120));
check('has a hero with a value proposition', /erp|workspace|run your/i.test(landingText), landingText.slice(0, 200));
check('lists modules', /sales|crm|accounting|inventory/i.test(landingText));
check('offers sign in and get started', /sign in/i.test(landingText) && /get started|start|free/i.test(landingText));
check('renders the animated mesh backdrop', landing.includes('nx-mesh'));
/* Each marketing band mounts the shared SectionGlow layer (6 home sections;
   the page header adds a seventh on the inner pages). */
const glowLayers = (landing.match(/nx-sectionfx/g) ?? []).length;
check('sections carry animated backdrops', glowLayers >= 6, `${glowLayers} layers`);

console.log('\nmarketing header \u2014 styling contract');
check('renders the 3D backdrop layer behind the pill', landing.includes('nx-site-header__bg'));
check('login button carries the continuous blink glow', landing.includes('nx-blink-glow'));
check('get started is wired to the arrow-exit sequence', landing.includes('nx-site-header__cta'));
check('the backdrop is decorative only', /nx-site-header__bg[^>]*aria-hidden="true"/.test(landing));

console.log('\nsigned out \u2014 /login');
const login = await renderAt('/login');
const loginText = text(login);
check('produces markup', login.length > 0, `${login.length} chars`);
check('is not a blank page', loginText.length > 40, `"${loginText.slice(0, 60)}"`);
check('shows the sign-in form', /sign in|email|password/i.test(loginText), loginText.slice(0, 120));
check('renders the animated mesh backdrop', login.includes('nx-mesh'));
check('offers one-click demo accounts', login.includes('nx-authpage__demo-tile'));
check('names the platform admin among them', /platform administrator/i.test(loginText));
check('collapses the roster behind a toggle', login.includes('nx-authpage__demo-more'));

console.log('\nsigned out \u2014 /register');
const register = text(await renderAt('/register'));
check('is not a blank page', register.length > 40, `"${register.slice(0, 60)}"`);
check('mentions account creation', /create|register|sign up/i.test(register), register.slice(0, 120));
check('hides demo accounts while registering', !register.includes('nx-authpage__demo-tile'));

console.log('\nsigned out \u2014 /does-not-exist');
const notFound = text(await renderAt('/does-not-exist'));
check('is not a blank page', notFound.length > 40, `"${notFound.slice(0, 60)}"`);
check('offers a way back', /dashboard|sign in|go back|home/i.test(notFound), notFound.slice(0, 140));

console.log('\nsigned out \u2014 vendor dashboard (guard)');
/* A protected route redirects with <Navigate>, which navigates in an effect.
   Server rendering never runs effects, so this route is legitimately empty
   here; what matters is that the guard fires and nothing leaks. */
const guarded = text(await renderAt(VENDOR_DASHBOARD));
check('leaks no dashboard content', !/revenue vs expenses/i.test(guarded), guarded.slice(0, 80));
check('guard is driven by session state', store.getState().auth.status === 'unauthenticated');

console.log('\nsigned in \u2014 vendor dashboard');
signedInAsVendor();
const shell = await renderAt(VENDOR_DASHBOARD);
const shellText = text(shell);
check('is not a blank page', shellText.length > 80, `${shellText.length} chars of text`);
check('renders the product brand', /nexerp/i.test(shellText));
check('names the signed-in user', /adaeze/i.test(shellText), shellText.slice(0, 140));
check('shows the active tenant', /meridian/i.test(shellText));
check('renders the sidebar navigation', /dashboard/i.test(shellText));
/* nx-dash scopes the animated shadow rules in Dashboard.css. */
check('dashboard carries its motion marker', shell.includes('nx-dash'));
/* Navigation entries are stored as bare suffixes in navigation.config.js and
   resolved to /vendor/:vendorId hrefs at render time. A relative href would
   resolve against the current path, so /vendor/VND-0001/sales/leads would
   navigate to /vendor/VND-0001/sales/sales/leads — assert the real thing. */
const shellHrefs = [...shell.matchAll(/href="([^"]+)"/g)]
  .map((m) => m[1])
  /* In-page anchors (the skip link) and external URLs are not routes. */
  .filter((href) => !href.startsWith('#') && !/^[a-z]+:/i.test(href));
/* Shared screens live at the root, outside the tenant mount. */
const SHELL_ROOTS = ['/activity', '/help', '/profile', '/notifications'];
const badHref = shellHrefs.find((href) => {
  if (!href.startsWith('/')) return true;
  if (href === '/') return false;
  /* The bare /vendor mount redirects to the tenant dashboard. */
  if (href === '/vendor') return false;
  return (
    !href.startsWith('/vendor/')
    && !href.startsWith('/admin')
    && !SHELL_ROOTS.some((root) => href === root || href.startsWith(`${root}?`))
  );
});
check('every shell link is an absolute path', !badHref, badHref ? `bad href: ${badHref}` : `${shellHrefs.length} hrefs`);
check(
  'sidebar links carry the tenant id',
  shellHrefs.some((href) => href.startsWith(`${VENDOR_DASHBOARD.slice(0, -'dashboard'.length)}`)),
  shellHrefs.slice(0, 6).join(' '),
);

console.log('\nsigned in \u2014 customers list');
const customers = text(await renderAt('/vendor/VND-0001/customers'));
check('is not a blank page', customers.length > 60, `${customers.length} chars`);
check('renders the customer directory heading', /customers/i.test(customers), customers.slice(0, 120));

console.log('\nsigned in \u2014 sales pipeline');
const pipeline = text(await renderAt('/vendor/VND-0001/sales'));
check('is not a blank page', pipeline.length > 60, `${pipeline.length} chars`);
check('renders the pipeline heading', /pipeline/i.test(pipeline), pipeline.slice(0, 120));
check(
  'renders the kanban board',
  pipeline.length > 0 && /new lead|qualified|proposal|negotiation|won|lost/i.test(pipeline),
  pipeline.slice(0, 300),
);

console.log('\nsigned in \u2014 inventory overview');
const inventory = text(await renderAt('/vendor/VND-0001/inventory'));
check('is not a blank page', inventory.length > 60, `${inventory.length} chars`);
check('renders the stock heading', /stock|inventory/i.test(inventory), inventory.slice(0, 120));

console.log('\nsigned in \u2014 invoices');
const invoices = text(await renderAt('/vendor/VND-0001/invoices'));
check('is not a blank page', invoices.length > 60, `${invoices.length} chars`);
check('renders the invoice register', /invoice/i.test(invoices), invoices.slice(0, 120));

/* The routes added after the first release. Each must render real content,
   not just the sidebar — the shell alone is ~570 chars of text, so anything
   under 700 means the page body never made it into the markup. */
console.log('\nsigned in \u2014 workspace routes');
const VENDOR_ROUTES = [
  ['/vendor/VND-0001/sales/quotes', 'quotes'],
  ['/vendor/VND-0001/sales/orders', 'orders'],
  ['/vendor/VND-0001/inventory/warehouses', 'warehouses'],
  ['/vendor/VND-0001/inventory/movements', 'stock movements'],
  ['/vendor/VND-0001/inventory/adjustments', 'stock adjustments'],
  ['/vendor/VND-0001/inventory/transfers', 'stock transfers'],
  ['/vendor/VND-0001/accounting/receivables', 'receivables'],
  ['/vendor/VND-0001/accounting/payables', 'payables'],
  ['/vendor/VND-0001/accounting/expenses', 'expenses'],
  ['/vendor/VND-0001/accounting/ledger', 'general ledger'],
  ['/vendor/VND-0001/projects', 'projects'],
  ['/vendor/VND-0001/hr/employees', 'employees'],
  ['/vendor/VND-0001/hr/attendance', 'attendance'],
  ['/vendor/VND-0001/hr/leave', 'leave'],
  ['/vendor/VND-0001/support/tickets', 'tickets'],
  ['/vendor/VND-0001/reports', 'reports index'],
  ['/vendor/VND-0001/reports/profit-loss', 'profit and loss'],
  ['/vendor/VND-0001/reports/balance-sheet', 'balance sheet'],
  ['/vendor/VND-0001/reports/cash-flow', 'cash flow'],
  ['/vendor/VND-0001/reports/tax', 'tax summary'],
  ['/vendor/VND-0001/settings', 'settings index'],
  ['/vendor/VND-0001/settings/company', 'company settings'],
  ['/vendor/VND-0001/settings/team', 'team settings'],
  ['/vendor/VND-0001/settings/preferences', 'preferences'],
  ['/vendor/VND-0001/settings/billing', 'billing'],
  ['/vendor/VND-0001/settings/audit-log', 'workspace audit log'],
];
for (const [path, label] of VENDOR_ROUTES) {
  const markup = await renderAt(path);
  const body = text(markup);
  check(`${label}: has its own page heading`, /<h1[\s>]/.test(markup), `${body.length} chars \u2014 ${body.slice(120, 420)}`);
  check(`${label}: is not a 404`, !/page not found/i.test(body));
}

console.log('\nsigned in \u2014 shared routes');
for (const [path, label] of [
  ['/profile', 'profile'],
  ['/notifications', 'notifications'],
  ['/activity', 'activity'],
  ['/help', 'help'],
  ['/forbidden', 'forbidden'],
]) {
  const markup = await renderAt(path);
  const body = text(markup);
  check(`${label}: has its own page heading`, /<h1[\s>]/.test(markup), `${body.length} chars \u2014 ${body.slice(120, 420)}`);
}

console.log('\nsigned in as vendor \u2014 /admin (role guard)');
/* A role mismatch renders `null` and redirects via <Navigate>, which navigates
   in an effect — so the server legitimately produces no markup here. What must
   hold is that nothing from the platform tree leaks. */
const forbidden = text(await renderAt('/admin'));
check('does not expose platform administration', !/platform mrr/i.test(forbidden), forbidden.slice(0, 160));
check('does not render the admin directory', !/vendor directory/i.test(forbidden), forbidden.slice(0, 160));
check('does not render a vendor shell', !/meridian/i.test(forbidden), forbidden.slice(0, 160));

console.log('\nsigned in as platform admin \u2014 /admin');
signedInAsPlatformAdmin();
const adminText = text(await renderAt('/admin'));
check('is not a blank page', adminText.length > 80, `"${adminText.slice(0, 60)}"`);
check('renders the platform dashboard', /platform mrr/i.test(adminText), adminText.slice(0, 160));
check('lists the vendor directory', /vendor directory/i.test(adminText), adminText.slice(0, 160));
check('is not a 404', !/page not found/i.test(adminText), adminText.slice(0, 160));

console.log('\nsigned in as platform admin \u2014 admin children');
for (const [path, label] of [
  ['/admin/vendors', 'vendor list'],
  ['/admin/vendors/VND-0001', 'vendor detail'],
  ['/admin/users', 'platform users'],
  ['/admin/subscriptions', 'subscriptions'],
  ['/admin/transactions', 'transactions'],
  ['/admin/onboarding', 'onboarding queue'],
  ['/admin/reports', 'platform reports'],
  ['/admin/audit-log', 'platform audit log'],
  ['/admin/system', 'system health'],
]) {
  const markup = await renderAt(path);
  const body = text(markup);
  check(`${label}: has its own page heading`, /<h1[\s>]/.test(markup), `${body.length} chars \u2014 ${body.slice(120, 420)}`);
  check(`${label}: is not a 404`, !/page not found/i.test(body));
}

console.log(failures === 0 ? '\nrender smoke: OK\n' : `\nrender smoke: ${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
