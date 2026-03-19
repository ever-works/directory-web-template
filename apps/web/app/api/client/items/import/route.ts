import { NextRequest, NextResponse } from 'next/server';
import { requireClientAuth } from '@/lib/utils/client-auth';
import { ItemImportService } from '@/lib/services/item-import.service';
import { safeErrorResponse } from '@/lib/utils/api-error';
import type { ImportRowValidation } from '@/lib/types/item-import-export';

interface ClientImportRequestBody {
	rows: ImportRowValidation[];
}

/**
 * POST /api/client/items/import
 * Execute client import. All items set to status: pending, submitted_by: userId.
 * No update-existing option — always creates new items (duplicates are skipped).
 */
export async function POST(request: NextRequest) {
	try {
		const authResult = await requireClientAuth();
		if (!authResult.success) return authResult.response;

		const { userId } = authResult;

		const body = (await request.json()) as ClientImportRequestBody;

		if (!body.rows || !Array.isArray(body.rows)) {
			return NextResponse.json(
				{ success: false, error: 'Missing or invalid rows array.' },
				{ status: 400 }
			);
		}

		const importService = new ItemImportService();
		const result = await importService.executeImport(body.rows, {
			duplicateStrategy: 'skip',
			defaultStatus: 'pending',
			submittedBy: userId,
		});

		return NextResponse.json({
			success: true,
			result,
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to execute import');
	}
}
