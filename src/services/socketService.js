/**
 * ArkCRM — WebSocket service
 * ---------------------------------------------------------------------------
 * Manages the single socket shared by the whole app. SocketContext.jsx owns the
 * React lifecycle; this module owns the transport, the reconnect backoff and
 * the event fan-out, so components can simply `socket.on('invoice:paid', cb)`.
 *
 * Server contract (Spring Boot STOMP-over-websocket, or a plain socket —
 * both are supported by the subscribe helper below):
 *   inbound  → { event: string, payload: object }
 *   outbound → { action: 'subscribe' | 'ping', channels: string[] }
 */

import { SOCKET_URL, STORAGE_KEYS } from '@/config/constants';

/** Canonical event names. Mirrors the backend's event enum. */
export const SOCKET_EVENTS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  NOTIFICATION: 'notification:new',
  INVOICE_UPDATED: 'invoice:updated',
  PAYMENT_RECEIVED: 'payment:received',
  STOCK_CHANGED: 'stock:changed',
  LOW_STOCK: 'stock:low',
  ORDER_UPDATED: 'order:updated',
  LEAD_MOVED: 'lead:moved',
  TICKET_UPDATED: 'ticket:updated',
  PING: 'ping',
  PONG: 'pong',
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const HEARTBEAT_MS = 25_000;

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.status = 'disconnected';
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    /** Set by SocketContext; lets the socket wake the Redux store. */
    this.dispatch = null;
  }

  /* ---------------------------------------------------------------------
   * CONNECTION
   * ------------------------------------------------------------------- */
  connect(dispatch) {
    if (this.dispatch) this.dispatch = dispatch ?? this.dispatch;
    if (this.socket && this.isOpen()) return;

    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    /* The token travels in the query string because browsers cannot set
       headers on a WebSocket handshake. */
    const url = `${SOCKET_URL}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    this.setStatus('connecting');

    try {
      this.socket = new WebSocket(url);
    } catch (error) {
      this.handleFailure(error);
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startHeartbeat();
      this.send({ action: 'subscribe', channels: ['vendor', 'notifications', 'inventory'] });
      this.emit(SOCKET_EVENTS.CONNECTED, { at: new Date().toISOString() });
    };

    this.socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return; /* Ignore non-JSON frames (keep-alives, etc.) */
      }

      if (message.event === SOCKET_EVENTS.PONG) return;
      if (message.event) this.emit(message.event, message.payload ?? message);
      else if (message.type) this.emit(message.type, message.payload ?? message);
    };

    this.socket.onerror = (error) => this.handleFailure(error);

    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.socket = null;
      this.setStatus('disconnected');
      this.emit(SOCKET_EVENTS.DISCONNECTED, {});
      this.scheduleReconnect();
    };
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.onclose = null; /* Suppress the auto-reconnect. */
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  /** Exponential backoff with jitter, capped at 30s. */
  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
    ) * (0.7 + Math.random() * 0.3);

    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  handleFailure(error) {
    this.emit(SOCKET_EVENTS.ERROR, { message: error?.message ?? 'Socket error' });
    this.setStatus('error');
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.send({ action: 'ping' }), HEARTBEAT_MS);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  /* ---------------------------------------------------------------------
   * I/O
   * ------------------------------------------------------------------- */
  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(payload) {
    if (!this.isOpen()) return false;
    try {
      this.socket.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Subscribes to an event.
   * @returns {Function} unsubscribe
   */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  /** Fan-out to every subscriber, isolated so one bad handler cannot break others. */
  emit(event, payload) {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        /* eslint-disable-next-line no-console */
        console.error(`[socket] listener for "${event}" threw`, error);
      }
    });
    /* '*' subscribers receive every event — used by the debug overlay. */
    this.listeners.get('*')?.forEach((handler) => {
      try {
        handler({ event, payload });
      } catch {
        /* ignore */
      }
    });
  }

  setStatus(next) {
    this.status = next;
    this.emit(SOCKET_EVENTS.CONNECTED, { status: next });
    if (this.dispatch) this.dispatch({ type: 'socket/statusChanged', payload: next });
  }

  getStatus() {
    return this.status;
  }
}

/** App-wide singleton — one socket per browser tab. */
export const socketService = new SocketService();

export default socketService;
