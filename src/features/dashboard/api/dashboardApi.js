/**
 * NexERP — Dashboard API
 * ---------------------------------------------------------------------------
 * The Executive Vendor Dashboard needs KPI figures, a 12-month revenue
 * trend, an expense mix, an AR aging profile, a quick-action feed and a live
 * activity stream. Issuing six separate requests would be wasteful, so the
 * backend exposes one aggregate endpoint.
 *
 * GET /dashboard/overview
 *   -> { metrics, revenueTrend, expenseBreakdown, receivablesAging,
 *        quickActions, activity, pipeline }
 *
 * Split out from reportsApi because this endpoint is versioned with the
 * dashboard layout, not with statutory reporting.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery,
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getOverview: builder.query({
      query: (params = {}) => ({ url: '/dashboard/overview', params }),
      providesTags: ['Dashboard'],
    }),

    /** KPI row only — used by the compact metric strip above the fold. */
    getMetrics: builder.query({
      query: (params = {}) => ({ url: '/dashboard/metrics', params }),
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetOverviewQuery, useGetMetricsQuery } = dashboardApi;
