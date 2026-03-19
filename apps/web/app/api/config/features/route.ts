import { NextResponse } from 'next/server';
import { getFeatureFlags } from '@/lib/config/feature-flags';

/**
 * @swagger
 * /api/config/features:
 *   get:
 *     tags: ["Configuration"]
 *     summary: "Get feature availability flags"
 *     description: "Returns current feature availability based on system configuration. Features depend on database availability. This is a public endpoint that helps the frontend gracefully handle missing features."
 *     responses:
 *       200:
 *         description: "Feature flags retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ratings:
 *                   type: boolean
 *                   description: "Whether ratings feature is available"
 *                   example: true
 *                 comments:
 *                   type: boolean
 *                   description: "Whether comments feature is available"
 *                   example: true
 *                 favorites:
 *                   type: boolean
 *                   description: "Whether favorites feature is available"
 *                   example: true
 *                 featuredItems:
 *                   type: boolean
 *                   description: "Whether featured items feature is available"
 *                   example: true
 *                 surveys:
 *                   type: boolean
 *                   description: "Whether surveys feature is available"
 *                   example: true
 *               required: ["ratings", "comments", "favorites", "featuredItems", "surveys"]
 *             examples:
 *               all_enabled:
 *                 summary: "All features enabled (database configured)"
 *                 value:
 *                   ratings: true
 *                   comments: true
 *                   favorites: true
 *                   featuredItems: true
 *                   surveys: true
 *               all_disabled:
 *                 summary: "All features disabled (no database)"
 *                 value:
 *                   ratings: false
 *                   comments: false
 *                   favorites: false
 *                   featuredItems: false
 *                   surveys: false
 */
export async function GET() {
  try {
    const flags = getFeatureFlags();

    return NextResponse.json(flags, {
      headers: {
        // Cache for 5 minutes to reduce load
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error getting feature flags:', error);

    // On error, assume all features are disabled for safety
    return NextResponse.json(
      {
        ratings: false,
        comments: false,
        favorites: false,
        featuredItems: false,
        surveys: false,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
