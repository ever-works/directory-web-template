"use client";

import { useMemo } from "react";
import { Button } from "@heroui/react";
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
	"flex items-center gap-4",
	"px-6 py-3",
	"bg-white dark:bg-gray-800",
	"border border-gray-200 dark:border-gray-700",
	"rounded-xl shadow-lg",
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
			{/* Selection count */}
			<span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
				{t("BULK_SELECTED_COUNT", { count: selectedCount })}
			</span>

			{/* Divider */}
			<div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

			{/* Action buttons */}
			<div className="flex items-center gap-2">
				{/* Approve button */}
				<Button
					size="sm"
					color="success"
					variant="flat"
					onPress={onApprove}
					isDisabled={!canApproveOrReject || isProcessing}
					startContent={
						processingAction === "approve" ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<CheckCircle className="w-4 h-4" />
						)
					}
				>
					{t("BULK_APPROVE")}
				</Button>

				{/* Reject button */}
				<Button
					size="sm"
					color="warning"
					variant="flat"
					onPress={onReject}
					isDisabled={!canApproveOrReject || isProcessing}
					startContent={
						processingAction === "reject" ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<XCircle className="w-4 h-4" />
						)
					}
				>
					{t("BULK_REJECT")}
				</Button>

				{/* Delete button */}
				<Button
					size="sm"
					color="danger"
					variant="flat"
					onPress={onDelete}
					isDisabled={isProcessing}
					startContent={
						processingAction === "delete" ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Trash2 className="w-4 h-4" />
						)
					}
				>
					{t("BULK_DELETE")}
				</Button>
			</div>

			{/* Divider */}
			<div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

			{/* Clear selection button */}
			<Button
				size="sm"
				variant="light"
				onPress={onClear}
				isDisabled={isProcessing}
				startContent={<X className="w-4 h-4" />}
			>
				{t("BULK_DESELECT_ALL")}
			</Button>
		</div>
	);
}
