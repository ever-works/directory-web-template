"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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
}

const summaryCardClass = cn(
	"flex flex-col items-center p-3 rounded-lg",
	"bg-gray-50 dark:bg-gray-800/50"
);

const selectClass = cn(
	"px-3 py-1.5 text-sm rounded-lg",
	"bg-white dark:bg-gray-800",
	"border border-gray-200 dark:border-gray-700",
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
}: ImportPreviewStepProps) {
	return (
		<div className="space-y-4">
			{/* Summary Bar */}
			<div className="grid grid-cols-4 gap-3">
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-gray-900 dark:text-white">{summary.total}</span>
					<span className="text-xs text-gray-500">Total</span>
				</div>
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-green-600">{summary.valid}</span>
					<span className="text-xs text-gray-500">Valid</span>
				</div>
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-red-600">{summary.errors}</span>
					<span className="text-xs text-gray-500">Errors</span>
				</div>
				<div className={summaryCardClass}>
					<span className="text-lg font-bold text-amber-600">{summary.duplicates}</span>
					<span className="text-xs text-gray-500">Duplicates</span>
				</div>
			</div>

			{/* Options */}
			<div className="flex flex-wrap gap-4">
				<div className="flex items-center gap-2">
					<label className="text-sm text-gray-600 dark:text-gray-400">Duplicates:</label>
					<select
						value={duplicateStrategy}
						onChange={(e) => onDuplicateStrategyChange(e.target.value as ImportDuplicateStrategy)}
						className={selectClass}
					>
						<option value="skip">Skip</option>
						<option value="update">Update existing</option>
					</select>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-sm text-gray-600 dark:text-gray-400">Default status:</label>
					<select
						value={defaultStatus}
						onChange={(e) => onDefaultStatusChange(e.target.value as "draft" | "pending" | "approved")}
						className={selectClass}
					>
						<option value="draft">Draft</option>
						<option value="pending">Pending</option>
						<option value="approved">Approved</option>
					</select>
				</div>
			</div>

			{/* Rows Table */}
			<div className="overflow-auto max-h-[320px] rounded-lg border border-gray-200 dark:border-gray-700">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
						<tr>
							<th className={cn(headerCellClass, "w-12")}>#</th>
							<th className={headerCellClass}>Status</th>
							<th className={headerCellClass}>Name</th>
							<th className={headerCellClass}>Details</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
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
