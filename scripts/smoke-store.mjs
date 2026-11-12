/**
 * Dev-time smoke test for the data layer.
 *
 * Bundles the real store and issues a real query through the mock backend, so
 * a mis-registered API slice, a broken middleware chain or a malformed
 * aggregate payload fails here instead of in the browser.
 *
 * Run: node scripts/smoke-store.mjs
 */
import { store } from '../src/store/store.js';
import { apis } from '../src/store/rootReducer.js';
import { dashboardApi } from '../src/features/dashboard/api/dashboardApi.js';
import { customersApi } from '../src/features/customers/api/customersApi.js';
import { authApi } from '../src/features/auth/api/authApi.js';
import { searchApi } from '../src/services/searchApi.js';
import { tokenStorage } from '../src/services/api.js';
import { STORAGE_KEYS } from '../src/config/constants.js';

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\nstore');
const state = store.getState();
check('auth slice present', Boolean(state.auth));
check(
  'every API slice registered',
  apis.every((api) => Boolean(state[api.reducerPath])),
  apis.filter((api) => !state[api.reducerPath]).map((a) => a.reducerPath).join(', '),
);
check(
  'no reducer is registered twice',
  new Set(apis.map((a) => a.reducerPath)).size === apis.length,
);
console.log(`  slices: ${Object.keys(state).join(', ')}`);

console.log('\ndashboard aggregate (GET /dashboard/overview)');
const overview = await store
  .dispatch(dashboardApi.endpoints.getOverview.initiate({ range: '30d' }))
  .unwrap();

check('currency returned', Boolean(overview.currency), JSON.stringify(overview.currency));
check('metrics has all five KPIs', ['sales', 'expenses', 'grossProfit', 'receivables', 'payables']
  .every((key) => typeof overview.metrics?.[key]?.value === 'number'),
Object.keys(overview.metrics ?? {}).join(', '));
check('sparkline survives the merge', Array.isArray(overview.metrics?.sales?.spark),
  JSON.stringify(overview.metrics?.sales?.spark));
check('revenue trend has 12 months', overview.revenueTrend?.length === 12, String(overview.revenueTrend?.length));
check('revenue trend x-key is "month"', overview.revenueTrend?.[0]?.month !== undefined);
check('aging rows use bucket/amount', overview.receivablesAging?.[0]?.bucket && overview.receivablesAging?.[0]?.amount);
check('pipeline has stages', overview.pipeline?.stages?.length > 0);
check('top customers ranked', overview.topCustomers?.length === 5, String(overview.topCustomers?.length));
check('attention queue populated', overview.attention?.length > 0, String(overview.attention?.length));
check('activity populated', overview.activity?.length > 0);

console.log('\nglobal search (GET /search)');
const search = await store
  .dispatch(searchApi.endpoints.search.initiate({ q: 'acme', limit: 5 }))
  .unwrap();
check('search returns an array', Array.isArray(search.results), JSON.stringify(search).slice(0, 120));

console.log('\ncustomer collection query (paginated)');
const customers = await store
  .dispatch(customersApi.endpoints.getCustomers.initiate({ page: 1, pageSize: 5 }))
  .unwrap();
check('items returned', Array.isArray(customers.items) && customers.items.length === 5,
  String(customers?.items?.length));
check('pagination metadata alongside items', typeof customers.total === 'number'
  && typeof customers.totalPages === 'number',
JSON.stringify({ total: customers.total, totalPages: customers.totalPages }));

console.log('\nfiltered + sorted collection query');
const filtered = await store
  .dispatch(
    customersApi.endpoints.getCustomers
      .initiate({ page: 1, pageSize: 3, search: 'a', sortBy: 'name', sortOrder: 'asc' }),
  )
  .unwrap();
check('search narrows the result set', filtered.items.length > 0 && filtered.items.length <= 3,
  `${filtered.items.length} rows`);
check('sort is applied', filtered.items.length < 2
  || String(filtered.items[0].name) <= String(filtered.items[1].name),
`${filtered.items[0]?.name} then ${filtered.items[1]?.name}`);

console.log('\nsession bootstrap');
/* The regression this guards: isBootstrapping starts true and every shell
   renders null while it is, so nothing clears it -> a permanently blank page. */
const { finishBootstrap } = await import('../src/features/auth/slices/authSlice.js');
check('starts out bootstrapping', store.getState().auth.isBootstrapping === true);

store.dispatch(finishBootstrap());
check('finishBootstrap clears the flag', store.getState().auth.isBootstrapping === false);
check('no user means unauthenticated', store.getState().auth.status === 'unauthenticated');
check('authApi exposes the revalidation query', typeof authApi.endpoints.me === 'object');

console.log('\nauth round-trip (mock)');
const session = await store.dispatch(authApi.endpoints.login.initiate({
  email: 'adaeze.okonkwo@arkcrm.io',
  password: 'Password123!',
})).unwrap();
check('login returns a token pair', Boolean(session.accessToken), JSON.stringify(Object.keys(session)));
check('tokens mirrored to storage', tokenStorage.getAccessToken() === session.accessToken);
check('slice marked authenticated', store.getState().auth.status === 'authenticated');
check('user persisted to storage', Boolean(localStorage.getItem(STORAGE_KEYS.activeUser)));

console.log('\nrole-aware login (mock)');
const platform = await store.dispatch(authApi.endpoints.login.initiate({
  email: 'tunde.aluko@arkcrm.io',
  password: 'Password123!',
})).unwrap();
check('platform admin gets the SUPER_ADMIN role', platform.user.role === 'SUPER_ADMIN');
check('platform admin has no tenant', platform.tenant === null);

const accountant = await store.dispatch(authApi.endpoints.login.initiate({
  email: 'Femi.Adeyemi@arkcrm.io',
  password: 'whatever',
})).unwrap();
check('email lookup is case-insensitive', accountant.user.role === 'ACCOUNTANT');
check('vendor roles keep the tenant', accountant.tenant?.id === 'VND-0001');
check('a 6+ char password of any value is accepted', Boolean(accountant.accessToken));

let rejected = null;
try {
  await store.dispatch(authApi.endpoints.login.initiate({
    email: 'nobody@example.com',
    password: 'Password123!',
  })).unwrap();
} catch (error) {
  rejected = error;
}
check('an unknown email is refused', rejected?.status === 401, JSON.stringify(rejected ?? 'accepted'));

console.log(failures === 0 ? '\nsmoke: OK\n' : `\nsmoke: ${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
