import { memo, useState } from "react";
import { LogOut, Zap, Loader2 } from "lucide-react";

interface LogoutButtonProps {
  onLogout: () => void | Promise<void>;
  logoutText: string;
  logoutDescription?: string;
}

function LogoutButton({ onLogout, logoutText, logoutDescription }: LogoutButtonProps) {
  const [isLogging, setIsLogging] = useState(false);

  const handleLogout = async () => {
    setIsLogging(true);
    try {
      await onLogout();
      // Intentionally keep loading when a redirect occurs.
      // If no redirect happens, the error handler will reset.
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLogging(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLogging}
      aria-busy={isLogging}
      aria-live="polite"
      className="group flex w-full items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-linear-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/10 dark:hover:to-pink-900/10 transition-all duration-200 disabled:opacity-75"
      role="menuitem"
    >
      <div className="flex items-center justify-center w-10 h-10 mr-3 rounded-xl bg-linear-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 group-hover:from-red-200 group-hover:to-pink-200 dark:group-hover:from-red-900/40 dark:group-hover:to-pink-900/40 transition-all duration-200">
        {isLogging ? (
          <Loader2 className="h-5 w-5 animate-spin text-red-600 dark:text-red-400" aria-label="Logging out" />
        ) : (
          <LogOut aria-hidden="true" className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
      </div>
      <div className="flex-1">
        <span className="font-semibold">{logoutText}</span>
        {logoutDescription ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{logoutDescription}</p>
        ) : null}
      </div>
      {!isLogging && (
        <Zap aria-hidden="true" className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      )}
    </button>
  );
}

// Export memoized component for better performance
export default memo(LogoutButton);
