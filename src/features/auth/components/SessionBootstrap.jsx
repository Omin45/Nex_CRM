/**
 * ArkCRM — SessionBootstrap
 * ---------------------------------------------------------------------------
 * Runs once, at the root, and does the one job that lets the app decide
 * whether to render a public or a signed-in shell: work out whether the
 * session persisted in localStorage is still valid.
 *
 * Why it exists: `auth.isBootstrapping` starts as `true` so the router can
 * wait instead of flashing the login screen at a signed-in user on a hard
 * refresh. Every shell therefore renders `null` while it is true, which means
 * this component MUST clear it — if it never runs, the app is a blank page.
 *
 *   no stored session  -> unauthenticated, done immediately (no request)
 *   stored session     -> GET /auth/me; the authApi endpoint dispatches
 *                         `setCredentials` (still valid) or `finishBootstrap`
 *                         (expired) itself
 *   the request hangs  -> a timeout clears the flag anyway, so the app can
 *                         never get stuck on a spinner
 *
 * Renders nothing.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useMeQuery } from '@/features/auth/api/authApi';
import { finishBootstrap } from '@/features/auth/slices/authSlice';
import { useCurrentUser } from '@/hooks/useAuth';
import { tokenStorage } from '@/services/api';

/** How long to wait for /auth/me before falling back to a signed-out shell. */
const BOOTSTRAP_TIMEOUT_MS = 5000;

export default function SessionBootstrap() {
  const dispatch = useDispatch();

  /* The slice already rehydrated the user from localStorage; only revalidate
     when a token survived too. A half-written pair counts as signed out. */
  const user = useCurrentUser();
  const hasSession = Boolean(user && tokenStorage.getAccessToken());

  const { isSuccess, isError } = useMeQuery(undefined, { skip: !hasSession });

  /* No stored session: nothing to wait for. */
  useEffect(() => {
    if (!hasSession) dispatch(finishBootstrap());
  }, [hasSession, dispatch]);

  /* Safety net so a slow or hanging backend cannot strand the user on a blank
     page. The query's own handlers normally settle this first. */
  useEffect(() => {
    if (!hasSession || isSuccess || isError) return undefined;

    const timer = setTimeout(() => dispatch(finishBootstrap()), BOOTSTRAP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hasSession, isSuccess, isError, dispatch]);

  return null;
}
