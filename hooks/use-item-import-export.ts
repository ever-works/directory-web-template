'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

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
