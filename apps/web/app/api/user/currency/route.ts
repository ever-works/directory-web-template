import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { updateUserCurrency } from '@/lib/services/currency.service';
import { SUPPORTED_CURRENCIES } from '@/lib/config/billing';
import {
	CountryHeaderProvider,
	getCountryFromHeaders,
	getCurrencyFromCountry
} from '@/lib/services/currency-detection.service';
import { Logger } from '@/lib/logger';
const logger = Logger.create('currencyService');

// Valid provider values for country detection
const VALID_PROVIDERS: readonly CountryHeaderProvider[] = [
	'cloudflare',
	'vercel',
	'cloudfront',
	'fastly',
	'generic',
	'auto',
	'smart'
] as const;

/**
 * Validates and normalizes the provider parameter
 * @param provider - Raw provider string from query parameter
 * @returns Valid CountryHeaderProvider or 'smart' as fallback
 */
function validateProvider(provider: string | null): CountryHeaderProvider {
	if (!provider) {
		return 'smart';
	}
	const normalized = provider.toLowerCase().trim();
	return VALID_PROVIDERS.includes(normalized as CountryHeaderProvider)
		? (normalized as CountryHeaderProvider)
		: 'smart';
}

const currencyUpdateSchema = z.object({
	currency: z
		.string()
		.trim()
		.length(3, 'Currency code must be exactly 3 characters')
		.toUpperCase()
		.refine((val) => SUPPORTED_CURRENCIES.includes(val as (typeof SUPPORTED_CURRENCIES)[number]), {
			message: `Currency code must be a valid ISO 4217 code. Supported codes: ${SUPPORTED_CURRENCIES.join(', ')}`
		}),
	country: z.union([
		z.string().trim().length(2, 'Country code must be exactly 2 characters').toUpperCase(),
		z.null(),
		z.undefined()
	])
});

/**
 * @swagger
 * /api/user/currency:
 *   get:
 *     tags: ["User - Currency"]
 *     summary: "Get user's currency preference"
 *     description: |
 *       Detects and returns the user's currency preference based on HTTP headers (Cloudflare, Vercel, CloudFront, etc.) or defaults to USD.
 *
 *       **Detection Strategy:**
 *       - Tries to detect country from HTTP headers (CDN/proxy headers)
 *       - Maps country to currency using ISO 4217 standards
 *       - Falls back to USD if detection fails
 *
 *       **Response Behavior:**
 *       - Always returns 200 OK with valid data (graceful degradation)
 *       - Uses `detected: true/false` flag to indicate detection success
 *       - This design choice prioritizes UX over strict REST conventions:
 *         * Application remains functional even if detection fails
 *         * Simplifies frontend error handling
 *         * Frontend can still monitor detection success via the `detected` flag
 *     parameters:
 *       - name: "provider"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["cloudflare", "vercel", "cloudfront", "fastly", "generic", "auto", "smart"]
 *           default: "smart"
 *         description: "Country detection provider to use. 'smart' automatically detects the best available provider."
 *         example: "smart"
 *     responses:
 *       200:
 *         description: "Currency preference retrieved successfully (always returns 200 for graceful degradation)"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currency:
 *                   type: string
 *                   description: "ISO 4217 currency code (3 characters). Defaults to USD if detection fails."
 *                   example: "USD"
 *                 country:
 *                   type: string
 *                   nullable: true
 *                   description: "ISO 3166-1 alpha-2 country code (2 characters) or null if detection failed"
 *                   example: "US"
 *                 detected:
 *                   type: boolean
 *                   description: "Whether currency/country was successfully detected (true) or is a fallback value (false)"
 *                   example: true
 *               required: ["currency", "detected"]
 *             examples:
 *               us_user_detected:
 *                 summary: "US user (successfully detected)"
 *                 value:
 *                   currency: "USD"
 *                   country: "US"
 *                   detected: true
 *               eu_user_detected:
 *                 summary: "EU user (successfully detected)"
 *                 value:
 *                   currency: "EUR"
 *                   country: "FR"
 *                   detected: true
 *               detection_failed:
 *                 summary: "Detection failed - using fallback"
 *                 value:
 *                   currency: "USD"
 *                   country: null
 *                   detected: false
 *               error_fallback:
 *                 summary: "Error occurred - using fallback"
 *                 value:
 *                   currency: "USD"
 *                   country: null
 *                   detected: false
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const provider = validateProvider(searchParams.get('provider'));
		const headers = request.headers;
		const detectedCountry = getCountryFromHeaders(headers, provider);
		const currency = detectedCountry ? getCurrencyFromCountry(detectedCountry) : 'USD';

		// Return with detection flag for better monitoring
		return NextResponse.json({
			currency,
			country: detectedCountry,
			detected: !!detectedCountry // Indicates successful detection vs fallback
		});
	} catch (error) {
		logger.error('[CurrencyAPI] Error detecting currency:', error);

		// Graceful degradation: return default values with detected:false
		// This allows the app to continue functioning while still enabling monitoring
		return NextResponse.json(
			{
				currency: 'USD',
				country: null,
				detected: false
			},
			{ status: 200 }
		);
	}
}

/**
 * @swagger
 * /api/user/currency:
 *   put:
 *     tags: ["User - Currency"]
 *     summary: "Update user's currency preference"
 *     description: "Updates the authenticated user's currency and country preference. Requires valid authentication session. Currency code must be a valid ISO 4217 code from the supported currencies list."
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *                 description: "ISO 4217 currency code (exactly 3 characters, uppercase)"
 *                 example: "EUR"
 *               country:
 *                 type: string
 *                 nullable: true
 *                 minLength: 2
 *                 maxLength: 2
 *                 description: "ISO 3166-1 alpha-2 country code (exactly 2 characters, uppercase). Optional - can be null if country is not available or not provided."
 *                 example: "FR"
 *             required: ["currency"]
 *           examples:
 *             euro:
 *               summary: "Set to Euro"
 *               value:
 *                 currency: "EUR"
 *                 country: "FR"
 *             usd:
 *               summary: "Set to US Dollar"
 *               value:
 *                 currency: "USD"
 *                 country: "US"
 *             gbp:
 *               summary: "Set to British Pound"
 *               value:
 *                 currency: "GBP"
 *                 country: "GB"
 *             currency_only:
 *               summary: "Update currency without country"
 *               value:
 *                 currency: "EUR"
 *                 country: null
 *     responses:
 *       200:
 *         description: "Currency preference updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currency:
 *                   type: string
 *                   description: "Updated ISO 4217 currency code"
 *                   example: "EUR"
 *                 country:
 *                   type: string
 *                   nullable: true
 *                   description: "Updated ISO 3166-1 alpha-2 country code (or null if not provided)"
 *                   example: "FR"
 *               required: ["currency"]
 *             examples:
 *               with_country:
 *                 summary: "With country code"
 *                 value:
 *                   currency: "EUR"
 *                   country: "FR"
 *               without_country:
 *                 summary: "Without country code"
 *                 value:
 *                   currency: "EUR"
 *                   country: null
 *       400:
 *         description: "Bad request - Invalid JSON payload or validation error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: "Error message describing the validation failure"
 *             examples:
 *               invalid_json:
 *                 summary: "Invalid JSON"
 *                 value:
 *                   error: "Invalid JSON payload"
 *               invalid_currency:
 *                 summary: "Invalid currency code"
 *                 value:
 *                   error: "Currency code must be a valid ISO 4217 code. Supported codes: USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW, RUB, TRY, ZAR, SGD, HKD, NOK, SEK, DKK, PLN, CZK, HUF, NZD, THB, ILS, CLP, PHP, AED, ..."
 *               invalid_country_format:
 *                 summary: "Invalid country code format (if provided)"
 *                 value:
 *                   error: "Country code must be 2 characters"
 *       401:
 *         description: "Unauthorized - User not authenticated"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error - Failed to update currency"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to update currency"
 */
export async function PUT(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Parse and validate JSON body
		let body: unknown;
		try {
			body = await request.json();
		} catch (parseError) {
			logger.error('Invalid JSON in currency update request:', parseError);
			return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
		}

		// Validate request body with Zod schema
		const validationResult = currencyUpdateSchema.safeParse(body);

		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues[0]?.message || 'Invalid currency code';
			return NextResponse.json({ error: errorMessage }, { status: 400 });
		}

		const { currency, country } = validationResult.data;

		const success = await updateUserCurrency(session.user.id, currency, country ?? undefined);

		if (!success) {
			return NextResponse.json({ error: 'Failed to update currency' }, { status: 500 });
		}

		return NextResponse.json({ currency, country });
	} catch (error) {
		logger.error('Error updating user currency:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
