/**
 * ArkCRM — Tenants API
 * ---------------------------------------------------------------------------
 * Business workspaces: creating one, joining one, and reading your own.
 *
 * The join check is the interesting one. Asking by name only confirms that a
 * business exists — it hands back no id and no code, because the name is not
 * the secret. Presenting the join code is what unlocks the workspace.
 *
 * @example
 * const [lookup] = useLazyTenantLookupQuery();
 * lookup({ name: 'Volcano Foods' });   // -> { exists: true, nameKnown: true }
 * lookup({ code: 'VOL-0003' });        // -> { exists: true, id, code, ... }
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const tenantsApi = createApi({
  reducerPath: 'tenantsApi',
  baseQuery,
  tagTypes: ['Tenant', 'Invite', 'Member'],
  endpoints: (builder) => ({
    /** Creates a workspace and returns its id and join code. */
    createTenant: builder.mutation({
      query: (body) => ({ url: apiRoutes.tenants.create, method: 'POST', body }),
      invalidatesTags: ['Tenant'],
    }),

    /**
     * Looks a business up. Pass a name to learn that it exists, or a code to
     * learn everything about it — including whether you may join.
     */
    lookupTenant: builder.query({
      query: (params = {}) => ({ url: apiRoutes.tenants.exists, params }),
      providesTags: ['Tenant'],
    }),

    /** The caller's own workspace, for restoring the session. */
    getMyTenant: builder.query({
      query: () => apiRoutes.tenants.me,
      providesTags: ['Tenant'],
    }),

    /**
     * Joins a workspace with its code.
     *
     * <p>The counterpart to the join code at sign-up: somebody who already
     * has an account uses the same code to come across.
     */
    joinTenant: builder.mutation({
      query: (body) => ({ url: apiRoutes.tenants.join, method: 'POST', body }),
      invalidatesTags: ['Tenant'],
    }),

    /* ---------------------------------------------------------------------
     * Invitations
     *
     * There is no mail service, so an invitation is a link rather than an
     * email: the owner copies it and sends it themselves. The link carries a
     * token; the row behind it records who it was for and what job they
     * will do.
     * ------------------------------------------------------------------- */

    /** Invites one person, under one role. */
    createInvite: builder.mutation({
      query: (body) => ({ url: apiRoutes.invites.create, method: 'POST', body }),
      invalidatesTags: ['Invite'],
    }),

    /** The caller's workspace invitations, newest first. */
    getInvites: builder.query({
      query: () => apiRoutes.invites.list,
      providesTags: ['Invite'],
    }),

    /** Withdraws an invitation that has not been used. */
    revokeInvite: builder.mutation({
      query: (id) => ({ url: apiRoutes.invites.remove(id), method: 'DELETE' }),
      invalidatesTags: ['Invite'],
    }),

    /** What an invitation is, for somebody holding the link. */
    lookupInvite: builder.query({
      query: (token) => apiRoutes.invites.lookup(token),
    }),

    /** Turns an invitation into an account. */
    acceptInvite: builder.mutation({
      query: (body) => ({ url: apiRoutes.invites.accept, method: 'POST', body }),
    }),

    /* ---------------------------------------------------------------------
     * Members
     *
     * The accounts that can sign in to this workspace. The server scopes
     * the list to the caller's own workspace, so this is "our people" and
     * not everybody on the platform.
     * ------------------------------------------------------------------- */

    /** The people who can sign in to this workspace. */
    getMembers: builder.query({
      query: () => apiRoutes.users.list,
      providesTags: ['Member'],
    }),

    /** Changes somebody's role - or their name, phone or active flag. */
    updateMember: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.users.update(id), method: 'PUT', body }),
      invalidatesTags: ['Member'],
    }),

    /** Removes somebody from the workspace. */
    removeMember: builder.mutation({
      query: (id) => ({ url: apiRoutes.users.remove(id), method: 'DELETE' }),
      invalidatesTags: ['Member'],
    }),
  }),
});

export const {
  useCreateTenantMutation,
  useLazyLookupTenantQuery,
  useGetMyTenantQuery,
  useJoinTenantMutation,
  useCreateInviteMutation,
  useGetInvitesQuery,
  useRevokeInviteMutation,
  useLookupInviteQuery,
  useAcceptInviteMutation,
  useGetMembersQuery,
  useUpdateMemberMutation,
  useRemoveMemberMutation,
} = tenantsApi;

export default tenantsApi;
