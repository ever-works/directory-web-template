"use client";

import { Category } from "@/lib/content";
import { Link, usePathname } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils/index";
import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import clsx from "clsx";
import { usePortal } from "@/hooks/use-portal";
import { useCategoriesEnabled } from "@/hooks/use-categories-enabled";

// Style constants
const SCROLL_CONTAINER_STYLES = clsx(
  "relative flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-1 scroll-smooth",
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
  "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1",
  "after:bg-linear-to-r after:from-transparent after:via-dark:bg-[#0b111f]/95 after:to-transparent",
  "dark:after:via-dark:bg-[#0b111f]/95",
);

const SCROLL_FADE_LEFT = clsx(
  "absolute left-0 top-0 bottom-4 w-16 pointer-events-none z-5",
  "bg-linear-to-r from-white via-white/80 to-transparent",
  "dark:from-gray-900 dark:via-gray-900/80",
  "opacity-0 transition-opacity duration-300"
);

const SCROLL_FADE_RIGHT = clsx(
  "absolute right-0 top-0 bottom-4 w-16 pointer-events-none",
);

const STICKY_LEFT_STYLES = clsx(
  "sticky left-0 shrink-0 z-10 pr-0 py-0",
  "bg-gradient-to-r from-white/20 via-white/10 to-transparent",
  "dark:from-[#172030]/30 dark:via-[#192232]/10 to-transparent",
  "backdrop-blur-sm rounded-r-full"
);

const CATEGORIES_WRAPPER_BASE = "flex items-center gap-2 sm:gap-3 transition-all duration-500";
const CATEGORIES_WRAPPER_COLLAPSED = clsx(CATEGORIES_WRAPPER_BASE, "flex-nowrap");
const CATEGORIES_WRAPPER_EXPANDED = clsx(CATEGORIES_WRAPPER_BASE, "flex-wrap");

const NAV_BUTTON_STYLES = clsx(
  "h-8 w-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center",
  "border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg",
  "hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200",
  "focus:outline-none focus:ring-0 focus:ring-offset-0",
  "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
  "active:outline-none active:ring-0",
  "disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",
  "shrink-0 flex-shrink-0"
);
const NAV_BUTTON_ICON = "w-4 h-4 text-gray-600 dark:text-gray-400";

type Home2CategoriesProps = {
  categories: Category[];
  basePath?: string;
  resetPath?: string;
  mode?: "navigation" | "filter";
  selectedCategories?: string[];
  onCategoryToggle?: (categoryId: string | "clear-all") => void;
  totalItems?: number;
  showAllCategories?: boolean;
};

type CategoryButtonProps = {
  href: string;
  isActive: boolean;
  displayName: string;
  count: number;
  isTextTruncated?: boolean;
  fullName?: string;
  compact?: boolean;
  onClick?: () => void;
};

const useCategoryState = (categories: Category[]) => {
  const pathname = usePathname();
  const totalItems = useMemo(
    () => categories.reduce((sum, cat) => sum + (cat.count || 0), 0),
    [categories]
  );

  const isHomeActive = useMemo(
    () =>
      pathname === "/" ||
      pathname === "/categories" ||
      pathname.startsWith("/discover"),
    [pathname]
  );

  return {
    totalItems,
    isHomeActive,
    pathname,
  };
};

// Navigation Button Component
const ScrollButton = memo(React.forwardRef<HTMLButtonElement, {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
  visible: boolean;
}>(({ direction, onClick, disabled, visible }, ref) => {
  // Hide button when disabled or not visible
  if (disabled || !visible) {
    return null;
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        NAV_BUTTON_STYLES,
        "transition-opacity duration-300"
      )}
      aria-label={`Scroll ${direction}`}
    >
      <svg
        className={NAV_BUTTON_ICON}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={direction === 'left' ? {} : { transform: 'rotate(180deg)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}));

ScrollButton.displayName = "ScrollButton";

// Memoized components
const CategoryButton = memo(
  React.forwardRef<HTMLDivElement, CategoryButtonProps>(
    (
      {
        href,
        isActive,
        displayName,
        count,
        isTextTruncated,
        fullName,
        compact,
        onClick,
      },
      ref
    ) => {
      const labelRef = useRef<HTMLSpanElement | null>(null);
      const [isOverflowing, setIsOverflowing] = useState(false);

      useLayoutEffect(() => {
        const el = labelRef.current;
        if (!el) return;

        const check = () => {
          // consider a 1px tolerance
          setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
        };

        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        window.addEventListener("resize", check);

        return () => {
          ro.disconnect();
          window.removeEventListener("resize", check);
        };
      }, [displayName, compact]);

      const buttonContent = useMemo(
        () => {
          const labelClass = compact
            ? "inline-block text-[11px] sm:text-[12px] truncate max-w-[9rem] sm:max-w-[10rem] capitalize! font-medium"
            : "inline-block text-xs sm:text-sm truncate max-w-[90px] sm:max-w-[120px] md:max-w-full capitalize! font-medium";

          const badgeClass = cn(
            "ml-1 sm:ml-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs transition-all duration-300 capitalize",
            isActive
              ? "bg-theme-primary-20 text-white dark:text-theme-primary-300 dark:bg-theme-primary-10"
              : "bg-gray-200/80 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300"
          );

          return (
            <>
              <span ref={labelRef} title={isOverflowing && fullName ? fullName : undefined} className={labelClass}>{displayName}</span>
              <span className={badgeClass}>{count}</span>
            </>
          );
        },
        [displayName, count, isActive, fullName, compact, isOverflowing]
      );

      const button = useMemo(
        () => (
          onClick ? (
            // Filter mode: Plain button with onClick - NO NAVIGATION
            <Button
              onPress={() => onClick()}
              className={cn(
                compact
                  ? "group h-7 sm:h-7 whitespace-nowrap py-1 px-2 sm:px-3 text-[11px] sm:text-[12px] transition-all duration-300 ease-in-out focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  : "group h-7 sm:h-9 whitespace-nowrap py-1 sm:py-1.5 px-3 sm:px-4 text-xs sm:text-sm transition-all duration-300 ease-in-out focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                {
                  "bg-linear-to-r from-theme-primary-500 to-theme-primary-600 dark:from-theme-primary-600 dark:to-theme-primary-700 text-white border-none shadow-md shadow-blue-500/20 dark:shadow-theme-primary-700/20":
                    isActive,
                  "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/70 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-xs hover:shadow-md":
                    !isActive,
                }
              )}
            >
              {buttonContent}
            </Button>
          ) : (
            // Navigation mode: Button as Link - CLIENT-SIDE NAVIGATION
            <Button
              as={Link}
              href={href}
              className={cn(
                compact
                  ? "group h-7 sm:h-7 whitespace-nowrap py-1 px-2 sm:px-3 text-[11px] sm:text-[12px] transition-all duration-300 ease-in-out focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  : "group h-7 sm:h-9 whitespace-nowrap py-1 sm:py-1.5 px-3 sm:px-4 text-xs sm:text-sm transition-all duration-300 ease-in-out focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                {
                  "bg-linear-to-r from-theme-primary-500 to-theme-primary-600 dark:from-theme-primary-600 dark:to-theme-primary-700 text-white border-none shadow-md shadow-blue-500/20 dark:shadow-theme-primary-700/20":
                    isActive,
                  "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/70 bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700 shadow-xs hover:shadow-md":
                    !isActive,
                }
              )}
            >
              {buttonContent}
            </Button>
          )
        ),
        [href, isActive, buttonContent, onClick, compact]
      );

      // Only render the custom tooltip if the label is actually overflowing
      if (isTextTruncated && fullName && isOverflowing) {
        return (
          <div ref={ref} className="relative group">
            {button}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-white dark:text-gray-900  text-white text-xs rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 capitalize!"
              role="tooltip"
            >
              {fullName}
            </div>
          </div>
        );
      }

      return <div ref={ref}>{button}</div>;
    }
  )
);

CategoryButton.displayName = "CategoryButton";

// Custom hook for carousel visibility detection
const useCarouselVisibility = (
  containerRef: React.RefObject<HTMLDivElement>,
  itemCount: number,
  showAllCategories: boolean
) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const itemWidthsRef = useRef<number[]>([]);
  const measureItems = useCallback(() => {
    if (!containerRef.current || showAllCategories) return;
    const container = containerRef.current;
    const wrapper = container.querySelector('[data-categories-wrapper]');
    if (!wrapper) return;
    
    const children = Array.from(wrapper.children) as HTMLElement[];
    if (!children.length) return;
    
    // Get actual gap from computed styles
    const computedStyle = window.getComputedStyle(wrapper);
    const gap = parseFloat(computedStyle.gap) || 8;
    
    // measure widths
    itemWidthsRef.current = children.map((child) => child.offsetWidth);
    let totalWidth = 0;
    let startIndex = 0;
    let endIndex = children.length - 1;
    // start index
    for (let i = 0; i < itemWidthsRef.current.length; i++) {
      totalWidth += itemWidthsRef.current[i];
      if (totalWidth > container.scrollLeft) {
        startIndex = i;
        break;
      }
    }
    // end index
    let totalOffset = 0;
    endIndex = children.length - 1; // default to last
    for (let i = 0; i < itemWidthsRef.current.length; i++) {
      totalOffset += itemWidthsRef.current[i] + gap;
      if (totalOffset > container.scrollLeft + container.clientWidth) {
        endIndex = i - 1 >= 0 ? i - 1 : 0; // last fully visible
        break;
      }
    }

    setVisibleRange({ start: startIndex, end: endIndex });

    const hidden = [];
    for (let i = endIndex + 1; i < itemCount; i++) {
      hidden.push(i);
    }
    setHiddenIndices(hidden);

    setCanScrollLeft(container.scrollLeft > 5);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 5);
  }, [containerRef, itemCount, showAllCategories]);

  useEffect(() => {
    if (!containerRef.current || showAllCategories) return;

    const container = containerRef.current;
    const handleScroll = () => measureItems();

    container.addEventListener("scroll", handleScroll);

    const resizeObserver = new ResizeObserver(measureItems);
    resizeObserver.observe(container);

    // initial measurement
    measureItems();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef, measureItems, showAllCategories]);

  return {
    visibleRange,
    hiddenIndices,
    canScrollLeft,
    canScrollRight,
    measureItems,
  };
};


export function HomeTwoCategories({
  categories,
  basePath,
  resetPath,
  mode = "navigation",
  selectedCategories = [],
  onCategoryToggle,
  totalItems,
  showAllCategories = false,
}: Home2CategoriesProps) {
  const { categoriesEnabled } = useCategoriesEnabled();
  const t = useTranslations("listing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  // Use totalItems prop for All Categories button, fallback to calculated value
  const { totalItems: calculatedTotalItems, isHomeActive, pathname } = useCategoryState(categories);
  const allCategoriesCount = totalItems ?? calculatedTotalItems;
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const morePopoverRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const portalTarget = usePortal('category-popover-portal');
  const rafId = useRef<number | null>(null);
  // Track all category elements
  const categoryElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Navigation button refs
  const leftButtonRef = useRef<HTMLButtonElement>(null);
  const rightButtonRef = useRef<HTMLButtonElement>(null);

  // Use carousel visibility detection
  const {
    visibleRange,
    hiddenIndices,
    canScrollLeft,
    canScrollRight,
    measureItems,
  } = useCarouselVisibility(
    scrollContainerRef,
    categories.length + 1, // +1 for "All Categories" button
    showAllCategories
  );

  // Scroll functions
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;

    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  // Wheel scrolling for horizontal scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Only apply horizontal scroll for vertical wheel
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault(); // Stop vertical scrolling
        container.scrollBy({
          left: e.deltaY, // scroll horizontally
          behavior: 'smooth', // smooth scrolling
        });
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => container.removeEventListener('wheel', onWheel);
  }, [scrollContainerRef]);

  const renderCategory = useCallback(
    (category: Category, index?: number, compact?: boolean) => {
          if (mode === "filter") {
        const isActive = selectedCategories.includes(category.id);
        const displayName = category.name;
        return (
          <CategoryButton
            key={category.id}
            href="#"
            isActive={isActive}
            displayName={displayName}
            count={category.count || 0}
            isTextTruncated={!showAllCategories}
            compact={!!compact}
            fullName={category.name}
            onClick={() => onCategoryToggle?.(category.id)}
            ref={(el) => {
              if (el && index !== undefined) {
                categoryElementsRef.current.set(category.id, el);
              }
            }}
          />
        );
      } else {
        const href = basePath
          ? `${basePath}/${category.id}`
          : `/categories/${category.id}`;
        const isActive = pathname === encodeURI(href) || pathname.startsWith(encodeURI(href) + '/');
        const displayName = category.name;

        return (
          <CategoryButton
            key={category.id}
            href={href}
            isActive={isActive}
            displayName={displayName}
            count={category.count || 0}
            isTextTruncated={!showAllCategories}
            compact={!!compact}
            fullName={category.name}
            ref={(el) => {
              if (el && index !== undefined) {
                categoryElementsRef.current.set(category.id, el);
              }
            }}
          />
        );
      }
    },
    [basePath, pathname, mode, selectedCategories, onCategoryToggle, showAllCategories]
  );

  // Get hidden categories based on hidden indices
  const hiddenCategories = useMemo(() => {
    return hiddenIndices
      .map(index => categories[index])
      .filter(Boolean);
  }, [categories, hiddenIndices]);

  // Calculate which categories to show (visible range)
  const visibleCategories = useMemo(() => {
    if (showAllCategories) return categories;
    // Show all items up to visibleRange.end (including those that might be partially visible)
    return categories.slice(0, Math.min(categories.length, visibleRange.end + 1));
  }, [categories, showAllCategories, visibleRange.end]);

  // Handle click outside to close popover with deferred listener pattern
  // This prevents the opening click from triggering the close handler
  useEffect(() => {
    if (!isMorePopoverOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      // Ignore clicks inside the popover or on any of the related controls
      if (morePopoverRef.current && morePopoverRef.current.contains(target)) return;
      if (triggerButtonRef.current && triggerButtonRef.current.contains(target)) return;
      if (leftButtonRef.current && leftButtonRef.current.contains(target)) return;
      if (rightButtonRef.current && rightButtonRef.current.contains(target)) return;

      setIsMorePopoverOpen(false);
    };

    // Defer listener attachment to next tick to prevent opening click from triggering close
    const timeoutId = setTimeout(() => {
      document.addEventListener('pointerdown', handleClickOutside, { capture: true });
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('pointerdown', handleClickOutside, { capture: true });
    };
  }, [isMorePopoverOpen]);

  // Calculate popover position - SIMPLIFIED FIX
  useEffect(() => {
    if (!isMorePopoverOpen || !triggerButtonRef.current) return;

    const updatePosition = () => {
      // Cancel any pending animation frame to prevent queue buildup
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      // Schedule position update for next browser paint cycle (60fps)
      rafId.current = requestAnimationFrame(() => {
        if (triggerButtonRef.current) {
          const rect = triggerButtonRef.current.getBoundingClientRect();
          setPopoverPosition({
            top: rect.bottom + 8, // 8px gap below trigger (viewport relative for fixed positioning)
            left: rect.right - 256, // 256px = w-64, align popover right edge with trigger right edge (viewport relative)
          });
        }
      });
    };
    // Calculate initial position
    updatePosition();
    // Update position on scroll and resize
    window.addEventListener('scroll', updatePosition, true); // true = capture phase
    window.addEventListener('resize', updatePosition);

    return () => {
      // Clean up event listeners
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      // Cancel any pending animation frame
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isMorePopoverOpen]);

  // Reset when showAllCategories changes
  useEffect(() => {
    if (showAllCategories) {
      // Clear measurements when switching to expanded view
      categoryElementsRef.current.clear();
    } else {
      // Re-measure when switching back to carousel view
      setTimeout(measureItems, 100);
    }
  }, [showAllCategories, measureItems]);

  // Update selected category based on pathname
  useEffect(() => {
    if (isHomeActive) {
      setSelectedCategory("all");
    } else {
      const currentCategory = categories.find((category) => {
        const href = basePath
          ? `${basePath}/${category.id}`
          : `/categories/${category.id}`;
        return pathname === encodeURI(href) || pathname.startsWith(encodeURI(href) + '/');
      });

      if (currentCategory) {
        setSelectedCategory(currentCategory.id);
      }
    }
  }, [categories, pathname, isHomeActive, basePath]);

  // Don't render if categories are disabled
  if (!categoriesEnabled) {
    return null;
  }

  // Handle category change from select
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCategory(value);

    if (mode === "filter") {
      if (value === "all") {
        onCategoryToggle?.("clear-all");
      } else {
        onCategoryToggle?.(value);
      }
    } else {
      if (value === "all") {
        router.push(resetPath || "/");
      } else {
        const category = categories.find((c) => c.id === value);
        if (category) {
          const href = basePath
            ? `${basePath}/${category.id}`
            : `/categories/${category.id}`;
          router.push(href);
        }
      }
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Mobile Select Dropdown */}
      <div className="md:hidden w-full px-1">
        <div className="relative">
          <select
            className="w-full p-3 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 appearance-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent transition-all duration-200"
            value={selectedCategory}
            onChange={handleCategoryChange}
            aria-label="Select category"
          >
            <option value="all">
              {t("ALL_CATEGORIES")} ({allCategoriesCount})
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.count || 0})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Desktop Categories - Carousel Approach */}
      <div className="hidden md:block">
        <div className="relative rounded-xl overflow-hidden py-2">
          <div
            ref={scrollContainerRef}
            className={showAllCategories ? "relative pb-4 pr-8 transition-all duration-500" : SCROLL_CONTAINER_STYLES}
            role="region"
            aria-label="Categories filter"
          >
            {/* Scroll fade indicators */}
            {!showAllCategories && canScrollLeft && (
              <div
                className={SCROLL_FADE_LEFT}
                style={{ opacity: canScrollLeft ? 1 : 0 }}
                aria-hidden="true"
              />
            )}
            {!showAllCategories && (canScrollRight || hiddenCategories.length > 0) && (
              <div
                className={SCROLL_FADE_RIGHT}
                style={{ opacity: (canScrollRight || hiddenCategories.length > 0) ? 1 : 0 }}
                aria-hidden="true"
              />
            )}

            <div
              data-categories-wrapper
              className={cn(
                showAllCategories ? CATEGORIES_WRAPPER_EXPANDED : CATEGORIES_WRAPPER_COLLAPSED,
                "relative" // Add relative positioning
              )}
            >
              {/* Left Navigation Button placed as first element */}
              {!showAllCategories && (
                <div className={cn(STICKY_LEFT_STYLES, "flex items-center gap-1")}>
                  <CategoryButton
                    href={mode === "filter" ? "#" : (resetPath || "/")}
                    isActive={mode === "filter" ? selectedCategories.length === 0 : isHomeActive}
                    displayName={t("ALL_CATEGORIES")}
                    count={allCategoriesCount}
                    onClick={mode === "filter" ? () => onCategoryToggle?.("clear-all") : undefined}
                  />
                  <ScrollButton
                    ref={leftButtonRef}
                    direction="left"
                    onClick={scrollLeft}
                    disabled={!canScrollLeft}
                    visible={canScrollLeft && !showAllCategories}
                  />
                </div>
              )}

              {/* Show All Categories without button when showAllCategories is true */}
              {showAllCategories && (
                <div className="">
                  <CategoryButton
                    href={mode === "filter" ? "#" : (resetPath || "/")}
                    isActive={mode === "filter" ? selectedCategories.length === 0 : isHomeActive}
                    displayName={t("ALL_CATEGORIES")}
                    count={allCategoriesCount}
                    onClick={mode === "filter" ? () => onCategoryToggle?.("clear-all") : undefined}
                  />
                </div>
              )}

              {/* Render visible categories only */}
              {visibleCategories.map((category, index) => (
                <React.Fragment key={category.id}>
                  {renderCategory(category, index)}
                </React.Fragment>
              ))}
            </div>

            {/* More Categories Button with Right Navigation Button */}
            {!showAllCategories && hiddenCategories.length > 0 && (
              <div className="sticky right-0 shrink-0 pl-2">
                <div className="flex items-center gap-1 rounded-l-full py-0.5 bg-white/10 dark:bg-[#172030]/10 backdrop-blur-sm ">
                <ScrollButton
                    ref={rightButtonRef}
                    direction="right"
                    onClick={scrollRight}
                    disabled={!canScrollRight && hiddenCategories.length === 0}
                    visible={(canScrollRight || hiddenCategories.length > 0) && !showAllCategories}
                  />
                  <div className="relative">
                    <div className="absolute w-20 -inset-0.5 dark:bg-[#1e2939] rounded-lg blur-xl"></div>
                    <div className="relative">
                      <Button
                        ref={triggerButtonRef}
                        className="h-8 py-2.5 text-xs flex items-center gap-1.5 bg-theme-primary-500 hover:bg-theme-primary-600 dark:bg-theme-primary-600 dark:hover:bg-theme-primary-500 text-white border border-theme-primary-600 shadow-xs hover:shadow-sm transition-all rounded-xl relative z-10 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 active:outline-none active:ring-0"
                        onPress={() => setIsMorePopoverOpen(!isMorePopoverOpen)}
                        aria-label={`Show ${hiddenCategories.length} more ${hiddenCategories.length === 1 ? 'category' : 'categories'}`}
                      >
                        <span className="font-medium">
                          +{hiddenCategories.length}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3.5 h-3.5"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </Button>
                    </div>

                    {/* Popover Content - Portal Rendered */}
                    {isMorePopoverOpen && portalTarget && ReactDOM.createPortal(
                      <div
                        ref={morePopoverRef}
                        className="fixed w-64 rounded-lg overflow-hidden bg-white dark:bg-[#0b111f] shadow-lg border border-gray-100 dark:border-gray-700/50 z-50"
                        style={{
                          top: `${popoverPosition.top}px`,
                          left: `${popoverPosition.left}px`,
                        }}
                      >
                        <div className="space-y-2">
                          <h3 className="text-xs p-2 font-medium text-gray-700 dark:text-gray-300/70 pb-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1.5 uppercase">
                            {tCommon("MORE")} {t("CATEGORIES")}
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 rounded-sm px-1.5 py-0.5">
                              {hiddenCategories.length}
                            </span>
                          </h3>
                          <div className="grid grid-cols-1 p-2 gap-1.5 max-h-64 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 [&::-webkit-scrollbar]:w-1 overflow-x-hidden w-full pr-1 scrollbar scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-theme-primary-500/40 dark:scrollbar-thumb-theme-primary-600/40 scrollbar-thumb-rounded-full -mr-2"
                            style={{ scrollbarWidth: "thin" }}
                          >
                            {hiddenCategories.map((category) => renderCategory(category, undefined, true))}
                          </div>
                        </div>
                      </div>,
                      portalTarget
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the second component as is - FIXED
export function Categories(props: {
  categories: Category[];
  basePath?: string;
  resetPath?: string;
  enableSticky?: boolean;
  maxVisibleTags?: number;
}) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (props.enableSticky) {
      const handleScroll = () => {
        const scrollPosition = window.scrollY;
        const scrollThreshold = 250;
        if (scrollPosition > scrollThreshold && !isSticky) {
          setIsSticky(true);
        } else if (scrollPosition <= scrollThreshold && isSticky) {
          setIsSticky(false);
        }
      };

      window.addEventListener("scroll", handleScroll);
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
    return undefined;
  }, [isSticky, props.enableSticky]);

  const MAX_VISIBLE_CATEGORIES = props.maxVisibleTags || 8;
  const hasMoreTags = props.categories.length > MAX_VISIBLE_CATEGORIES;

  const renderCategory = useCallback(
    (category: Category, index: number) => {
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
            "px-1.5 py-1 h-8 font-medium transition-all duration-200",
            isActive
              ? "bg-theme-primary text-white border-theme-primary shadow-xs"
              : "border border-dark--theme-200 dark:border-dark--theme-800",
            "hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800",
            !showAllCategories && "shrink-0"
          )}
        >
          {isActive && (
            <svg
              className="w-3 h-3 mr-1.5 text-white"
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
          <span
            className={cn(
              "text-sm font-medium transition-all duration-300",
              isActive
                ? "text-white tracking-wide"
                : "text-gray-700 dark:text-gray-300 group-hover:text-theme-primary dark:group-hover:text-theme-primary capitalize"
            )}
          >
            {category.name}
          </span>
          {category.count && (
            <span
              className={cn(
                "ml-1.5 text-xs font-normal",
                isActive ? "text-white" : "text-dark-500 dark:text-dark-400"
              )}
            >
              ({category.count})
            </span>
          )}
        </Button>
      );
    },
    [props.basePath, pathname, showAllCategories]
  );

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
        "p-4 transition-all duration-300",
        props.enableSticky
          ? cn(
            "sticky top-4 z-10",
            isSticky
              ? "bg-white/95 dark:bg-gray-800/95 shadow-md backdrop-blur-xs"
              : "bg-transparent"
          )
          : "bg-inherit"
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3
            className={cn(
              "text-lg font-bold transition-colors duration-300",
              isSticky
                ? "text-theme-primary dark:text-theme-primary"
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
                "px-4 py-1 font-medium transition-all duration-300  text-theme-primary bg-theme-primary-10 hover:to-theme-primary",
                isSticky && "shadow-xs"
              )}
              onPress={() => setShowAllCategories(!showAllCategories)}
            >
              {showAllCategories ? (
                <>
                  <span className="hidden sm:inline">Show as single row</span>
                  <span className="sm:hidden">Single row</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="ml-1.5 transition-transform group-hover:-translate-y-0.5 dark:text-default-300"
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
                  <span className="sm:hidden">All categories</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="ml-1.5 transition-transform group-hover:translate-y-0.5 dark:text-default-300"
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
            <div className="w-full flex flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-500/30 dark:scrollbar-thumb-blue-700/30 scrollbar-track-transparent -mr-2">
              <Button
                variant={!isAnyTagActive ? "solid" : "bordered"}
                radius="full"
                size="sm"
                as={Link}
                prefetch={false}
                href={props.resetPath || props.basePath || "/"}
                className={cn(
                  "px-3 py-1 h-8 font-medium transition-all duration-300 shrink-0 group",
                  !isAnyTagActive
                    ? "bg-theme-primary text-white border-theme-primary-500 shadow-xs"
                    : "border border-dark--theme-200 dark:border-dark--theme-800",
                  "hover:shadow-md hover:border-theme-primary dark:hover:border-theme-primary"
                )}
              >
                {!isAnyTagActive && (
                  <svg
                    className="w-3 h-3 mr-1.5 text-white"
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
                <span>All Categories</span>
                <span
                  className={cn(
                    "ml-1.5 text-xs font-normal",
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
            <div className="w-full flex flex-wrap gap-2">
              <Button
                variant={!isAnyTagActive ? "solid" : "bordered"}
                radius="full"
                size="sm"
                as={Link}
                prefetch={false}
                href={props.resetPath || props.basePath || "/"}
                className={cn(
                  "px-3 py-1 h-8 font-medium transition-all duration-200",
                  !isAnyTagActive
                    ? "bg-theme-primary text-white border-theme-primary shadow-xs"
                    : "border border-dark--theme-200 dark:border-dark--theme-800",
                  "hover:shadow-md hover:border-theme-primary dark:hover:border-theme-primary"
                )}
              >
                {!isAnyTagActive && (
                  <svg
                    className="w-3 h-3 mr-1.5 text-white"
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
                <span>All Categories</span>
                <span
                  className={cn(
                    "ml-1.5 text-xs font-normal",
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
