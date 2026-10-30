/**
 * NexERP — useAuth
 * ---------------------------------------------------------------------------
 * Single accessor for the signed-in user, the active tenant and the token
 * pair. Screens should never touch `state.auth` directly — this hook is the
 * contract, which keeps a future switch to a different auth backend local to
 * one file.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectUser, selectTenant, selectAuthStatus, selectAuthError,
  selectIsAuthenticated, selectUserRole, selectVendorId, selectIsBootstrapping,
  logout as logoutAction, updateUser, clearAuthError,
} from '@/features/auth/slices/authSlice';
import { useLogoutMutation } from '@/features/auth/api/authApi';
import { PLATFORM_ROLES } from '@/config/permissions.config';

export function useAuth() {
  const dispatch = useDispatch();

  const user = useSelector(selectUser);
  const tenant = useSelector(selectTenant);
  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isBootstrapping = useSelector(selectIsBootstrapping);
  const role = useSelector(selectUserRole);
  const vendorId = useSelector(selectVendorId);
  const [logoutMutation] = useLogoutMutation();

  /**
   * Signs the user out. The RTK Query mutation notifies the backend to revoke
   * the refresh token; the slice clears local state either way, so a network
   * failure can never leave the user stuck in a half-authenticated state.
   */
  const logout = useCallback(async () => {
    try {
      await logoutMutation();
    } finally {
      dispatch(logoutAction());
    }
  }, [dispatch, logoutMutation]);

  const clearError = useCallback(() => dispatch(clearAuthError()), [dispatch]);

  const updateProfile = useCallback(
    (patch) => dispatch(updateUser(patch)),
    [dispatch],
  );

  return useMemo(
    () => ({
      user,
      tenant,
      status,
      error,
      role,
      vendorId,
      isAuthenticated,
      isBootstrapping,
      isLoading: status === 'loading',
      isPlatformAdmin: PLATFORM_ROLES.includes(role),
      logout,
      clearError,
      updateProfile,
    }),
    [user, tenant, status, error, role, vendorId, isAuthenticated, isBootstrapping, logout, clearError, updateProfile],
  );
}

/** Convenience selectors for components that only need one field. */
export function useCurrentUser() {
  return useSelector(selectUser);
}

export function useIsAuthenticated() {
  return useSelector(selectIsAuthenticated);
}

export function useAuthBootstrapping() {
  return useSelector(selectIsBootstrapping);
}

export function useUserRole() {
  return useSelector(selectUserRole);
}

export default useAuth;
