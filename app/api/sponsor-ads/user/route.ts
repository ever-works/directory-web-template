import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { createSponsorAdSchema, querySponsorAdsSchema } from '@/lib/validations/sponsor-ad';
import { PaymentProvider } from '@/lib/constants';
import { getDefaultTenantId } from '@/lib/db/tenant';

// Determine which payment provider to use
const ACTIVE_PAYMENT_PROVIDER = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || PaymentProvider.STRIPE;

/**
 * @swagger
 * /api/sponsor-ads/user:
 *   get:
 *     tags: ["Sponsor Ads - User"]
 *     summary: "Get user's sponsor ads"
 *     description: "Returns a paginated list of sponsor ads submitted by the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: "limit"
 *         in: "query"
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: "status"
 *         in: "query"
 *         schema:
 *           type: string
 *           enum: ["pending", "approved", "rejected", "active", "expired", "cancelled"]
 *     responses:
 *       200:
 *         description: "User's sponsor ads retrieved successfully"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);

		// Build query params - let Zod handle all validation including enum values
		const queryParams = {
			page: parseInt(searchParams.get('page') || '1', 10),
			limit: parseInt(searchParams.get('limit') || '10', 10),
			status: searchParams.get('status') || undefined,
			interval: searchParams.get('interval') || undefined,
			search: searchParams.get('search') || undefined,
			userId: session.user.id
		};

		// Validate with Zod - handles enum validation for status/interval
		const validationResult = querySponsorAdsSchema.safeParse(queryParams);
		if (!validationResult.success) {
			return NextResponse.json(
				{
					success: false,
					error: validationResult.error.issues[0]?.message || 'Invalid query parameters'
				},
				{ status: 400 }
			);
		}

		const tenantId = session.user.tenantId || (await getDefaultTenantId());

		// Get paginated sponsor ads for user
		const result = await sponsorAdService.getSponsorAdsPaginated(tenantId, {
			...validationResult.data,
			userId: session.user.id
		});

		return NextResponse.json({
			success: true,
			data: result.sponsorAds,
			pagination: {
				page: result.page,
				limit: result.limit,
				total: result.total,
				totalPages: result.totalPages,
				hasNext: result.page < result.totalPages,
				hasPrev: result.page > 1
			}
		});
	} catch (error) {
		console.error('Error fetching user sponsor ads:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch sponsor ads' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/sponsor-ads/user:
 *   post:
 *     tags: ["Sponsor Ads - User"]
 *     summary: "Create sponsor ad submission"
 *     description: "Creates a new sponsor ad submission for the authenticated user. The submission will be pending admin approval."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemSlug
 *               - itemName
 *               - interval
 *             properties:
 *               itemSlug:
 *                 type: string
 *                 description: "Slug of the item to sponsor"
 *               itemName:
 *                 type: string
 *                 description: "Name of the item to sponsor"
 *               itemIconUrl:
 *                 type: string
 *                 description: "Icon URL of the item"
 *               itemCategory:
 *                 type: string
 *                 description: "Category of the item"
 *               itemDescription:
 *                 type: string
 *                 description: "Description of the item (max 500 chars)"
 *               interval:
 *                 type: string
 *                 enum: ["weekly", "monthly"]
 *                 description: "Subscription interval"
 *     responses:
 *       201:
 *         description: "Sponsor ad submission created successfully"
 *       400:
 *         description: "Bad request - Invalid input or duplicate submission"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		let body: any;
		try {
			body = await request.json();
		} catch (jsonError) {
			console.error('Invalid JSON in request body:', jsonError);
			return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
		}

		// Validate request body
		const validationResult = createSponsorAdSchema.safeParse({
			...body,
			paymentProvider: ACTIVE_PAYMENT_PROVIDER
		});

		if (!validationResult.success) {
			return NextResponse.json(
				{
					success: false,
					error: validationResult.error.issues[0]?.message || 'Invalid request body'
				},
				{ status: 400 }
			);
		}

		const tenantId = session.user.tenantId || (await getDefaultTenantId());

		// Create sponsor ad
		const sponsorAd = await sponsorAdService.createSponsorAd(session.user.id, validationResult.data, tenantId);

		return NextResponse.json(
			{
				success: true,
				data: sponsorAd,
				message: 'Sponsor ad submission created successfully. Pending admin approval.'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating sponsor ad:', error);

		const errorMessage = error instanceof Error ? error.message : 'Failed to create sponsor ad';

		// Handle duplicate submission errors (400) - keep specific message for expected validation errors
		if (errorMessage.includes('already have')) {
			return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
		}

		// Use generic message for unexpected errors (500) to avoid exposing sensitive details
		return NextResponse.json({ success: false, error: 'Failed to create sponsor ad' }, { status: 500 });
	}
}
