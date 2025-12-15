import axios from 'axios';
import type {
  InventoryItem,
  AuditHistory,
  NotificationConfig,
  User,
  UpdateInventoryDto,
  CsvUploadResult,
  DashboardStats,
  FilterOptions
} from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Required for Windows Authentication
  headers: {
    'Content-Type': 'application/json',
    'X-Username': 'admin', // Development authentication
  },
});

// Inventory endpoints
export const inventoryApi = {
  getAll: async (filters?: FilterOptions): Promise<InventoryItem[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.hardwareType) params.append('hardwareType', filters.hardwareType);
    if (filters?.needsReorder !== undefined) params.append('needsReorder', String(filters.needsReorder));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortDesc !== undefined) params.append('sortDesc', String(filters.sortDesc));

    const response = await api.get<InventoryItem[]>(`/inventory?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<InventoryItem> => {
    const response = await api.get<InventoryItem>(`/inventory/${id}`);
    return response.data;
  },

  getAllAuditHistory: async (params?: { limit?: number; search?: string }): Promise<AuditHistory[]> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);

    const response = await api.get<AuditHistory[]>(`/inventory/audit-history?${queryParams.toString()}`);
    return response.data;
  },

  getAuditHistory: async (id: number): Promise<AuditHistory[]> => {
    const response = await api.get<AuditHistory[]>(`/inventory/${id}/audit-history`);
    return response.data;
  },

  getHardwareTypes: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/inventory/types');
    return response.data;
  },

  getLowStockCount: async (): Promise<number> => {
    const response = await api.get<number>('/inventory/low-stock-count');
    return response.data;
  },

  updateQuantity: async (dto: UpdateInventoryDto): Promise<{ previousQuantity: number; newQuantity: number; itemNumber: string }> => {
    const response = await api.post('/inventory/update-quantity', dto);
    return response.data;
  },

  updateItem: async (id: number, item: InventoryItem): Promise<InventoryItem> => {
    const response = await api.put(`/inventory/${id}`, item);
    return response.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/inventory/dashboard-stats');
    return response.data;
  },

  deleteItem: async (id: number): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },
};

// CSV Upload endpoints
export const csvApi = {
  upload: async (file: File): Promise<CsvUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<CsvUploadResult>('/csvupload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get('/csvupload/template', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Configuration endpoints
export const configApi = {
  getNotificationConfig: async (): Promise<NotificationConfig> => {
    const response = await api.get<NotificationConfig>('/configuration/notification');
    return response.data;
  },

  updateNotificationConfig: async (config: NotificationConfig): Promise<NotificationConfig> => {
    const response = await api.put<NotificationConfig>('/configuration/notification', config);
    return response.data;
  },
};

// User endpoints
export const userApi = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/user/me');
    return response.data;
  },

  searchUsers: async (query: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/user/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },
};

export default api;
