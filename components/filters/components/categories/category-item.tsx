import React from "react";
import { Button, cn } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CategoryItemProps } from "../../types";
import { truncateText, isTextTruncated as checkTextTruncated, formatDisplayName } from "../../utils/text-utils";
import { FILTER_CONSTANTS } from "../../constants";
import { useContainerWidth } from "@/components/ui/container";

/**
 * Individual category item component
 */
export function CategoryItem({ 
  category, 
  isActive, 
  href, 
  isAllCategories = false,
  totalItems,
  mode = "navigation",
  onToggle
}: CategoryItemProps) {
  const t = useTranslations("listing");
  const containerWidth = useContainerWidth();
  const isFluid = containerWidth === "fluid";
  const formattedName = formatDisplayName(category.name);
  // In fluid mode, use longer truncation (35 chars) to show more text
  const displayName = isFluid ? truncateText(formattedName, 35) : truncateText(formattedName);
  const textIsTruncated = isFluid ? checkTextTruncated(formattedName, 35) : checkTextTruncated(formattedName);

  const handleClick = (e: React.MouseEvent) => {
    if (mode === "filter") {
      e.preventDefault();
      if (onToggle) {
        onToggle(category.id);
      } else {
        console.warn("CategoryItem: onToggle is required when mode is 'filter'");
      }
    }
  };

  // Custom tooltip state (like view-toggle)
  const [hovered, setHovered] = React.useState(false);
  const tooltipTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Show tooltip for 4 seconds on hover/focus
  const showTooltip = () => {
    setHovered(true);
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    tooltipTimeout.current = setTimeout(() => setHovered(false), 3000);
  };
  const hideTooltip = () => {
    setHovered(false);
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
  };

  return (
    <div className="relative w-full overflow-visible">
      <Button
        className={cn(
          "font-medium text-left justify-start items-center transition-all duration-300 mb-1 h-10 px-3 w-full",
          "hover:transform-none active:transform-none",
          "group relative",
          {
            "bg-theme-primary-500 text-white hover:bg-theme-primary-600 dark:hover:bg-theme-primary-600 active:bg-theme-primary-700": isActive,
            "bg-transparent text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700": !isActive,
          }
        )}
        radius="md"
        variant="light"
        as={mode === "filter" ? "button" : Link}
        href={mode === "filter" ? undefined : href}
        onClick={mode === "filter" ? handleClick : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        fullWidth
        aria-label={
          isAllCategories 
            ? `${t("ALL_CATEGORIES")}, ${t("ALL_CATEGORIES_DESCRIPTION", { defaultValue: "View all categories" })}`
            : `${formattedName}, ${category.count ?? 0} ${t("items", { count: category.count ?? 0, defaultValue: "items" })}`
        }
      >
        <div className="flex items-center justify-between w-full">
          <span
            className={cn(
              "font-medium truncate pr-2 transition-colors duration-300",
              isActive 
                ? "text-white" 
                : "text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white"
            )}
          >
            {isAllCategories ? t("ALL_CATEGORIES") : displayName}
          </span>
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-300 shrink-0 z-20",
              "group-hover:scale-105 group-hover:shadow-sm",
              isActive
                ? "bg-white/20 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            )}
            aria-label={`${isAllCategories ? (totalItems ?? 0) : (category.count ?? 0)} ${t("items", { count: isAllCategories ? (totalItems ?? 0) : (category.count ?? 0), defaultValue: "items" })}`}
          >
            {isAllCategories ? totalItems : category.count}
          </span>
        </div>
      </Button>
        {(hovered && textIsTruncated) && (
        <div
          className={cn(
            "absolute left-1/2 top-full font-light -translate-x-1/2 mt-1 min-w-40 z-50 px-1.5 py-1 rounded-lg shadow-xl text-[12px] border pointer-events-none",
            isActive
              ? "bg-theme-primary-600 text-white border-theme-primary-700"
              : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
          )}
          style={{ whiteSpace: 'pre-line' }}
        >
            <div className="flex flex-col gap-1">
              <div className="font-semibold">{formattedName}</div>
            </div>
        </div>
      )}
    </div>
  );
}