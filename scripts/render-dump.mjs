/**
 * Prints the static markup for DUMP_ROUTE. See run-render-dump.mjs.
 */
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

const mem = new Map();
const st = {
  getItem: (k) => (mem.has(String(k)) ? mem.get(String(k)) : null),
  setItem: (k, v) => mem.set(String(k), String(v)),
  removeItem: (k) => mem.delete(String(k)),
  clear: () => mem.clear(),
};
globalThis.localStorage = st;
globalThis.sessionStorage = st;
globalThis.window = { matchMedia: undefined, addEventListener() {}, removeEventListener() {} };
globalThis.ResizeObserver = class {
  observe() {}

  unobserve() {}

  disconnect() {}
};
globalThis.IntersectionObserver = globalThis.ResizeObserver;

const { store } = await import('../src/store/store.js');
const { finishBootstrap, logout } = await import('../src/features/auth/slices/authSlice.js');
const { ThemeProvider } = await import('../src/context/ThemeContext.jsx');
const { NotificationProvider } = await import('../src/components/feedback/NotificationToast.jsx');
const { SocketProvider } = await import('../src/context/SocketContext.jsx');
const { default: AppRoutes } = await import('../src/routes/AppRoutes.jsx');

store.dispatch(logout());
store.dispatch(finishBootstrap());

const html = renderToString(
  createElement(
    Provider,
    { store },
    createElement(
      ThemeProvider,
      null,
      createElement(
        NotificationProvider,
        null,
        createElement(
          SocketProvider,
          null,
          createElement(MemoryRouter, { initialEntries: [DUMP_ROUTE] }, createElement(AppRoutes)),
        ),
      ),
    ),
  ),
);

console.log(html);
