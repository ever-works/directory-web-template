import React, { useState, memo } from "react";
import { Button, cn } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { TagItemProps } from "../../types";
import { getButtonVariantStyles } from "../../utils/style-utils";
import { formatDisplayName } from "../../utils/text-utils";

/**
 * Individual tag item component
 */
export const TagItem = memo(function TagItem({ tag, isActive, href, showCount = true }: TagItemProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const showTooltip = (btn: HTMLButtonElement) => {
    const textEl = btn.querySelector('[data-tag-label]') as HTMLElement | null;
    const isTruncated = textEl ? textEl.scrollWidth > textEl.clientWidth + 1 : false;
    if (isTruncated) {
      const r = btn.getBoundingClientRect();
      // Position tooltip above the button, centered horizontally
      setPos({ top: r.top - 8, left: r.left + r.width / 2 });
      setHovered(true);
    }
  };
  const hideTooltip = () => setHovered(false);

  const formattedName = formatDisplayName(tag.name);

  return (
    <>
      <Button
        variant={isActive ? "solid" : "bordered"}
        radius="full"
        size="sm"
        as={Link}
        prefetch={false}
        href={href}
        onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
        onMouseLeave={hideTooltip}
        onFocus={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
        onBlur={hideTooltip}
        className={getButtonVariantStyles(
          isActive,
          "px-1.5 py-1 h-8 font-medium transition-all duration-200 shrink-0"
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

        {tag.icon_url && (
          <Image
            width={20}
            height={20}
            src={tag.icon_url}
            className={cn(
              "w-4 h-4 mr-1.5 transition-transform",
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
          {formattedName}
        </span>

        {showCount && tag.count && (
          <span
            className={cn(
              "ml-1.5 text-xs font-normal",
              isActive
                ? "bg-white/20 text-white dark:bg-black/10 dark:text-[#0a0a0a] px-1 rounded-md"
                : "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-white/1 group-hover:text-gray-900 dark:group-hover:text-white"
            )}
          >
            ({tag.count})
          </span>
        )}
      </Button>

      {hovered && typeof document !== 'undefined' && createPortal(
        <div
          className={cn(
            "fixed min-w-40 z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-light border pointer-events-none",
            isActive
              ? "bg-[#0a0a0a] text-white border border-[#0a0a0a] dark:bg-white dark:text-[#0a0a0a] dark:border-white"
              : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
          )}
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%) translateY(-100%)', whiteSpace: 'pre-line' }}
        >
          <div className="flex flex-col gap-1">
            <div className="font-semibold">{formattedName}</div>
          </div>
        </div>, document.body)
      }
    </>
  );
});