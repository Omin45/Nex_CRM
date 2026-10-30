/**
 * NexERP — HR API
 * Endpoints: /hr/employees, /hr/attendance (+ summary, check-in/out),
 * /hr/leaves (+ decision)
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const hrApi = createApi({
  reducerPath: 'hrApi',
  baseQuery,
  tagTypes: ['Employee', 'Attendance', 'Leave'],
  endpoints: (builder) => ({
    /* ---- employees ---- */
    getEmployees: builder.query({
      query: (params = {}) => ({ url: apiRoutes.hr.employees, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Employee', id })), { type: 'Employee', id: 'LIST' }]
          : [{ type: 'Employee', id: 'LIST' }],
    }),

    getEmployee: builder.query({
      query: (id) => apiRoutes.hr.employee(id),
      providesTags: (result, error, id) => [{ type: 'Employee', id }],
    }),

    createEmployee: builder.mutation({
      query: (body) => ({ url: apiRoutes.hr.employees, method: 'POST', body }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),

    updateEmployee: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.hr.employee(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Employee', id },
        { type: 'Employee', id: 'LIST' },
      ],
    }),

    /* ---- attendance ---- */
    getAttendance: builder.query({
      query: (params = {}) => ({ url: apiRoutes.hr.attendance, params }),
      providesTags: ['Attendance'],
    }),

    getAttendanceSummary: builder.query({
      query: (params = {}) => ({ url: apiRoutes.hr.attendanceSummary, params }),
      providesTags: ['Attendance'],
    }),

    checkIn: builder.mutation({
      query: (body) => ({ url: apiRoutes.hr.checkIn, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),

    checkOut: builder.mutation({
      query: (body) => ({ url: apiRoutes.hr.checkOut, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),

    /* ---- leave ---- */
    getLeaves: builder.query({
      query: (params = {}) => ({ url: apiRoutes.hr.leaves, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Leave', id })), { type: 'Leave', id: 'LIST' }]
          : [{ type: 'Leave', id: 'LIST' }],
    }),

    /** Approve or reject. `decision` is APPROVED or REJECTED. */
    decideLeave: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.hr.approveLeave(id), method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Leave', id }, { type: 'Leave', id: 'LIST' }],
    }),

    createLeave: builder.mutation({
      query: (body) => ({ url: apiRoutes.hr.leaves, method: 'POST', body }),
      invalidatesTags: [{ type: 'Leave', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useGetAttendanceQuery,
  useGetAttendanceSummaryQuery,
  useCheckInMutation,
  useCheckOutMutation,
  useGetLeavesQuery,
  useDecideLeaveMutation,
  useCreateLeaveMutation,
} = hrApi;
