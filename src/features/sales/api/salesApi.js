/**
 * ArkCRM — Sales API
 * Endpoints: /sales/leads (incl. the kanban stage move), /sales/quotes,
 * /sales/orders, /sales/pipeline/value
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const salesApi = createApi({
  reducerPath: 'salesApi',
  baseQuery,
  tagTypes: ['Lead', 'Quote', 'Order'],
  endpoints: (builder) => ({
    /* ---- leads / pipeline ---- */
    getLeads: builder.query({
      query: (params = {}) => ({ url: apiRoutes.sales.leads, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Lead', id })), { type: 'Lead', id: 'LIST' }]
          : [{ type: 'Lead', id: 'LIST' }],
    }),

    /** Drag-and-drop target: PATCH /sales/leads/:id/stage */
    moveLead: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.sales.moveLead(id), method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'Lead'],
    }),

    createLead: builder.mutation({
      query: (body) => ({ url: apiRoutes.sales.leads, method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }],
    }),

    updateLead: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.sales.lead(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Lead', id }, { type: 'Lead', id: 'LIST' }],
    }),

    /** Weighted pipeline total + per-stage rollup for the dashboard. */
    getPipelineValue: builder.query({
      query: () => apiRoutes.sales.pipelineValue,
      providesTags: ['Lead'],
    }),

    /* ---- quotes ---- */
    getQuotes: builder.query({
      query: (params = {}) => ({ url: apiRoutes.sales.quotes, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Quote', id })), { type: 'Quote', id: 'LIST' }]
          : [{ type: 'Quote', id: 'LIST' }],
    }),

    getQuote: builder.query({
      query: (id) => apiRoutes.sales.quote(id),
      providesTags: (result, error, id) => [{ type: 'Quote', id }],
    }),

    createQuote: builder.mutation({
      query: (body) => ({ url: apiRoutes.sales.quotes, method: 'POST', body }),
      invalidatesTags: [{ type: 'Quote', id: 'LIST' }],
    }),

    updateQuote: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.sales.quote(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Quote', id }, { type: 'Quote', id: 'LIST' }],
    }),

    /** Accepts a quote and creates the sales order. */
    convertQuote: builder.mutation({
      query: (id) => ({ url: apiRoutes.sales.convertQuote(id), method: 'POST' }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }, { type: 'Quote', id: 'LIST' }],
    }),

    /* ---- sales orders ---- */
    getOrders: builder.query({
      query: (params = {}) => ({ url: apiRoutes.sales.orders, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Order', id })), { type: 'Order', id: 'LIST' }]
          : [{ type: 'Order', id: 'LIST' }],
    }),

    getOrder: builder.query({
      query: (id) => apiRoutes.sales.order(id),
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),

    createOrder: builder.mutation({
      query: (body) => ({ url: apiRoutes.sales.orders, method: 'POST', body }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
    }),

    updateOrder: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.sales.order(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }, { type: 'Order', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetLeadsQuery,
  useMoveLeadMutation,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useGetPipelineValueQuery,
  useGetQuotesQuery,
  useGetQuoteQuery,
  useCreateQuoteMutation,
  useUpdateQuoteMutation,
  useConvertQuoteMutation,
  useGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
} = salesApi;
