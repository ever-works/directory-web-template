import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/lib/config-manager';
import { getCachedApiSession } from '@/lib/auth/cached-session';

/**
 * GET /api/admin/settings
 * Retrieves the settings section from config.yml
 */
export async function GET(req: NextRequest) {
	try {
		// Check admin authentication
		const session = await getCachedApiSession(req);
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get settings from config
		const config = configManager.getConfig();
		const settings = config.settings || {};

		return NextResponse.json({ settings }, { status: 200 });
	} catch (error) {
		console.error('Error fetching settings:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch settings' },
			{ status: 500 }
		);
	}
}

/**
 * PATCH /api/admin/settings
 * Updates specific settings in config.yml
 * Request body: { key: string, value: unknown }
 */
export async function PATCH(req: NextRequest) {
	try {
		// Check admin authentication
		const session = await getCachedApiSession(req);
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await req.json();
		const { key, value } = body;

		if (!key) {
			return NextResponse.json(
				{ error: 'Key is required' },
				{ status: 400 }
			);
		}

		// Update the nested key under settings
		const settingsKey = `settings.${key}`;
		const success = await configManager.updateNestedKey(settingsKey, value);

		if (!success) {
			return NextResponse.json(
				{ error: 'Failed to update setting' },
				{ status: 500 }
			);
		}

		return NextResponse.json(
			{ success: true, key, value },
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error updating settings:', error);
		return NextResponse.json(
			{ error: 'Failed to update settings' },
			{ status: 500 }
		);
	}
}
