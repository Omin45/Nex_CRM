/**
 * ArkCRM — Root reducer & API registry
 * ---------------------------------------------------------------------------
 * One place that knows about every slice and every RTK Query API. Adding a
 * feature means adding it to `apis` below — the reducer map, the middleware
 * chain and the serializability allow-list are all derived from that list, so
 * a new API cannot be half-registered.
 */

import { combineReducers } from '@reduxjs/toolkit';

import authReducer from '@/features/auth/slices/authSlice';
import { authApi } from '@/features/auth/api/authApi';
import { superAdminApi } from '@/features/super-admin/api/superAdminApi';
import { customersApi } from '@/features/customers/api/customersApi';
import { inventoryApi } from '@/features/inventory/api/inventoryApi';
import { salesApi } from '@/features/sales/api/salesApi';
import { accountingApi } from '@/features/accounting/api/accountingApi';
import { hrApi } from '@/features/hr/api/hrApi';
import { projectsApi } from '@/features/projects/api/projectsApi';
import { supportApi } from '@/features/support/api/supportApi';
import { reportsApi } from '@/features/reports/api/reportsApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { notificationsApi } from '@/features/notifications/api/notificationsApi';
import { settingsApi } from '@/features/settings/api/settingsApi';
import { tenantsApi } from '@/features/tenants/api/tenantsApi';
import { searchApi } from '@/services/searchApi';

/** Every API slice, in middleware order. */
export const apis = [
  tenantsApi,
  authApi,
  superAdminApi,
  customersApi,
  inventoryApi,
  salesApi,
  accountingApi,
  hrApi,
  projectsApi,
  supportApi,
  reportsApi,
  dashboardApi,
  notificationsApi,
  settingsApi,
  searchApi,
];

/** State keys holding RTK Query caches, for the serializability allow-list. */
export const apiReducerPaths = apis.map((api) => api.reducerPath);

/** Action types RTK Query dispatches — payloads may carry cached records. */
export const apiActionTypes = apis.flatMap((api) => [
  `${api.reducerPath}/executeQuery/pending`,
  `${api.reducerPath}/executeQuery/fulfilled`,
  `${api.reducerPath}/executeQuery/rejected`,
  `${api.reducerPath}/executeMutation/pending`,
  `${api.reducerPath}/executeMutation/fulfilled`,
  `${api.reducerPath}/executeMutation/rejected`,
  `${api.reducerPath}/queryResultPatched`,
]);

const rootReducer = combineReducers({
  auth: authReducer,

  // Keyed by each API's own reducerPath so slices stay namespaced.
  ...Object.fromEntries(apis.map((api) => [api.reducerPath, api.reducer])),
});

export default rootReducer;
