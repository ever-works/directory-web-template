"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ######################### Types #########################

interface SearchableSelectProps {
	items: SearchableSelectItem[];
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	label?: string;
	disabled?: boolean;
	className?: string;
}

export interface SearchableSelectItem {
	value: string;
	label: string;
	description?: string;
	icon?: React.ReactNode;
}

// ######################### Styling Constants #########################

const TRIGGER_BASE = cn(
	"w-full flex items-center justify-between px-4 py-3 rounded-xl",
	"border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
	"text-sm text-gray-900 dark:text-white",
	"focus:outline-none focus:ring-2 focus:ring-blue-500",
	"disabled:opacity-50 disabled:cursor-not-allowed",
	"transition-colors"
);

const DROPDOWN_BASE = cn(
	"z-[9999]",
	"bg-white dark:bg-gray-800",
	"border border-gray-200 dark:border-gray-700",
	"rounded-xl shadow-lg overflow-hidden"
);

const SEARCH_INPUT = cn(
	"w-full px-4 py-3 text-sm",
	"bg-transparent border-b border-gray-200 dark:border-gray-700",
	"text-gray-900 dark:text-white placeholder-gray-400",
	"focus:outline-none"
);

const ITEM_BASE = cn(
	"w-full flex items-center gap-3 px-4 py-3 text-left",
	"hover:bg-gray-50 dark:hover:bg-gray-700/50",
	"transition-colors cursor-pointer"
);

const ITEM_SELECTED = "bg-blue-50 dark:bg-blue-900/20";

// ######################### Component #########################

export function SearchableSelect({
	items,
	value,
	onValueChange,
	placeholder = "Select an option",
	searchPlaceholder = "Search...",
	emptyMessage = "No results found",
	label,
	disabled = false,
	className,
}: SearchableSelectProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);
	const searchInputRef = React.useRef<HTMLInputElement>(null);

	// Filter items based on search
	const filteredItems = React.useMemo(() => {
		if (!search.trim()) return items;
		const query = search.toLowerCase();
		return items.filter(
			(item) =>
				item.label.toLowerCase().includes(query) ||
				item.description?.toLowerCase().includes(query)
		);
	}, [items, search]);

	// Get selected item
	const selectedItem = React.useMemo(() => {
		return items.find((item) => item.value === value);
	}, [items, value]);

	// Update dropdown position when opened
	React.useEffect(() => {
		if (isOpen && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setDropdownPosition({
				top: rect.bottom + window.scrollY + 4,
				left: rect.left + window.scrollX,
				width: rect.width,
			});
		}
	}, [isOpen]);

	// Handle click outside
	React.useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: PointerEvent) => {
			const target = event.target as Node;
			const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
			const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

			if (isOutsideTrigger && isOutsideDropdown) {
				setIsOpen(false);
				setSearch("");
			}
		};

		const timeoutId = setTimeout(() => {
			document.addEventListener("pointerdown", handleClickOutside, { capture: true });
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("pointerdown", handleClickOutside, { capture: true });
		};
	}, [isOpen]);

	// Focus search input when dropdown opens
	React.useEffect(() => {
		if (isOpen && searchInputRef.current) {
			setTimeout(() => searchInputRef.current?.focus(), 0);
		}
	}, [isOpen]);

	const handleSelect = (itemValue: string) => {
		onValueChange?.(itemValue);
		setIsOpen(false);
		setSearch("");
	};

	const handleToggle = () => {
		if (disabled) return;
		setIsOpen(!isOpen);
		if (!isOpen) {
			setSearch("");
		}
	};

	// Dropdown content rendered via portal
	const dropdownContent = isOpen && typeof document !== "undefined" ? createPortal(
		<div
			ref={dropdownRef}
			className={DROPDOWN_BASE}
			style={{
				position: "absolute",
				top: dropdownPosition.top,
				left: dropdownPosition.left,
				width: dropdownPosition.width,
			}}
		>
			{/* Search Input */}
			<div className="relative">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
				<input
					ref={searchInputRef}
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder={searchPlaceholder}
					className={cn(SEARCH_INPUT, "pl-10")}
				/>
			</div>

			{/* Items List */}
			<div className="max-h-[240px] overflow-y-auto">
				{filteredItems.length === 0 ? (
					<div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
						{emptyMessage}
					</div>
				) : (
					filteredItems.map((item) => {
						const isSelected = item.value === value;
						return (
							<button
								key={item.value}
								type="button"
								onClick={() => handleSelect(item.value)}
								className={cn(ITEM_BASE, isSelected && ITEM_SELECTED)}
							>
								{item.icon && (
									<div className="shrink-0">{item.icon}</div>
								)}
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-gray-900 dark:text-white truncate">
										{item.label}
									</div>
									{item.description && (
										<div className="text-xs text-gray-500 dark:text-gray-400 truncate">
											{item.description}
										</div>
									)}
								</div>
								{isSelected && (
									<Check size={16} className="text-blue-500 shrink-0" />
								)}
							</button>
						);
					})
				)}
			</div>
		</div>,
		document.body
	) : null;

	return (
		<div className={cn("relative", className)}>
			{label && (
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					{label}
				</label>
			)}

			{/* Trigger Button */}
			<button
				ref={triggerRef}
				type="button"
				onClick={handleToggle}
				disabled={disabled}
				className={TRIGGER_BASE}
			>
				<div className="flex items-center gap-3 flex-1 min-w-0">
					{selectedItem?.icon}
					<span className={cn("truncate", !selectedItem && "text-gray-400")}>
						{selectedItem?.label || placeholder}
					</span>
				</div>
				<ChevronDown
					size={18}
					className={cn(
						"text-gray-400 transition-transform shrink-0",
						isOpen && "rotate-180"
					)}
				/>
			</button>

			{/* Dropdown via Portal */}
			{dropdownContent}
		</div>
	);
}
