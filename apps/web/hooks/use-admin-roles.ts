import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { Permission } from '@/lib/db/schema';

// Types
export interface RoleData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  isAdmin: boolean;
  permissions?: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  status?: 'active' | 'inactive';
  isAdmin?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
  isAdmin?: boolean;
  permissions?: Permission[];
}

export interface RolesListResponse {
  success: boolean;
  roles: RoleData[];
  error?: string;
  message?: string;
}

export interface RoleResponse {
  success: boolean;
  role: RoleData;
  error?: string;
  message?: string;
}

// Query keys for React Query
const rolesQueryKeys = {
  all: ['admin-roles'] as const,
  lists: () => [...rolesQueryKeys.all, 'list'] as const,
  list: () => [...rolesQueryKeys.lists()] as const,
  details: () => [...rolesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...rolesQueryKeys.details(), id] as const,
};

// API functions
const fetchRoles = async (): Promise<RolesListResponse> => {
  const response = await serverClient.get<RolesListResponse>('/api/admin/roles');
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const createRole = async (data: CreateRoleRequest): Promise<RoleResponse> => {
  const response = await serverClient.post<RoleResponse>('/api/admin/roles', data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const updateRole = async (id: string, data: UpdateRoleRequest): Promise<RoleResponse> => {
  const response = await serverClient.put<RoleResponse>(`/api/admin/roles/${id}`, data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const deleteRole = async (id: string, hardDelete: boolean = false): Promise<void> => {
  const url = hardDelete 
    ? `/api/admin/roles/${id}?hard=true`
    : `/api/admin/roles/${id}`;
  
  const response = await serverClient.delete(url);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
};

interface UseAdminRolesReturn {
  // Data
  roles: RoleData[];
  
  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Actions
  createRole: (data: CreateRoleRequest) => Promise<boolean>;
  updateRole: (id: string, data: UpdateRoleRequest) => Promise<boolean>;
  deleteRole: (id: string, hardDelete?: boolean) => Promise<boolean>;
  
  // Utility
  refetch: () => void;
  refreshData: () => void;
}

export function useAdminRoles(): UseAdminRolesReturn {
  // Query client for cache management
  const queryClient = useQueryClient();

  // React Query hooks
  const {
    data: rolesData,
    isLoading,
    error: _error,
    refetch,
  } = useQuery({
    queryKey: rolesQueryKeys.list(),
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes - reduced from 30 seconds
    retry: 3,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all });
      toast.success('Role created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: string; hardDelete?: boolean }) => deleteRole(id, hardDelete),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all });
      toast.success(variables.hardDelete ? 'Role permanently deleted' : 'Role deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });

  // Derived data
  const roles = rolesData?.roles || [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Wrapper functions for mutations
  const handleCreateRole = useCallback(async (data: CreateRoleRequest): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch (error) {
      console.error('Failed to create role:', error);
      return false;
    }
  }, [createMutation]);

  const handleUpdateRole = useCallback(async (id: string, data: UpdateRoleRequest): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch (error) {
      console.error('Failed to update role:', error);
      return false;
    }
  }, [updateMutation]);

  const handleDeleteRole = useCallback(async (id: string, hardDelete: boolean = false): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync({ id, hardDelete });
      return true;
    } catch (error) {
      console.error('Failed to delete role:', error);
      return false;
    }
  }, [deleteMutation]);

  // Refresh all data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all });
  }, [queryClient]);

  return {
    // Data
    roles,
    
    // Loading states
    isLoading,
    isSubmitting,
    
    // Actions
    createRole: handleCreateRole,
    updateRole: handleUpdateRole,
    deleteRole: handleDeleteRole,
    
    // Utility
    refetch,
    refreshData,
  };
}