// API client utilities for making requests to the backend

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `/api${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(
        response.status,
        error.error || `Request failed with status ${response.status}`,
        error.details
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// API endpoint helpers
export const api = {
  dashboard: {
    stats: () => apiClient('/dashboard/stats'),
    activity: (limit?: number) => 
      apiClient(`/dashboard/activity${limit ? `?limit=${limit}` : ''}`),
  },
  providers: {
    list: () => apiClient('/providers'),
    get: (id: string) => apiClient(`/providers/${id}`),
    create: (data: any) => apiClient('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiClient(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiClient(`/providers/${id}`, {
      method: 'DELETE',
    }),
    test: (id: string) => apiClient(`/providers/${id}/test`, {
      method: 'POST',
    }),
  },
  syncQueue: {
    list: (params?: any) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      return apiClient(`/sync-queue${searchParams.toString() ? `?${searchParams}` : ''}`);
    },
    stats: () => apiClient('/sync-queue/stats'),
    create: (data: any) => apiClient('/sync-queue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updatePriority: (id: string, priority: number) => 
      apiClient(`/sync-queue/${id}/priority`, {
        method: 'PUT',
        body: JSON.stringify({ priority }),
      }),
    cancel: (id: string) => apiClient(`/sync-queue/${id}`, {
      method: 'DELETE',
    }),
  },
  failover: {
    events: (params?: any) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      return apiClient(`/failover/events${searchParams.toString() ? `?${searchParams}` : ''}`);
    },
    rules: () => apiClient('/failover/rules'),
    updateRules: (data: any) => apiClient('/failover/rules', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },
  backup: {
    status: () => apiClient('/backup/status'),
    trigger: () => apiClient('/backup/status', {
      method: 'POST',
    }),
  },
};