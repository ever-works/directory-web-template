"use client";

import { useEffect, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

// Types
interface InfinityScrollProps {
  basePath: string;
  initialPage: number;
  total: number;
  onLoadMore: (page: number) => Promise<void>;
  hasMore: boolean;
  isLoading?: boolean;
  error?: Error | null;
  retry?: () => void;
}

interface ScrollState {
  page: number;
  isLoading: boolean;
  error: Error | null;
}

// Custom hook for infinite scroll logic
const useInfiniteScroll = (
  initialPage: number,
  hasMore: boolean,
  onLoadMore: (page: number) => Promise<void>
) => {
  const [state, setState] = useState<ScrollState>({
    page: initialPage,
    isLoading: false,
    error: null,
  });

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  const loadMore = useCallback(async () => {
    if (state.isLoading || !hasMore) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const nextPage = state.page + 1;
      await onLoadMore(nextPage);
      setState(prev => ({ ...prev, page: nextPage, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load more items'),
      }));
    }
  }, [state.page, state.isLoading, hasMore, onLoadMore]);

  useEffect(() => {
    if (inView && hasMore && !state.isLoading) {
      loadMore();
    }
  }, [inView, hasMore, state.isLoading, loadMore]);

  const retry = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    loadMore();
  }, [loadMore]);

  return {
    ref,
    state,
    retry,
  };
};

// Loading indicator component
const LoadingIndicator = ({ isLoading }: { isLoading: boolean }) => {
  const t = useTranslations("common");
  
  if (!isLoading) return <div className="h-1 w-1" />;
  
  return (
    <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">{t("LOADING")}</span>
    </div>
  );
};

// Error state component
const ErrorState = ({ error, retry }: { error: Error; retry: () => void }) => {
  const t = useTranslations("common");
  
  return (
    <div className="text-center py-4">
      <p className="text-sm text-red-600 dark:text-red-400 mb-2">
        {error.message}
      </p>
      <button
        onClick={retry}
        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
      >
        {t("RETRY")}
      </button>
    </div>
  );
};

// Main component
export function InfinityScroll({
  initialPage,
  total,
  onLoadMore,
  hasMore,
  isLoading: externalLoading,
  error: externalError,
  retry: externalRetry,
}: InfinityScrollProps) {
  const t = useTranslations("common");
  const { ref, state, retry } = useInfiniteScroll(initialPage, hasMore, onLoadMore);

  const isLoading = externalLoading ?? state.isLoading;
  const error = externalError ?? state.error;
  const handleRetry = externalRetry ?? retry;

  return (
    <div className="flex flex-col items-center gap-6 mt-16 mb-12">
      {/* Page info */}
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("LOADED_PAGES")}{" "}
          <span className="font-semibold text-primary-600 dark:text-primary-400">
            {state.page}
          </span>{" "}
          {t("OF")}{" "}
          <span className="font-semibold text-primary-600 dark:text-primary-400">
            {total}
          </span>
        </p>
      </div>

      {/* Loading or error state */}
      <div
        ref={ref}
        className={cn(
          "w-full flex items-center justify-center py-8",
          !hasMore && "hidden"
        )}
      >
        {error ? (
          <ErrorState error={error} retry={handleRetry} />
        ) : (
          <LoadingIndicator isLoading={isLoading} />
        )}
      </div>

      {/* End of content message */}
      {!hasMore && !error && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("END_OF_CONTENT")}
          </p>
        </div>
      )}
    </div>
  );
}