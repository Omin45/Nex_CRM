/**
 * NexERP — Super Admin API
 * Platform-level (cross-tenant) endpoints. Guarded by ProtectedRoute, which
 * only mounts this slice for a SUPER_ADMIN session.
 *
 * Endpoints: /vendors, /vendors/:id, /vendors/:id/suspend, /vendors/:id/activate,
 * /vendors/stats, /vendors/onboarding, plus the platform namespace:
 * /platform/users, /platform/subscriptions, /platform/transactions,
 * /platform/audit-log, /platform/onboarding, /platform/system
 *
 * The platform collections all answer with the same `{ items, total, … }`
 * envelope the tenant ones do, so they share one tag helper: a paginated
 * list is tagged per row *and* as a LIST, which is what lets a mutation
 * invalidate "the row" and "the page it sits on" in one shot.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

/** Per-row tags for a paginated `{ items }` response, plus the list tag. */
const listTags = (result, type) =>
  result
    ? [...result.items.map(({ id }) => ({ type, id })), { type, id: 'LIST' }]
    : [{ type, id: 'LIST' }];

export const superAdminApi = createApi({
  reducerPath: 'superAdminApi',
  baseQuery,
  tagTypes: ['Vendor', 'PlatformUser', 'Subscription', 'Transaction', 'AuditLog', 'Onboarding', 'System'],
  endpoints: (builder) => ({
    getVendors: builder.query({
      query: (params = {}) => ({ url: apiRoutes.vendors.list, params }),
      providesTags: (result) => listTags(result, 'Vendor'),
    }),

    getVendor: builder.query({
      query: (id) => apiRoutes.vendors.detail(id),
      providesTags: (result, error, id) => [{ type: 'Vendor', id }],
    }),

    /** Tenant counts, MRR and sign-up trend for the platform dashboard. */
    getStats: builder.query({
      query: () => apiRoutes.vendors.stats,
      providesTags: ['Vendor'],
    }),

    createVendor: builder.mutation({
      query: (body) => ({ url: apiRoutes.vendors.create ?? '/vendors', method: 'POST', body }),
      invalidatesTags: [{ type: 'Vendor', id: 'LIST' }],
    }),

    updateVendor: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.vendors.detail(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Vendor', id }, { type: 'Vendor', id: 'LIST' }],
    }),

    suspendVendor: builder.mutation({
      query: (id) => ({ url: apiRoutes.vendors.suspend(id), method: 'POST' }),
      invalidatesTags: (result, error, id) => [{ type: 'Vendor', id }, { type: 'Vendor', id: 'LIST' }],
    }),

    activateVendor: builder.mutation({
      query: (id) => ({ url: apiRoutes.vendors.activate(id), method: 'POST' }),
      invalidatesTags: (result, error, id) => [{ type: 'Vendor', id }, { type: 'Vendor', id: 'LIST' }],
    }),

    /**
     * The multi-step onboarding wizard posts its accumulated state here once
     * the vendor is actually created.
     */
    submitOnboarding: builder.mutation({
      query: (body) => ({ url: apiRoutes.vendors.onboards, method: 'POST', body }),
      invalidatesTags: [{ type: 'Vendor', id: 'LIST' }],
    }),

    /* ---- platform namespace -------------------------------------------
       Everything below is cross-tenant by construction: the routes live
       under /platform, so a tenant session can never address them even if
       it guessed the path. ------------------------------------------------ */

    /** Every account that can sign in anywhere: platform users only, never
     *  a tenant's own people list. */
    getPlatformUsers: builder.query({
      query: (params = {}) => ({ url: apiRoutes.platform.users, params }),
      providesTags: (result) => listTags(result, 'PlatformUser'),
    }),

    /** Subscriptions as the billing desk sees them: one row per tenant. */
    getSubscriptions: builder.query({
      query: (params = {}) => ({ url: apiRoutes.platform.subscriptions, params }),
      providesTags: (result) => listTags(result, 'Subscription'),
    }),

    /** Platform-wide money movement, including failed and refunded rows. */
    getTransactions: builder.query({
      query: (params = {}) => ({ url: apiRoutes.platform.transactions, params }),
      providesTags: (result) => listTags(result, 'Transaction'),
    }),

    /** The immutable cross-tenant audit trail. Read-only on purpose. */
    getPlatformAuditLog: builder.query({
      query: (params = {}) => ({ url: apiRoutes.platform.audit, params }),
      providesTags: (result) => listTags(result, 'AuditLog'),
    }),

    getOnboarding: builder.query({
      query: (params = {}) => ({ url: apiRoutes.platform.onboarding, params }),
      providesTags: (result) => listTags(result, 'Onboarding'),
    }),

    /** Service health. A single object, so it carries one tag rather than
     *  a LIST — there is nothing to paginate and no row to address. */
    getPlatformSystem: builder.query({
      query: () => apiRoutes.platform.system,
      providesTags: ['System'],
    }),

    /**
     * Moves a tenant's onboarding checklist forward (or records a note about
     * it). PATCH, not PUT: the caller sends the fields it changed, never the
     * whole queue item.
     */
    updateOnboarding: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${apiRoutes.platform.onboarding}/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Onboarding', id },
        { type: 'Onboarding', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetVendorsQuery,
  useGetVendorQuery,
  useGetStatsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useSuspendVendorMutation,
  useActivateVendorMutation,
  useSubmitOnboardingMutation,
  useGetPlatformUsersQuery,
  useGetSubscriptionsQuery,
  useGetTransactionsQuery,
  useGetPlatformAuditLogQuery,
  useGetOnboardingQuery,
  useGetPlatformSystemQuery,
  useUpdateOnboardingMutation,
} = superAdminApi;
