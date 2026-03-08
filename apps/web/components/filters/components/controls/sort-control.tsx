 "use client";
 
import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { SORT_OPTIONS, SORT_LABELS } from "../../constants";
import { SortOption } from "../../types";

interface SortControlProps {
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  className?: string;
}

/**
 * Sort control component
 * Handles sorting options selection
 */
export function SortControl({ sortBy, setSortBy, className = "" }: SortControlProps) {
  const t = useTranslations("listing");
  const [open, setOpen] = React.useState(false);

  const options = [
    { value: SORT_OPTIONS.POPULARITY, label: t(SORT_LABELS[SORT_OPTIONS.POPULARITY]) },
    { value: SORT_OPTIONS.NAME_ASC, label: t(SORT_LABELS[SORT_OPTIONS.NAME_ASC]) },
    { value: SORT_OPTIONS.NAME_DESC, label: t(SORT_LABELS[SORT_OPTIONS.NAME_DESC]) },
    { value: SORT_OPTIONS.DATE_DESC, label: t(SORT_LABELS[SORT_OPTIONS.DATE_DESC]) },
    { value: SORT_OPTIONS.DATE_ASC, label: t(SORT_LABELS[SORT_OPTIONS.DATE_ASC]) },
  ];

  const currentOption = options.find(opt => opt.value === sortBy);

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button className={`group relative w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600/50 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500 dark:focus:ring-theme-primary-400 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500/50 hover:shadow-md ${className}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate pr-2">{currentOption?.label}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </div>
          
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="start"
          className="z-50 min-w-(--radix-dropdown-menu-trigger-width) bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 origin-top-left"
        >
          <div className="p-1">
            {options.map((option) => (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => setSortBy(option.value)}
                className="relative flex items-center justify-between px-3 py-2 text-gray-900 dark:text-gray-100 rounded-md cursor-pointer outline-hidden transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 data-highlighted:bg-gray-100 dark:data-highlighted:bg-gray-800 group/item"
              >
                <span className="font-medium text-sm">{option.label}</span>
                {sortBy === option.value && <Check className="h-4 w-4 text-theme-primary-500 dark:text-theme-primary-400 animate-in zoom-in-50 duration-200" />}
                
              </DropdownMenu.Item>
            ))}
          </div>
          <DropdownMenu.Arrow className="fill-white dark:fill-gray-900" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}