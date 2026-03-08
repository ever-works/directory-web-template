"use client";

import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user";

export function useLogout() {
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      await signOut({ redirect: false });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    }
  };

  return { logout };
} 