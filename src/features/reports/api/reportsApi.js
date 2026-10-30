/**
 * NexERP — Reports API
 * Endpoints: /reports/profit-loss, /reports/balance-sheet, /reports/cash-flow,
 * /reports/tax-summary, /reports/vendor-performance, /reports/export
 *
 * The Executive Dashboard's own endpoints live in
 * features/dashboard/api/dashboardApi.js — they aggregate across domains and
 * are therefore versioned separately from statutory reporting.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery,
  tagTypes: ['Report'],
  endpoints: (builder) => ({
    getProfitAndLoss: builder.query({
      query: (params = {}) => ({ url: apiRoutes.reports.profitAndLoss, params }),
      providesTags: ['Report'],
    }),

    getBalanceSheet: builder.query({
      query: (params = {}) => ({ url: apiRoutes.reports.balanceSheet, params }),
      providesTags: ['Report'],
    }),

    getCashFlow: builder.query({
      query: (params = {}) => ({ url: apiRoutes.reports.cashFlow, params }),
      providesTags: ['Report'],
    }),

    getTaxSummary: builder.query({
      query: (params = {}) => ({ url: apiRoutes.reports.taxSummary, params }),
      providesTags: ['Report'],
    }),

    getVendorPerformance: builder.query({
      query: (params = {}) => ({ url: apiRoutes.reports.vendorPerformance, params }),
      providesTags: ['Report'],
    }),

    /**
     * Server-side export. Preferred over the client-side helpers in
     * utils/export.js for anything spanning multiple pages — the backend
     * streams a fully formatted file.
     *
     * `responseHandler: 'blob'` keeps the browser from navigating to the file.
     */
    exportReport: builder.mutation({
      query: ({ format = 'pdf', report, ...params }) => ({
        url: apiRoutes.reports.export,
        method: 'POST',
        body: { format, report, params },
        responseHandler: 'blob',
      }),
    }),
  }),
});

export const {
  useGetProfitAndLossQuery,
  useGetBalanceSheetQuery,
  useGetCashFlowQuery,
  useGetTaxSummaryQuery,
  useGetVendorPerformanceQuery,
  useExportReportMutation,
} = reportsApi;
