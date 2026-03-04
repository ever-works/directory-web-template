import { NextRequest, NextResponse } from 'next/server';
import { requireClientAuth } from '@/lib/utils/client-auth';
import { ItemExportService } from '@/lib/services/item-export.service';
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * GET /api/client/items/import/sample?format=csv|xlsx
 * Client endpoint to download a sample import template.
 */
export async function GET(request: NextRequest) {
	try {
		const authResult = await requireClientAuth();
		if (!authResult.success) return authResult.response;

		const { searchParams } = new URL(request.url);
		const format = searchParams.get('format') || 'csv';

		if (format !== 'csv' && format !== 'xlsx') {
			return NextResponse.json(
				{ success: false, error: 'Invalid format. Use "csv" or "xlsx".' },
				{ status: 400 }
			);
		}

		const exportService = new ItemExportService();

		if (format === 'xlsx') {
			const result = await exportService.generateSampleXLSX();
			return new NextResponse(new Uint8Array(result.data), {
				headers: {
					'Content-Type': result.contentType,
					'Content-Disposition': `attachment; filename="${result.filename}"`,
				},
			});
		}

		const result = exportService.generateSampleCSV();
		return new NextResponse(result.data, {
			headers: {
				'Content-Type': result.contentType,
				'Content-Disposition': `attachment; filename="${result.filename}"`,
			},
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to generate sample template');
	}
}
