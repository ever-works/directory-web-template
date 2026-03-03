import { NextRequest, NextResponse } from 'next/server';
import { requireClientAuth } from '@/lib/utils/client-auth';
import { ItemImportService } from '@/lib/services/item-import.service';
import { safeErrorResponse } from '@/lib/utils/api-error';
import type { ColumnMapping } from '@/lib/types/item-import-export';

/**
 * POST /api/client/items/import/validate
 * Client-side import validation. Simplified: always skip duplicates, status forced to pending.
 */
export async function POST(request: NextRequest) {
	try {
		const authResult = await requireClientAuth();
		if (!authResult.success) return authResult.response;

		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return NextResponse.json(
				{ success: false, error: 'No file provided.' },
				{ status: 400 }
			);
		}

		// Validate file type
		const filename = file.name.toLowerCase();
		const isCSV = filename.endsWith('.csv');
		const isXLSX = filename.endsWith('.xlsx') || filename.endsWith('.xls');

		if (!isCSV && !isXLSX) {
			return NextResponse.json(
				{ success: false, error: 'Invalid file type. Only CSV and XLSX files are supported.' },
				{ status: 400 }
			);
		}

		// Validate file size (10 MB max)
		if (file.size > 10 * 1024 * 1024) {
			return NextResponse.json(
				{ success: false, error: 'File too large. Maximum size is 10 MB.' },
				{ status: 400 }
			);
		}

		// Parse mapping from form data
		const mappingRaw = formData.get('mapping') as string | null;

		let columnMapping: ColumnMapping = {};
		if (mappingRaw) {
			try {
				columnMapping = JSON.parse(mappingRaw);
			} catch {
				return NextResponse.json(
					{ success: false, error: 'Invalid column mapping JSON.' },
					{ status: 400 }
				);
			}
		}

		const importService = new ItemImportService();

		// Parse file
		let parsed;
		if (isCSV) {
			const text = await file.text();
			parsed = importService.parseCSV(text);
		} else {
			const arrayBuffer = await file.arrayBuffer();
			parsed = importService.parseXLSX(Buffer.from(arrayBuffer));
		}

		if (parsed.rows.length === 0) {
			return NextResponse.json(
				{ success: false, error: 'File contains no data rows.' },
				{ status: 400 }
			);
		}

		// If no mapping provided, auto-suggest one
		const effectiveMapping = Object.keys(columnMapping).length > 0
			? columnMapping
			: importService.suggestColumnMapping(parsed.headers);

		// Validate rows — client always uses skip + pending
		const result = await importService.validateRows(parsed.rows, {
			columnMapping: effectiveMapping,
			duplicateStrategy: 'skip',
			defaultStatus: 'pending',
		});

		return NextResponse.json({
			success: true,
			headers: parsed.headers,
			suggestedMapping: result.suggestedMapping,
			validationResults: result.validationResults,
			summary: result.summary,
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to validate import file');
	}
}
