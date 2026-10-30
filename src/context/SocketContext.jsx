/**
 * NexERP — Socket context
 * ---------------------------------------------------------------------------
 * Wraps the SocketService singleton in React state so any component can read
 * the live connection status and subscribe to server events with automatic
 * cleanup.
 *
 * Usage:
 *   const { status, isLive } = useSocket();
 *   useSocketEvent('invoice:updated', (payload) => toast(...));
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import socketService, { SOCKET_EVENTS } from '@/services/socketService';
import { useIsAuthenticated } from '@/hooks/useAuth';

const SocketContext = createContext(null);

export const SOCKET_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

export function SocketProvider({ children }) {
  const dispatch = useDispatch();
  const isAuthenticated = useIsAuthenticated();
  const [status, setStatus] = useState(socketService.getStatus());
  const [lastEvent, setLastEvent] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  /* The service needs the dispatcher so it can push status changes into the
     store; holding it in a ref keeps connect() stable. */
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    const offStatus = socketService.on(SOCKET_EVENTS.CONNECTED, (payload) => {
      setStatus(payload?.status ?? socketService.getStatus());
    });
    const offError = socketService.on(SOCKET_EVENTS.ERROR, () => setStatus(SOCKET_STATUS.ERROR));
    const offDisconnect = socketService.on(SOCKET_EVENTS.DISCONNECTED, () => {
      setStatus(SOCKET_STATUS.DISCONNECTED);
      setReconnectAttempts(socketService.reconnectAttempts);
    });
    /* Mirror the latest frame so components can render a "live" indicator. */
    const offAny = socketService.on('*', ({ event, payload }) => {
      if (event === SOCKET_EVENTS.CONNECTED || event === SOCKET_EVENTS.DISCONNECTED) return;
      setLastEvent({ event, payload, at: Date.now() });
    });

    return () => {
      offStatus();
      offError();
      offDisconnect();
      offAny();
    };
  }, []);

  /* Open the socket only while a session exists, and tear it down on sign-out
     so a logged-out browser tab holds no authenticated connection. */
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect(dispatchRef.current);
    } else {
      socketService.disconnect();
    }

    return () => socketService.disconnect();
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      status,
      isLive: status === SOCKET_STATUS.CONNECTED,
      isConnecting: status === SOCKET_STATUS.CONNECTING,
      isDisconnected: status === SOCKET_STATUS.DISCONNECTED,
      reconnectAttempts,
      lastEvent,
      service: socketService,
    }),
    [status, reconnectAttempts, lastEvent],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}

/**
 * Subscribes to a socket event for the lifetime of the component.
 * @param {string} event  a key of SOCKET_EVENTS
 * @param {Function} handler
 * @param {Array} [deps] extra dependencies that should re-subscribe
 */
export function useSocketEvent(event, handler, deps = []) {
  const handlerRef = useRef(handler);
  /* Keep the latest handler in a ref so re-renders do not re-subscribe. */
  handlerRef.current = handler;

  useEffect(() => {
    if (!event) return undefined;
    return socketService.on(event, (payload) => handlerRef.current(payload));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Imperative access for non-React code paths (axios interceptors, services).
 * Returns the singleton itself — not a getter — so callers can write
 * `socketService.send(...)` directly.
 */
export function useSocketService() {
  return socketService;
}

export default SocketContext;
