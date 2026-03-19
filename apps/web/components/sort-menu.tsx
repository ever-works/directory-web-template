"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = {
  value: string;
  label: string;
};

export interface SortMenuProps {
  options: SortOption[];
  value: string;
  onSortChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  label?: string;
}

const SortMenu: React.FC<SortMenuProps> = ({
  options,
  value,
  onSortChange,
  ariaLabel = "Sort items",
  className,
}) => {
  const currentOption = options.find(opt => opt.value === value);
  const dropdownId = React.useId().replace(/:/g, "");

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-controls={dropdownId}
          className={cn(
            "group inline-flex items-center justify-between",
            "!min-w-36 sm:!min-w-36",
            "rounded-lg border border-gray-300 dark:border-white/6",
            "bg-gray-100 dark:bg-white/3",
            "px-2.5 sm:px-3 py-1.5",
            "text-xs sm:text-sm font-medium",
            "text-theme-primary-600 dark:text-theme-primary-400",
            "transition-all duration-200",
            "hover:bg-gray-50 dark:hover:bg-white/3",
            "hover:border-gray-300 dark:hover:border-white/6",
            "hover:shadow-md",
            "focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500",
            className
          )}
        >
          <span className="truncate block">{currentOption?.label ?? "Sort"}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          id={dropdownId}
          align="end"
          sideOffset={6}
          className={cn(
            "z-50 w-36",
            "rounded-lg border border-gray-200 dark:border-white/6",
            "bg-white dark:bg-white/3",
            "shadow-lg shadow-black/10 dark:shadow-black/30",
            "animate-in fade-in zoom-in-95"
          )}
        >
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={onSortChange}
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
                  "hover:bg-gray-100 dark:hover:bg-white/6",
                  "focus:bg-gray-100 dark:focus:bg-white/5"
                )}
              >
                <span>{option.label}</span>

                <DropdownMenu.ItemIndicator>
                  <Check className="h-4 w-4 text-theme-primary-500 dark:text-theme-primary-400" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Arrow className="fill-white dark:fill-[#0a0a0a]" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default SortMenu;
