/**
 * ArkCRM — API service connector
 * ---------------------------------------------------------------------------
 * The single seam between the React app and the Spring Boot backend.
 *
 *  - `apiClient`   — a configured Axios instance for imperative calls
 *                    (file uploads, print payloads, anything outside RTK Query).
 *  - `baseQuery`   — the RTK Query baseQuery used by every `*Api.js` slice.
 *                    Attaches the bearer token, unwraps the Spring error
 *                    contract, and refreshes an expired access token once
 *                    before replaying the original request.
 *
 * While `VITE_USE_MOCKS` is not "false" the baseQuery delegates to
 * mockBackend.js, so no network call is attempted. Flip the flag when the
 * backend is live — nothing else changes.
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS, USE_MOCK_API } from '@/config/constants';
import { mockBaseQuery } from './mockBackend';

/* ---------------------------------------------------------------------------
 * TOKEN STORAGE
 * The backend returns `{ accessToken, refreshToken }` from
 * POST /auth/login. Kept in localStorage so a hard refresh keeps the session;
 * a production deployment should prefer httpOnly cookies for the refresh
 * token specifically.
 * ------------------------------------------------------------------------- */
export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(STORAGE_KEYS.accessToken),
  getRefreshToken: () => localStorage.getItem(STORAGE_KEYS.refreshToken),
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.activeUser);
  },
};

/* ---------------------------------------------------------------------------
 * AXIOS INSTANCE (imperative calls)
 * ------------------------------------------------------------------------- */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Normalises the Spring Boot error envelope into a readable message.
 * Expected shape: { status, error, message, path, timestamp }.
 */
export function extractErrorMessage(error) {
  const data = error?.response?.data ?? error?.data ?? error?.error?.data;
  if (!data) return error?.message || 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  if (Array.isArray(data.errors)) {
    /* Bean Validation on the DTO returns a field-errors array. */
    return data.errors.map((e) => `${e.field}: ${e.message}`).join(' · ');
  }
  return data.message || data.error || 'Request failed';
}

/* ---------------------------------------------------------------------------
 * TOKEN REFRESH
 * A single in-flight refresh promise is shared by every queued request, so a
 * dashboard firing eight parallel queries on mount triggers exactly one
 * refresh round-trip rather than eight.
 * ------------------------------------------------------------------------- */
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const { data } = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  tokenStorage.set(data);
  return data.accessToken;
}

/* ---------------------------------------------------------------------------
 * BASE QUERY
 * ------------------------------------------------------------------------- */
const realBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  /* Credentials matter if the backend moves the refresh token to a cookie. */
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = tokenStorage.getAccessToken() ?? getState()?.auth?.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    /* Echo the active workspace so the backend can scope the request. It is
       the workspace *id* on its own: the stored tenant is a record, and
       posting the whole thing as a header value helps nobody. */
    const state = getState();
    const tenantId = state?.auth?.tenant?.id ?? state?.auth?.user?.vendorId ?? null;
    if (tenantId) headers.set('X-Vendor-Id', tenantId);
    headers.set('X-Client', 'arkcrm-web');
    return headers;
  },
});

/**
 * Wraps the real baseQuery with transparent 401 recovery.
 * On a 401: refresh once, then replay the request with the new token.
 * If the refresh itself fails, clear the session and reject so ProtectedRoute
 * redirects to /login.
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await realBaseQuery(args, api, extraOptions);

  if (result?.error?.status !== 401) return result;

  try {
    refreshPromise = refreshPromise ?? refreshAccessToken();
    const newToken = await refreshPromise;
    refreshPromise = null;

    /* Replay the original request with the refreshed bearer token. */
    const retryArgs = {
      ...args,
      headers: {
        ...(args.headers ?? {}),
        authorization: `Bearer ${newToken}`,
      },
    };
    return await realBaseQuery(retryArgs, api, extraOptions);
  } catch {
    refreshPromise = null;
    tokenStorage.clear();
    /* Signal the app to navigate to /login. */
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('arkcrm:session-expired'));
    }
    return result;
  } finally {
    refreshPromise = null;
  }
};

/**
 * The baseQuery every feature API slice imports. Delegates to the fixtures
 * while the backend is still being built.
 */
export const baseQuery = USE_MOCK_API ? mockBaseQuery : baseQueryWithReauth;

/** Tag types registered on the store, used for cache invalidation. */
export const tagTypes = [
  'Auth', 'Vendor', 'Customer', 'Product', 'Inventory', 'Warehouse',
  'Lead', 'Quote', 'Order', 'Invoice', 'Expense', 'Ledger',
  'Employee', 'Attendance', 'Leave', 'Project', 'Task',
  'Ticket', 'Notification', 'Dashboard', 'Report',
];

/** Network-state flags every screen checks before rendering. */
export const networkStatusSelectors = {
  selectIsFetching: (state, path, args) =>
    state.api?.[path]?.queries?.[JSON.stringify(args)]?.status === 'pending',
};

export default apiClient;
