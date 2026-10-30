/**
 * NexERP — Store
 * ---------------------------------------------------------------------------
 * Configures the Redux Toolkit store and composes the RTK Query middleware.
 *
 * The dev-only checks are relaxed *only* for RTK Query's own actions and cache
 * slices: report exports are Blobs and cached records can carry dates or
 * Errors. Everything the app itself dispatches stays strictly checked, so a
 * genuine serializability bug still surfaces in development.
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import rootReducer, { apis, apiReducerPaths, apiActionTypes } from './rootReducer';

export function createStore(preloadedState) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: apiActionTypes,
          ignoredPaths: apiReducerPaths.flatMap((path) => [
            `${path}.queries`,
            `${path}.mutations`,
            `${path}.provided`,
            `${path}.config`,
          ]),
        },
        immutableCheck: { warnAfter: 128 },
      })
        /* One middleware per API slice; each must sit before the others so a
           query can be dispatched by the component that owns it. */
        .concat(apis.map((api) => api.middleware)),
    devTools: import.meta.env.MODE !== 'production',
  });

  /* setupListeners is applied *after* the store exists — it wraps the store's
     dispatch to listen for focus/reconnect and replay the flagged queries. It
     is not a middleware and must not be concatenated into the chain. */
  setupListeners({
    onRefetchDueToFocus: 30,
    onRefetchDueToReconnect: 60,
  })(store.dispatch);

  return store;
}

export const store = createStore();

export default store;
