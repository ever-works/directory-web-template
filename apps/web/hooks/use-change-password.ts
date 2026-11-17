"use client";

import { serverClient } from "@/lib/api/server-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user";

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

// Strip the "HTTP 4xx: " prefix that serverClient prepends to error messages
const cleanErrorMessage = (raw: string) => raw.replace(/^HTTP \d+: /, "");

const changePasswordApi = async (data: ChangePasswordData): Promise<ChangePasswordResponse> => {
  const response = await serverClient.post<ChangePasswordResponse>("/api/auth/change-password", data);
  if (!response.success) {
    const error: ChangePasswordError = {
      error: cleanErrorMessage(response.error || "Failed to change password"),
      details: (response as any).details,
    };
    throw error;
  }
  return response.data || { success: true, message: "Password changed successfully" };
};

export function useChangePassword() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationKey: ["change-password"],
    mutationFn: changePasswordApi,
    onSuccess: async () => {
      // Show success message
      toast.success(
        "Password changed successfully! Sign in with your new password. You will receive a confirmation email shortly."
      );

      // The change ends every session that signed in before it, this one included (the jwt
      // callback in lib/auth), so drop the signed-in data, sign out and send the user to sign in
      // with the new password. Refetching it here would only answer 401.
      queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ["user"] });
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.removeQueries({ queryKey: ["security-settings"] });
      queryClient.removeQueries({ queryKey: ["auth"] });
      try {
        await signOut({ redirect: false });
      } catch (error) {
        // The server has already ended the session; going to sign in is still right.
        console.error("Sign-out after password change failed:", error);
      }
      router.replace("/auth/signin");
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
