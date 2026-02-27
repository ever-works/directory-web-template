"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { ImportResult } from "@/lib/types/item-import-export";

interface ImportResultsStepProps {
	result: ImportResult | null;
	isImporting: boolean;
}

const statCardClass = cn(
	"flex flex-col items-center p-4 rounded-lg",
	"bg-gray-50 dark:bg-gray-800/50"
);

export function ImportResultsStep({ result, isImporting }: ImportResultsStepProps) {
	if (isImporting) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12">
				<Loader2 className="w-10 h-10 text-theme-primary animate-spin" />
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Importing items...
				</p>
			</div>
		);
	}

	if (!result) return null;

	const hasErrors = result.errors.length > 0;

	return (
		<div className="space-y-6">
			{/* Status Header */}
			<div className="flex items-center gap-3">
				{hasErrors ? (
					<AlertCircle className="w-8 h-8 text-amber-500" />
				) : (
					<CheckCircle className="w-8 h-8 text-green-500" />
				)}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						{hasErrors ? "Import completed with issues" : "Import completed successfully"}
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{result.created} created, {result.updated} updated, {result.skipped} skipped
					</p>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-4 gap-3">
				<div className={statCardClass}>
					<span className="text-xl font-bold text-gray-900 dark:text-white">{result.total}</span>
					<span className="text-xs text-gray-500">Total Rows</span>
				</div>
				<div className={statCardClass}>
					<span className="text-xl font-bold text-green-600">{result.created}</span>
					<span className="text-xs text-gray-500">Created</span>
				</div>
				<div className={statCardClass}>
					<span className="text-xl font-bold text-blue-600">{result.updated}</span>
					<span className="text-xs text-gray-500">Updated</span>
				</div>
				<div className={statCardClass}>
					<span className="text-xl font-bold text-gray-500">{result.skipped}</span>
					<span className="text-xs text-gray-500">Skipped</span>
				</div>
			</div>

			{/* Errors */}
			{hasErrors && (
				<div className="space-y-2">
					<h4 className="text-sm font-medium text-red-600 dark:text-red-400">
						Errors ({result.errors.length})
					</h4>
					<div className="max-h-[200px] overflow-auto rounded-lg border border-red-200 dark:border-red-800">
						{result.errors.map((error, idx) => (
							<div
								key={idx}
								className={cn(
									"px-3 py-2 text-xs text-red-700 dark:text-red-300",
									idx > 0 && "border-t border-red-100 dark:border-red-800"
								)}
							>
								{error.rowIndex >= 0 ? `Row ${error.rowIndex + 1}: ` : ""}
								{error.message}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
