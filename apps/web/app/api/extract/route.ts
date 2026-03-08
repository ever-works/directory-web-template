import { NextResponse } from 'next/server';
import { z } from 'zod';

const extractSchema = z.object({
	url: z.string().url('Invalid URL format'),
	existingCategories: z.array(z.string()).optional()
});

/**
 * @swagger
 * /api/extract:
 *   post:
 *     tags: ["Items"]
 *     summary: "Extract item metadata from URL"
 *     description: "Secure proxy route that extracts item metadata (name, description, etc.) from a given URL using the Ever Works Platform API. This endpoint requires PLATFORM_API_URL to be configured. If not configured, returns a graceful response indicating the feature is disabled (featureDisabled: true)."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: "The URL to extract metadata from"
 *                 example: "https://example.com/product"
 *               existingCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Optional array of existing category names to help with categorization"
 *                 example: ["Productivity", "Developer Tools"]
 *             required: ["url"]
 *     responses:
 *       200:
 *         description: "Response from extraction endpoint - can be success, feature disabled, or error"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: "Successfully extracted metadata"
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       description: "Extracted item metadata (name, description, etc.)"
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Awesome Product"
 *                         description:
 *                           type: string
 *                           example: "A great product description"
 *                 - type: object
 *                   description: "Feature disabled - Platform API not configured"
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     featureDisabled:
 *                       type: boolean
 *                       example: true
 *                       description: "Indicates that the extraction feature is not available"
 *                     message:
 *                       type: string
 *                       example: "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
 *       400:
 *         description: "Bad request - Invalid URL format or validation error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid URL format"
 *       500:
 *         description: "Internal server error during extraction"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error during extraction"
 */
export async function POST(request: Request) {
	try {
		// Check if platform API is configured
		const platformApiUrl = process.env.PLATFORM_API_URL;
		const platformApiToken = process.env.PLATFORM_API_SECRET_TOKEN;

		// If not configured, return a graceful response indicating the feature is disabled
		if (!platformApiUrl) {
			return NextResponse.json({
				success: false,
				featureDisabled: true,
				message:
					'URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured.'
			});
		}

		const body = await request.json();
		const result = extractSchema.safeParse(body);

		if (!result.success) {
			return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 });
		}

		const { url, existingCategories } = result.data;

		// Build the extraction endpoint URL
		const extractionEndpoint = `${platformApiUrl.replace(/\/+$/, '')}/extract-item-details`;

		const response = await fetch(extractionEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				...(platformApiToken ? { Authorization: `Bearer ${platformApiToken}` } : {})
			},
			body: JSON.stringify({
				source_url: url,
				existing_data: existingCategories && existingCategories.length > 0 ? existingCategories : undefined
			})
		});

		if (!response.ok) {
			// Try to parse error response as JSON, fallback to text if it fails
			let errorMessage = 'Failed to extract data from platform API';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// If response is not JSON (e.g., HTML error page), use status text
				errorMessage = response.statusText || errorMessage;
			}
			return NextResponse.json({ success: false, error: errorMessage }, { status: response.status });
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('[ExtractProxy] Error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error during extraction' }, { status: 500 });
	}
}
