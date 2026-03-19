"use client";

import { serverClient } from "@/lib/api/server-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface ChangePasswordError {
  error: string;
  details?: Array<{
    path: string[];
    message: string;
    code: string;
  }>;
}

// API function for changing password
// Using fetch directly since our internal API doesn't follow the ApiResponse format
const changePasswordApi = async (data: ChangePasswordData): Promise<ChangePasswordResponse> => {
  try {
    const response = await serverClient.post<ChangePasswordResponse>("/api/auth/change-password", data);
    if (!response.success) {
      const error: ChangePasswordError = {
        error: response.error || "Failed to change password",
        details: (response as any).details,
      };
      console.error("Password change error:", error);
      throw error;
    }

    return response.data || { success: true, message: "Password changed successfully" };
  } catch (error: any) {
    console.error("Network or server error:", error);
    const changePasswordError: ChangePasswordError = {
      error: error.message || "Network error occurred",
      details: error.details,
    };

    throw changePasswordError;
  }
};

export function useChangePassword() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["change-password"],
    mutationFn: changePasswordApi,
    onSuccess: () => {
      // Show success message
      toast.success("Password changed successfully! You will receive a confirmation email shortly.");

      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["security-settings"] });

      // Optional: Clear any cached authentication data
      queryClient.removeQueries({ queryKey: ["auth"] });
    },
    onError: (error: ChangePasswordError) => {
      // Show error message
      const errorMessage = error.error || "An unexpected error occurred";
      toast.error(errorMessage);

      // Log detailed errors for debugging
      if (error.details) {
        console.error("Password change validation errors:", error.details);
      }
    },
    // Retry configuration
    retry: (failureCount, error: ChangePasswordError) => {
      // Don't retry on validation errors (4xx status codes)
      if (error.error?.includes("Invalid input") ||
          error.error?.includes("Current password is incorrect") ||
          error.error?.includes("Too many")) {
        return false;
      }
      // Retry up to 2 times for server errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const changePassword = async (data: ChangePasswordData): Promise<ChangePasswordResponse> => {
    try {
      const result = await mutation.mutateAsync(data);
      return {
        success: true,
        message: result.message || "Password changed successfully",
      };
    } catch (error) {
      const err = error as ChangePasswordError;
      return {
        success: false,
        message: err.error || "An unexpected error occurred",
        error: err.error,
      };
    }
  };

  return {
    changePassword,
    isLoading: mutation.isPending,
    error: mutation.error?.error || null,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    reset: mutation.reset,
    // Additional React Query states
    status: mutation.status,
    failureCount: mutation.failureCount,
    failureReason: mutation.failureReason,
  };
}
