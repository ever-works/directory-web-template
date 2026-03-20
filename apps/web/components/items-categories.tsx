import { usePathname } from "@/i18n/navigation";
import { Category } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useThrottledScroll } from "@/hooks/use-throttled-scroll";
import { useCategoriesEnabled } from "@/hooks/use-categories-enabled";

export function ItemsCategories(props: {
    categories: Category[];
    basePath?: string;
    resetPath?: string;
    enableSticky?: boolean;
    maxVisibleTags?: number;
  }) {
    const { categoriesEnabled } = useCategoriesEnabled();
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const pathname = usePathname();

    const isStickyRef = useRef(false);

    const handleScroll = useCallback(() => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 250;
      if (scrollPosition > scrollThreshold && !isStickyRef.current) {
        isStickyRef.current = true;
        setIsSticky(true);
      } else if (scrollPosition <= scrollThreshold && isStickyRef.current) {
        isStickyRef.current = false;
        setIsSticky(false);
      }
    }, []);

    useThrottledScroll(handleScroll, !!props.enableSticky);

    if (!categoriesEnabled) {
      return null;
    }

    if (!props.categories || props.categories.length === 0) {
      return null;
    }
  
    const MAX_VISIBLE_CATEGORIES = props.maxVisibleTags || 8;
    const hasMoreTags = props.categories.length > MAX_VISIBLE_CATEGORIES;
  
    const renderCategory = (category: Category, index: number) => {
      const basePath = props.basePath
        ? `${props.basePath}/${category.id}`
        : `/categories/${category.id}`;

      const isActive = pathname === encodeURI(basePath) || pathname.startsWith(encodeURI(basePath) + '/');
      return (
        <Button
          key={category.id || index}
          variant={isActive ? "solid" : "bordered"}
          radius="full"
          size="sm"
          as={Link}
          prefetch={false}
          href={basePath}
          className={cn(
            "px-2 sm:px-3 py-1 h-7 sm:h-8 font-medium transition-all duration-200",
            isActive
              ? "bg-theme-primary text-white border-theme-primary shadow-xs"
              : "border border-dark--theme-200 dark:border-dark--theme-800",
            "hover:shadow-md hover:border-theme-primary dark:hover:border-theme-primary",
            !showAllCategories && "shrink-0"
          )}
        >
          {isActive && (
            <svg
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {category.icon_url && (
            <Image
              width={20}
              height={20}
              src={category.icon_url}
              className={cn(
                "w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 transition-transform",
                isActive ? "brightness-200" : ""
              )}
              alt={category.name}
            />
          )}
          <span
            className={cn(
              "text-xs sm:text-sm font-medium transition-all duration-300",
              isActive
                ? "text-white tracking-wide"
                : "text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 capitalize"
            )}
          >
            {category.name}
          </span>
          {category.count && (
            <span
              className={cn(
                "ml-1 sm:ml-1.5 text-[10px] sm:text-xs font-normal",
                isActive ? "text-white" : "text-dark-500 dark:text-dark-400"
              )}
            >
              ({category.count})
            </span>
          )}
        </Button>
      );
    };
  
    const visibleCategories = showAllCategories
      ? props.categories
      : props.categories.slice(0, MAX_VISIBLE_CATEGORIES);
  
    const isAnyTagActive = props.categories.some((category) => {
      const basePath = props.basePath
        ? `${props.basePath}/${category.id}`
        : `/categories/${category.id}`;
      return pathname === encodeURI(basePath) || pathname.startsWith(encodeURI(basePath) + '/');
    });
  
    return (
      <div
        className={cn(
          "p-3 sm:p-4 transition-all duration-300",
          props.enableSticky
            ? cn(
                "sticky top-4 z-10",
                isSticky
                  ? "bg-white/95 dark:bg-white/5 shadow-md backdrop-blur-xs"
                  : "bg-transparent"
              )
            : "bg-inherit"
        )}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3
              className={cn(
                "text-base sm:text-lg font-bold transition-colors duration-300",
                isSticky
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-900 dark:text-white"
              )}
            >
              Categories
            </h3>
            {hasMoreTags && (
              <Button
                variant="flat"
                radius="full"
                size="sm"
                className={cn(
                  "px-3 py-2 text-xs font-semibold rounded-full bg-linear-to-r from-theme-primary-100 to-theme-primary-100 text-theme-primary border border-theme-primary-500 dark:from-theme-primary-900/30 dark:to-theme-primary-900/30 dark:text-theme-primary dark:border-theme-primary-500 transition-all duration-300 hover:scale-105 hover:shadow-md capitalize shadow-xs bg-theme-primary-10",
                  isSticky && "shadow-md"
                )}
                onPress={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories ? (
                  <>
                    <span className="hidden sm:inline">Show as single row</span>
                    <span className="sm:hidden">Single row</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="ml-1 sm:ml-1.5 transition-transform group-hover:-translate-y-0.5 dark:text-default-300"
                    >
                      <path
                        d="M3 10h18M3 14h18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      Show all {props.categories.length} categories
                    </span>
                    <span className="sm:hidden">All</span>
                    <svg

                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="ml-1 sm:ml-1.5 transition-transform group-hover:translate-y-0.5 dark:text-default-300 text-white"
                    >
                      <path
                        d="M4 4h16v7H4V4zm0 9h16v7H4v-7z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="relative">
            {!showAllCategories && (
              <div className="w-full flex flex-nowrap gap-1.5 sm:gap-2 overflow-x-auto pb-2 hide-scrollbar scrollbar-thin scrollbar-thumb-blue-500/30 dark:scrollbar-thumb-blue-700/30 scrollbar-track-transparent">
                <Button
                  variant={!isAnyTagActive ? "solid" : "bordered"}
                  radius="full"
                  size="sm"
                  as={Link}
                  prefetch={false}
                  href={props.resetPath || props.basePath || "/"}
                  className={cn(
                    "px-2 sm:px-3 py-1 h-7 sm:h-8 font-medium transition-all duration-300 shrink-0 group",
                    !isAnyTagActive
                      ? "bg-theme-primary-500 text-white border-theme-primary-500 shadow-xs"
                      : "border border-dark--theme-200 dark:border-dark--theme-800",
                    "hover:shadow-md hover:border-theme-primary-200 dark:hover:border-theme-primary-800"
                  )}
                >
                  {!isAnyTagActive && (
                    <svg
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  <span className="text-xs sm:text-sm">All Categories</span>
                  <span
                    className={cn(
                      "ml-1 sm:ml-1.5 text-[10px] sm:text-xs font-normal",
                      !isAnyTagActive
                        ? "text-white"
                        : "text-dark-500 dark:text-dark-400"
                    )}
                  >
                    ({props.categories.length})
                  </span>
                </Button>
                {visibleCategories.map(renderCategory)}
              </div>
            )}
  
            {showAllCategories && (
              <div className="w-full flex flex-wrap gap-1.5 sm:gap-2">
                <Button
                  variant={!isAnyTagActive ? "solid" : "bordered"}
                  radius="full"
                  size="sm"
                  as={Link}
                  prefetch={false}
                  href={props.resetPath || props.basePath || "/"}
                  className={cn(
                    "px-2 sm:px-3 py-1 h-7 sm:h-8 font-medium transition-all duration-200",
                    !isAnyTagActive
                      ? "bg-primary-500 text-white border-primary-500 shadow-xs"
                      : "border border-dark--theme-200 dark:border-dark--theme-800",
                    "hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800"
                  )}
                >
                  {!isAnyTagActive && (
                    <svg
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  <span className="text-xs sm:text-sm">All Categories</span>
                  <span
                    className={cn(
                      "ml-1 sm:ml-1.5 text-[10px] sm:text-xs font-normal",
                      !isAnyTagActive
                        ? "text-white"
                        : "text-dark-500 dark:text-dark-400"
                    )}
                  >
                    ({props.categories.length})
                  </span>
                </Button>
                {visibleCategories.map(renderCategory)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }