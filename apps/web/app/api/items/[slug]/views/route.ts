import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { isBot } from '@/lib/utils/bot-detection';
import { recordItemView } from '@/lib/db/queries/item-view.queries';
import { ItemRepository } from '@/lib/repositories/item.repository';
import { VIEWER_COOKIE_NAME, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants/analytics';

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * POST /api/items/[slug]/views
 *
 * Records a unique daily view for an item.
 *
 * Flow:
 * 1. Check database availability
 * 2. Detect and reject bots
 * 3. Exclude owner views (if authenticated)
 * 4. Get or create viewer ID from cookie
 * 5. Record view with daily deduplication
 *
 * Response:
 * - { success: true, counted: true } - New view recorded
 * - { success: true, counted: false } - Duplicate view (same day)
 * - { success: true, counted: false, reason: "bot" } - Bot detected
 * - { success: true, counted: false, reason: "owner" } - Owner viewing own item
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		// 1. Database availability check
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const { slug } = await params;

		// 2. Bot detection
		const userAgent = request.headers.get('user-agent') || '';
		if (isBot(userAgent)) {
			return NextResponse.json({ success: true, counted: false, reason: 'bot' });
		}

		// 3. Validate item exists and owner exclusion (if authenticated)
		const itemRepository = new ItemRepository();
		const item = await itemRepository.findBySlug(slug);

		// Validate item exists before recording view
		if (!item) {
			return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
		}

		// Owner exclusion (if authenticated) - check before cookie handling
		const session = await auth();
		if (session?.user?.id && item.submitted_by === session.user.id) {
			return NextResponse.json({ success: true, counted: false, reason: 'owner' });
		}

		// 4. Get or create viewer ID from cookie
		const cookieStore = await cookies();
		let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
		const isNewViewer = !viewerId;

		if (!viewerId) {
			viewerId = crypto.randomUUID();
		}

		// 5. Record view with daily deduplication
		const viewedDateUtc = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		const counted = await recordItemView({
			itemId: slug,
			viewerId,
			viewedDateUtc
		});

		// 6. Set cookie if new viewer
		if (isNewViewer) {
			cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: VIEWER_COOKIE_MAX_AGE,
				path: '/'
			});
		}

		return NextResponse.json({ success: true, counted });
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Error recording item view:', error);
		}
		return NextResponse.json({ success: false, error: 'Failed to record view' }, { status: 500 });
	}
}
