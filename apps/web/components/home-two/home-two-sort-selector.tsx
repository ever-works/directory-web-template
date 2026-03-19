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
            "group inline-flex items-center justify-between text-[10px] sm:text-xs",
            "w-28 sm:w-32",
            "rounded-lg border border-gray-300 dark:border-white/[0.06]",
            "bg-gray-50 dark:bg-white/[0.04]",
            "px-2.5 sm:px-3 py-1 sm:py-1.5",
            "font-medium",
            "text-gray-900 dark:text-white",
            "transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-white/[0.06]",
            "hover:border-gray-300 dark:hover:border-white/[0.1]",
            "hover:shadow-md",
            "focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500",
            className
          )}
        >
          <span className="truncate">
            {currentOption?.label ?? t("listing.SORT_BY")}
          </span>

          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180 text-theme-white/30" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          id={dropdownId}
          align="end"
          sideOffset={6}
          className={cn(
            "z-50 w-28 sm:w-32",
            "rounded-lg border border-gray-200 dark:border-white/[0.08]",
            "bg-white dark:bg-[#141414]",
            "shadow-lg shadow-black/10 dark:shadow-black/30",
            "animate-in fade-in zoom-in-95"
          )}
          onCloseAutoFocus={e => e.preventDefault()}
        >
          <DropdownMenu.RadioGroup
            value={sortBy}
            onValueChange={value => setSortBy?.(value as SortValue)}
            className="p-1"
          >
            {options.map(option => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex items-center justify-between text-[10px] sm:text-xs",
                  "px-2 py-1 rounded-md",
                  "font-medium",
                  "cursor-pointer outline-hidden",
                  "text-gray-900 dark:text-gray-100",
                  "transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-white/[0.06]",
                  "focus:bg-gray-100 dark:focus:bg-white/[0.06]"
                )}
              >
                <span>{option.label}</span>

                <DropdownMenu.ItemIndicator>
                  <Check className="h-3 w-3 text-theme-primary-500 dark:text-theme-primary-400" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Arrow className="fill-white dark:fill-[#0a0a0a]" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
