"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ImportRowValidation, ImportDuplicateStrategy } from "@/lib/types/item-import-export";

interface ImportPreviewStepProps {
	validationResults: ImportRowValidation[];
	summary: {
		total: number;
		valid: number;
		errors: number;
		duplicates: number;
	};
	duplicateStrategy: ImportDuplicateStrategy;
	onDuplicateStrategyChange: (strategy: ImportDuplicateStrategy) => void;
	defaultStatus: "draft" | "pending" | "approved";
	onDefaultStatusChange: (status: "draft" | "pending" | "approved") => void;
	showOptions?: boolean;
}

const summaryCardClass = cn(
	"flex flex-col items-center p-3 rounded-lg",
	"bg-gray-50 dark:bg-white/3"
);

const selectClass = cn(
	"px-3 py-1.5 text-sm rounded-lg",
	"bg-white dark:bg-white/5",
	"border border-gray-200 dark:border-white/6",
	"text-gray-900 dark:text-white",
	"focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
);

const headerCellClass = cn(
	"px-3 py-2 text-left text-xs font-medium uppercase tracking-wider",
	"text-gray-500 dark:text-gray-400"
);

export function ImportPreviewStep({
	validationResults,
	summary,
	duplicateStrategy,
	onDuplicateStrategyChange,
	defaultStatus,
	onDefaultStatusChange,
	showOptions = true,
}: ImportPreviewStepProps) {
	const t = useTranslations("admin.ITEM_IMPORT");

	return (
		<div className="space-y-4">
			{/* Summary Bar */}
			<div className="grid grid-cols-4 gap-3">
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-gray-900 dark:text-white">{summary.total}</span>
					<span className="text-xs text-gray-500">{t("SUMMARY_TOTAL")}</span>
				</div>
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-green-600">{summary.valid}</span>
					<span className="text-xs text-gray-500">{t("SUMMARY_VALID")}</span>
				</div>
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-red-600">{summary.errors}</span>
					<span className="text-xs text-gray-500">{t("SUMMARY_ERRORS")}</span>
				</div>
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-amber-600">{summary.duplicates}</span>
					<span className="text-xs text-gray-500">{t("SUMMARY_DUPLICATES")}</span>
				</div>
			</div>

			{/* Options */}
			{showOptions && (
				<div className="flex flex-wrap gap-4">
					<div className="flex items-center gap-2">
						<label className="text-sm text-gray-600 dark:text-gray-400">{t("DUPLICATES_LABEL")}</label>
						<select
							value={duplicateStrategy}
							onChange={(e) => onDuplicateStrategyChange(e.target.value as ImportDuplicateStrategy)}
							className={selectClass}
						>
							<option value="skip">{t("DUPLICATE_SKIP")}</option>
							<option value="update">{t("DUPLICATE_UPDATE")}</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm text-gray-600 dark:text-gray-400">{t("DEFAULT_STATUS_LABEL")}</label>
						<select
							value={defaultStatus}
							onChange={(e) => onDefaultStatusChange(e.target.value as "draft" | "pending" | "approved")}
							className={selectClass}
						>
							<option value="draft">{t("STATUS_DRAFT")}</option>
							<option value="pending">{t("STATUS_PENDING")}</option>
							<option value="approved">{t("STATUS_APPROVED")}</option>
						</select>
					</div>
				</div>
			)}

			{/* Rows Table */}
			<div className="overflow-auto max-h-[320px] rounded-lg border border-gray-200 dark:border-white/6">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 dark:bg-white/3 sticky top-0">
						<tr>
							<th className={cn(headerCellClass, "w-12")}>#</th>
							<th className={headerCellClass}>Status</th>
							<th className={headerCellClass}>Name</th>
							<th className={headerCellClass}>Details</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-white/6">
						{validationResults.map((row) => (
							<tr
								key={row.rowIndex}
								className={cn(
									"transition-colors",
									row.valid
										? "hover:bg-green-50/30 dark:hover:bg-green-900/10"
										: "bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50"
								)}
							>
								<td className="px-3 py-2 text-gray-500 text-xs">{row.rowIndex + 1}</td>
								<td className="px-3 py-2">
									{row.valid ? (
										row.duplicate?.slug ? (
											<AlertTriangle className="w-4 h-4 text-amber-500" />
										) : (
											<CheckCircle className="w-4 h-4 text-green-500" />
										)
									) : (
										<XCircle className="w-4 h-4 text-red-500" />
									)}
								</td>
								<td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200 max-w-[200px] truncate">
									{row.data?.name || "—"}
								</td>
								<td className="px-3 py-2">
									{row.errors.length > 0 && (
										<div className="text-xs text-red-600 dark:text-red-400">
											{row.errors.join("; ")}
										</div>
									)}
									{row.warnings.length > 0 && (
										<div className="text-xs text-amber-600 dark:text-amber-400">
											{row.warnings.join("; ")}
										</div>
									)}
									{row.valid && row.errors.length === 0 && row.warnings.length === 0 && (
										<span className="text-xs text-green-600 dark:text-green-400">Ready</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
