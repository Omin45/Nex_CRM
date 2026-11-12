/**
 * ArkCRM — Auth API (RTK Query)
 * ---------------------------------------------------------------------------
 * Endpoints for POST /auth/*. The login/refresh responses are the only place
 * tokens are produced, so each is cached and mirrored into localStorage by the
 * auth slice.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery, tokenStorage } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery,
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({ url: apiRoutes.auth.login, method: 'POST', body: credentials }),
      async onQueryStarted(credentials, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          tokenStorage.set(data);
          dispatch({ type: 'auth/setCredentials', payload: data });
        } catch {
          /* Error surfaced through the mutation's error field. */
        }
      },
    }),

    register: builder.mutation({
      query: (payload) => ({ url: apiRoutes.auth.register, method: 'POST', body: payload }),
      async onQueryStarted(payload, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          tokenStorage.set(data);
          dispatch({ type: 'auth/setCredentials', payload: data });
        } catch {
          /* ignore */
        }
      },
    }),

    refresh: builder.mutation({
      query: (refreshToken) => ({ url: apiRoutes.auth.refresh, method: 'POST', body: { refreshToken } }),
    }),

    /** Revalidates a persisted session on app boot. */
    me: builder.query({
      query: () => apiRoutes.auth.me,
      providesTags: ['Auth'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch({ type: 'auth/setCredentials', payload: data });
        } catch {
          dispatch({ type: 'auth/finishBootstrap' });
        }
      },
    }),

    logout: builder.mutation({
      /* The refresh token goes with it so the server can close that session
         on its side too — otherwise the device stays "signed in" until the
         token expires on its own. */
      query: () => ({
        url: apiRoutes.auth.logout,
        method: 'POST',
        body: { refreshToken: tokenStorage.getRefreshToken() },
      }),
      // Always resolve, even if the server is unreachable — the client must
      // still drop the local session.
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          /* ignore */
        }
        dispatch({ type: 'auth/logout' });
      },
    }),

    forgotPassword: builder.mutation({
      query: (email) => ({ url: apiRoutes.auth.forgotPassword, method: 'POST', body: { email } }),
    }),

    resetPassword: builder.mutation({
      query: (payload) => ({ url: apiRoutes.auth.resetPassword, method: 'POST', body: payload }),
    }),

    verifyEmail: builder.mutation({
      query: (token) => ({ url: apiRoutes.auth.verifyEmail, method: 'POST', body: { token } }),
    }),

    /** The devices this account is signed in on. */
    getSessions: builder.query({
      query: () => apiRoutes.auth.sessions,
      providesTags: ['Auth'],
    }),

    /** Signs one device out. */
    revokeSession: builder.mutation({
      query: (id) => ({ url: apiRoutes.auth.revokeSession(id), method: 'DELETE' }),
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshMutation,
  useMeQuery,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
} = authApi;
