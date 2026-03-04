import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ItemExportService } from '@/lib/services/item-export.service';
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * GET /api/admin/items/export/sample?format=csv|xlsx
 * Admin-only endpoint to download a sample import template.
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

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
