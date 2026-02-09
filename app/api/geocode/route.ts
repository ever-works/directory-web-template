import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getGeocodingService } from '@/lib/services/geocoding';
import { getLocationEnabled } from '@/lib/utils/settings';
import { safeErrorResponse } from '@/lib/utils/api-error';

// ===================== Request Schemas =====================

const geocodeRequestSchema = z.object({
	address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
	options: z
		.object({
			countryCodes: z.array(z.string().length(2)).optional(),
			language: z.string().length(2).optional(),
			proximity: z
				.object({
					latitude: z.number().min(-90).max(90),
					longitude: z.number().min(-180).max(180),
				})
				.optional(),
		})
		.optional(),
});

const reverseGeocodeRequestSchema = z.object({
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	options: z
		.object({
			language: z.string().length(2).optional(),
		})
		.optional(),
});

// ===================== Response Types =====================

interface GeocodeResponse {
	success: boolean;
	data?: {
		latitude: number;
		longitude: number;
		formattedAddress: string;
		city?: string;
		state?: string;
		country?: string;
		countryCode?: string;
		postalCode?: string;
		confidence?: number;
	};
	error?: string;
}

interface ReverseGeocodeResponse {
	success: boolean;
	data?: {
		formattedAddress: string;
		streetAddress?: string;
		city?: string;
		state?: string;
		country?: string;
		countryCode?: string;
		postalCode?: string;
	};
	error?: string;
}

// ===================== API Route Handler =====================

/**
 * @swagger
 * /api/geocode:
 *   post:
 *     tags: ["Geocoding"]
 *     summary: "Geocode an address or reverse geocode coordinates (Admin only)"
 *     description: |
 *       Converts an address to coordinates (forward geocoding) or coordinates to an address (reverse geocoding).
 *       Results are cached for 15 minutes to reduce API calls.
 *       **Requires admin authentication** to prevent API cost abuse (Mapbox/Google).
 *
 *       **Forward Geocoding** (address → coordinates):
 *       - Provide an `address` string to get latitude/longitude and parsed address components.
 *
 *       **Reverse Geocoding** (coordinates → address):
 *       - Provide `latitude` and `longitude` to get the formatted address and components.
 *
 *       Note: Location features must be enabled in settings for this endpoint to work.
 *       All requests are audit logged for cost tracking.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: "Forward Geocoding Request"
 *                 properties:
 *                   address:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 500
 *                     description: "Address to geocode"
 *                     example: "1600 Amphitheatre Parkway, Mountain View, CA"
 *                   options:
 *                     type: object
 *                     properties:
 *                       countryCodes:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: "Limit results to specific countries (ISO 3166-1 alpha-2)"
 *                         example: ["US", "CA"]
 *                       language:
 *                         type: string
 *                         description: "Language code for results (ISO 639-1)"
 *                         example: "en"
 *                       proximity:
 *                         type: object
 *                         properties:
 *                           latitude:
 *                             type: number
 *                             minimum: -90
 *                             maximum: 90
 *                           longitude:
 *                             type: number
 *                             minimum: -180
 *                             maximum: 180
 *                         description: "Bias results toward this location"
 *                 required: ["address"]
 *               - type: object
 *                 title: "Reverse Geocoding Request"
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     minimum: -90
 *                     maximum: 90
 *                     description: "Latitude coordinate"
 *                     example: 37.4224764
 *                   longitude:
 *                     type: number
 *                     minimum: -180
 *                     maximum: 180
 *                     description: "Longitude coordinate"
 *                     example: -122.0842499
 *                   options:
 *                     type: object
 *                     properties:
 *                       language:
 *                         type: string
 *                         description: "Language code for results (ISO 639-1)"
 *                         example: "en"
 *                 required: ["latitude", "longitude"]
 *     responses:
 *       200:
 *         description: "Geocoding successful"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   title: "Forward Geocoding Response"
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                           example: 37.4224764
 *                         longitude:
 *                           type: number
 *                           example: -122.0842499
 *                         formattedAddress:
 *                           type: string
 *                           example: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
 *                         city:
 *                           type: string
 *                           example: "Mountain View"
 *                         state:
 *                           type: string
 *                           example: "California"
 *                         country:
 *                           type: string
 *                           example: "United States"
 *                         countryCode:
 *                           type: string
 *                           example: "US"
 *                         postalCode:
 *                           type: string
 *                           example: "94043"
 *                         confidence:
 *                           type: number
 *                           example: 0.95
 *                 - type: object
 *                   title: "Reverse Geocoding Response"
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       type: object
 *                       properties:
 *                         formattedAddress:
 *                           type: string
 *                           example: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
 *                         streetAddress:
 *                           type: string
 *                           example: "1600 Amphitheatre Parkway"
 *                         city:
 *                           type: string
 *                           example: "Mountain View"
 *                         state:
 *                           type: string
 *                           example: "California"
 *                         country:
 *                           type: string
 *                           example: "United States"
 *                         countryCode:
 *                           type: string
 *                           example: "US"
 *                         postalCode:
 *                           type: string
 *                           example: "94043"
 *       400:
 *         description: "Bad request - Invalid request data"
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
 *                   example: "Invalid request data"
 *       401:
 *         description: "Unauthorized - Authentication required"
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
 *                   example: "Unauthorized"
 *       403:
 *         description: "Forbidden - Admin access required"
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
 *                   example: "Forbidden. Admin access required for geocoding operations."
 *       404:
 *         description: "Not found - No results for the geocoding request"
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
 *                   example: "No results found for the given address"
 *       503:
 *         description: "Service unavailable - Location features disabled or geocoding not configured"
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
 *                   example: "Location features are disabled"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Check authentication - require admin to prevent API cost abuse
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		if (!session.user.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Forbidden. Admin access required for geocoding operations.' },
				{ status: 403 }
			);
		}

		// Check if location features are enabled
		if (!getLocationEnabled()) {
			return NextResponse.json({ success: false, error: 'Location features are disabled' }, { status: 503 });
		}

		// Parse request body
		const body = await request.json();

		// Get geocoding service
		const geocodingService = getGeocodingService();

		// Check if geocoding is configured
		if (!geocodingService.isConfigured()) {
			return NextResponse.json(
				{ success: false, error: 'Geocoding service is not configured. Please add API keys.' },
				{ status: 503 }
			);
		}

		// Determine request type (forward or reverse geocoding)
		if ('address' in body) {
			// Forward geocoding
			const validationResult = geocodeRequestSchema.safeParse(body);
			if (!validationResult.success) {
				return NextResponse.json(
					{
						success: false,
						error: 'Invalid request data',
					},
					{ status: 400 }
				);
			}

			const { address, options } = validationResult.data;
			const result = await geocodingService.geocodeAddress(address, options);

			// Audit log for forward geocoding
			console.info('[Geocode] Forward geocoding request', {
				action: 'forward_geocode',
				userId: session.user.id,
				userEmail: session.user.email,
				address: address.substring(0, 100), // Truncate for logs
				hasResult: !!result,
				timestamp: new Date().toISOString(),
			});

			if (!result) {
				return NextResponse.json(
					{ success: false, error: 'No results found for the given address' },
					{ status: 404 }
				);
			}

			return NextResponse.json({
				success: true,
				data: {
					latitude: result.latitude,
					longitude: result.longitude,
					formattedAddress: result.formattedAddress,
					city: result.city,
					state: result.state,
					country: result.country,
					countryCode: result.countryCode,
					postalCode: result.postalCode,
					confidence: result.confidence,
				},
			});
		} else if ('latitude' in body && 'longitude' in body) {
			// Reverse geocoding
			const validationResult = reverseGeocodeRequestSchema.safeParse(body);
			if (!validationResult.success) {
				return NextResponse.json(
					{
						success: false,
						error: 'Invalid request data',
					},
					{ status: 400 }
				);
			}

			const { latitude, longitude, options } = validationResult.data;
			const result = await geocodingService.reverseGeocode(latitude, longitude, options);

			// Audit log for reverse geocoding
			console.info('[Geocode] Reverse geocoding request', {
				action: 'reverse_geocode',
				userId: session.user.id,
				userEmail: session.user.email,
				coordinates: `${latitude},${longitude}`,
				hasResult: !!result,
				timestamp: new Date().toISOString(),
			});

			if (!result) {
				return NextResponse.json(
					{ success: false, error: 'No results found for the given coordinates' },
					{ status: 404 }
				);
			}

			return NextResponse.json({
				success: true,
				data: {
					formattedAddress: result.formattedAddress,
					streetAddress: result.streetAddress,
					city: result.city,
					state: result.state,
					country: result.country,
					countryCode: result.countryCode,
					postalCode: result.postalCode,
				},
			});
		} else {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid request: must include either "address" or "latitude" and "longitude"',
				},
				{ status: 400 }
			);
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid request data',
				},
				{ status: 400 }
			);
		}

		return safeErrorResponse(error, 'An unexpected error occurred');
	}
}

/**
 * @swagger
 * /api/geocode:
 *   get:
 *     tags: ["Geocoding"]
 *     summary: "Get geocoding service status"
 *     description: "Returns the status of the geocoding service including which providers are configured."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Geocoding service status"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                       description: "Whether location features are enabled"
 *                       example: true
 *                     configured:
 *                       type: boolean
 *                       description: "Whether any geocoding provider is configured"
 *                       example: true
 *                     providers:
 *                       type: object
 *                       properties:
 *                         mapbox:
 *                           type: boolean
 *                           description: "Mapbox provider configured"
 *                           example: true
 *                         google:
 *                           type: boolean
 *                           description: "Google provider configured"
 *                           example: false
 *                     cache:
 *                       type: object
 *                       properties:
 *                         size:
 *                           type: number
 *                           description: "Current cache size"
 *                           example: 42
 *                         maxSize:
 *                           type: number
 *                           description: "Maximum cache size"
 *                           example: 1000
 *                         ttlMs:
 *                           type: number
 *                           description: "Cache TTL in milliseconds"
 *                           example: 900000
 *       401:
 *         description: "Unauthorized - Authentication required"
 */
export async function GET(): Promise<NextResponse> {
	try {
		// Check authentication
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const geocodingService = getGeocodingService();
		const cacheStats = geocodingService.getCacheStats();

		return NextResponse.json({
			success: true,
			data: {
				enabled: getLocationEnabled(),
				configured: geocodingService.isConfigured(),
				providers: {
					mapbox: geocodingService.isProviderConfigured('mapbox'),
					google: geocodingService.isProviderConfigured('google'),
				},
				cache: cacheStats,
			},
		});
	} catch (error) {
		return safeErrorResponse(error, 'An unexpected error occurred');
	}
}
