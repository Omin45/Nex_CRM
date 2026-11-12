/**
 * ArkCRM — useNotification
 * ---------------------------------------------------------------------------
 * Toast and real-time alert triggers. The provider lives in
 * components/feedback/NotificationToast.jsx; this hook is the public API.
 *
 * Also bridges the WebSocket stream into the toast system, so a server-side
 * event (payment received, low stock) surfaces as a toast without any
 * component having to subscribe.
 */

import { useCallback, useContext, useEffect, useMemo } from 'react';
import { NotificationContext } from '@/components/feedback/NotificationToast';
import socketService, { SOCKET_EVENTS } from '@/services/socketService';
import { serverMessage } from '@/utils/errorMessage';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '@/features/notifications/api/notificationsApi';

/** Bound once so the effect below can subscribe without a dependency on the
 *  service instance. */
const subscribe = (event, handler) => socketService.on(event, handler);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Full notification capability: toasts, the persisted list, the unread badge
 * and the read/clear mutations.
 *
 * @param {object} [options]
 * @param {boolean} [options.subscribeToSocket=true] mirror live events as toasts
 * @param {boolean} [options.fetchList=false] load the persisted list eagerly
 */
export function useNotifications(options = {}) {
  const { subscribeToSocket = true, fetchList = false } = options;
  const { toast, removeToast, clearToasts } = useNotification();

  const { data: list, isLoading, isFetching, refetch } = useGetNotificationsQuery(undefined, {
    skip: !fetchList,
    /* The socket delivers new items; a slow poll is a safety net only. */
    pollingInterval: fetchList ? 120_000 : 0,
  });
  const { data: unread } = useGetUnreadCountQuery();
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  /* Server events -> toasts. Declared once; the handlers are stable. */
  useEffect(() => {
    if (!subscribeToSocket) return undefined;

    const unsubscribers = [
      /* The socket service is a singleton, so subscribe imperatively here
         rather than through the SocketContext hook — this keeps the toast
         layer decoupled from where the provider is mounted. */
      subscribe(SOCKET_EVENTS.PAYMENT_RECEIVED, (payload) =>
        toast({
          variant: 'success',
          title: 'Payment received',
          message: payload?.amount
            ? `${payload.currency ?? ''}${Number(payload.amount).toLocaleString()} against ${payload.invoiceNumber ?? 'an invoice'}.`
            : undefined,
        }),
      ),
      subscribe(SOCKET_EVENTS.LOW_STOCK, (payload) =>
        toast({
          variant: 'warning',
          title: 'Low stock alert',
          message: payload?.productName
            ? `${payload.productName} is below its reorder level.`
            : undefined,
        }),
      ),
      subscribe(SOCKET_EVENTS.INVOICE_UPDATED, (payload) =>
        toast({
          variant: 'info',
          title: 'Invoice updated',
          message: payload?.number ? `${payload.number} was modified.` : undefined,
        }),
      ),
      subscribe(SOCKET_EVENTS.TICKET_UPDATED, (payload) =>
        toast({
          variant: 'info',
          title: 'Support ticket updated',
          message: payload?.number ? `${payload.number} moved to ${payload.status}.` : undefined,
        }),
      ),
    ];

    return () => unsubscribers.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToSocket]);

  const items = useMemo(() => {
    if (Array.isArray(list)) return list;
    return list?.items ?? [];
  }, [list]);

  const unreadCount = unread?.count ?? items.filter((n) => !n.read).length;

  return {
    // toast surface
    toast,
    removeToast,
    clearToasts,
    // persisted list
    notifications: items,
    isLoading,
    isFetching,
    refetch,
    unreadCount,
    markRead: (id) => markRead(id),
    markAllRead: () => markAllRead(),
  };
}

/** Fires an immediate notification — used for client-side success/error. */
export function useNotify() {
  const { toast } = useNotification();

  return useMemo(
    () => ({
      success: (message, options) => toast({ variant: 'success', message, ...options }),
      error: (message, options) => toast({ variant: 'error', message, ...options }),
      warning: (message, options) => toast({ variant: 'warning', message, ...options }),
      info: (message, options) => toast({ variant: 'info', message, ...options }),
      /** Promise helper: await it, then get a consistent success/failure toast. */
      async fromPromise(promise, { success, error } = {}) {
        try {
          const result = await promise;
          if (success) toast({ variant: 'success', message: success });
          return result;
        } catch (err) {
          toast({ variant: 'error', message: error ?? serverMessage(err, 'Something went wrong') });
          throw err;
        }
      },
    }),
    [toast],
  );
}

/** Convenience wrapper for one-off alert triggers. */
export function useAlertOnce() {
  const { toast } = useNotification();
  return useCallback(
    (message, variant = 'info') => toast({ variant, message }),
    [toast],
  );
}

export default useNotification;
