import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, type RequestBody, type ApiError } from '@/lib/api/api-client';
import { Permission } from '@/lib/permissions/definitions';

interface RolePermissionsPayload {
  permissions: Permission[];
  role: {
    id: string;
    name: string;
    description: string;
  };
}

interface UpdatePermissionsPayload {
  message: string;
  role: {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
  };
}

interface UpdatePermissionsRequest {
  permissions: Permission[];
}

// Fetch role permissions
const fetchRolePermissions = async (roleId: string): Promise<RolePermissionsPayload> => {
  try {
    const response = await apiClient.get<RolePermissionsPayload>(`/api/admin/roles/${roleId}/permissions`);
    return response;
  } catch (error) {
    console.error('Error fetching role permissions for roleId:', roleId, 'Error:', error);
    throw error;
  }
};

// Update role permissions
const updateRolePermissions = async (
  roleId: string,
  data: UpdatePermissionsRequest
): Promise<UpdatePermissionsPayload> => {
  const response = await apiClient.put<UpdatePermissionsPayload>(
    `/api/admin/roles/${roleId}/permissions`,
    data as unknown as RequestBody
  );
  return response;
};

// Query keys
const rolePermissionsQueryKeys = {
  all: ['role-permissions'] as const,
  role: (roleId: string) => [...rolePermissionsQueryKeys.all, roleId] as const,
};

export function useRolePermissions(roleId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  // Query enabled when roleId exists and enabled is true
  const queryEnabled = !!roleId && enabled;

  // Query for fetching permissions
  const {
    data: permissionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: rolePermissionsQueryKeys.role(roleId),
    queryFn: () => fetchRolePermissions(roleId),
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors (401, 403)
      const apiError = error as ApiError;
      if (apiError.status === 401 || apiError.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false,
  });

  // Mutation for updating permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: (data: UpdatePermissionsRequest) =>
      updateRolePermissions(roleId, data),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: rolePermissionsQueryKeys.role(roleId)
      });
      queryClient.invalidateQueries({
        queryKey: ['admin-roles']
      });

      toast.success(data.message || 'Permissions updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });

  // Helper functions
  const updatePermissions = async (permissions: Permission[]): Promise<boolean> => {
    try {
      await updatePermissionsMutation.mutateAsync({ permissions });
      return true;
    } catch (error) {
      console.error('Failed to update permissions:', error);
      return false;
    }
  };

  const invalidateCache = () => {
    queryClient.invalidateQueries({
      queryKey: rolePermissionsQueryKeys.role(roleId)
    });
  };

  return {
    // Data
    permissions: permissionsData?.permissions || [],
    role: permissionsData?.role,

    // Loading states
    isLoading,
    isUpdating: updatePermissionsMutation.isPending,

    // Error states
    error,

    // Actions
    updatePermissions,
    refetch,
    invalidateCache,
  };
}