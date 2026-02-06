import { Button, cn } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import { Tag } from "@/lib/content";
import { TagItem } from "./tag-item";
import { getButtonVariantStyles } from "../../utils/style-utils";
import { expandVisibleTagsWithSelected, orderTagsWithSelectedFirst } from "../../utils/tag-utils";
import { formatDisplayName } from "../../utils/text-utils";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { usePortal } from "@/hooks/use-portal";
import { useTranslations } from "next-intl";
import clsx from "clsx";

// Style constants for scroll container (similar to home-two-categories)
const SCROLL_CONTAINER_STYLES = clsx(
  "relative flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth",
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
);

const SCROLL_FADE_LEFT = clsx(
  "absolute left-0 top-0 bottom-2 w-12 pointer-events-none z-5",
  "dark:from-gray-900 dark:via-gray-900/80",
  "opacity-0 transition-opacity duration-300"
);

const SCROLL_FADE_RIGHT = clsx(
  "pointer-events-none z-5",
);

// Sticky left styles for "All Tags" button (similar to home-two-categories)
const STICKY_LEFT_STYLES = clsx(
  "sticky left-0 shrink-0 z-10 pr-0",
  "backdrop-blur-sm rounded-r-full",
);

// Navigation button styles for scroll buttons
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

// Scroll Button Component
const ScrollButton = React.memo(React.forwardRef<HTMLButtonElement, {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
  visible: boolean;
}>(({ direction, onClick, disabled, visible }, ref) => {
  if (disabled || !visible) {
    return null;
  }
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        NAV_BUTTON_STYLES,
        "transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
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

interface TagsListProps {
  tags: Tag[];
  basePath?: string;
  resetPath?: string;
  showAllTags: boolean;
  visibleTags: Tag[];
  isAnyTagActive: boolean;
  selectedTags?: string[];
  setSelectedTags?: (tags: string[]) => void;
  allItemsCount?: number;
}

/**
 * Tags list component
 * Renders a list of tag items with "All Tags" option
 * Features scroll fade indicators and "+N more" popover for hidden tags
 */
export function TagsList({
  tags,
  basePath,
  resetPath,
  showAllTags,
  visibleTags,
  isAnyTagActive,
  selectedTags = [],
  setSelectedTags,
  allItemsCount,
}: TagsListProps) {
  const t = useTranslations("listing");
  const tCommon = useTranslations("common");
  const leftButtonRef = useRef<HTMLButtonElement>(null);
  const rightButtonRef = useRef<HTMLButtonElement>(null);
  
  // State for scroll indicators and hidden tags
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hiddenTags, setHiddenTags] = useState<Tag[]>([]);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  
  // Refs for scroll container and tag elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<(HTMLDivElement | null)[]>([]);
  const morePopoverRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const rafId = useRef<number | null>(null);
  const portalTarget = usePortal('tag-popover-portal');
  const itemWidthsRef = useRef<number[]>([]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // Tooltip state for truncated tag names (similar to CategoryItem)
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipTextIsTruncated, setTooltipTextIsTruncated] = useState(false);
  
  // 'All Tags' is active when no tags are selected
  const isAllTagsActive = setSelectedTags ? selectedTags.length === 0 : !isAnyTagActive;

  // Handle tag click for filter mode
  const handleTagClick = useCallback((tagId: string) => {
    if (!setSelectedTags) return;
    // If All Tags is active, selecting any tag should only select that tag
    if (selectedTags.length === 0) {
      setSelectedTags([tagId]);
      return;
    }
    if (selectedTags.includes(tagId)) {
      // Remove tag from selection
      const newTags = selectedTags.filter((id) => id !== tagId);
      setSelectedTags(newTags);
    } else {
      // Add tag to selection
      setSelectedTags([...selectedTags, tagId]);
    }
  }, [setSelectedTags, selectedTags]);

  // Scroll functions for left/right navigation buttons
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.5; // half viewport per click
    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.5; // half viewport per click
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  // Wheel scrolling for horizontal scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || showAllTags) return;

    const onWheel = (e: WheelEvent) => {
      // Only apply horizontal scroll for vertical wheel
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault(); // Stop vertical scrolling
        container.scrollBy({
          left: e.deltaY * 1.5, // boost speed a bit for faster feel
          behavior: 'smooth', // smooth scrolling
        });
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => container.removeEventListener('wheel', onWheel);
  }, [showAllTags]);

  // In filter mode, ensure all selected tags are visible and order them properly
  // Memoize to prevent infinite re-renders
  const orderedVisibleTags = useMemo(() => {
    if (setSelectedTags) {
      const expandedVisibleTags = expandVisibleTagsWithSelected(visibleTags, tags, selectedTags);
      return orderTagsWithSelectedFirst(expandedVisibleTags, selectedTags);
    }
    return visibleTags;
  }, [visibleTags, tags, selectedTags, setSelectedTags]);

  // Measure tags dynamically - similar to categories
  const measureTags = useCallback(() => {
    if (!scrollContainerRef.current || showAllTags) return;
    const container = scrollContainerRef.current;
    const children = Array.from(
      container.querySelector('[data-tags-wrapper]')?.children || []
    ) as HTMLElement[];
    if (!children.length) return;
    
    // Measure widths including computed margin-right for accurate gap spacing
    itemWidthsRef.current = children.map((child) => {
      const style = getComputedStyle(child);
      const marginRight = parseFloat(style.marginRight || '0');
      return child.offsetWidth + marginRight;
    });
    
    let totalWidth = 0;
    let startIndex = 0;
    let endIndex = children.length - 1;
    
    // Calculate start index
    for (let i = 0; i < itemWidthsRef.current.length; i++) {
      totalWidth += itemWidthsRef.current[i];
      if (totalWidth > container.scrollLeft) {
        startIndex = i;
        break;
      }
    }
    
    // Calculate end index more precisely
    let totalOffset = 0;
    endIndex = children.length - 1; // default to last
    for (let i = 0; i < itemWidthsRef.current.length; i++) {
      totalOffset += itemWidthsRef.current[i];
      if (totalOffset > container.scrollLeft + container.clientWidth - 1) {
        endIndex = i - 1 >= 0 ? i - 1 : 0;
        break;
      }
    }

    setVisibleRange({ start: startIndex, end: endIndex });
    
    // Calculate hidden tags based on visible range
    const hidden: Tag[] = [];
    for (let i = endIndex + 1; i < orderedVisibleTags.length; i++) {
      hidden.push(orderedVisibleTags[i]);
    }
    setHiddenTags(hidden);

    setCanScrollLeft(container.scrollLeft > 5);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 5);
  }, [scrollContainerRef, showAllTags, orderedVisibleTags]);

  // Initialize and update measurements with delayed initial measurement
  useEffect(() => {
    if (!scrollContainerRef.current || showAllTags) return;

    const container = scrollContainerRef.current;
    const handleScroll = () => measureTags();

    container.addEventListener("scroll", handleScroll);

    const resizeObserver = new ResizeObserver(measureTags);
    resizeObserver.observe(container);

    // Delay initial measurement to allow layout/fonts/images to settle
    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(measureTags);
    }, 100);
    
    // Also measure on window load for late-loading assets
    window.addEventListener('load', measureTags);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
      window.removeEventListener('load', measureTags);
    };
  }, [scrollContainerRef, measureTags, showAllTags]);

  // Reset hidden tags when toggling between collapsed/expanded views
  useEffect(() => {
    setHiddenTags([]);
    setCanScrollLeft(false);
    setCanScrollRight(false);
  }, [showAllTags]);

  // Handle click outside to close popover with deferred listener pattern
  // This prevents the opening click from triggering the close handler
  useEffect(() => {
    if (!isMorePopoverOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (
        morePopoverRef.current &&
        !morePopoverRef.current.contains(event.target as Node) &&
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(event.target as Node)
      ) {
        setIsMorePopoverOpen(false);
      }
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

  // Calculate popover position when opened and on scroll/resize
  useEffect(() => {
    if (!isMorePopoverOpen || !triggerButtonRef.current) return;

    const updatePosition = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        if (triggerButtonRef.current) {
          const rect = triggerButtonRef.current.getBoundingClientRect();
          setPopoverPosition({
            top: rect.bottom + 8,
            left: Math.max(8, rect.right - 256), // 256px = w-64, ensure it doesn't go off-screen
          });
        }
      });
    };

    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isMorePopoverOpen]);

  // Render a single tag (button for filter, link for navigation)
  const renderTag = useCallback((tag: Tag, index: number, inPopover = false) => {
    const tagBasePath = basePath
      ? `${basePath}/${tag.id}`
      : `/tags/${tag.id}`;

    const isActive = setSelectedTags
      ? selectedTags.includes(tag.id)
      : false;

    if (setSelectedTags) {
      const formattedName = formatDisplayName(tag.name)
      const showTooltip = (btn: HTMLElement | null) => {
        if (!inPopover && btn) {
          const textEl = btn.querySelector('[data-tag-label]') as HTMLElement | null;
          const isTruncated = textEl ? textEl.scrollWidth > textEl.clientWidth + 1 : false;
          if (isTruncated) {
            const r = btn.getBoundingClientRect();
            setTooltipPos({ top: r.top - 8, left: r.left + r.width / 2 });
            setTooltipText(formattedName);
            setTooltipTextIsTruncated(true);
            setTooltipVisible(true);
          }
        }
      };
      
      const hideTooltip = () => {
        setTooltipVisible(false);
      };
      
      // Filter mode (multi-select)
      return (
        <Button
          key={tag.id || index}
          variant={isActive ? "solid" : "bordered"}
          radius="full"
          size="sm"
          className={getButtonVariantStyles(
            isActive,
            cn(
              "px-1.5 py-1 h-8 font-medium transition-all duration-200 shrink-0 overflow-hidden whitespace-nowrap",
              inPopover ? "w-full justify-start" : "min-w-0 max-w-[140px]"
            )
          )}
          onClick={() => {
            handleTagClick(tag.id);
            if (inPopover) setIsMorePopoverOpen(false);
          }}
          onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLElement)}
          onMouseLeave={hideTooltip}
          onFocus={(e) => showTooltip(e.currentTarget as HTMLElement)}
          onBlur={hideTooltip}
        >
          {isActive && (
            <svg
              className="w-3 h-3 mr-1.5 text-white shrink-0"
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
          {tag.icon_url && (
            <Image
              src={tag.icon_url}
              width={16}
              height={16}
              className={cn(
                "w-4 h-4 mr-1.5 transition-transform shrink-0",
                isActive ? "brightness-200" : ""
              )}
              alt={tag.name}
            />
          )}
          <span
            className={cn(
              "text-sm font-medium transition-all duration-300 truncate",
              isActive
                ? "text-white tracking-wide"
                : "text-gray-700 dark:text-gray-300 group-hover:text-theme-primary dark:group-hover:text-theme-primary"
            )}
            data-tag-label
          >
            {formatDisplayName(tag.name)}
          </span>
          {typeof tag.count === 'number' && (
            <span
              className={cn(
                "ml-1.5 text-xs font-normal shrink-0",
                isActive ? "text-white" : "text-dark-500 dark:text-dark-400"
              )}
            >
              ({tag.count})
            </span>
          )}
        </Button>
      );
    }

    // Navigation mode (single select, highlight if selected)
    return (
      <TagItem
        key={tag.id || index}
        tag={tag}
        isActive={isActive}
        href={tagBasePath}
        showCount={true}
      />
    );
  }, [basePath, setSelectedTags, selectedTags, handleTagClick]);

  return (
    <div className="relative ">
      {!showAllTags && (
        <div className="relative">
          {/* Scroll fade indicators */}
          {canScrollLeft && (
            <div
              className={SCROLL_FADE_LEFT}
              style={{ opacity: 1 }}
              aria-hidden="true"
            />
          )}
          {canScrollRight && (
            <div
              className={SCROLL_FADE_RIGHT}
              style={{ opacity: 1 }}
              aria-hidden="true"
            />
          )}
          
          <div 
            ref={scrollContainerRef}
            className={SCROLL_CONTAINER_STYLES}
            role="region"
            aria-label="Tags filter"
          >
            {/* Tags wrapper with data attribute for measurement */}
            <div data-tags-wrapper className="flex items-center gap-2">
              {/* Left Navigation Button + All Tags Button - Sticky */}
              <div className={cn(STICKY_LEFT_STYLES, "flex items-center gap-1")}> 
                {/* All Tags Button */}
                {setSelectedTags ? (
                  <Button
                    variant={isAllTagsActive ? "solid" : "bordered"}
                    radius="full"
                    size="sm"
                    className={getButtonVariantStyles(
                      isAllTagsActive,
                      cn(
                        "px-3 py-1 h-8 font-medium transition-all duration-300 shrink-0 group capitalize focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 dark:bg-[#182131] bg-white",
                        isAllTagsActive && "bg-theme-primary-500! text-white! border-theme-primary-500!"
                      )
                    )}
                    onClick={() => setSelectedTags([])}
                  >
                  {isAllTagsActive && (
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
                  <span className="whitespace-nowrap">All Tags</span>
                  <span
                    className={cn(
                      "ml-1.5 text-xs font-normal",
                      isAllTagsActive
                        ? "text-white"
                        : "text-dark-500 dark:text-dark-400"
                    )}
                  >
                    ({allItemsCount ?? tags.length})
                  </span>
                </Button>
              ) : (
                <Button
                  variant={isAllTagsActive ? "solid" : "bordered"}
                  radius="full"
                  size="sm"
                  as={Link}
                  prefetch={false}
                  href={resetPath || basePath || "/"}
                  className={getButtonVariantStyles(
                    isAllTagsActive,
                    cn(
                      "px-3 py-1 h-8 font-medium transition-all duration-300 shrink-0 group capitalize focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
                      isAllTagsActive && "bg-theme-primary-500! text-white! border-theme-primary-500!"
                    )
                  )}
                >
                  {isAllTagsActive && (
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
                  <span className="whitespace-nowrap">All Tags</span>
                  <span
                    className={cn(
                      "ml-1.5 text-xs font-normal",
                      isAllTagsActive
                        ? "text-white"
                        : "text-dark-500 dark:text-dark-400"
                    )}
                  >
                    ({allItemsCount ?? tags.length})
                  </span>
                </Button>
              )}
              <ScrollButton
                  ref={leftButtonRef}
                  direction="left"
                  onClick={scrollLeft}
                  disabled={!canScrollLeft}
                  visible={canScrollLeft && !showAllTags}
                />
              </div>
            
            {/* Tag buttons */}
            {orderedVisibleTags.map((tag, idx) => (
              <div 
                key={tag.id || idx} 
                className="shrink-0"
              >
                {renderTag(tag, idx)}
              </div>
            ))}
            
            {/* "+N more" button with Right Navigation Button */}
            {hiddenTags.length > 0 && (
              <div className="sticky right-0 shrink-0 pl-0 flex items-center gap-1 bg-white/10 dark:bg-[#172030]/10 backdrop-blur-sm rounded-l-full">
                <ScrollButton
                  ref={rightButtonRef}
                  direction="right"
                  onClick={scrollRight}
                  disabled={!canScrollRight && hiddenTags.length === 0}
                  visible={(canScrollRight || hiddenTags.length > 0) && !showAllTags}
                />
                <Button
                  ref={triggerButtonRef}
                  className="h-8 py-2 px-3 text-xs flex items-center gap-1.5 bg-theme-primary-500 hover:bg-theme-primary-600 dark:bg-theme-primary-500 dark:hover:bg-theme-primary-600 text-white border border-theme-primary-600 shadow-xs hover:shadow-sm transition-all rounded-full focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                  onPress={() => setIsMorePopoverOpen(!isMorePopoverOpen)}
                  aria-label={`Show ${hiddenTags.length} more ${hiddenTags.length === 1 ? 'tag' : 'tags'}`}
                >
                  <span className="font-medium">
                    +{hiddenTags.length}
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
                    className={cn(
                      "w-3.5 h-3.5 transition-transform",
                      isMorePopoverOpen && "rotate-180"
                    )}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </Button>
              </div>
            )}
            </div>
          </div>
          
          {/* Popover Content - Portal Rendered */}
          {isMorePopoverOpen && hiddenTags.length > 0 && portalTarget && ReactDOM.createPortal(
            <div
              ref={morePopoverRef}
              className="fixed w-64 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 z-50"
              style={{
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
              }}
            >
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 pb-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1.5 uppercase">
                  {tCommon("MORE")} Tags
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 rounded-sm px-1.5 py-0.5">
                    {hiddenTags.length}
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto w-full pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {hiddenTags.map((tag, idx) => renderTag(tag, idx, true))}
                </div>
              </div>
            </div>,
            portalTarget
          )}
        </div>
      )}

      {showAllTags && (
        <div className="w-full flex flex-wrap gap-2 max-h-[110dvh] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 -mr-2 [&::-webkit-scrollbar]:w-1"
        style={{ scrollbarWidth: "thin" }}
        >
          {/* All Tags Button */}
          {setSelectedTags ? (
            <Button
              variant={isAllTagsActive ? "solid" : "bordered"}
              radius="full"
              size="sm"
              className={getButtonVariantStyles(
                isAllTagsActive,
                cn(
                  "px-3 py-1 h-8 font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
                  isAllTagsActive && "bg-theme-primary-500! text-white! border-theme-primary-500!"
                )
              )}
              onClick={() => setSelectedTags([])}
            >
              {isAllTagsActive && (
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
              <span>All Tags</span>
              <span
                className={cn(
                  "ml-1.5 text-xs font-normal",
                  isAllTagsActive
                    ? "text-white"
                    : "text-dark-500 dark:text-dark-400"
                )}
              >
                ({allItemsCount ?? tags.length})
              </span>
            </Button>
          ) : (
            <Button
              variant={isAllTagsActive ? "solid" : "bordered"}
              radius="full"
              size="sm"
              as={Link}
              prefetch={false}
              href={resetPath || basePath || "/"}
              className={getButtonVariantStyles(
                isAllTagsActive,
                cn(
                  "px-3 py-1 h-8 font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
                  isAllTagsActive && "bg-theme-primary-500! text-white! border-theme-primary-500!"
                )
              )}
            >
              {isAllTagsActive && (
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
              <span>All Tags</span>
              <span
                className={cn(
                  "ml-1.5 text-xs font-normal",
                  isAllTagsActive
                    ? "text-white"
                    : "text-dark-500 dark:text-dark-400"
                )}
              >
                ({allItemsCount ?? tags.length})
              </span>
            </Button>
          )}
          {/* All Tags */}
          {orderedVisibleTags.map((tag, idx) => renderTag(tag, idx))}
        </div>
      )}
      {/* Tooltip for truncated tag names (global) */}
      {tooltipVisible && tooltipTextIsTruncated && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          className={cn(
            "fixed min-w-30 z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-light border pointer-events-none",
            "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
          )}
          style={{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translateX(-50%) translateY(-100%)', whiteSpace: 'pre-line' }}
        >
          <div className="flex flex-col gap-1">
            <div className="font-semibold">{tooltipText}</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 