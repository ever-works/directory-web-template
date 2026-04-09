import { useCallback, useRef } from "react";
import { signOut } from "next-auth/react";

export function useLogoutOverlay() {
  const isLoggingOutRef = useRef<boolean>(false);

  const handleLogout = useCallback(async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;

    try {
      await signOut({ redirect: false });
      window.location.assign("/");
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      isLoggingOutRef.current = false;
    }
  }, []);

  return {
    handleLogout,
  };
}
