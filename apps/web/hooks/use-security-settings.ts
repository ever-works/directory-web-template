"use client";

import { apiUtils, serverClient } from "@/lib/api/server-api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string | null;
  activeSessionsCount: number;
  loginAttemptsCount: number;
  accountLocked: boolean;
  passwordExpiresAt: string | null;
}

interface LoginActivity {
  id: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  success: boolean;
  sessionActive: boolean;
}

// Query keys for security-related data
export const SECURITY_QUERY_KEYS = {
  settings: ["security", "settings"] as const,
  loginActivity: (page: number, limit: number) => ["security", "login-activity", page, limit] as const,
  activeSessions: ["security", "active-sessions"] as const,
} as const;

// Fetch security settings using server-api-client
const fetchSecuritySettings = async (): Promise<SecuritySettings> => {

  const response = await serverClient.get<SecuritySettings>("/api/auth/security/settings");

  if (!response.success) {
    throw new Error(response.error || "Failed to fetch security settings");
  }

  return response.data!;
};

// Fetch login activity using server-api-client
const fetchLoginActivity = async (page: number = 1, limit: number = 10): Promise<{
  activities: LoginActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {

  const url = apiUtils.buildUrl("/api/auth/security/login-activity", { page, limit });
  const response = await serverClient.get<{
    activities: LoginActivity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(url);

  if (!response.success) {
    throw new Error(response.error || "Failed to fetch login activity");
  }

  return response.data!;
};

// Hook for security settings
export function useSecuritySettings() {
  return useQuery({
    queryKey: SECURITY_QUERY_KEYS.settings,
    queryFn: fetchSecuritySettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Hook for login activity
export function useLoginActivity(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: SECURITY_QUERY_KEYS.loginActivity(page, limit),
    queryFn: () => fetchLoginActivity(page, limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
  });
}

// Hook for invalidating security-related queries
export function useSecurityCache() {
  const queryClient = useQueryClient();

  const invalidateSecuritySettings = () => {
    queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.settings });
  };

  const invalidateLoginActivity = () => {
    queryClient.invalidateQueries({ queryKey: ["security", "login-activity"] });
  };

  const invalidateAllSecurity = () => {
    queryClient.invalidateQueries({ queryKey: ["security"] });
  };

  const prefetchSecuritySettings = () => {
    queryClient.prefetchQuery({
      queryKey: SECURITY_QUERY_KEYS.settings,
      queryFn: fetchSecuritySettings,
      staleTime: 1000 * 60 * 5,
    });
  };

  return {
    invalidateSecuritySettings,
    invalidateLoginActivity,
    invalidateAllSecurity,
    prefetchSecuritySettings,
  };
}
