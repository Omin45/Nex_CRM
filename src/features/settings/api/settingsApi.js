/**
 * ArkCRM — Settings API
 * Endpoints: /settings/audit-log
 *
 * The audit log is the only settings screen the server answers today; company,
 * team and billing read from the session hooks instead. The slice still earns
 * its own file: it gives a future settings PUT (company details, workspace
 * preferences) an obvious home without growing another feature's API, and the
 * AuditLog tag means a future mutation can invalidate this cache in one line.
 *
 * Structure mirrors features/notifications/api/notificationsApi.js exactly —
 * same baseQuery, same tag shape, one exported hook per endpoint.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery,
  tagTypes: ['AuditLog'],
  endpoints: (builder) => ({
    /* The mock serves this from the workspaceAuditLog fixture with the usual
       search / sort / page / pageSize params, so the page can be fully
       server-driven without a client-side filter layer. */
    getAuditLog: builder.query({
      query: (params = {}) => ({ url: '/settings/audit-log', params }),
      providesTags: ['AuditLog'],
    }),
  }),
});

export const { useGetAuditLogQuery } = settingsApi;
