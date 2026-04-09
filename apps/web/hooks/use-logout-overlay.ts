import { useCallback, useRef, useState } from "react";
import { signOut } from "next-auth/react";

export function useLogoutOverlay() {
  const isLoggingOutRef = useRef<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      await signOut({ redirect: false });
      window.location.assign("/");
    } catch (error) {
      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  return {
    handleLogout,
    isLoggingOut,
  };
}
