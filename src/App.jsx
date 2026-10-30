/**
 * NexERP — App
 * ---------------------------------------------------------------------------
 * Composes the provider stack. Order is load-bearing:
 *
 *   Redux          the store every hook below reads from
 *   Theme          writes data-theme on <html> before first paint
 *   Toast          the notification surface useNotify() writes into
 *   Socket         connects once authenticated, after the store exists
 *   Router         last, so no component renders outside a route context
 *
 * RouterProvider replaces BrowserRouter + <Routes>: the route tree lives in
 * routes/AppRoutes.jsx and is mounted on a browser router here, in the entry
 * that is only ever loaded in a browser. (The tree itself is plain data, so it
 * can also be mounted on a memory router in tests — see scripts/smoke-render.)
 *
 * ErrorBoundary stays *inside* the router so a crash in a lazy screen still has
 * a working router context to offer "go home" from.
 */

import { Provider } from 'react-redux';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { store } from '@/store/store';
import { ThemeProvider } from '@/context/ThemeContext';
import { SocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/components/feedback/NotificationToast';
import SessionBootstrap from '@/features/auth/components/SessionBootstrap';
import { routes } from '@/routes/AppRoutes';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';

/* Created once at module scope: `createBrowserRouter` reads window.history, so
   it must not run during render (where StrictMode would construct it twice). */
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <NotificationProvider>
          {/* Clears auth.isBootstrapping, which every shell waits on. Must be
              mounted even while no route has resolved. */}
          <SessionBootstrap />

          <SocketProvider>
            <ErrorBoundary>
              <RouterProvider router={router} />
            </ErrorBoundary>
          </SocketProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Provider>
  );
}
