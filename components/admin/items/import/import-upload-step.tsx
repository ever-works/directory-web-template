"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Uppy from "@uppy/core";
import useUppyState from "@uppy/react/lib/useUppyState";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImportUploadStepProps {
	onFileSelected: (file: File) => void;
}

const ACCEPTED_TYPES = [".csv", ".xlsx", ".xls"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const dropzoneBaseClass = cn(
	"relative flex flex-col items-center justify-center gap-4 p-10",
	"border-2 border-dashed rounded-xl",
	"transition-colors duration-200 cursor-pointer"
);

const dropzoneIdleClass = cn(
	"border-gray-300 dark:border-gray-600",
	"bg-gray-50/50 dark:bg-gray-800/30",
	"hover:border-theme-primary/50 hover:bg-theme-primary/5"
);

const dropzoneActiveClass = cn(
	"border-theme-primary bg-theme-primary/10",
	"dark:border-theme-primary dark:bg-theme-primary/10"
);

const dropzoneErrorClass = cn(
	"border-red-400 bg-red-50/50",
	"dark:border-red-500 dark:bg-red-900/10"
);

export function ImportUploadStep({ onFileSelected }: ImportUploadStepProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const uppy = useMemo(
		() =>
			new Uppy({
				restrictions: {
					maxFileSize: MAX_FILE_SIZE,
					maxNumberOfFiles: 1,
					allowedFileTypes: ACCEPTED_TYPES,
				},
				autoProceed: false,
			}),
		[]
	);

	const files = useUppyState(uppy, (state) => state.files);
	const selectedFile = useMemo(() => {
		const fileIds = Object.keys(files);
		return fileIds.length > 0 ? files[fileIds[0]] : null;
	}, [files]);

	// Clean up Uppy on unmount
	useEffect(() => {
		return () => {
			uppy.clear();
		};
	}, [uppy]);

	const handleFile = useCallback(
		(file: File) => {
			setError(null);
			uppy.clear();

			try {
				uppy.addFile({
					name: file.name,
					type: file.type,
					data: file,
					source: "local",
				});
				onFileSelected(file);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Invalid file";
				setError(message);
			}
		},
		[uppy, onFileSelected]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragOver(false);

			const droppedFile = e.dataTransfer.files[0];
			if (droppedFile) {
				handleFile(droppedFile);
			}
		},
		[handleFile]
	);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				handleFile(file);
			}
			// Reset input so the same file can be re-selected
			e.target.value = "";
		},
		[handleFile]
	);

	return (
		<div className="space-y-4">
			<div
				className={cn(
					dropzoneBaseClass,
					error ? dropzoneErrorClass : isDragOver ? dropzoneActiveClass : dropzoneIdleClass
				)}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
			>
				<input
					type="file"
					accept={ACCEPTED_TYPES.join(",")}
					onChange={handleInputChange}
					className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
					aria-label="Select file to import"
				/>

				{selectedFile ? (
					<>
						<FileSpreadsheet className="w-12 h-12 text-theme-primary" />
						<div className="text-center">
							<p className="text-sm font-medium text-gray-900 dark:text-white">
								{selectedFile.name}
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								{formatFileSize(selectedFile.size ?? 0)}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								uppy.clear();
								setError(null);
							}}
						>
							Choose different file
						</Button>
					</>
				) : (
					<>
						<Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
						<div className="text-center">
							<p className="text-sm font-medium text-gray-700 dark:text-gray-200">
								Drop your file here or click to browse
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								CSV or Excel files, up to 10 MB
							</p>
						</div>
					</>
				)}
			</div>

			{error && (
				<div className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
					<AlertCircle className="w-4 h-4 shrink-0" />
					{error}
				</div>
			)}
		</div>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
