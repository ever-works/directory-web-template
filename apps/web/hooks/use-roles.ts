import { useState, useCallback } from 'react';
import { RoleData } from '@/lib/types/role';

const API_BASE = '/api/admin/roles';

export function useRoles() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_BASE);
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      const data = await response.json();
      if (data.roles) {
        setRoles(data.roles);
        return data.roles;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch roles';
      setError(errorMessage);
      console.error('Error fetching roles:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    roles,
    loading,
    error,
    getRoles,
    clearError,
  };
} 