"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, Upload, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItemExport } from "@/hooks/use-item-import-export";

const menuItemClass = cn(
	"flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none rounded-md mx-1",
	"text-gray-700 dark:text-gray-200",
	"hover:bg-gray-100 dark:hover:bg-gray-700",
	"focus:bg-gray-100 dark:focus:bg-gray-700",
	"transition-colors duration-150"
);

const sectionLabelClass = cn(
	"px-3 py-1.5 text-xs font-medium uppercase tracking-wider",
	"text-gray-400 dark:text-gray-500"
);

/**
 * Import/Export dropdown button for the admin items page header.
 * Export-only for PR 1; import will be added in PR 2.
 */
export function ItemImportExport() {
	const { exportItems, downloadSample, isExporting } = useItemExport();

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					className={cn(
						"inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
						"bg-white dark:bg-gray-800",
						"border border-gray-200 dark:border-gray-700",
						"text-gray-700 dark:text-gray-200",
						"hover:bg-gray-50 dark:hover:bg-gray-700",
						"shadow-sm hover:shadow-md",
						"transition-all duration-200",
						isExporting && "opacity-70 cursor-wait"
					)}
					disabled={isExporting}
				>
					{isExporting ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<FileSpreadsheet className="w-4 h-4" />
					)}
					Import / Export
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					className={cn(
						"min-w-[200px] bg-white dark:bg-gray-800 rounded-xl shadow-lg",
						"border border-gray-200 dark:border-gray-700",
						"py-1 z-50",
						"animate-in fade-in-0 zoom-in-95 duration-200"
					)}
					sideOffset={5}
					align="end"
				>
					{/* Export Section */}
					<DropdownMenu.Label className={sectionLabelClass}>
						Export
					</DropdownMenu.Label>

					<DropdownMenu.Item
						className={menuItemClass}
						onSelect={() => exportItems('csv')}
						disabled={isExporting}
					>
						<FileText className="w-4 h-4" />
						Export CSV
					</DropdownMenu.Item>

					<DropdownMenu.Item
						className={menuItemClass}
						onSelect={() => exportItems('xlsx')}
						disabled={isExporting}
					>
						<FileSpreadsheet className="w-4 h-4" />
						Export Excel
					</DropdownMenu.Item>

					<DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

					{/* Template Section */}
					<DropdownMenu.Label className={sectionLabelClass}>
						Template
					</DropdownMenu.Label>

					<DropdownMenu.Item
						className={menuItemClass}
						onSelect={() => downloadSample('csv')}
						disabled={isExporting}
					>
						<Download className="w-4 h-4" />
						Download CSV Template
					</DropdownMenu.Item>

					<DropdownMenu.Item
						className={menuItemClass}
						onSelect={() => downloadSample('xlsx')}
						disabled={isExporting}
					>
						<Download className="w-4 h-4" />
						Download Excel Template
					</DropdownMenu.Item>

					<DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

					{/* Import Section - placeholder for PR 2 */}
					<DropdownMenu.Label className={sectionLabelClass}>
						Import
					</DropdownMenu.Label>

					<DropdownMenu.Item
						className={cn(menuItemClass, "opacity-50 cursor-not-allowed")}
						disabled
					>
						<Upload className="w-4 h-4" />
						Import from File
						<span className="ml-auto text-[10px] text-gray-400">Soon</span>
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
