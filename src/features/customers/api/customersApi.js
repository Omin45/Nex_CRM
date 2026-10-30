/**
 * NexERP — Customers API
 * Endpoints: /customers, /customers/:id, /customers/:id/financial-summary,
 * /customers/:id/activity
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const customersApi = createApi({
  reducerPath: 'customersApi',
  baseQuery,
  tagTypes: ['Customer'],
  endpoints: (builder) => ({
    /** Paginated, searchable, sortable directory listing. */
    getCustomers: builder.query({
      query: (params = {}) => ({ url: apiRoutes.customers.list, params }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Customer', id })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),

    getCustomer: builder.query({
      query: (id) => apiRoutes.customers.detail(id),
      providesTags: (result, error, id) => [{ type: 'Customer', id }],
    }),

    /** Customer 360 header: balances, limits and credit terms. */
    getFinancialSummary: builder.query({
      query: (id) => apiRoutes.customers.financialSummary(id),
      providesTags: (result, error, id) => [{ type: 'Customer', id }],
    }),

    getActivity: builder.query({
      query: ({ id, ...params }) => ({ url: apiRoutes.customers.activity(id), params }),
      providesTags: (result, error, { id }) => [{ type: 'Customer', id }],
    }),

    createCustomer: builder.mutation({
      query: (body) => ({ url: apiRoutes.customers.create, method: 'POST', body }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),

    updateCustomer: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.customers.update(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Customer', id }, { type: 'Customer', id: 'LIST' }],
    }),

    deleteCustomer: builder.mutation({
      query: (id) => ({ url: apiRoutes.customers.remove(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useGetFinancialSummaryQuery,
  useGetActivityQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = customersApi;
