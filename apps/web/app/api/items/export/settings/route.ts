import { NextResponse } from 'next/server';
import { getExportEnabled } from '@/lib/utils/settings';

/**
 * GET /api/items/export/settings
 * Public endpoint returning export feature status.
 * Used by frontend to conditionally show export buttons.
 */
export async function GET() {
	return NextResponse.json({
		export_enabled: getExportEnabled(),
	});
}
