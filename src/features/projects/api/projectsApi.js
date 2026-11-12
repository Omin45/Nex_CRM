/**
 * ArkCRM — Projects API
 * Endpoints: /projects, /projects/:id/tasks, /projects/tasks/:id/status
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery,
  tagTypes: ['Project', 'Task'],
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (params = {}) => ({ url: apiRoutes.projects.list, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Project', id })), { type: 'Project', id: 'LIST' }]
          : [{ type: 'Project', id: 'LIST' }],
    }),

    getProject: builder.query({
      query: (id) => apiRoutes.projects.detail(id),
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),

    createProject: builder.mutation({
      query: (body) => ({ url: apiRoutes.projects.create, method: 'POST', body }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),

    updateProject: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.projects.update(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Project', id },
        { type: 'Project', id: 'LIST' },
      ],
    }),

    /* ---- task board ---- */
    getTasks: builder.query({
      query: ({ projectId, ...params } = {}) => ({
        url: projectId ? apiRoutes.projects.tasks(projectId) : '/projects/tasks',
        params,
      }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Task', id })), { type: 'Task', id: 'LIST' }]
          : [{ type: 'Task', id: 'LIST' }],
    }),

    createTask: builder.mutation({
      query: ({ projectId, ...body }) => ({
        url: apiRoutes.projects.tasks(projectId),
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    updateTask: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.projects.task(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }],
    }),

    /** Kanban drag target: carries the new status and its column index. */
    moveTask: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.projects.moveTask(id), method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }, 'Task'],
    }),

    getMilestones: builder.query({
      query: (id) => apiRoutes.projects.milestones(id),
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useGetMilestonesQuery,
} = projectsApi;
