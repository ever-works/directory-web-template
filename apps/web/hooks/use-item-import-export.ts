'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
	ColumnMapping,
	ImportDuplicateStrategy,
	ImportRowValidation,
	ImportResult,
} from '@/lib/types/item-import-export';

type ExportFormat = 'csv' | 'xlsx';

/**
 * Trigger a file download from an API endpoint.
 */
async function downloadFile(url: string, fallbackFilename: string): Promise<void> {
	const response = await fetch(url);

	if (!response.ok) {
		const body = await response.json().catch(() => null);
		throw new Error(body?.error || `Download failed (${response.status})`);
	}

	const blob = await response.blob();

	// Extract filename from Content-Disposition header
	const disposition = response.headers.get('Content-Disposition');
	let filename = fallbackFilename;
	if (disposition) {
		const match = disposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1];
	}

	const blobUrl = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = blobUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(blobUrl);
}

/**
 * Hook for item export operations (admin).
 */
export function useItemExport() {
	const [isExporting, setIsExporting] = useState(false);

	const exportItems = useCallback(async (format: ExportFormat) => {
		setIsExporting(true);
		try {
			await downloadFile(`/api/admin/items/export?format=${format}`, `items-export.${format}`);
			toast.success(`Items exported as ${format.toUpperCase()}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Export failed';
			toast.error(message);
		} finally {
			setIsExporting(false);
		}
	}, []);

	const downloadSample = useCallback(async (format: ExportFormat) => {
		setIsExporting(true);
		try {
			await downloadFile(`/api/admin/items/export/sample?format=${format}`, `items-import-template.${format}`);
			toast.success('Template downloaded');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Download failed';
			toast.error(message);
		} finally {
			setIsExporting(false);
		}
	}, []);

	return {
		exportItems,
		downloadSample,
		isExporting,
	};
}

/**
 * Hook for public item export (checks if export is enabled via config).
 */
export function usePublicItemExport() {
	const [isExporting, setIsExporting] = useState(false);

	const { data: settings } = useQuery({
		queryKey: ['items', 'export', 'settings'],
		queryFn: async () => {
			const response = await fetch('/api/items/export/settings');
			if (!response.ok) return { export_enabled: false };
			return response.json() as Promise<{ export_enabled: boolean }>;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	const exportItems = useCallback(async (format: ExportFormat) => {
		setIsExporting(true);
		try {
			await downloadFile(`/api/items/export?format=${format}`, `items.${format}`);
			toast.success(`Items exported as ${format.toUpperCase()}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Export failed';
			toast.error(message);
		} finally {
			setIsExporting(false);
		}
	}, []);

	return {
		exportItems,
		isExporting,
		exportEnabled: settings?.export_enabled ?? false,
	};
}

// ===================== Import Types =====================

interface ValidateImportResponse {
	success: boolean;
	error?: string;
	headers: string[];
	suggestedMapping: ColumnMapping;
	validationResults: ImportRowValidation[];
	summary: {
		total: number;
		valid: number;
		errors: number;
		duplicates: number;
	};
}

interface ExecuteImportResponse {
	success: boolean;
	error?: string;
	result: ImportResult;
}

// ===================== Import Hook =====================

/**
 * Hook for admin item import operations.
 */
export function useItemImport() {
	const [isValidating, setIsValidating] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

	const validateImport = useCallback(
		async (
			file: File,
			mapping: ColumnMapping,
			duplicateStrategy: ImportDuplicateStrategy,
			defaultStatus: 'draft' | 'pending' | 'approved'
		): Promise<ValidateImportResponse | null> => {
			setIsValidating(true);
			try {
				const formData = new FormData();
				formData.append('file', file);
				formData.append('mapping', JSON.stringify(mapping));
				formData.append('duplicateStrategy', duplicateStrategy);
				formData.append('defaultStatus', defaultStatus);

				const response = await fetch('/api/admin/items/import/validate', {
					method: 'POST',
					body: formData,
				});

				const data = (await response.json()) as ValidateImportResponse;

				if (!response.ok || !data.success) {
					toast.error(data.error || 'Validation failed');
					return null;
				}

				return data;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Validation failed';
				toast.error(message);
				return null;
			} finally {
				setIsValidating(false);
			}
		},
		[]
	);

	const executeImport = useCallback(
		async (
			rows: ImportRowValidation[],
			options: {
				duplicateStrategy: ImportDuplicateStrategy;
				defaultStatus: 'draft' | 'pending' | 'approved';
			}
		): Promise<ImportResult | null> => {
			setIsImporting(true);
			try {
				const response = await fetch('/api/admin/items/import', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ rows, options }),
				});

				const data = (await response.json()) as ExecuteImportResponse;

				if (!response.ok || !data.success) {
					toast.error(data.error || 'Import failed');
					return null;
				}

				const { result } = data;
				toast.success(`Imported ${result.created} items${result.updated > 0 ? `, updated ${result.updated}` : ''}`);
				return result;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Import failed';
				toast.error(message);
				return null;
			} finally {
				setIsImporting(false);
			}
		},
		[]
	);

	return {
		validateImport,
		executeImport,
		isValidating,
		isImporting,
	};
}

// ===================== Client Import Hook =====================

/**
 * Hook for client-side item import operations.
 * Simplified: always skip duplicates, status forced to pending.
 */
export function useClientItemImport() {
	const [isValidating, setIsValidating] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const downloadSample = useCallback(async (format: ExportFormat) => {
		setIsDownloading(true);
		try {
			await downloadFile(`/api/client/items/import/sample?format=${format}`, `items-import-template.${format}`);
			toast.success('Template downloaded');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Download failed';
			toast.error(message);
		} finally {
			setIsDownloading(false);
		}
	}, []);

	const validateImport = useCallback(
		async (
			file: File,
			mapping: ColumnMapping
		): Promise<ValidateImportResponse | null> => {
			setIsValidating(true);
			try {
				const formData = new FormData();
				formData.append('file', file);
				formData.append('mapping', JSON.stringify(mapping));

				const response = await fetch('/api/client/items/import/validate', {
					method: 'POST',
					body: formData,
				});

				const data = (await response.json()) as ValidateImportResponse;

				if (!response.ok || !data.success) {
					toast.error(data.error || 'Validation failed');
					return null;
				}

				return data;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Validation failed';
				toast.error(message);
				return null;
			} finally {
				setIsValidating(false);
			}
		},
		[]
	);

	const executeImport = useCallback(
		async (rows: ImportRowValidation[]): Promise<ImportResult | null> => {
			setIsImporting(true);
			try {
				const response = await fetch('/api/client/items/import', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ rows }),
				});

				const data = (await response.json()) as ExecuteImportResponse;

				if (!response.ok || !data.success) {
					toast.error(data.error || 'Import failed');
					return null;
				}

				const { result } = data;
				toast.success(`Imported ${result.created} items`);
				return result;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Import failed';
				toast.error(message);
				return null;
			} finally {
				setIsImporting(false);
			}
		},
		[]
	);

	return {
		validateImport,
		executeImport,
		downloadSample,
		isValidating,
		isImporting,
		isDownloading,
	};
}
