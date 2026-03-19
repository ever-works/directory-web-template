"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import UniversalPagination from "@/components/universal-pagination";

interface StandardPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

interface InfiniteScrollPaginationProps {
  loadMoreRef: (node?: Element | null) => void;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

/**
 * StandardPagination - Displays standard page-based pagination
 */
export function StandardPagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: StandardPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <UniversalPagination
      page={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      className={className}
    />
  );
}

/**
 * InfiniteScrollPagination - Displays infinite scroll loading indicator
 */
export function InfiniteScrollPagination({
  loadMoreRef,
  hasMore,
  isLoading,
  error,
  onRetry,
}: InfiniteScrollPaginationProps) {
  const commonT = useTranslations("common");

  return (
    <div className="flex flex-col items-center gap-6 mt-16 mb-12">
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="w-full flex items-center justify-center py-8"
        >
          {error ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                {error.message}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="text-sm text-theme-primary-500 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 transition-colors"
              >
                {commonT("RETRY")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-theme-primary-500 dark:text-theme-primary-400">
              {isLoading && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">
                    {commonT("LOADING")}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!hasMore && !error && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {commonT("END_OF_CONTENT")}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * SharedCardPagination - Orchestrates pagination based on type
 */
export function SharedCardPagination({
  paginationType,
  standardPaginationProps,
  infiniteScrollProps,
}: {
  paginationType: "standard" | "infinite";
  standardPaginationProps?: StandardPaginationProps;
  infiniteScrollProps?: InfiniteScrollPaginationProps;
}) {
  if (paginationType === "standard" && standardPaginationProps) {
    return <StandardPagination {...standardPaginationProps} />;
  }

  if (paginationType === "infinite" && infiniteScrollProps) {
    return <InfiniteScrollPagination {...infiniteScrollProps} />;
  }

  return null;
}
