import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/lib/config-manager';
import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * GET /api/admin/settings
 * Retrieves the settings section from .works/works.yml
 */
export async function GET() {
	try {
		const authError = await checkAdminAuth();
		if (authError) return authError;

		const config = configManager.getConfig();
		const settings = config.settings || {};

		return NextResponse.json(
			{
				success: true,
				data: settings,
				// Legacy field retained for backward compatibility (see EW-606)
				settings,
			},
			{ status: 200 }
		);
	} catch (error) {
		return safeErrorResponse(error, 'Failed to fetch settings');
	}
}

/**
 * PATCH /api/admin/settings
 * Updates specific settings in .works/works.yml
 * Request body: { key: string, value: unknown }
 */
export async function PATCH(req: NextRequest) {
	try {
		const authError = await checkAdminAuth();
		if (authError) return authError;

		const body = await req.json();
		const { key, value } = body;

		if (!key) {
			return NextResponse.json(
				{ success: false, error: 'Key is required' },
				{ status: 400 }
			);
		}

		const settingsKey = `settings.${key}`;
		const updated = await configManager.updateNestedKey(settingsKey, value);

		if (!updated) {
			return NextResponse.json(
				{ success: false, error: 'Failed to update setting' },
				{ status: 500 }
			);
		}

		return NextResponse.json(
			{
				success: true,
				data: { key, value },
				// Legacy fields retained for backward compatibility (see EW-606)
				key,
				value,
			},
			{ status: 200 }
		);
	} catch (error) {
		return safeErrorResponse(error, 'Failed to update settings');
	}
}
