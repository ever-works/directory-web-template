import { useState, useCallback } from 'react';
import { RoleData } from '@/lib/types/role';

const API_BASE = '/api/admin/roles/active';

export function useActiveRoles() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getActiveRoles = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_BASE, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch active roles: ${response.status}`);
      }

      const data = await response.json();

      // Check if the request was aborted before updating state
      if (signal?.aborted) {
        return [];
      }

      if (data.roles) {
        setRoles(data.roles);
        setLoading(false);
        return data.roles;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      // Don't update state if the request was aborted
      if (signal?.aborted) {
        return [];
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch active roles';
      console.error('Error fetching active roles:', err);
      setError(errorMessage);
      setLoading(false);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    roles,
    loading,
    error,
    getActiveRoles,
    clearError,
  };
}