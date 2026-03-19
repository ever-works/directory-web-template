import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
  UserData,
  CreateUserRequest,
  UpdateUserRequest,
  UserListOptions,
  UserListResponse
} from '@/lib/types/user';

// Logger utility
const logger = {
  error: (message: string, error?: Error) =>
    console.error(`[UserHooks] ${message}`, error || ''),
};

// API base URL
const API_BASE = '/api/admin/users';

// Query keys for consistent cache management
export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (options: UserListOptions) => [...userQueryKeys.lists(), options] as const,
  details: () => [...userQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...userQueryKeys.details(), id] as const,
  stats: () => [...userQueryKeys.all, 'stats'] as const,
} as const;

// API functions using server-client
const userApi = {
  // Get users with filtering and pagination
  async getUsers(options: UserListOptions = {}): Promise<UserListResponse> {
    const queryParams = apiUtils.createQueryString(options);
    const endpoint = queryParams ? `${API_BASE}?${queryParams}` : API_BASE;
    
    const response = await serverClient.get<UserListResponse>(endpoint);
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data;
  },

  // Get a single user by ID
  async getUser(id: string): Promise<UserData | null> {
    const response = await serverClient.get<{ user: UserData }>(`${API_BASE}/${id}`);
    
    if (!apiUtils.isSuccess(response)) {
      // Handle 404 case specifically
      if (response.error?.includes('404')) {
        return null;
      }
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data.user;
  },

  // Create a new user
  async createUser(userData: CreateUserRequest): Promise<UserData> {
    const response = await serverClient.post<{ user: UserData }>(API_BASE, userData);
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data.user;
  },

  // Update an existing user
  async updateUser(id: string, userData: UpdateUserRequest): Promise<UserData> {
    const response = await serverClient.put<{ user: UserData }>(`${API_BASE}/${id}`, userData);
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data.user;
  },

  // Delete a user
  async deleteUser(id: string): Promise<void> {
    const response = await serverClient.delete(`${API_BASE}/${id}`);
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
  },

  // Get user statistics
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const response = await serverClient.get<{
      total: number;
      active: number;
      inactive: number;
    }>(`${API_BASE}/stats`);
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data;
  },

  // Check username availability
  async checkUsername(username: string, excludeId?: string): Promise<boolean> {
    const response = await serverClient.post<{ available: boolean }>(
      `${API_BASE}/check-username`, 
      { username, excludeId }
    );
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data.available;
  },

  // Check email availability
  async checkEmail(email: string, excludeId?: string): Promise<boolean> {
    const response = await serverClient.post<{ available: boolean }>(
      `${API_BASE}/check-email`, 
      { email, excludeId }
    );
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data.available;
  },
};

// React Query hooks
export function useUsers(options: UserListOptions = {}) {
  return useQuery({
    queryKey: userQueryKeys.list(options),
    queryFn: () => userApi.getUsers(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUser(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: userQueryKeys.detail(id),
    queryFn: () => userApi.getUser(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: userQueryKeys.stats(),
    queryFn: userApi.getUserStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      // Invalidate and refetch user lists and stats
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.stats() });
    },
    onError: (error) => {
      logger.error('Failed to create user:', error as Error);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userData }: { id: string; userData: UpdateUserRequest }) =>
      userApi.updateUser(id, userData),
    onSuccess: (data, variables) => {
      // Update the specific user in cache
      queryClient.setQueryData(userQueryKeys.detail(variables.id), data);
      // Invalidate user lists to reflect changes
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.stats() });
    },
    onError: (error) => {
      logger.error('Failed to update user:', error as Error);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: (_, id) => {
      // Remove the user from cache
      queryClient.removeQueries({ queryKey: userQueryKeys.detail(id) });
      // Invalidate user lists and stats
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.stats() });
    },
    onError: (error) => {
      logger.error('Failed to delete user:', error as Error);
    },
  });
}

export function useCheckUsername() {
  return useMutation({
    mutationFn: ({ username, excludeId }: { username: string; excludeId?: string }) =>
      userApi.checkUsername(username, excludeId),
    onError: (error) => {
      logger.error('Failed to check username availability:', error as Error);
    },
  });
}

export function useCheckEmail() {
  return useMutation({
    mutationFn: ({ email, excludeId }: { email: string; excludeId?: string }) =>
      userApi.checkEmail(email, excludeId),
    onError: (error) => {
      logger.error('Failed to check email availability:', error as Error);
    },
  });
}

// Main hook that provides all functionality (backward compatibility)
export function useUsersManagement() {
  const queryClient = useQueryClient();

  return {
    // Query hooks
    useUsers,
    useUser,
    useUserStats,
    
    // Mutation hooks
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useCheckUsername,
    useCheckEmail,
    
    // Utility functions
    invalidateUsers: () => queryClient.invalidateQueries({ queryKey: userQueryKeys.all }),
    invalidateUser: (id: string) => queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(id) }),
    invalidateUserLists: () => queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() }),
    invalidateUserStats: () => queryClient.invalidateQueries({ queryKey: userQueryKeys.stats() }),
  };
}

// Legacy hook for backward compatibility (deprecated)
export function useUsersLegacy() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUsers = useCallback(async (options: UserListOptions = {}): Promise<UserListResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await userApi.getUsers(options);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      return {
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUser = useCallback(async (id: string): Promise<UserData | null> => {
    setLoading(true);
    setError(null);
    try {
      return await userApi.getUser(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: CreateUserRequest): Promise<UserData | null> => {
    setLoading(true);
    setError(null);
    try {
      return await userApi.createUser(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, userData: UpdateUserRequest): Promise<UserData | null> => {
    setLoading(true);
    setError(null);
    try {
      return await userApi.updateUser(id, userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await userApi.deleteUser(id);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserStats = useCallback(async (): Promise<{
    total: number;
    active: number;
    inactive: number;
  } | null> => {
    setLoading(true);
    setError(null);
    try {
      return await userApi.getUserStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user statistics';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUsername = useCallback(async (username: string, excludeId?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      return await userApi.checkUsername(username, excludeId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check username availability';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkEmail = useCallback(async (email: string, excludeId?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      return await userApi.checkEmail(email, excludeId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check email availability';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserStats,
    checkUsername,
    checkEmail,
    clearError,
  };
} 