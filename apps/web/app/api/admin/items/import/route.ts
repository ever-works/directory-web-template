import { NextRequest, NextResponse } from 'next/server';
import { ItemImportService } from '@/lib/services/item-import.service';
import { safeErrorResponse } from '@/lib/utils/api-error';
import type { ImportRowValidation, ImportDuplicateStrategy } from '@/lib/types/item-import-export';
import { requireAdminSession } from '@/lib/auth/admin-guard';

interface ImportRequestBody {
	rows: ImportRowValidation[];
	options: {
		duplicateStrategy: ImportDuplicateStrategy;
		defaultStatus: 'draft' | 'pending' | 'approved';
	};
}

/**
 * POST /api/admin/items/import
 * Execute the import: writes validated rows to git data repo.
 */
export async function POST(request: NextRequest) {
	try {
		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;
		const { session } = authResult;

		const body = (await request.json()) as ImportRequestBody;

		if (!body.rows || !Array.isArray(body.rows)) {
			return NextResponse.json(
				{ success: false, error: 'Missing or invalid rows array.' },
				{ status: 400 }
			);
		}

		if (!body.options) {
			return NextResponse.json(
				{ success: false, error: 'Missing import options.' },
				{ status: 400 }
			);
		}

		const importService = new ItemImportService();
		const result = await importService.executeImport(body.rows, {
			duplicateStrategy: body.options.duplicateStrategy || 'skip',
			defaultStatus: body.options.defaultStatus || 'draft',
			submittedBy: session.user.email || 'admin',
		});

		return NextResponse.json({
			success: true,
			result,
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to execute import');
	}
}
