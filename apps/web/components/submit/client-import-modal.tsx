"use client";

import { useState, useCallback } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useClientItemImport } from "@/hooks/use-item-import-export";
import { ImportUploadStep } from "@/components/admin/items/import/import-upload-step";
import { ImportMappingStep } from "@/components/admin/items/import/import-mapping-step";
import { ImportPreviewStep } from "@/components/admin/items/import/import-preview-step";
import { ImportResultsStep } from "@/components/admin/items/import/import-results-step";
import type {
	ColumnMapping,
	ImportRowValidation,
	ImportResult,
} from "@/lib/types/item-import-export";

interface ClientImportModalProps {
	isOpen: boolean;
	onClose: () => void;
}

type WizardStep = "upload" | "mapping" | "preview" | "results";

const STEP_KEYS: { key: WizardStep; translationKey: string }[] = [
	{ key: "upload", translationKey: "STEP_UPLOAD" },
	{ key: "mapping", translationKey: "STEP_MAPPING" },
	{ key: "preview", translationKey: "STEP_PREVIEW" },
	{ key: "results", translationKey: "STEP_RESULTS" },
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
	"bg-gray-200 dark:bg-white/8 text-gray-500 dark:text-gray-400"
);

export function ClientImportModal({ isOpen, onClose }: ClientImportModalProps) {
	const t = useTranslations("admin.ITEM_IMPORT");
	const [step, setStep] = useState<WizardStep>("upload");
	const [file, setFile] = useState<File | null>(null);
	const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
	const [mapping, setMapping] = useState<ColumnMapping>({});
	const [validationResults, setValidationResults] = useState<ImportRowValidation[]>([]);
	const [summary, setSummary] = useState({ total: 0, valid: 0, errors: 0, duplicates: 0 });
	const [importResult, setImportResult] = useState<ImportResult | null>(null);

	const { validateImport, executeImport, downloadSample, isValidating, isImporting, isDownloading } = useClientItemImport();

	const resetState = useCallback(() => {
		setStep("upload");
		setFile(null);
		setSourceHeaders([]);
		setMapping({});
		setValidationResults([]);
		setSummary({ total: 0, valid: 0, errors: 0, duplicates: 0 });
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

			const result = await validateImport(selectedFile, {});
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

		const result = await validateImport(file, mapping);
		if (result) {
			setValidationResults(result.validationResults);
			setSummary(result.summary);
			setStep("preview");
		}
	}, [file, mapping, validateImport]);

	// Step 3 → 4: Execute import
	const handleImport = useCallback(async () => {
		setStep("results");

		const result = await executeImport(validationResults);

		if (result) {
			setImportResult(result);
		}
	}, [validationResults, executeImport]);

	const currentStepIndex = STEP_KEYS.findIndex((s) => s.key === step);
	const canImport = summary.valid > 0 && step === "preview";

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={t("IMPORT_MODAL_TITLE")}
			size="4xl"
			isDismissable={step !== "results" || !isImporting}
		>
			{/* Step Indicator */}
			<div className="flex items-center justify-center gap-2 px-6 py-3 border-b border-gray-200 dark:border-white/6">
				{STEP_KEYS.map((s, i) => (
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
							{t(s.translationKey)}
						</span>
						{i < STEP_KEYS.length - 1 && (
							<div className="w-8 h-px bg-gray-300 dark:bg-white/1 mx-1" />
						)}
					</div>
				))}
			</div>

			<ModalBody>
				{step === "upload" && (
					<ImportUploadStep
						onFileSelected={handleFileSelected}
						onDownloadSample={downloadSample}
						isDownloadingSample={isDownloading}
					/>
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
						duplicateStrategy="skip"
						onDuplicateStrategyChange={() => {}}
						defaultStatus="pending"
						onDefaultStatusChange={() => {}}
						showOptions={false}
					/>
				)}

				{step === "results" && (
					<ImportResultsStep result={importResult} isImporting={isImporting} />
				)}
			</ModalBody>

			<ModalFooter>
				{step === "upload" && (
					<Button variant="outline" onClick={handleClose}>
						{t("CANCEL")}
					</Button>
				)}

				{step === "mapping" && (
					<>
						<Button variant="outline" onClick={() => setStep("upload")}>
							{t("BACK")}
						</Button>
						<Button
							onClick={handleMappingNext}
							disabled={isValidating}
						>
							{isValidating ? t("VALIDATING") : t("NEXT")}
						</Button>
					</>
				)}

				{step === "preview" && (
					<>
						<Button variant="outline" onClick={() => setStep("mapping")}>
							{t("BACK")}
						</Button>
						<Button
							onClick={handleImport}
							disabled={!canImport || isValidating}
						>
							{t("IMPORT_N_ITEMS", { count: summary.valid })}
						</Button>
					</>
				)}

				{step === "results" && (
					<Button onClick={handleClose} disabled={isImporting}>
						{t("CLOSE")}
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
}
