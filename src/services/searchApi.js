/**
 * ArkCRM — Global search API
 * ---------------------------------------------------------------------------
 * The backend for the ⌘K command palette. It lives in `services/` rather than a
 * feature folder because it spans every entity — customers, products,
 * invoices, projects, tickets, employees.
 *
 * Search goes through RTK Query rather than a raw `fetch` so the palette
 * benefits from the bearer token, the active-tenant header and the mock
 * backend (which serves `/search` from the fixture index) for free. Two
 * in-flight searches for the same term are also deduplicated.
 *
 * `getWorkspaceActivity` lives here for a non-obvious reason: rootReducer.js
 * owns the API registry, and only slices listed there get a reducer, middleware
 * and a serializability entry. The workspace feed needed an endpoint and this
 * was the one shared slice that was already registered, so it rides along here
 * rather than forcing an edit to the store.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery,
  tagTypes: ['Search', 'Activity'],
  endpoints: (builder) => ({
    /**
     * @param {{ q: string, limit?: number, type?: string }} params
     *   `type` narrows the palette to one entity (the /filter chips).
     * @returns {{ results: Array<{ id, type, title, subtitle, to, meta }> }}
     */
    search: builder.query({
      query: ({ q, limit = 12, type } = {}) => ({
        url: apiRoutes.search.global,
        params: { q, limit, ...(type ? { type } : {}) },
      }),
      /* Results are per-keystroke and never reused across a session. */
      keepUnusedDataFor: 0,
    }),

    /** Type-ahead for the people/company pickers. */
    suggest: builder.query({
      query: ({ q, limit = 5 } = {}) => ({
        url: apiRoutes.search.suggestions,
        params: { q, limit },
      }),
      keepUnusedDataFor: 30,
    }),

    /**
     * The workspace activity feed (60 audit rows from the mock's
     * `workspaceAuditLog`). Tagged separately from `Search` so a refetch of the
     * palette can never invalidate the timeline, and vice versa.
     * @param {{ page?: number, pageSize?: number, search?: string }} params
     * @returns {{ items: Array<{ id, timestamp, actor, category, action, severity, … }>, total, page, pageSize, totalPages }}
     */
    getWorkspaceActivity: builder.query({
      query: (params = {}) => ({ url: '/activity', params }),
      providesTags: ['Activity'],
    }),
  }),
});

export const {
  useSearchQuery,
  useLazySearchQuery,
  useSuggestQuery,
  useGetWorkspaceActivityQuery,
} = searchApi;

export default searchApi;
