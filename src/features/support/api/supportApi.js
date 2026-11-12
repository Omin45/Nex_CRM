/**
 * ArkCRM — Support API
 * Endpoints: /support/tickets (+ messages, assign, close), /support/sla
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const supportApi = createApi({
  reducerPath: 'supportApi',
  baseQuery,
  tagTypes: ['Ticket'],
  endpoints: (builder) => ({
    getTickets: builder.query({
      query: (params = {}) => ({ url: apiRoutes.support.tickets, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Ticket', id })), { type: 'Ticket', id: 'LIST' }]
          : [{ type: 'Ticket', id: 'LIST' }],
    }),

    getTicket: builder.query({
      query: (id) => apiRoutes.support.ticket(id),
      providesTags: (result, error, id) => [{ type: 'Ticket', id }],
    }),

    createTicket: builder.mutation({
      query: (body) => ({ url: apiRoutes.support.tickets, method: 'POST', body }),
      invalidatesTags: [{ type: 'Ticket', id: 'LIST' }],
    }),

    updateTicket: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.support.ticket(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Ticket', id }, { type: 'Ticket', id: 'LIST' }],
    }),

    /** Full message thread, including internal notes. */
    getMessages: builder.query({
      query: (id) => apiRoutes.support.reply(id),
      providesTags: (result, error, id) => [{ type: 'Ticket', id }],
    }),

    addMessage: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.support.reply(id), method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Ticket', id }],
    }),

    assignTicket: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.support.assign(id), method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Ticket', id }, { type: 'Ticket', id: 'LIST' }],
    }),

    closeTicket: builder.mutation({
      query: (id) => ({ url: apiRoutes.support.close(id), method: 'POST' }),
      invalidatesTags: (result, error, id) => [{ type: 'Ticket', id }, { type: 'Ticket', id: 'LIST' }],
    }),

    /** SLA compliance figures for the support header widgets. */
    getSlaMetrics: builder.query({
      query: (params = {}) => ({ url: apiRoutes.support.sla, params }),
      providesTags: ['Ticket'],
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useGetMessagesQuery,
  useAddMessageMutation,
  useAssignTicketMutation,
  useCloseTicketMutation,
  useGetSlaMetricsQuery,
} = supportApi;
