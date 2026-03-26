"use client";

import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePublicItemExport } from "@/hooks/use-item-import-export";

const menuItemClass = cn(
	"flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none rounded-md mx-1",
	"text-gray-700 dark:text-gray-200",
	"hover:bg-gray-100 dark:hover:bg-white/6",
	"focus:bg-gray-100 dark:focus:bg-white/6",
	"transition-colors duration-150"
);

/**
 * Public export button shown in the listing header when export_enabled is true.
 */
export function ExportButton() {
	const { exportItems, isExporting, exportEnabled } = usePublicItemExport();
	const t = useTranslations("admin.ITEM_IMPORT");
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted || !exportEnabled) return null;

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					className={cn(
						"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
						"bg-white/80 dark:bg-white/4 backdrop-blur-sm",
						"border border-gray-200 dark:border-white/6",
						"text-gray-600 dark:text-gray-300",
						"hover:bg-white dark:hover:bg-white/6",
						"hover:text-gray-900 dark:hover:text-white",
						"shadow-sm hover:shadow",
						"transition-all duration-200",
						isExporting && "opacity-70 cursor-wait"
					)}
					disabled={isExporting}
					aria-label={t("EXPORT_SECTION")}
				>
					{isExporting ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<Download className="w-3.5 h-3.5" />
					)}
					{t("EXPORT_SECTION")}
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					className={cn(
						"min-w-[160px] bg-white dark:bg-white/5 rounded-xl shadow-lg",
						"border border-gray-200 dark:border-white/6",
						"py-1 z-50",
						"animate-in fade-in-0 zoom-in-95 duration-200"
					)}
					sideOffset={5}
					align="end"
				>
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
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
