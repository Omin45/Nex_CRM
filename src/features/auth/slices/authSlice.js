/**
 * NexERP — Auth slice
 * ---------------------------------------------------------------------------
 * Session state: the signed-in user, the active tenant, and the token pair.
 *
 * The token pair is mirrored into localStorage (see services/api.js) so a hard
 * refresh survives; this slice is the source of truth for rendering.
 */

import { createSlice } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/config/constants';
import { tokenStorage } from '@/services/api';

/** Rehydrates the session from localStorage on first load. */
function loadPersistedSession() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const user = localStorage.getItem(STORAGE_KEYS.activeUser);
    if (!user) return null;
    return JSON.parse(user);
  } catch {
    return null;
  }
}

function loadPersistedTenant() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const tenant = localStorage.getItem(STORAGE_KEYS.activeVendor);
    return tenant ? JSON.parse(tenant) : null;
  } catch {
    return null;
  }
}

const initialState = {
  user: loadPersistedSession(),
  tenant: loadPersistedTenant(),
  accessToken: tokenStorage.getAccessToken(),
  refreshToken: tokenStorage.getRefreshToken(),
  /** 'idle' | 'loading' | 'authenticated' | 'unauthenticated' */
  status: 'idle',
  error: null,
  /** True while the persisted session is being revalidated against /auth/me. */
  isBootstrapping: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { user, tenant, accessToken, refreshToken } = action.payload ?? {};
      state.user = user ?? state.user;
      state.tenant = tenant ?? state.tenant;
      state.accessToken = accessToken ?? state.accessToken;
      state.refreshToken = refreshToken ?? state.refreshToken;
      state.status = 'authenticated';
      state.error = null;
      state.isBootstrapping = false;

      if (user) localStorage.setItem(STORAGE_KEYS.activeUser, JSON.stringify(user));
      if (tenant) localStorage.setItem(STORAGE_KEYS.activeVendor, JSON.stringify(tenant));
    },
    setTenant(state, action) {
      state.tenant = action.payload;
      localStorage.setItem(STORAGE_KEYS.activeVendor, JSON.stringify(action.payload));
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(STORAGE_KEYS.activeUser, JSON.stringify(state.user));
    },
    logout(state) {
      state.user = null;
      state.tenant = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'unauthenticated';
      state.error = null;
      state.isBootstrapping = false;
      tokenStorage.clear();
      localStorage.removeItem(STORAGE_KEYS.activeUser);
      localStorage.removeItem(STORAGE_KEYS.activeVendor);
    },
    clearAuthError(state) {
      state.error = null;
    },
    /** Called once the app has attempted to revalidate a persisted session. */
    finishBootstrap(state) {
      state.isBootstrapping = false;
      if (!state.user) state.status = 'unauthenticated';
    },
  },
  extraReducers: (builder) => {
    /* Surface the backend's error message on the login/register forms. */
    builder
      .addMatcher(
        (action) => action.type.endsWith('/login') || action.type.endsWith('/register'),
        (state, action) => {
          if (action.type.endsWith('/pending')) {
            state.status = 'loading';
            state.error = null;
          } else if (action.type.endsWith('/rejected')) {
            state.status = 'unauthenticated';
            state.error = action.error?.data?.message ?? 'Unable to sign in. Please try again.';
          }
        },
      )
      .addMatcher(
        (action) => action.type.endsWith('/logout') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.user = null;
          state.tenant = null;
          state.status = 'unauthenticated';
          tokenStorage.clear();
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.activeUser);
            localStorage.removeItem(STORAGE_KEYS.activeVendor);
          }
        },
      );
  },
});

export const {
  setCredentials, setTenant, updateUser, logout, clearAuthError, finishBootstrap,
} = authSlice.actions;

/* Selectors */
export const selectUser = (state) => state.auth.user;
export const selectTenant = (state) => state.auth.tenant;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;
export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken || state.auth.user);
export const selectIsBootstrapping = (state) => state.auth.isBootstrapping;
export const selectUserRole = (state) => state.auth.user?.role ?? null;
export const selectVendorId = (state) => state.auth.tenant?.id ?? state.auth.user?.vendorId ?? null;

export default authSlice.reducer;
