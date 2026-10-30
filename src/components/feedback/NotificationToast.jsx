/**
 * NexERP — NotificationToast
 * ---------------------------------------------------------------------------
 * The toast surface and the context every `useNotification()` call reads from.
 * Mounted once by RootLayout.
 *
 * Behaviour:
 *  - max 4 toasts on screen; the oldest is dropped when a fifth arrives
 *  - auto-dismiss after a per-variant duration (errors linger longer)
 *  - the timer pauses while the pointer is over a toast, so a message cannot
 *    vanish before it has been read
 *  - a closing animation runs before removal, so toasts do not vanish abruptly
 *  - the region is an aria-live log, so screen readers announce new toasts
 *
 * @example
 * const { toast } = useNotification();
 * toast({ variant: 'success', title: 'Invoice sent', message: 'INV-2026-3001' });
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import Button from '../ui/Button/Button';
import { TOAST_VARIANTS } from '@/config/constants';
import './Feedback.css';

/** Default lifetimes per variant — errors stay up long enough to be acted on. */
const DURATIONS = {
  success: 4000,
  info: 4500,
  warning: 6000,
  error: 8000,
};

const MAX_VISIBLE = 4;

const NotificationContext = createContext(null);

let toastIdCounter = 0;
const nextId = () => `toast-${++toastIdCounter}`;

/* ---------------------------------------------------------------------------
 * PROVIDER
 * ------------------------------------------------------------------------ */
export function NotificationProvider({ children, maxVisible = MAX_VISIBLE }) {
  const [toasts, setToasts] = useState([]);
  /* Timers are keyed by toast id in a ref so a manual dismiss can clear the
     pending timeout without leaking it. */
  const timersRef = useRef(new Map());

  const clearTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id) => {
      clearTimer(id);
      /* Mark as leaving first so the exit animation can play. */
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
      );
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 250);
    },
    [clearTimer],
  );

  const toast = useCallback(
    (input) => {
      /* Accept both toast({...}) and toast('message'). */
      const config = typeof input === 'string' ? { message: input } : input ?? {};
      const variant = config.variant ?? 'info';
      const duration = config.duration ?? DURATIONS[variant] ?? 4500;

      const id = nextId();
      const entry = {
        id,
        variant,
        title: config.title ?? TOAST_VARIANTS[variant]?.label,
        message: config.message,
        action: config.action,
        duration,
        leaving: false,
      };

      setToasts((current) => {
        const next = [...current, entry];
        /* Drop the oldest if we exceed the visible limit. */
        while (next.length > maxVisible) {
          const evicted = next.shift();
          clearTimer(evicted.id);
        }
        return next;
      });

      /* duration: 0 disables auto-dismiss (for confirmations). */
      if (duration > 0) {
        timersRef.current.set(
          id,
          setTimeout(() => removeToast(id), duration),
        );
      }

      return id;
    },
    [maxVisible, clearTimer, removeToast],
  );

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  /* Hover-pause: clear the timer on enter, restart the full window on leave. */
  const pauseToast = useCallback((id) => clearTimer(id), [clearTimer]);

  const resumeToast = useCallback(
    (id, entry) => {
      if (entry?.duration > 0) {
        timersRef.current.set(id, setTimeout(() => removeToast(id), entry.duration));
      }
    },
    [removeToast],
  );

  /* Clear every pending timer if the provider itself unmounts. */
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(
    () => ({ toast, removeToast, clearToasts, toasts }),
    [toast, removeToast, clearToasts, toasts],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastViewport
        toasts={toasts}
        onDismiss={removeToast}
        onPause={pauseToast}
        onResume={resumeToast}
      />
    </NotificationContext.Provider>
  );
}

/* ---------------------------------------------------------------------------
 * VIEWPORT
 * ------------------------------------------------------------------------ */
function ToastViewport({ toasts, onDismiss, onPause, onResume }) {
  if (toasts.length === 0) return null;

  return (
    <div className="nx-toast-region" role="region" aria-label="Notifications">
      {/* polite: a toast should not interrupt whatever the user is doing. */}
      <div aria-live="polite" aria-atomic="false">
        {toasts.map((entry) => (
          <div
            key={entry.id}
            className={`nx-toast nx-toast--${entry.variant}${entry.leaving ? ' is-leaving' : ''}`}
            onMouseEnter={() => onPause(entry.id)}
            onMouseLeave={() => onResume(entry.id, entry)}
          >
            <span className="nx-toast__icon" aria-hidden="true">
              <ToastIcon variant={entry.variant} />
            </span>

            <div className="nx-toast__body">
              {entry.title ? <p className="nx-toast__title">{entry.title}</p> : null}
              {entry.message ? <p className="nx-toast__message">{entry.message}</p> : null}
              {entry.action ? (
                <Button
                  variant="ghost"
                  size="xs"
                  className="nx-toast__action"
                  onClick={() => {
                    entry.action.onClick?.();
                    onDismiss(entry.id);
                  }}
                >
                  {entry.action.label}
                </Button>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="xs"
              className="nx-toast__close"
              onClick={() => onDismiss(entry.id)}
              aria-label="Dismiss notification"
              leftIcon={
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * ICONS
 * ------------------------------------------------------------------------ */
function ToastIcon({ variant }) {
  const paths = {
    success: <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />,
    error: <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />,
    warning: <path d="M12 3l9 16H3l9-16zM12 10v4M12 17.5v.5" strokeLinecap="round" strokeLinejoin="round" />,
    info: <path d="M12 16v-5M12 8v.5" strokeLinecap="round" />,
  };

  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      {variant === 'info' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          {paths.info}
        </>
      ) : (
        paths[variant]
      )}
    </svg>
  );
}

/** Re-exported so features can read the context directly if they must. */
export { NotificationContext };

export default NotificationProvider;
