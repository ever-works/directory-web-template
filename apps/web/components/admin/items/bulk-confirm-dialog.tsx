"use client";

import { useEffect, useState } from "react";
import { Button, Textarea } from "@heroui/react";
import { CheckCircle, XCircle, Trash2, AlertTriangle, X } from "lucide-react";
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
	"fixed inset-0 bg-black/60 backdrop-blur-sm",
	"flex items-center justify-center",
	"z-50 p-4"
);

const MODAL_CONTAINER = cn(
	"w-full max-w-md",
	"bg-white dark:bg-[#121212]",
	"rounded-xl shadow-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden",
	"animate-in fade-in-0 zoom-in-95 duration-200"
);

const MODAL_BODY = "p-6";

const ICON_WRAPPER: Record<BulkActionType, string> = {
	approve: "bg-green-50 dark:bg-green-900/20",
	reject: "bg-orange-50 dark:bg-orange-900/20",
	delete: "bg-red-50 dark:bg-red-900/20",
};

const ICON_COLOR: Record<BulkActionType, string> = {
	approve: "text-green-600 dark:text-green-400",
	reject: "text-orange-600 dark:text-orange-400",
	delete: "text-red-600 dark:text-red-400",
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

	useEffect(() => {
		if (!isOpen) {
			setRejectionReason("");
		}
	}, [isOpen]);

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
				<div className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.06]">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className={cn("flex items-center justify-center w-9 h-9 rounded-lg", ICON_WRAPPER[action])}>
								<Icon className={cn("w-5 h-5", ICON_COLOR[action])} />
							</div>
							<h2 className="text-base font-semibold text-gray-900 dark:text-white">
								{action === "approve" && t("BULK_CONFIRM_APPROVE_TITLE")}
								{action === "reject" && t("BULK_CONFIRM_REJECT_TITLE")}
								{action === "delete" && t("BULK_CONFIRM_DELETE_TITLE")}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={isProcessing}
							className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40"
							aria-label="Close"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
						{action === "approve" && t("BULK_CONFIRM_APPROVE_DESC", { count: affectedCount })}
						{action === "reject" && t("BULK_CONFIRM_REJECT_DESC", { count: affectedCount })}
						{action === "delete" && t("BULK_CONFIRM_DELETE_DESC", { count: affectedCount })}
					</p>

					{/* Warning for delete */}
					{action === "delete" && (
						<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
							<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
								<AlertTriangle className="h-4 w-4 shrink-0" />
								<span className="text-sm font-medium">{t("BULK_DELETE_WARNING")}</span>
							</div>
						</div>
					)}

					{/* Rejection Reason */}
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
								classNames={{ input: "text-sm" }}
								isDisabled={isProcessing}
							/>
							{rejectionReason.length > 0 && !isReasonValid && (
								<p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
									<span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
									{t("REJECTION_REASON_MIN_LENGTH")}
								</p>
							)}
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-3 mt-6">
						<Button
							color="default"
							variant="flat"
							onPress={onClose}
							isDisabled={isProcessing}
							className="font-medium text-gray-700 dark:text-gray-200"
						>
							{t("CANCEL")}
						</Button>
						<Button
							color={action === "delete" ? "danger" : action === "reject" ? "warning" : "success"}
							onPress={handleConfirm}
							isLoading={isProcessing}
							isDisabled={isProcessing || !isReasonValid}
							className="font-medium"
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
