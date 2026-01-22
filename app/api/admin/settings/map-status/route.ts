import { NextRequest, NextResponse } from 'next/server';
import { getCachedApiSession } from '@/lib/auth/cached-session';

/**
 * GET /api/admin/settings/map-status
 * Returns the configuration status of map providers (without exposing actual keys)
 */
export async function GET(req: NextRequest) {
	try {
		// Check admin authentication
		const session = await getCachedApiSession(req);
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const mapboxConfigured = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
		const googleConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

		const mapStatus = {
			mapbox: {
				isConfigured: mapboxConfigured,
				isPreviewAvailable: mapboxConfigured,
				name: 'Mapbox'
			},
			google: {
				isConfigured: googleConfigured,
				isPreviewAvailable: googleConfigured,
				name: 'Google Maps'
			}
		};

		return NextResponse.json({ status: mapStatus }, { status: 200 });
	} catch (error) {
		console.error('Error fetching map status:', error);
		return NextResponse.json({ error: 'Failed to fetch map status' }, { status: 500 });
	}
}
