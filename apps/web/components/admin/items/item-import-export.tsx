"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, Upload, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useItemExport } from "@/hooks/use-item-import-export";
import { ItemImportModal } from "./import/item-import-modal";

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
 */
export function ItemImportExport() {
	const t = useTranslations("admin.ITEM_IMPORT");
	const { exportItems, downloadSample, isExporting } = useItemExport();
	const [isImportOpen, setIsImportOpen] = useState(false);

	return (
		<>
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
						{t("IMPORT_EXPORT_BUTTON")}
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
							{t("EXPORT_SECTION")}
						</DropdownMenu.Label>

						<DropdownMenu.Item
							className={menuItemClass}
							onSelect={() => exportItems('csv')}
							disabled={isExporting}
						>
							<FileText className="w-4 h-4" />
							{t("EXPORT_CSV")}
						</DropdownMenu.Item>

						<DropdownMenu.Item
							className={menuItemClass}
							onSelect={() => exportItems('xlsx')}
							disabled={isExporting}
						>
							<FileSpreadsheet className="w-4 h-4" />
							{t("EXPORT_EXCEL")}
						</DropdownMenu.Item>

						<DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

						{/* Template Section */}
						<DropdownMenu.Label className={sectionLabelClass}>
							{t("TEMPLATE_SECTION")}
						</DropdownMenu.Label>

						<DropdownMenu.Item
							className={menuItemClass}
							onSelect={() => downloadSample('csv')}
							disabled={isExporting}
						>
							<Download className="w-4 h-4" />
							{t("DOWNLOAD_CSV_TEMPLATE")}
						</DropdownMenu.Item>

						<DropdownMenu.Item
							className={menuItemClass}
							onSelect={() => downloadSample('xlsx')}
							disabled={isExporting}
						>
							<Download className="w-4 h-4" />
							{t("DOWNLOAD_EXCEL_TEMPLATE")}
						</DropdownMenu.Item>

						<DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

						{/* Import Section */}
						<DropdownMenu.Label className={sectionLabelClass}>
							{t("IMPORT_SECTION")}
						</DropdownMenu.Label>

						<DropdownMenu.Item
							className={menuItemClass}
							onSelect={() => setIsImportOpen(true)}
						>
							<Upload className="w-4 h-4" />
							{t("IMPORT_FROM_FILE")}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>

			<ItemImportModal
				isOpen={isImportOpen}
				onClose={() => setIsImportOpen(false)}
			/>
		</>
	);
}
