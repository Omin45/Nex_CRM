/**
 * NexERP — Accounting API
 * Endpoints: /accounting/invoices (+ payments, send), /accounting/receivables,
 * /accounting/payables, /accounting/expenses (+ approve), /accounting/ledger
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const accountingApi = createApi({
  reducerPath: 'accountingApi',
  baseQuery,
  tagTypes: ['Invoice', 'Expense', 'Ledger'],
  endpoints: (builder) => ({
    /* ---- invoices ---- */
    getInvoices: builder.query({
      query: (params = {}) => ({ url: apiRoutes.accounting.invoices, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Invoice', id })), { type: 'Invoice', id: 'LIST' }]
          : [{ type: 'Invoice', id: 'LIST' }],
    }),

    getInvoice: builder.query({
      query: (id) => apiRoutes.accounting.invoice(id),
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),

    createInvoice: builder.mutation({
      query: (body) => ({ url: apiRoutes.accounting.invoices, method: 'POST', body }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }, 'Dashboard'],
    }),

    updateInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.accounting.invoice(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Invoice', id }, { type: 'Invoice', id: 'LIST' }],
    }),

    /** Emails the invoice to the customer. */
    sendInvoice: builder.mutation({
      query: (id) => ({ url: apiRoutes.accounting.sendInvoice(id), method: 'POST' }),
      invalidatesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),

    /** Applies a payment against an invoice; may partially settle it. */
    recordPayment: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.accounting.recordPayment(id), method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        { type: 'Invoice', id: 'LIST' },
        'Dashboard',
      ],
    }),

    /* ---- receivables / payables ---- */
    getReceivables: builder.query({
      query: (params = {}) => ({ url: apiRoutes.accounting.receivables, params }),
      providesTags: ['Invoice'],
    }),

    getPayables: builder.query({
      query: (params = {}) => ({ url: apiRoutes.accounting.payables, params }),
      providesTags: ['Expense'],
    }),

    /* ---- expenses ---- */
    getExpenses: builder.query({
      query: (params = {}) => ({ url: apiRoutes.accounting.expenses, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Expense', id })), { type: 'Expense', id: 'LIST' }]
          : [{ type: 'Expense', id: 'LIST' }],
    }),

    createExpense: builder.mutation({
      query: (body) => ({ url: apiRoutes.accounting.expenses, method: 'POST', body }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }, 'Dashboard'],
    }),

    updateExpense: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.accounting.expense(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Expense', id }, { type: 'Expense', id: 'LIST' }],
    }),

    /** Manager approval gate. `decision` is APPROVED or REJECTED. */
    approveExpense: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.accounting.approveExpense(id), method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
        'Dashboard',
      ],
    }),

    /* ---- ledger ---- */
    getLedger: builder.query({
      query: (params = {}) => ({ url: apiRoutes.accounting.ledger, params }),
      providesTags: ['Ledger'],
    }),

    getTrialBalance: builder.query({
      query: (params = {}) => ({ url: apiRoutes.accounting.trialBalance, params }),
      providesTags: ['Ledger'],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useSendInvoiceMutation,
  useRecordPaymentMutation,
  useGetReceivablesQuery,
  useGetPayablesQuery,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useApproveExpenseMutation,
  useGetLedgerQuery,
  useGetTrialBalanceQuery,
} = accountingApi;
