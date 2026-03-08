import React, { useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import { Button, cn } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CategoryItemProps } from "../../types";
import { truncateText, isTextTruncated as checkTextTruncated, formatDisplayName } from "../../utils/text-utils";
import { useContainerWidth } from "@/components/ui/container";

/**
 * Individual category item component
 */
export const CategoryItem = memo(function CategoryItem({ category, isActive, href, isAllCategories = false, totalItems, mode = "navigation", onToggle }: CategoryItemProps) {
  const t = useTranslations("listing");
  const isFluid = useContainerWidth() === "fluid";
  const formattedName = formatDisplayName(category.name);
  const displayName = isFluid ? truncateText(formattedName, 35) : truncateText(formattedName);
  const textIsTruncated = isFluid ? checkTextTruncated(formattedName, 35) : checkTextTruncated(formattedName);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  
  const showTooltip = () => {
    if (textIsTruncated && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 8 });
      setHovered(true);
    }
  };
  const hideTooltip = () => {
    setHovered(false);
  };
  const handleClick = (e: React.MouseEvent) => {
    if (mode === "filter") {
      e.preventDefault();
      onToggle?.(category.id);
    }
  };
  const tooltip = hovered && textIsTruncated && typeof document !== 'undefined'
    ? createPortal(
        <div
          className={cn(
            "fixed min-w-40 z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-light border pointer-events-none",
            isActive
              ? "bg-theme-primary-600 text-white border-theme-primary-700"
              : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
          )}
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)', whiteSpace: 'pre-line' }}
        >
          <div className="flex flex-col gap-1">
            <div className="font-semibold">{formattedName}</div>
          </div>
        </div>, document.body)
    : null;
  return (
    <div className="relative w-full">
      <Button
        ref={btnRef}
        className={cn(
          "font-medium text-left justify-start items-center transition-[color,background-color] duration-200 mb-1 h-10 px-3 w-full",
          "hover:transform-none active:transform-none",
          "group relative",
          isActive
            ? "bg-theme-primary-500! text-white! hover:bg-theme-primary-600! active:bg-theme-primary-700!"
            : "bg-transparent text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700"
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
              "font-medium truncate pr-2 transition-colors duration-200",
              isActive
                ? "text-white"
                : "text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white"
            )}
          >
            {isAllCategories ? t("ALL_CATEGORIES") : displayName}
          </span>
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full transition-[color,background-color] duration-200 shrink-0 z-20",
              isActive
                ? "bg-white/20 text-white group-hover:bg-white/30"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 group-hover:bg-theme-primary-100 group-hover:text-theme-primary-700 dark:group-hover:bg-theme-primary-900/30 dark:group-hover:text-theme-primary-300"
            )}
            aria-label={`${isAllCategories ? (totalItems ?? 0) : (category.count ?? 0)} ${t("items", { count: isAllCategories ? (totalItems ?? 0) : (category.count ?? 0), defaultValue: "items" })}`}
          >
            {isAllCategories ? totalItems : category.count}
          </span>
        </div>
      </Button>
      {tooltip}
    </div>
  );
});