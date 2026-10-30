/**
 * NexERP — Inventory API
 * Endpoints: /inventory/overview, /inventory/movements, /inventory/adjustments,
 * /inventory/transfers, /products, /warehouses
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/services/api';
import { apiRoutes } from '@/config/constants';

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery,
  tagTypes: ['Product', 'Inventory', 'Warehouse'],
  endpoints: (builder) => ({
    /* ---- aggregate overview (drives InventoryOverviewPage) ---- */
    getOverview: builder.query({
      query: (params = {}) => ({ url: apiRoutes.inventory.overview, params }),
      providesTags: ['Inventory'],
    }),

    /* ---- products ---- */
    getProducts: builder.query({
      query: (params = {}) => ({ url: apiRoutes.products.list, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Product', id })), { type: 'Product', id: 'LIST' }]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    getProduct: builder.query({
      query: (id) => apiRoutes.products.detail(id),
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    createProduct: builder.mutation({
      query: (body) => ({ url: apiRoutes.products.create, method: 'POST', body }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, 'Inventory'],
    }),

    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.products.update(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
        'Inventory',
      ],
    }),

    deleteProduct: builder.mutation({
      query: (id) => ({ url: apiRoutes.products.remove(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, 'Inventory'],
    }),

    getLowStock: builder.query({
      query: (params = {}) => ({ url: apiRoutes.products.lowStock, params }),
      providesTags: ['Product'],
    }),

    /* ---- stock movements ---- */
    getMovements: builder.query({
      query: (params = {}) => ({ url: apiRoutes.inventory.stockMovements, params }),
      providesTags: ['Inventory'],
    }),

    /* ---- adjustments & transfers ---- */
    createAdjustment: builder.mutation({
      query: (body) => ({ url: apiRoutes.inventory.adjust, method: 'POST', body }),
      invalidatesTags: ['Inventory', { type: 'Product', id: 'LIST' }],
    }),

    createTransfer: builder.mutation({
      query: (body) => ({ url: apiRoutes.inventory.transfer, method: 'POST', body }),
      invalidatesTags: ['Inventory'],
    }),

    getTransferHistory: builder.query({
      query: (params = {}) => ({ url: apiRoutes.inventory.transferHistory, params }),
      providesTags: ['Inventory'],
    }),

    /* ---- warehouses ---- */
    getWarehouses: builder.query({
      query: (params = {}) => ({ url: apiRoutes.warehouses.list, params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Warehouse', id })), { type: 'Warehouse', id: 'LIST' }]
          : [{ type: 'Warehouse', id: 'LIST' }],
    }),

    getWarehouse: builder.query({
      query: (id) => apiRoutes.warehouses.detail(id),
      providesTags: (result, error, id) => [{ type: 'Warehouse', id }],
    }),

    createWarehouse: builder.mutation({
      query: (body) => ({ url: apiRoutes.warehouses.create, method: 'POST', body }),
      invalidatesTags: [{ type: 'Warehouse', id: 'LIST' }],
    }),

    updateWarehouse: builder.mutation({
      query: ({ id, ...body }) => ({ url: apiRoutes.warehouses.update(id), method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Warehouse', id }],
    }),
  }),
});

export const {
  useGetOverviewQuery,
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetLowStockQuery,
  useGetMovementsQuery,
  useCreateAdjustmentMutation,
  useCreateTransferMutation,
  useGetTransferHistoryQuery,
  useGetWarehousesQuery,
  useGetWarehouseQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
} = inventoryApi;
