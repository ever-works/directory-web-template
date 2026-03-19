"use client";

import { useState, useMemo, useCallback, useRef, useId, useEffect } from "react";
import { Tag } from "@/lib/content";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, Tag as TagIcon, X } from "lucide-react";
import { cn } from "@/lib/utils/index";
import { useTagsEnabled } from "@/hooks/use-tags-enabled";

type HomeTwoTagsSelectorProps = {
  tags: Tag[];
  selectedTags?: string[];
  onTagToggle?: (tagId: string) => void;
};

type TagButtonProps = {
  tag: Tag;
  isActive: boolean;
  onPress: () => void;
};

const MAX_TAG_NAME_LENGTH = 20;
const TRUNCATE_SUFFIX = "...";

const truncateText = (text: string): string => {
  if (!text || text.length <= MAX_TAG_NAME_LENGTH) return text;
  return `${text.substring(0, MAX_TAG_NAME_LENGTH)}${TRUNCATE_SUFFIX}`;
};

const TagButton = ({ tag, isActive, onPress }: TagButtonProps) => {
  const displayName = truncateText(tag.name);
  const isTextTruncated = tag.name.length > MAX_TAG_NAME_LENGTH;

  return (
    <Button
      onPress={onPress}
      className={cn(
        "group w-full !px-1 h-7 font-medium text-left transition-all duration-200",
        {
          "bg-theme-primary-500 dark:bg-theme-primary-600 text-white border border-theme-primary-600 dark:border-theme-primary-600":
            isActive,
          "bg-theme-primary-50 text-theme-primary-700 dark:bg-theme-primary-900/20 dark:text-theme-primary-300 hover:bg-theme-primary-100 hover:border-theme-primary-200 dark:hover:border-theme-primary-600 border border-theme-primary-200 dark:border-theme-primary-700/30":
            !isActive,
        }
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {isActive && (
            <svg
              className="w-3 h-3 text-white"
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
              "text-xs pl-1 transition-colors truncate pr-2 capitalize",
              isActive
                ? "text-white"
                : "text-gray-700 dark:text-gray-300 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400"
            )}
            title={isTextTruncated ? tag.name : undefined}
          >
            {displayName}
          </span>
        </div>
        {tag.count && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-md transition-colors",
              isActive
                ? "bg-white/20 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-theme-primary-50 dark:group-hover:bg-theme-primary-900/30 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400"
            )}
          >
            {tag.count}
          </span>
        )}
      </div>
    </Button>
  );
};

export const HomeTwoTagsSelector = ({
  tags,
  selectedTags = [],
  onTagToggle
}: HomeTwoTagsSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const t = useTranslations();
  const { tagsEnabled } = useTagsEnabled();

  const filteredTags = useMemo(() => {
    if (!searchTerm) return tags;
    const searchLower = searchTerm.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(searchLower));
  }, [tags, searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  // Manual outside click and escape key handling with deferred listeners
  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Critical: Defer listener attachment to next tick
      // This prevents the opening click from triggering the outside click handler
      const timeoutId = setTimeout(() => {
        document.addEventListener('pointerdown', handlePointerDownOutside, { capture: true });
        document.addEventListener('keydown', handleKeyDown);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('pointerdown', handlePointerDownOutside, { capture: true });
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  // Hide if tags are disabled or if tags array is empty
  if (!tagsEnabled || !tags || tags.length === 0) {
    return null;
  }

  const selectedTagsCount = selectedTags.length;

  return (
    <div className="flex flex-col gap-2 relative" ref={popoverRef}>
      <Button
        disableRipple
        onPress={() => setIsOpen(!isOpen)}
        className={cn(
          "bg-gray-100 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-lg px-2 sm:px-3 h-8 sm:h-9 text-xs sm:text-sm text-gray-700 dark:text-gray-300 transition-colors duration-300",
          "group flex items-center gap-1 sm:gap-2 min-w-[80px] sm:min-w-[100px]"
        )}
        radius="sm"
        variant="light"
        aria-label="Select tags"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        <TagIcon className="w-3 h-3 sm:w-4 sm:h-4 transition-transform" />
        <span className="text-xs sm:text-sm font-normal capitalize truncate max-w-[60px] sm:max-w-[100px]">
          {t("listing.TAGS")}
        </span>
        {selectedTagsCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({selectedTagsCount})
          </span>
        )}
        <ChevronDown className={cn(
          "h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-500 dark:text-gray-400 transition-all duration-300",
          isOpen && "rotate-180"
        )} />
      </Button>

      {isOpen && (
        <div
          id={panelId}
          className={cn(
            "absolute top-full mt-2 left-0 z-50",
            "p-0 max-h-[300px] sm:max-h-[400px] w-[300px] sm:w-56",
            "bg-white dark:bg-[#0b111f] border border-gray-200 dark:border-gray-700/50",
            "rounded-lg shadow-2xl overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          <div className="p-3 sm:p-3 space-y-2 sm:space-y-2">
            {/* Search Bar */}
            <div className="relative group w-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                <Search
                  className={
                    "h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 " +
                    "group-focus-within:text-theme-primary-500 dark:group-focus-within:text-theme-primary-400 " +
                    "transition-colors"
                  }
                />
              </div>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("listing.SEARCH")}
                className={
                  "w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1 sm:py-1.5 bg-gray-50 dark:bg-gray-800/40 " +
                  "border border-gray-200 dark:border-gray-700/50 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white " +
                  "placeholder-gray-500 dark:placeholder-gray-400 focus:outline-hidden focus:border focus:border-theme-primary-500 " +
                  "dark:focus:border-theme-primary-400 transition-all duration-200"
                }
              />

              {searchTerm && (
                <Button
                  onPress={clearSearch}
                  className={
                    "absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center justify-center h-full text-gray-400 " +
                    "hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-transparent"
                  }
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>

            {/* Tags List */}
            <div
              className="max-h-[200px] sm:max-h-[250px] overflow-y-auto overflow-x-hidden -mr-2 pr-2 space-y-1.5 sm:space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent [&::-webkit-scrollbar]:w-2"
              style={{ scrollbarWidth: "thin" }}
            >
              {filteredTags.map((tag, index) => {
                const isActive = selectedTags.includes(tag.id);
                return (
                  <TagButton
                    key={`${tag.id}-${index}`}
                    tag={tag}
                    isActive={isActive}
                    onPress={() => onTagToggle?.(tag.id)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
