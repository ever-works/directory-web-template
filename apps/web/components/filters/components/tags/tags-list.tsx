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
  "dark:from-[rgba(10,10,10,1)] dark:via-[rgba(10,10,10,0.8)]",
  "transition-opacity duration-300"
);

const SCROLL_FADE_RIGHT = clsx(
  "pointer-events-none z-5",
  "transition-opacity duration-300"
);

// Sticky left styles for "All Tags" button (similar to home-two-categories)
const STICKY_LEFT_STYLES = clsx(
  "sticky left-0 shrink-0 z-10 pr-0",
  "rounded-r-full",
);

// Navigation button styles for scroll buttons
const NAV_BUTTON_STYLES = clsx(
  "h-8 w-8 rounded-full bg-white dark:bg-[#161616] flex items-center justify-center",
  "border border-gray-200 dark:border-white/6 shadow-md hover:shadow-lg",
  "hover:bg-gray-50 dark:hover:bg-[#161616] transition-[background-color,box-shadow] duration-200",
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
  const _t = useTranslations("listing");
  const tCommon = useTranslations("common");
  const leftButtonRef = useRef<HTMLButtonElement>(null);
  const rightButtonRef = useRef<HTMLButtonElement>(null);
  
  // State for scroll indicators and hidden tags
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hiddenTags, setHiddenTags] = useState<Tag[]>([]);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Refs for scroll container and tag elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const _tagsRef = useRef<(HTMLDivElement | null)[]>([]);
  const morePopoverRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const rafId = useRef<number | null>(null);
  const portalTarget = usePortal('tag-popover-portal');
  const itemWidthsRef = useRef<number[]>([]);

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
    let _startIndex = 0;
    let endIndex = children.length - 1;

    // Calculate start index
    for (let i = 0; i < itemWidthsRef.current.length; i++) {
      totalWidth += itemWidthsRef.current[i];
      if (totalWidth > container.scrollLeft) {
        _startIndex = i;
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
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        measureTags();
        rafId = null;
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

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
      if (rafId !== null) cancelAnimationFrame(rafId);
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
            top: rect.bottom + 8, // 8px gap below trigger (viewport relative for fixed positioning)
            left: rect.right - 208, // 208px = w-52, align popover right edge with trigger right edge (viewport relative)
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

  // Keep popover hidden until we compute a position to avoid flashing at 0,0
  useEffect(() => {
    if (!isMorePopoverOpen) {
      setPopoverPosition(null);
    }
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
              "px-2 py-1 h-8 font-medium transition-all duration-200 shrink-0 overflow-hidden whitespace-nowrap",
              isActive
                ? "bg-[#0a0a0a] text-white/90 border !border-[#0a0a0a] dark:bg-white/20 dark:border-white/40"
                : "bg-white dark:bg-white/4 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/8 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-900 dark:group-hover:text-white hover:border-gray-300 dark:hover:border-white/[0.15]",
              inPopover ? "w-full justify-between" : "min-w-0 max-w-[140px]"
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
              "text-xs font-medium transition-all duration-300 truncate",
              isActive
                ? "text-white tracking-wide"
                : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
            )}
            data-tag-label
          >
            {formatDisplayName(tag.name)}
          </span>
          {typeof tag.count === 'number' && (
            <span
              className={cn(
                "ml-1 text-[12px] font-normal dark:bg-white/20 bg-dark-500 text-white py-0.5 px-1.5 rounded-full",
                isActive ? "bg-white/20 text-white dark:text-white/70 px-1" 
                : "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-white/1 group-hover:text-gray-900 dark:group-hover:text-white"
              )}
            >
              {tag.count}
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
          <div
            className={cn(SCROLL_FADE_LEFT, canScrollLeft ? "opacity-100" : "opacity-0")}
            aria-hidden="true"
          />
          <div
            className={cn(SCROLL_FADE_RIGHT, canScrollRight ? "opacity-100" : "opacity-0")}
            aria-hidden="true"
          />
          
        <div 
            ref={scrollContainerRef}
            className={SCROLL_CONTAINER_STYLES}
            role="region"
            aria-label={tCommon("TAGS_FILTER")}
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
                        "px-3 py-1 h-8 ro font-medium transition-all duration-300 shrink-0 group capitalize focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
                        isAllTagsActive && "bg-[#0a0a0a] text-white border border-[#0a0a0a] dark:bg-white dark:text-[#0a0a0a] dark:border-white",
                        !isAllTagsActive && "bg-gray-100 dark:bg-[#161616] text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-white/1 group-hover:text-gray-900 dark:group-hover:text-white"
                      )
                    )}
                    onClick={() => setSelectedTags([])}
                  >
                  {isAllTagsActive && (
                    <svg
                      className="w-3 h-3 mr-1.5 text-white dark:text-gray-600"
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
                  <span className="whitespace-nowrap">{tCommon("ALL_TAGS")}</span>
                  <span
                    className={cn(
                      "ml-1 text-[12px] font-normal dark:bg-white/20 bg-dark-500 text-white py-0.5 px-1.5 rounded-full",
                      isAllTagsActive
                        ? "bg-gray-400 text-white dark:text-[rgba(10,10,10,0.7)]"
                        : "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-white/1 group-hover:text-gray-900 dark:group-hover:text-white"
                    )}
                  >
                    {allItemsCount ?? tags.length}
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
                      isAllTagsActive && "bg-[#0a0a0a] text-white border border-[#0a0a0a] dark:bg-white dark:text-[#0a0a0a] dark:border-white"
                    )
                  )}
                >
                  {isAllTagsActive && (
                    <svg
                      className="w-3 h-3 mr-1.5 text-white dark:text-gray-600"
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
                  <span className="whitespace-nowrap">{tCommon("ALL_TAGS")}</span>
                  <span
                    className={cn(
                      "ml-1 text-[12px] font-normal dark:bg-white/20 bg-dark-500 text-white py-0.5 px-1.5 rounded-full",
                      isAllTagsActive
                        ? "bg-gray-400 text-white dark:text-[#0a0a0a]"
                        : "bg-gray-100 dark:bg-[#161616] text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-white/1 group-hover:text-gray-900 dark:group-hover:text-white"
                    )}
                  >
                    {allItemsCount ?? tags.length}
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
              <div className="sticky right-0 shrink-0 pl-0 flex items-center gap-1 bg-white dark:bg-[#0a0a0a] rounded-l-full">
                <ScrollButton
                  ref={rightButtonRef}
                  direction="right"
                  onClick={scrollRight}
                  disabled={!canScrollRight && hiddenTags.length === 0}
                  visible={(canScrollRight || hiddenTags.length > 0) && !showAllTags}
                />
                <Button
                  ref={triggerButtonRef}
                  className="h-8 py-2 px-3 text-xs flex items-center gap-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/6 shadow-xs hover:shadow-sm transition-all rounded-full focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                  onClick={() => setIsMorePopoverOpen(!isMorePopoverOpen)}
                  onPress={() => setIsMorePopoverOpen(!isMorePopoverOpen)}
                  aria-label={tCommon("SHOW_MORE", { count: hiddenTags.length })}
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
          {popoverPosition && isMorePopoverOpen && hiddenTags.length > 0 && (portalTarget || (typeof document !== 'undefined' ? document.body : null)) && ReactDOM.createPortal(
            <div
              ref={morePopoverRef}
              className="fixed w-52 p-2 rounded-lg bg-white dark:bg-[#0a0a0a] shadow-lg border border-gray-100 dark:border-white/6 z-50"
              style={{
                top: `${popoverPosition!.top}px`,
                left: `${popoverPosition!.left}px`,
              }}
            >
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 pb-1.5 border-b border-gray-100 dark:border-white/6 flex items-center gap-1.5 uppercase">
                  {tCommon("MORE")} {tCommon("TAG")}
                  <span className="text-xs bg-gray-100 dark:bg-white/8 rounded-sm px-1.5 py-0.5">
                    {hiddenTags.length}
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-1.5 max-h-64 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 [&::-webkit-scrollbar]:w-1 overflow-x-hidden w-full pr-1 scrollbar scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-theme-primary-500/40 dark:scrollbar-thumb-theme-primary-600/40 scrollbar-thumb-rounded-full"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {hiddenTags.map((tag, idx) => renderTag(tag, idx, true))}
                </div>
              </div>
            </div>,
            (portalTarget || (typeof document !== 'undefined' ? document.body : null)) as Element
          )}
        </div>
      )}

      {showAllTags && (
        <div className="w-full flex flex-wrap gap-2 max-h-[85dvh] overflow-y-auto  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1"
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
                  isAllTagsActive && "bg-[#0a0a0a] text-white border border-[#0a0a0a] dark:bg-white dark:text-[#0a0a0a] dark:border-white"
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
              <span>{tCommon("ALL_TAGS")}</span>
              <span
                className={cn(
                  "ml-1.5 text-xs font-normal",
                  isAllTagsActive
                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-[#0a0a0a] px-1 rounded-md"
                    : "text-gray-700 dark:text-gray-300"
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
                  isAllTagsActive && "bg-[#0a0a0a] text-white border border-[#0a0a0a] dark:bg-white dark:text-[#0a0a0a] dark:border-white"
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
              <span>{tCommon("ALL_TAGS")}</span>
              <span
                className={cn(
                  "ml-1.5 text-xs font-normal",
                  isAllTagsActive
                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-[#0a0a0a] px-1 rounded-md"
                    : "text-gray-700 dark:text-gray-300"
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
