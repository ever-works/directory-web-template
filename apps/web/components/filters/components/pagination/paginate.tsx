import { Pagination, cn } from "@heroui/react";
import { PaginateProps } from "../../types";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { FILTER_CONSTANTS } from "../../constants";

/**
 * Pagination component
 * Handles both standard pagination and infinite scroll based on user preference
 */
export function Paginate({
  basePath,
  initialPage,
  total,
  onPageChange,
  paginationType = "standard",
}: PaginateProps & {
  paginationType?: "standard" | "infinite";
  onPageChange?: (page: number) => void;
}) {
  const { navigateWithScroll } = useScrollToTop({
    easing: "easeInOut",
    duration: FILTER_CONSTANTS.SCROLL_DURATION,
    threshold: FILTER_CONSTANTS.SCROLL_THRESHOLD_PX,
  });

  function redirect(page: number) {
    if (onPageChange) {
      // Client-side pagination
      onPageChange(page);
    } else if (basePath) {
      // Server-side pagination (URL-based)
      const path = basePath + (page === 1 ? "" : `/${page}`);
      navigateWithScroll(path, FILTER_CONSTANTS.NAVIGATE_DELAY);
    } else {
      console.error('Neither onPageChange nor basePath provided to Paginate component');
    }
  }

  // Don't render pagination if there's only one page
  if (paginationType === "standard" && total <= 1) {
    return null;
  }

  return (
    <>
      {paginationType === "standard" && (
        <div className="flex flex-col items-center gap-6 mt-16 mb-12">
          {/* Page info */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page{" "}
              <span className="font-semibold text-theme-primary dark:text-theme-primary">
                {initialPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-primary dark:text-theme-primary">
                {total}
              </span>
            </p>
          </div>

          {/* Enhanced Pagination */}
          <div className="relative group">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-linear-to-r from-primary-500/10 via-primary-600/5 to-primary-500/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>

            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2 shadow-lg hover:shadow-xl transition-all duration-300 dark:shadow-lg dark:shadow-theme-primary-500/20 dark:shadow-theme-primary-500/20">
              <Pagination
                showControls
                total={total}
                initialPage={initialPage}
                onChange={redirect}
                radius="lg"
                size="lg"
                classNames={{
                  wrapper: "gap-2 p-2",
                  item: cn(
                    "min-w-10 h-10 text-sm font-medium transition-all duration-300 ease-out",
                    "bg-transparent hover:bg-theme-primary hover:bg-theme-primary hover:to-theme-primary",
                    "dark:hover:bg-theme-primary dark:hover:to-theme-primary",
                    "text-gray-700 dark:text-gray-300 hover:text-theme-primary dark:hover:text-theme-primary",
                    "border border-transparent hover:border-theme-primary dark:hover:border-theme-primary",
                    "hover:shadow-md hover:scale-105 active:scale-95",
                    "data-[hover=true]:bg-theme-primary data-[hover=true]:bg-theme-primary data-[hover=true]:bg-theme-primary",
                    "dark:data-[hover=true]:bg-theme-primary dark:data-[hover=true]:bg-theme-primary",
                    "cursor-pointer relative overflow-hidden"
                  ),
                  cursor: cn(
                    "bg-theme-primary! text-white font-semibold",
                    "shadow-lg shadow-theme-primary dark:shadow-theme-primary",
                    "border-2 border-theme-primary dark:border-theme-primary",
                    "relative overflow-hidden"
                  ),
                  prev: cn(
                    "min-w-10 h-10 font-medium transition-all duration-300",
                    "bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700",
                    "text-gray-600 dark:text-gray-300 hover:text-theme-primary dark:hover:text-theme-primary",
                    "border border-gray-200 dark:border-gray-600 hover:border-theme-primary dark:hover:border-theme-primary",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  ),
                  next: cn(
                    "min-w-10 h-10 font-medium transition-all duration-300",
                    "bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700",
                    "text-gray-600 dark:text-gray-300 hover:text-theme-primary dark:hover:text-theme-primary",
                    "border border-gray-200 dark:border-gray-600 hover:border-theme-primary dark:hover:border-theme-primary",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  ),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
