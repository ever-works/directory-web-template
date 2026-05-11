import { NextRequest, NextResponse } from 'next/server';
import { ItemExportService } from '@/lib/services/item-export.service';
import { exportQuerySchema } from '@/lib/validations/item-import';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { checkAdminAuth } from '@/lib/auth/admin-guard';

/**
 * GET /api/admin/items/export?format=csv|xlsx
 * Admin-only endpoint to export all items.
 */
export async function GET(request: NextRequest) {
	try {
		const authError = await checkAdminAuth();
		if (authError) return authError;

		const { searchParams } = new URL(request.url);
		const { format } = exportQuerySchema.parse(Object.fromEntries(searchParams));

		const exportService = new ItemExportService();

		if (format === 'xlsx') {
			const result = await exportService.exportToXLSX();
			return new NextResponse(new Uint8Array(result.data), {
				headers: {
					'Content-Type': result.contentType,
					'Content-Disposition': `attachment; filename="${result.filename}"`,
				},
			});
		}

		const result = await exportService.exportToCSV();
		return new NextResponse(result.data, {
			headers: {
				'Content-Type': result.contentType,
				'Content-Disposition': `attachment; filename="${result.filename}"`,
			},
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to export items');
	}
}
