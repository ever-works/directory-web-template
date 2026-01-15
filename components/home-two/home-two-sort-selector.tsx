"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortValue =
  | "popularity"
  | "name-asc"
  | "name-desc"
  | "date-desc"
  | "date-asc";

interface ISortSelector {
  sortBy?: SortValue;
  setSortBy?: (sort: SortValue) => void;
  className?: string;
}

export function HomeTwoSortSelector({
  sortBy = "popularity",
  setSortBy,
  className,
}: ISortSelector) {
  const t = useTranslations();
  const dropdownId = React.useId().replace(/:/g, "");

  const options: { value: SortValue; label: string }[] = [
    { value: "popularity", label: t("listing.POPULARITY") },
    { value: "name-asc", label: t("listing.NAME_A_Z") },
    { value: "name-desc", label: t("listing.NAME_Z_A") },
    { value: "date-desc", label: t("listing.NEWEST") },
    { value: "date-asc", label: t("listing.OLDEST") },
  ];

  const currentOption = options.find(opt => opt.value === sortBy);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t("listing.SORT_BY")}
          aria-haspopup="menu"
          aria-controls={dropdownId}
          className={cn(
            "group inline-flex items-center justify-between",
            "w-36",
            "rounded-lg border border-gray-300 dark:border-gray-600/50",
            "bg-gray-50 dark:bg-gray-900/50",
            "px-3 sm:px-4 py-1.5 sm:py-2",
            "text-xs sm:text-sm font-medium",
            "text-gray-900 dark:text-white",
            "transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-gray-800/50",
            "hover:border-gray-300 dark:hover:border-gray-500/50",
            "hover:shadow-md",
            "focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500",
            className
          )}
        >
          <span className="truncate">
            {currentOption?.label ?? t("listing.SORT_BY")}
          </span>

          <ChevronDown className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-180 text-theme-primary-500" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          id={dropdownId}
          align="end"
          sideOffset={6}
          className={cn(
            "z-50 w-36",
            "rounded-lg border border-gray-200 dark:border-gray-700",
            "bg-white dark:bg-gray-900",
            "shadow-lg shadow-black/10 dark:shadow-black/30",
            "animate-in fade-in zoom-in-95"
          )}
          onCloseAutoFocus={e => e.preventDefault()}
        >
          <DropdownMenu.RadioGroup
            value={sortBy}
            onValueChange={value => setSortBy?.(value as SortValue)}
            className="p-1.5"
          >
            {options.map(option => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex items-center justify-between",
                  "px-3 py-1.5 rounded-md",
                  "text-xs sm:text-sm font-medium",
                  "cursor-pointer outline-hidden",
                  "text-gray-900 dark:text-gray-100",
                  "transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  "focus:bg-gray-100 dark:focus:bg-gray-800"
                )}
              >
                <span>{option.label}</span>

                <DropdownMenu.ItemIndicator>
                  <Check className="h-4 w-4 text-theme-primary-500 dark:text-theme-primary-400" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Arrow className="fill-white dark:fill-gray-900" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
