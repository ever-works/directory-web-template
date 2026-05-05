"use client";

import { useMemo } from "react";
import { CheckCircle, XCircle, Trash2, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ItemData } from "@/lib/types/item";

interface BulkActionBarProps {
	selectedIds: Set<string>;
	items: ItemData[];
	onApprove: () => void;
	onReject: () => void;
	onDelete: () => void;
	onClear: () => void;
	isProcessing: boolean;
	processingAction: "approve" | "reject" | "delete" | null;
}

const CONTAINER_CLASSES = cn(
	"fixed bottom-6 left-1/2 -translate-x-1/2",
	"flex items-center gap-3",
	"px-5 py-2.5",
	"bg-white dark:bg-[#121212]",
	"border border-gray-200 dark:border-white/[0.06]",
	"rounded-xl shadow-2xl",
	"z-50",
	"transition-all duration-300 ease-out"
);

const HIDDEN_CLASSES = "opacity-0 translate-y-4 pointer-events-none";
const VISIBLE_CLASSES = "opacity-100 translate-y-0";

export function BulkActionBar({
	selectedIds,
	items,
	onApprove,
	onReject,
	onDelete,
	onClear,
	isProcessing,
	processingAction,
}: BulkActionBarProps) {
	const t = useTranslations("admin.ADMIN_ITEMS_PAGE");

	const selectedCount = selectedIds.size;
	const isVisible = selectedCount > 0;

	// Calculate how many pending items are in the selection
	const pendingCount = useMemo(() => {
		return items.filter(
			(item) => selectedIds.has(item.id) && item.status === "pending"
		).length;
	}, [items, selectedIds]);

	const canApproveOrReject = pendingCount > 0;

	return (
		<div
			className={cn(
				CONTAINER_CLASSES,
				isVisible ? VISIBLE_CLASSES : HIDDEN_CLASSES
			)}
			role="toolbar"
			aria-label={t("BULK_ACTIONS")}
		>
			{/* Selection badge */}
			<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.06]">
				<span className="flex items-center justify-center w-4.5 h-4.5 text-[11px] font-bold rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 leading-none min-w-[18px] min-h-[18px]">
					{selectedCount}
				</span>
				<span className="text-xs font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
					{t("BULK_SELECTED_COUNT", { count: selectedCount })}
				</span>
			</div>

			{/* Divider */}
			<div className="h-5 w-px bg-gray-200 dark:bg-white/[0.08]" />

			{/* Action buttons */}
			<div className="flex items-center gap-1.5">
				{/* Approve button */}
				<button
					type="button"
					onClick={onApprove}
					disabled={!canApproveOrReject || isProcessing}
					className={cn(
						"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150",
						"focus:outline-none focus:ring-2 focus:ring-offset-1",
						canApproveOrReject && !isProcessing
							? "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-500/20 focus:ring-green-500"
							: "bg-gray-100 dark:bg-white/6 text-gray-400 dark:text-gray-500 opacity-50 cursor-not-allowed"
					)}
				>
					{processingAction === "approve" ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<CheckCircle className="w-3.5 h-3.5" />
					)}
					{t("BULK_APPROVE")}
				</button>

				{/* Reject button */}
				<button
					type="button"
					onClick={onReject}
					disabled={!canApproveOrReject || isProcessing}
					className={cn(
						"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150",
						"focus:outline-none focus:ring-2 focus:ring-offset-1",
						canApproveOrReject && !isProcessing
							? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 focus:ring-orange-500"
							: "bg-gray-100 dark:bg-white/6 text-gray-400 dark:text-gray-500 opacity-50 cursor-not-allowed"
					)}
				>
					{processingAction === "reject" ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<XCircle className="w-3.5 h-3.5" />
					)}
					{t("BULK_REJECT")}
				</button>

				{/* Delete button */}
				<button
					type="button"
					onClick={onDelete}
					disabled={isProcessing}
					className={cn(
						"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150",
						"bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20",
						"focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1",
						"disabled:opacity-50 disabled:cursor-not-allowed"
					)}
				>
					{processingAction === "delete" ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<Trash2 className="w-3.5 h-3.5" />
					)}
					{t("BULK_DELETE")}
				</button>
			</div>

			{/* Divider */}
			<div className="h-5 w-px bg-gray-200 dark:bg-white/[0.08]" />

			{/* Clear selection button */}
			<button
				type="button"
				onClick={onClear}
				disabled={isProcessing}
				className={cn(
					"inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg",
					"text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
					"hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors",
					"disabled:opacity-40 disabled:cursor-not-allowed"
				)}
			>
				<X className="w-3.5 h-3.5" />
				{t("BULK_DESELECT_ALL")}
			</button>
		</div>
	);
}
