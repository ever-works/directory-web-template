"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowUp, ArrowDown, Check, Loader2, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type SortField = "name" | "updated_at" | "status" | "submitted_at";
export type SortOrder = "asc" | "desc";

interface ItemListSortingProps {
    sortBy: SortField;
    sortOrder: SortOrder;
    onSortByChange: (sortBy: SortField) => void;
    onSortOrderChange: (sortOrder: SortOrder) => void;
    disabled?: boolean;
    isLoading?: boolean;
}

const SORT_FIELDS: { value: SortField; labelKey: string }[] = [
    { value: "updated_at", labelKey: "SORT_UPDATED" },
    { value: "name", labelKey: "SORT_NAME" },
    { value: "status", labelKey: "SORT_STATUS" },
    { value: "submitted_at", labelKey: "SORT_SUBMITTED" },
];

export function ItemListSorting({
    sortBy,
    sortOrder,
    onSortByChange,
    onSortOrderChange,
    disabled = false,
    isLoading = false,
}: ItemListSortingProps) {
    const t = useTranslations("admin.ADMIN_ITEMS_PAGE");

    const currentFieldLabel = SORT_FIELDS.find((f) => f.value === sortBy)?.labelKey || "SORT_UPDATED";

    const handleFieldSelect = (field: SortField) => {
        if (field === sortBy) {
            // Toggle order if same field selected
            onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
        } else {
            onSortByChange(field);
        }
    };

    const toggleOrder = () => {
        if (!isLoading && !disabled) {
            onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
        }
    };

    return (
        <DropdownMenu.Root>
            <div className="inline-flex items-center">
                {/* Sort Order Toggle */}
                <button
                    type="button"
                    onClick={toggleOrder}
                    disabled={disabled || isLoading}
                    aria-label={sortOrder === "asc" ? t("SORT_ASC") : t("SORT_DESC")}
                    className={cn(
                        "inline-flex items-center justify-center",
                        "px-2 py-1 rounded-l-md",
                        "border border-r-0 border-gray-200 dark:border-white/[0.06]",
                        "bg-gray-50 dark:bg-white/[0.05]",
                        "text-gray-600 dark:text-gray-300",
                        "hover:bg-gray-100 dark:hover:bg-white/[0.06]",
                        "hover:text-theme-primary dark:hover:text-theme-primary",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50 focus-visible:z-10",
                        "transition-colors",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : sortOrder === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                    ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                    )}
                </button>

                {/* Sort Field Dropdown Trigger */}
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        disabled={disabled || isLoading}
                        className={cn(
                            "inline-flex items-center justify-between gap-1.5 px-2.5 py-1 text-xs font-medium rounded-r-md",
                            "min-w-[100px]",
                            "border border-gray-200 dark:border-white/[0.06]",
                            "text-gray-600 dark:text-gray-300",
                            "hover:bg-gray-50 dark:hover:bg-white/[0.06]",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50",
                            "transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        <span>{t(currentFieldLabel)}</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                </DropdownMenu.Trigger>
            </div>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className={cn(
                        "min-w-[160px] bg-white dark:bg-white/[0.05] rounded-lg shadow-lg",
                        "border border-gray-200 dark:border-white/[0.06]",
                        "py-1 z-50",
                        "animate-in fade-in-0 zoom-in-95 duration-200"
                    )}
                    sideOffset={5}
                    align="end"
                >
                    {SORT_FIELDS.map((field) => (
                        <DropdownMenu.Item
                            key={field.value}
                            onSelect={() => handleFieldSelect(field.value)}
                            className={cn(
                                "flex items-center justify-between px-3 py-2 text-sm cursor-pointer outline-none",
                                "hover:bg-gray-100 dark:hover:bg-white/[0.06]",
                                "focus:bg-gray-100 dark:focus:bg-white/[0.06]",
                                "transition-colors",
                                sortBy === field.value
                                    ? "text-theme-primary"
                                    : "text-gray-700 dark:text-gray-300"
                            )}
                        >
                            <span>{t(field.labelKey)}</span>
                            {sortBy === field.value && (
                                <Check className="w-3.5 h-3.5 text-theme-primary" />
                            )}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
