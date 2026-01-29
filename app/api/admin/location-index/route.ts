import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { getLocationIndexService } from '@/lib/services/location/location-index.service';
import { clearLocationIndex } from '@/lib/db/queries/location-index.queries';
import { ItemRepository } from '@/lib/repositories/item.repository';

// Disable caching for authenticated dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const itemRepository = new ItemRepository();

/**
 * @swagger
 * /api/admin/location-index:
 *   get:
 *     tags: ["Admin - Geographic"]
 *     summary: "Get location index statistics"
 *     description: "Returns statistics about the location index including total indexed items, cities, countries, and rebuild metadata. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Location index stats retrieved successfully"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *       500:
 *         description: "Internal server error"
 */
export async function GET() {
	try {
		const authError = await checkAdminAuth();
		if (authError) return authError;

		const service = getLocationIndexService();
		const stats = await service.getIndexStats();

		return NextResponse.json({ success: true, data: stats });
	} catch (error) {
		console.error('Error fetching location index stats:', error);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/location-index:
 *   post:
 *     tags: ["Admin - Geographic"]
 *     summary: "Manage location index"
 *     description: "Rebuild or clear the location index. Action 'rebuild' re-indexes all items with location data. Action 'clear' removes all entries from the index. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [rebuild, clear]
 *             required: [action]
 *     responses:
 *       200:
 *         description: "Action completed successfully"
 *       400:
 *         description: "Invalid action"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest) {
	try {
		const authError = await checkAdminAuth();
		if (authError) return authError;

		const body = await request.json();
		const { action } = body;

		if (action === 'rebuild') {
			const service = getLocationIndexService();
			const items = await itemRepository.findAll();
			const result = await service.rebuildIndex(items);
			return NextResponse.json({ success: true, data: result });
		}

		if (action === 'clear') {
			const cleared = await clearLocationIndex();
			return NextResponse.json({ success: true, data: { cleared } });
		}

		return NextResponse.json(
			{ success: false, error: 'Invalid action. Use "rebuild" or "clear".' },
			{ status: 400 }
		);
	} catch (error) {
		console.error('Error managing location index:', error);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}
