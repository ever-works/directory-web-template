"use client";

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import type { ColumnMapping } from "@/lib/types/item-import-export";
import { IMPORTABLE_FIELDS, ALL_IMPORTABLE_FIELDS } from "@/lib/types/item-import-export";

interface ImportMappingStepProps {
	sourceHeaders: string[];
	mapping: ColumnMapping;
	onMappingChange: (mapping: ColumnMapping) => void;
}

const selectClass = cn(
	"w-full px-3 py-2 text-sm rounded-lg",
	"bg-white dark:bg-gray-800",
	"border border-gray-200 dark:border-gray-700",
	"text-gray-900 dark:text-white",
	"focus:outline-none focus:ring-2 focus:ring-theme-primary/50",
	"transition-colors duration-150"
);

const headerCellClass = cn(
	"px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider",
	"text-gray-500 dark:text-gray-400"
);

const bodyCellClass = cn(
	"px-4 py-3 text-sm"
);

export function ImportMappingStep({
	sourceHeaders,
	mapping,
	onMappingChange,
}: ImportMappingStepProps) {
	const requiredFields = IMPORTABLE_FIELDS.required as readonly string[];

	// Find unmapped required fields
	const mappedTargets = new Set(Object.values(mapping).filter((v) => v && v !== "skip"));
	const unmappedRequired = requiredFields.filter((field) => !mappedTargets.has(field));

	const handleChange = (sourceCol: string, targetField: string) => {
		const updated = { ...mapping, [sourceCol]: targetField };
		onMappingChange(updated);
	};

	return (
		<div className="space-y-4">
			{unmappedRequired.length > 0 && (
				<div className="flex items-start gap-2 p-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
					<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
					<div>
						<p className="font-medium">Required fields not mapped:</p>
						<p className="mt-0.5">{unmappedRequired.join(", ")}</p>
					</div>
				</div>
			)}

			<div className="overflow-auto max-h-[400px] rounded-lg border border-gray-200 dark:border-gray-700">
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
						<tr>
							<th className={headerCellClass}>File Column</th>
							<th className={headerCellClass}>Map To</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
						{sourceHeaders.map((header) => {
							const targetField = mapping[header] || "";
							const isRequired = requiredFields.includes(targetField);

							return (
								<tr
									key={header}
									className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
								>
									<td className={cn(bodyCellClass, "font-medium text-gray-700 dark:text-gray-200")}>
										{header}
									</td>
									<td className={bodyCellClass}>
										<select
											value={targetField}
											onChange={(e) => handleChange(header, e.target.value)}
											className={cn(
												selectClass,
												isRequired && "ring-1 ring-green-400 dark:ring-green-600"
											)}
										>
											<option value="skip">-- Skip --</option>
											<optgroup label="Required">
												{IMPORTABLE_FIELDS.required.map((field) => (
													<option key={field} value={field}>
														{field} *
													</option>
												))}
											</optgroup>
											<optgroup label="Optional">
												{IMPORTABLE_FIELDS.optional.map((field) => (
													<option key={field} value={field}>
														{field}
													</option>
												))}
											</optgroup>
										</select>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<p className="text-xs text-gray-500 dark:text-gray-400">
				{ALL_IMPORTABLE_FIELDS.length} fields available.
				Array values (tags, category, images, collections) should be separated by semicolons.
			</p>
		</div>
	);
}
