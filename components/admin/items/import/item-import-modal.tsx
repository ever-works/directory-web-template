"use client";

import { useState, useCallback } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useItemImport } from "@/hooks/use-item-import-export";
import { ImportUploadStep } from "./import-upload-step";
import { ImportMappingStep } from "./import-mapping-step";
import { ImportPreviewStep } from "./import-preview-step";
import { ImportResultsStep } from "./import-results-step";
import type {
	ColumnMapping,
	ImportRowValidation,
	ImportDuplicateStrategy,
	ImportResult,
} from "@/lib/types/item-import-export";

interface ItemImportModalProps {
	isOpen: boolean;
	onClose: () => void;
}

type WizardStep = "upload" | "mapping" | "preview" | "results";

const STEPS: { key: WizardStep; label: string }[] = [
	{ key: "upload", label: "Upload" },
	{ key: "mapping", label: "Mapping" },
	{ key: "preview", label: "Preview" },
	{ key: "results", label: "Results" },
];

const stepIndicatorBase = cn(
	"flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium",
	"transition-colors duration-200"
);

const stepIndicatorActive = cn(
	"bg-theme-primary text-white"
);

const stepIndicatorDone = cn(
	"bg-green-500 text-white"
);

const stepIndicatorPending = cn(
	"bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
);

export function ItemImportModal({ isOpen, onClose }: ItemImportModalProps) {
	const [step, setStep] = useState<WizardStep>("upload");
	const [file, setFile] = useState<File | null>(null);
	const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
	const [mapping, setMapping] = useState<ColumnMapping>({});
	const [validationResults, setValidationResults] = useState<ImportRowValidation[]>([]);
	const [summary, setSummary] = useState({ total: 0, valid: 0, errors: 0, duplicates: 0 });
	const [duplicateStrategy, setDuplicateStrategy] = useState<ImportDuplicateStrategy>("skip");
	const [defaultStatus, setDefaultStatus] = useState<"draft" | "pending" | "approved">("draft");
	const [importResult, setImportResult] = useState<ImportResult | null>(null);

	const { validateImport, executeImport, isValidating, isImporting } = useItemImport();

	const resetState = useCallback(() => {
		setStep("upload");
		setFile(null);
		setSourceHeaders([]);
		setMapping({});
		setValidationResults([]);
		setSummary({ total: 0, valid: 0, errors: 0, duplicates: 0 });
		setDuplicateStrategy("skip");
		setDefaultStatus("draft");
		setImportResult(null);
	}, []);

	const handleClose = useCallback(() => {
		resetState();
		onClose();
	}, [resetState, onClose]);

	// Step 1: File selected → validate with empty mapping to get headers + suggestions
	const handleFileSelected = useCallback(
		async (selectedFile: File) => {
			setFile(selectedFile);

			const result = await validateImport(selectedFile, {}, "skip", "draft");
			if (result) {
				setSourceHeaders(result.headers);
				setMapping(result.suggestedMapping);
				setStep("mapping");
			}
		},
		[validateImport]
	);

	// Step 2 → 3: Re-validate with final mapping
	const handleMappingNext = useCallback(async () => {
		if (!file) return;

		const result = await validateImport(file, mapping, duplicateStrategy, defaultStatus);
		if (result) {
			setValidationResults(result.validationResults);
			setSummary(result.summary);
			setStep("preview");
		}
	}, [file, mapping, duplicateStrategy, defaultStatus, validateImport]);

	// Step 3 → 4: Execute import
	const handleImport = useCallback(async () => {
		setStep("results");

		const result = await executeImport(validationResults, {
			duplicateStrategy,
			defaultStatus,
		});

		if (result) {
			setImportResult(result);
		}
	}, [validationResults, duplicateStrategy, defaultStatus, executeImport]);

	// Re-validate when duplicate strategy or default status changes in preview
	const handleOptionsChange = useCallback(
		async (newStrategy: ImportDuplicateStrategy, newStatus: "draft" | "pending" | "approved") => {
			setDuplicateStrategy(newStrategy);
			setDefaultStatus(newStatus);

			if (!file) return;
			const result = await validateImport(file, mapping, newStrategy, newStatus);
			if (result) {
				setValidationResults(result.validationResults);
				setSummary(result.summary);
			}
		},
		[file, mapping, validateImport]
	);

	const currentStepIndex = STEPS.findIndex((s) => s.key === step);
	const canImport = summary.valid > 0 && step === "preview";

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title="Import Items"
			size="4xl"
			isDismissable={step !== "results" || !isImporting}
		>
			{/* Step Indicator */}
			<div className="flex items-center justify-center gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700/50">
				{STEPS.map((s, i) => (
					<div key={s.key} className="flex items-center gap-2">
						<div
							className={cn(
								stepIndicatorBase,
								i < currentStepIndex
									? stepIndicatorDone
									: i === currentStepIndex
										? stepIndicatorActive
										: stepIndicatorPending
							)}
						>
							{i + 1}
						</div>
						<span
							className={cn(
								"text-xs hidden sm:inline",
								i === currentStepIndex
									? "text-gray-900 dark:text-white font-medium"
									: "text-gray-400 dark:text-gray-500"
							)}
						>
							{s.label}
						</span>
						{i < STEPS.length - 1 && (
							<div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-1" />
						)}
					</div>
				))}
			</div>

			<ModalBody>
				{step === "upload" && (
					<ImportUploadStep onFileSelected={handleFileSelected} />
				)}

				{step === "mapping" && (
					<ImportMappingStep
						sourceHeaders={sourceHeaders}
						mapping={mapping}
						onMappingChange={setMapping}
					/>
				)}

				{step === "preview" && (
					<ImportPreviewStep
						validationResults={validationResults}
						summary={summary}
						duplicateStrategy={duplicateStrategy}
						onDuplicateStrategyChange={(s) => handleOptionsChange(s, defaultStatus)}
						defaultStatus={defaultStatus}
						onDefaultStatusChange={(s) => handleOptionsChange(duplicateStrategy, s)}
					/>
				)}

				{step === "results" && (
					<ImportResultsStep result={importResult} isImporting={isImporting} />
				)}
			</ModalBody>

			<ModalFooter>
				{step === "upload" && (
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
				)}

				{step === "mapping" && (
					<>
						<Button variant="outline" onClick={() => setStep("upload")}>
							Back
						</Button>
						<Button
							onClick={handleMappingNext}
							disabled={isValidating}
						>
							{isValidating ? "Validating..." : "Next"}
						</Button>
					</>
				)}

				{step === "preview" && (
					<>
						<Button variant="outline" onClick={() => setStep("mapping")}>
							Back
						</Button>
						<Button
							onClick={handleImport}
							disabled={!canImport || isValidating}
						>
							Import {summary.valid} items
						</Button>
					</>
				)}

				{step === "results" && (
					<Button onClick={handleClose} disabled={isImporting}>
						Close
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
}
