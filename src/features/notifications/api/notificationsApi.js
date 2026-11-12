/**
 * ArkCRM — Notifications API
 * Endpoints: /notifications, /notifications/unread-count, /notifications/:id/read,
 * /notifications/read-all
 *
 * The bell menu, the toast stream and the in-app notification tray all read
 * from this single cache entry, so marking one item as read updates every
 * surface at once.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery,
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: (params = {}) => ({ url: apiRoutes.notifications.list, params }),
      providesTags: ['Notification'],
    }),

    getUnreadCount: builder.query({
      query: () => apiRoutes.notifications.unreadCount,
      providesTags: ['Notification'],
      /* Polled so the badge stays accurate without a socket round-trip; the
         socket pushes remain the fast path. */
      pollingInterval: 120_000,
    }),

    markRead: builder.mutation({
      query: (id) => ({ url: apiRoutes.notifications.markRead(id), method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),

    markAllRead: builder.mutation({
      query: () => ({ url: apiRoutes.notifications.markAllRead, method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
