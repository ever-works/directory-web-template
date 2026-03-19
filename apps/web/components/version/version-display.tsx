"use client";

import { Clock, GitBranch, User, Calendar, Info } from "lucide-react";
import { useVersionInfo } from "@/hooks/use-version-info";
import { useIsDevOrAdmin } from "@/hooks/use-is-dev-or-admin";
import { memo, useMemo } from "react";

interface VersionDisplayProps {
  className?: string;
  variant?: "inline" | "badge" | "detailed";
  showDetails?: boolean;
  refreshInterval?: number;
}

const VersionDisplay = memo(function VersionDisplay({
  className = "",
  variant = "inline",
  showDetails = false,
  refreshInterval = 5 * 60 * 1000 // 5 minutes
}: VersionDisplayProps) {
  const { versionInfo, error } = useVersionInfo({
    refreshInterval,
    retryOnError: true,
  });
  const isDevOrAdmin = useIsDevOrAdmin();

  // Memoize date formatters for performance
  const dateFormatters = useMemo(() => ({
    formatDate: (dateString: string) => {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    
    getRelativeTime: (dateString: string) => {
      const now = new Date();
      const date = new Date(dateString);
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return "Just now";
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
      return new Date(dateString).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    },
    
    getRepositoryName: (url: string) => {
      if (url === "unknown") return "Unknown";
      const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      return match ? match[1] : url;
    }
  }), []);

  // Error state - only show error UI to dev/admin users
  if (error || !versionInfo) {
    // For regular users: hide the component silently
    if (!isDevOrAdmin) {
      return null;
    }

    // For dev/admin: show error message
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 ${className}`}>
        <Info className="h-3 w-3" />
        <span>Version unavailable</span>
      </div>
    );
  }

  // Badge variant
  if (variant === "badge") {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 shadow-xs hover:shadow-md transition-all duration-200 hover:scale-105 ${className}`}>
        <GitBranch className="h-3 w-3" />
        <span>v{versionInfo.commit}</span>
        <div className="w-1 h-1 bg-blue-400 dark:bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-blue-600 dark:text-blue-400">
          {dateFormatters.getRelativeTime(versionInfo.date)}
        </span>
      </div>
    );
  }

  // Detailed variant
  if (variant === "detailed") {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-xs hover:shadow-md transition-all duration-200 ${className}`}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-blue-500" />
              Data Version
            </h3>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
            </div>
          </div>

          {/* Version Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-sm text-xs font-mono text-gray-800 dark:text-gray-200 border">
                  {versionInfo.commit}
                </code>
                <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {dateFormatters.getRelativeTime(versionInfo.date)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-3 w-3" />
              <span>{versionInfo.author}</span>
            </div>

            {versionInfo.message && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded-sm border-l-2 border-blue-200 dark:border-blue-800">
                &ldquo;{versionInfo.message.split('\n')[0]}&rdquo;
              </div>
            )}
          </div>

          {/* Details section */}
          {showDetails && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>Updated: {dateFormatters.formatDate(versionInfo.date)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>Last sync: {dateFormatters.formatDate(versionInfo.lastSync)}</span>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span>Repository: </span>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded-sm font-mono">
                  {dateFormatters.getRepositoryName(versionInfo.repository)}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={`inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 ${className}`}>
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3 w-3" />
        <span className="font-medium">v{versionInfo.commit}</span>
      </div>
      <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
      <span>{dateFormatters.getRelativeTime(versionInfo.date)}</span>
      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
    </div>
  );
});

export { VersionDisplay }; 