import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sponsorAdService } from "@/lib/services/sponsor-ad.service";
import { validatePaginationParams } from "@/lib/utils/pagination-validation";
import { querySponsorAdsSchema } from "@/lib/validations/sponsor-ad";
import type { SponsorAdStatus, SponsorAdIntervalType } from "@/lib/types/sponsor-ad";

/**
 * @swagger
 * /api/admin/sponsor-ads:
 *   get:
 *     tags: ["Admin - Sponsor Ads"]
 *     summary: "List sponsor ads"
 *     description: "Returns a paginated list of sponsor ads with optional filtering by status and interval. Requires admin authentication."
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
 *           enum: ["pending_payment", "pending", "rejected", "active", "expired", "cancelled"]
 *       - name: "interval"
 *         in: "query"
 *         schema:
 *           type: string
 *           enum: ["weekly", "monthly"]
 *       - name: "search"
 *         in: "query"
 *         schema:
 *           type: string
 *       - name: "sortBy"
 *         in: "query"
 *         schema:
 *           type: string
 *           enum: ["createdAt", "updatedAt", "startDate", "endDate", "status"]
 *           default: "createdAt"
 *       - name: "sortOrder"
 *         in: "query"
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "desc"
 *     responses:
 *       200:
 *         description: "Sponsor ads retrieved successfully"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized. Admin access required." },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);

		// Validate pagination parameters
		const paginationResult = validatePaginationParams(searchParams);
		if ("error" in paginationResult) {
			return NextResponse.json(
				{ success: false, error: paginationResult.error },
				{ status: paginationResult.status }
			);
		}

		// Parse query parameters
		const statusParam = searchParams.get("status");
		const intervalParam = searchParams.get("interval");

		// Only include status/interval if they are valid values (not empty string or "all")
		const validStatuses = ["pending_payment", "pending", "rejected", "active", "expired", "cancelled"];
		const validIntervals = ["weekly", "monthly"];

		const queryParams = {
			page: paginationResult.page,
			limit: paginationResult.limit,
			status: statusParam && validStatuses.includes(statusParam) ? statusParam as SponsorAdStatus : undefined,
			interval: intervalParam && validIntervals.includes(intervalParam) ? intervalParam as SponsorAdIntervalType : undefined,
			search: searchParams.get("search") || undefined,
			sortBy: (searchParams.get("sortBy") || "createdAt") as
				| "createdAt"
				| "updatedAt"
				| "startDate"
				| "endDate"
				| "status",
			sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
		};

		// Validate with Zod
		const validationResult = querySponsorAdsSchema.safeParse(queryParams);
		if (!validationResult.success) {
			return NextResponse.json(
				{
					success: false,
					error: validationResult.error.issues[0]?.message || "Invalid query parameters",
				},
				{ status: 400 }
			);
		}

		// Get paginated sponsor ads
		const result = await sponsorAdService.getSponsorAdsPaginated(validationResult.data);
		console.log("[Admin Sponsor Ads] Query result:", JSON.stringify(result, null, 2));

		// Get stats for dashboard
		const stats = await sponsorAdService.getSponsorAdStats();
		console.log("[Admin Sponsor Ads] Stats:", JSON.stringify(stats, null, 2));

		return NextResponse.json({
			success: true,
			data: result.sponsorAds,
			pagination: {
				page: result.page,
				limit: result.limit,
				total: result.total,
				totalPages: result.totalPages,
				hasNext: result.page < result.totalPages,
				hasPrev: result.page > 1,
			},
			stats,
		});
	} catch (error) {
		console.error("Error fetching sponsor ads:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch sponsor ads" },
			{ status: 500 }
		);
	}
}
