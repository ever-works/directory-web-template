import { NextRequest, NextResponse } from 'next/server';
import { ItemExportService } from '@/lib/services/item-export.service';
import { getExportEnabled } from '@/lib/utils/settings';
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * GET /api/items/export?format=csv|xlsx
 * Public endpoint to export approved items.
 * Only available when export_enabled is true in config.yml.
 */
export async function GET(request: NextRequest) {
	try {
		if (!getExportEnabled()) {
			return NextResponse.json(
				{ success: false, error: 'Export is not enabled.' },
				{ status: 403 }
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
			const result = await exportService.exportToXLSX({ publicOnly: true });
			return new NextResponse(new Uint8Array(result.data), {
				headers: {
					'Content-Type': result.contentType,
					'Content-Disposition': `attachment; filename="${result.filename}"`,
				},
			});
		}

		const result = await exportService.exportToCSV({ publicOnly: true });
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
