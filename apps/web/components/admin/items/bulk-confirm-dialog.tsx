"use client";

import { useEffect, useState } from "react";
import { Button, Textarea } from "@heroui/react";
import { CheckCircle, XCircle, Trash2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type BulkActionType = "approve" | "reject" | "delete";

interface BulkConfirmDialogProps {
	isOpen: boolean;
	action: BulkActionType | null;
	selectedCount: number;
	pendingCount: number;
	isProcessing: boolean;
	onConfirm: (reason?: string) => void;
	onClose: () => void;
}

const MODAL_OVERLAY = cn(
	"fixed inset-0 bg-black bg-opacity-50",
	"flex items-center justify-center",
	"z-50 p-4"
);

const MODAL_CONTAINER = cn(
	"w-full max-w-md",
	"bg-white dark:bg-[#0a0a0a]",
	"rounded-xl shadow-xl overflow-hidden"
);

const MODAL_BODY = "p-6";

const HEADER_CLASSES: Record<BulkActionType, string> = {
	approve: "bg-gradient-to-r from-green-500 to-green-600",
	reject: "bg-gradient-to-r from-orange-500 to-orange-600",
	delete: "bg-gradient-to-r from-red-500 to-red-600",
};

const ICON_MAP: Record<BulkActionType, typeof CheckCircle> = {
	approve: CheckCircle,
	reject: XCircle,
	delete: Trash2,
};

export function BulkConfirmDialog({
	isOpen,
	action,
	selectedCount,
	pendingCount,
	isProcessing,
	onConfirm,
	onClose,
}: BulkConfirmDialogProps) {
	const t = useTranslations("admin.ADMIN_ITEMS_PAGE");
	const [rejectionReason, setRejectionReason] = useState("");

	// Reset rejection reason when dialog opens/closes
	useEffect(() => {
		if (!isOpen) {
			setRejectionReason("");
		}
	}, [isOpen]);

	// Handle Escape key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isProcessing) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, isProcessing, onClose]);

	// Handle click outside to close
	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget && !isProcessing) {
			onClose();
		}
	};

	if (!isOpen || !action) return null;

	const Icon = ICON_MAP[action];
	const isReasonValid = action !== "reject" || rejectionReason.trim().length >= 10;
	const affectedCount = action === "delete" ? selectedCount : pendingCount;

	const handleConfirm = () => {
		if (action === "reject") {
			onConfirm(rejectionReason.trim());
		} else {
			onConfirm();
		}
	};

	return (
		<div className={MODAL_OVERLAY} onClick={handleOverlayClick}>
			<div className={MODAL_CONTAINER} role="dialog" aria-modal="true">
				{/* Header */}
				<div className={cn("px-6 py-4", HEADER_CLASSES[action])}>
					<div className="flex items-center space-x-3">
						<div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20">
							<Icon className="h-6 w-6 text-white" />
						</div>
						<h2 className="text-xl font-semibold text-white">
							{action === "approve" && t("BULK_CONFIRM_APPROVE_TITLE")}
							{action === "reject" && t("BULK_CONFIRM_REJECT_TITLE")}
							{action === "delete" && t("BULK_CONFIRM_DELETE_TITLE")}
						</h2>
					</div>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					{/* Description */}
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
						{action === "approve" &&
							t("BULK_CONFIRM_APPROVE_DESC", { count: affectedCount })}
						{action === "reject" &&
							t("BULK_CONFIRM_REJECT_DESC", { count: affectedCount })}
						{action === "delete" &&
							t("BULK_CONFIRM_DELETE_DESC", { count: affectedCount })}
					</p>

					{/* Warning for delete */}
					{action === "delete" && (
						<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
							<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
								<AlertTriangle className="h-4 w-4" />
								<span className="text-sm font-medium">
									{t("BULK_DELETE_WARNING")}
								</span>
							</div>
						</div>
					)}

					{/* Rejection Reason (only for reject action) */}
					{action === "reject" && (
						<div className="mt-4">
							<label
								htmlFor="bulkRejectionReason"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								{t("REJECTION_REASON_LABEL")}
							</label>
							<Textarea
								id="bulkRejectionReason"
								value={rejectionReason}
								onValueChange={setRejectionReason}
								placeholder={t("REJECTION_REASON_PLACEHOLDER")}
								minRows={4}
								classNames={{
									input: "text-sm",
								}}
								isDisabled={isProcessing}
							/>
							{rejectionReason.length > 0 && !isReasonValid && (
								<p className="text-xs text-red-500 mt-1">
									{t("REJECTION_REASON_MIN_LENGTH")}
								</p>
							)}
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end space-x-3 mt-6">
						<Button
							color="default"
							variant="bordered"
							onPress={onClose}
							isDisabled={isProcessing}
						>
							{t("CANCEL")}
						</Button>
						<Button
							color={action === "delete" ? "danger" : action === "reject" ? "warning" : "success"}
							onPress={handleConfirm}
							isLoading={isProcessing}
							isDisabled={isProcessing || !isReasonValid}
						>
							{action === "approve" && t("BULK_CONFIRM_APPROVE_BTN")}
							{action === "reject" && t("BULK_CONFIRM_REJECT_BTN")}
							{action === "delete" && t("BULK_CONFIRM_DELETE_BTN")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
