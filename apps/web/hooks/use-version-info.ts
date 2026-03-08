import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VersionInfo } from "@/app/api/version/route";
import { apiUtils, serverClient } from "@/lib/api/server-api-client";

// Query key for version info
export const VERSION_INFO_QUERY_KEY = ["version-info"] as const;

// Cache configuration
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

interface UseVersionInfoOptions {
  refreshInterval?: number;
  retryOnError?: boolean;
  enabled?: boolean;
}

interface UseVersionInfoError {
  message: string;
  status?: number;
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}

export function useVersionInfo({
  refreshInterval = 5 * 60 * 1000, // 5 minutes
  retryOnError = true,
  enabled = true,
}: UseVersionInfoOptions = {}): UseVersionInfoReturn {
  const queryClient = useQueryClient();

  // React Query implementation
  const {
    data: versionInfo,
    isLoading,
    isError,
    error,
    refetch,
    isStale,
    dataUpdatedAt,
  } = useQuery<VersionInfo, UseVersionInfoError>({
    queryKey: VERSION_INFO_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await serverClient.get<VersionInfo>("/api/version", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!apiUtils.isSuccess(response)) {
          const errorMessage = apiUtils.getErrorMessage(response) || "Failed to fetch version info";
          throw {
            message: errorMessage,
            status: 'status' in response ? response.status : undefined,
          };
        }

        const data = response.data;

        // Validate response data
        if (!data || !data.commit || !data.date || !data.author) {
          throw {
            message: "Invalid version data received",
            status: 422,
          };
        }

        return data;
      } catch (err) {
        // Handle both our custom errors and unexpected errors
        if (err && typeof err === 'object' && 'message' in err) {
          throw err as UseVersionInfoError;
        }

        const error = err as Error;
        throw {
          message: error?.message || "Failed to fetch version info",
          status: undefined,
        } as UseVersionInfoError;
      }
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    refetchOnWindowFocus: false, // Don't refetch on tab switch to reduce API calls
    refetchOnReconnect: true,
    refetchOnMount: false, // Don't refetch if data exists in cache
    enabled,
    retry: (failureCount, error) => {
      if (!retryOnError) return false;

      // Don't retry on client errors (4xx) except for specific cases
      if (error.status && error.status >= 400 && error.status < 500) {
        return false;
      }

      // Retry network errors and server errors once (reduced from 3 for better UX)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Log errors in development mode (only for dev/admin)
  if (isError && error && process.env.NODE_ENV === 'development') {
    console.error('[VersionInfo] Failed to fetch version:', error.message);
  }

  // Utility function to invalidate version info cache
  const invalidateVersionInfo = async () => {
    await queryClient.invalidateQueries({ queryKey: VERSION_INFO_QUERY_KEY });
  };

  return {
    versionInfo: versionInfo ?? null,
    isLoading,
    isError,
    error: error ?? null,
    refetch,
    isStale,
    dataUpdatedAt,
    invalidateVersionInfo,
  };
}

/**
 * Utility hook for managing version info queries across the application
 */
export function useVersionInfoUtils() {
  const queryClient = useQueryClient();

  const prefetchVersionInfo = async () => {
    await queryClient.prefetchQuery({
      queryKey: VERSION_INFO_QUERY_KEY,
      queryFn: async () => {
        const response = await serverClient.get<VersionInfo>("/api/version");

        if (!apiUtils.isSuccess(response)) {
          throw new Error(apiUtils.getErrorMessage(response) || "Failed to fetch version info");
        }

        return response.data;
      },
      staleTime: STALE_TIME,
    });
  };

  const invalidateVersionInfo = async () => {
    await queryClient.invalidateQueries({ queryKey: VERSION_INFO_QUERY_KEY });
  };

  const getVersionInfoFromCache = (): VersionInfo | undefined => {
    return queryClient.getQueryData(VERSION_INFO_QUERY_KEY);
  };

  const setVersionInfoInCache = (versionInfo: VersionInfo) => {
    queryClient.setQueryData(VERSION_INFO_QUERY_KEY, versionInfo);
  };

  return {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache,
  };
}