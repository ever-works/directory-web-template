/**
 * Currency Detection Service
 *
 * Automatically detects user currency based on:
 * 1. User profile country (if available)
 * 2. IP-based geolocation (fallback)
 * 3. Default currency (USD/EUR) if detection fails
 */

// Comprehensive country to currency mapping
const COUNTRY_TO_CURRENCY: Record<string, string> = {
	// North America
	US: 'USD',
	CA: 'CAD',
	MX: 'MXN',

	// Europe
	GB: 'GBP',
	IE: 'EUR',
	FR: 'EUR',
	DE: 'EUR',
	ES: 'EUR',
	IT: 'EUR',
	NL: 'EUR',
	BE: 'EUR',
	AT: 'EUR',
	PT: 'EUR',
	FI: 'EUR',
	GR: 'EUR',
	LU: 'EUR',
	CH: 'CHF',
	NO: 'NOK',
	SE: 'SEK',
	DK: 'DKK',
	PL: 'PLN',
	CZ: 'CZK',
	HU: 'HUF',
	RO: 'RON',
	BG: 'BGN',
	HR: 'EUR', // Croatia adopted EUR on January 1, 2023 (replacing HRK)

	// Asia Pacific
	JP: 'JPY',
	CN: 'CNY',
	KR: 'KRW',
	IN: 'INR',
	AU: 'AUD',
	NZ: 'NZD',
	SG: 'SGD',
	HK: 'HKD',
	TW: 'TWD',
	TH: 'THB',
	MY: 'MYR',
	ID: 'IDR',
	PH: 'PHP',
	VN: 'VND',

	// Middle East
	AE: 'AED',
	SA: 'SAR',
	IL: 'ILS',
	TR: 'TRY',

	// South America
	BR: 'BRL',
	AR: 'ARS',
	CL: 'CLP',
	CO: 'COP',
	PE: 'PEN',

	// Africa
	ZA: 'ZAR',
	EG: 'EGP',
	NG: 'NGN',
	KE: 'KES',

	// Other
	RU: 'RUB',
	UA: 'UAH'
};
/**
 * Provider types for country detection
 */
export type CountryHeaderProvider = 'cloudflare' | 'vercel' | 'cloudfront' | 'fastly' | 'generic' | 'auto' | 'smart';

/**
 * Header names mapping for each provider
 */
const HEADER_NAMES: Record<Exclude<CountryHeaderProvider, 'auto' | 'smart'>, string> = {
	cloudflare: 'cf-ipcountry',
	vercel: 'x-vercel-ip-country',
	cloudfront: 'cloudfront-viewer-country',
	fastly: 'fastly-geo-country-code',
	generic: 'x-country'
};

// Default currencies by region (fallback)
const DEFAULT_CURRENCIES = {
	AMERICAS: 'USD',
	EUROPE: 'EUR',
	ASIA: 'USD',
	MIDDLE_EAST: 'USD',
	AFRICA: 'USD',
	OCEANIA: 'AUD',
	DEFAULT: 'USD'
} as const;

/**
 * Extract country code from location string
 * Handles formats like "Paris, France", "FR", "France", etc.
 */
export function extractCountryCode(location: string | null | undefined): string | null {
	if (!location) {
		return null;
	}

	const normalized = location.trim();

	// If it's already a 2-letter code
	if (/^[A-Z]{2}$/i.test(normalized)) {
		return normalized.toUpperCase();
	}

	// Try to extract from common patterns
	// "City, Country" or "City, Country Code"
	const parts = normalized.split(',').map((p) => p.trim());
	if (parts.length > 1) {
		const lastPart = parts[parts.length - 1];
		// Check if last part is a country code
		if (/^[A-Z]{2}$/i.test(lastPart)) {
			return lastPart.toUpperCase();
		}
	}

	// Try to match country name to code (basic mapping)
	const countryNameToCode: Record<string, string> = {
		'united states': 'US',
		usa: 'US',
		canada: 'CA',
		mexico: 'MX',
		'united kingdom': 'GB',
		uk: 'GB',
		france: 'FR',
		germany: 'DE',
		spain: 'ES',
		italy: 'IT',
		netherlands: 'NL',
		belgium: 'BE',
		austria: 'AT',
		portugal: 'PT',
		finland: 'FI',
		greece: 'GR',
		luxembourg: 'LU',
		switzerland: 'CH',
		norway: 'NO',
		sweden: 'SE',
		denmark: 'DK',
		poland: 'PL',
		'czech republic': 'CZ',
		hungary: 'HU',
		romania: 'RO',
		bulgaria: 'BG',
		croatia: 'HR',
		japan: 'JP',
		china: 'CN',
		'south korea': 'KR',
		india: 'IN',
		australia: 'AU',
		'new zealand': 'NZ',
		singapore: 'SG',
		'hong kong': 'HK',
		taiwan: 'TW',
		thailand: 'TH',
		malaysia: 'MY',
		indonesia: 'ID',
		philippines: 'PH',
		vietnam: 'VN',
		'united arab emirates': 'AE',
		'saudi arabia': 'SA',
		israel: 'IL',
		turkey: 'TR',
		brazil: 'BR',
		argentina: 'AR',
		chile: 'CL',
		colombia: 'CO',
		peru: 'PE',
		'south africa': 'ZA',
		egypt: 'EG',
		nigeria: 'NG',
		kenya: 'KE',
		russia: 'RU',
		ukraine: 'UA'
	};

	const lowerLocation = normalized.toLowerCase();
	for (const [name, code] of Object.entries(countryNameToCode)) {
		if (lowerLocation.includes(name)) {
			return code;
		}
	}

	return null;
}

/**
 * Get currency from country code (ISO 3166-1 alpha-2)
 */
export function getCurrencyFromCountry(countryCode: string | null | undefined): string {
	if (!countryCode) {
		return DEFAULT_CURRENCIES.DEFAULT;
	}

	const normalizedCountry = countryCode.toUpperCase().trim();
	return COUNTRY_TO_CURRENCY[normalizedCountry] || DEFAULT_CURRENCIES.DEFAULT;
}

/**
 * Detect the best provider based on environment and available headers
 * This is the recommended approach as it automatically selects the optimal provider
 */
function detectBestProvider(headers: Headers): Exclude<CountryHeaderProvider, 'auto' | 'smart'> | null {
	// Priority 1: Check environment variables (most reliable)
	if (process.env.VERCEL === '1') {
		if (headers.get('x-vercel-ip-country')) {
			return 'vercel';
		}
	}

	// Priority 2: Check for Cloudflare (common when using Cloudflare as CDN)
	if (headers.get('cf-ipcountry')) {
		return 'cloudflare';
	}

	// Priority 3: Check for Vercel header (even if not explicitly on Vercel)
	if (headers.get('x-vercel-ip-country')) {
		return 'vercel';
	}

	// Priority 4: Check for AWS CloudFront
	if (headers.get('cloudfront-viewer-country')) {
		return 'cloudfront';
	}

	// Priority 5: Check for Fastly
	if (headers.get('fastly-geo-country-code')) {
		return 'fastly';
	}

	// Priority 6: Check for generic header
	if (headers.get('x-country')) {
		return 'generic';
	}

	return null;
}

/**
 * Normalize and validate a country code from header
 * Handles lowercase, uppercase, and whitespace
 * @param country - Raw country code from header
 * @returns Normalized country code (uppercase) or null if invalid
 */
function normalizeCountryCode(country: string | null): string | null {
	if (!country) {
		return null;
	}

	// Trim whitespace and convert to uppercase
	const normalized = country.trim().toUpperCase();

	// Validate: must be exactly 2 letters (ISO 3166-1 alpha-2)
	if (/^[A-Z]{2}$/.test(normalized)) {
		return normalized;
	}

	return null;
}

export function getCountryFromHeaders(headers: Headers, provider: CountryHeaderProvider = 'smart'): string | null {
	// Smart mode: Automatically detect the best provider (recommended)
	if (provider === 'smart') {
		const bestProvider = detectBestProvider(headers);
		if (bestProvider) {
			const headerName = HEADER_NAMES[bestProvider];
			const country = normalizeCountryCode(headers.get(headerName));
			if (country) {
				return country;
			}
		}
		// If smart detection fails, fall back to auto mode
		provider = 'auto';
	}

	// If a specific provider is requested, check only that one
	if (provider !== 'auto') {
		const headerName = HEADER_NAMES[provider];
		const country = normalizeCountryCode(headers.get(headerName));
		if (country) {
			return country;
		}
		return null;
	}

	// Auto mode: check all providers in priority order
	// Cloudflare provides country in CF-IPCountry header
	const cfCountry = normalizeCountryCode(headers.get('cf-ipcountry'));
	if (cfCountry) {
		return cfCountry;
	}

	// Vercel provides country in x-vercel-ip-country header
	const vercelCountry = normalizeCountryCode(headers.get('x-vercel-ip-country'));
	if (vercelCountry) {
		return vercelCountry;
	}

	// AWS CloudFront provides country in CloudFront-Viewer-Country header
	const cloudfrontCountry = normalizeCountryCode(headers.get('cloudfront-viewer-country'));
	if (cloudfrontCountry) {
		return cloudfrontCountry;
	}

	// Fastly provides country in Fastly-Geo-Country-Code header
	const fastlyCountry = normalizeCountryCode(headers.get('fastly-geo-country-code'));
	if (fastlyCountry) {
		return fastlyCountry;
	}

	// Generic x-country header (some proxies use this)
	const genericCountry = normalizeCountryCode(headers.get('x-country'));
	if (genericCountry) {
		return genericCountry;
	}

	return null;
}

/**
 * Detect currency and country for a user
 * Priority: 1. Profile country, 2. Request headers (CDN/Proxy), 3. Default
 * Returns both currency and detected country
 */
export async function detectUserCurrency(options: {
	profileCountry?: string | null;
	profileLocation?: string | null;
	headers?: Headers;
}): Promise<{ currency: string; country: string | null }> {
	const { profileCountry, profileLocation, headers } = options;

	// Priority 1: Use explicit country from profile
	if (profileCountry) {
		const currency = getCurrencyFromCountry(profileCountry);
		if (currency !== DEFAULT_CURRENCIES.DEFAULT) {
			return { currency, country: profileCountry.toUpperCase() };
		}
	}

	// Priority 2: Extract country from location string
	if (profileLocation) {
		const extractedCountry = extractCountryCode(profileLocation);
		if (extractedCountry) {
			const currency = getCurrencyFromCountry(extractedCountry);
			if (currency !== DEFAULT_CURRENCIES.DEFAULT) {
				return { currency, country: extractedCountry.toUpperCase() };
			}
		}
	}

	// Priority 3: Get country from request headers (CDN/Proxy - no external API call)
	if (headers) {
		const headerCountry = getCountryFromHeaders(headers);
		if (headerCountry) {
			const currency = getCurrencyFromCountry(headerCountry);
			if (currency !== DEFAULT_CURRENCIES.DEFAULT) {
				return { currency, country: headerCountry.toUpperCase() };
			}
		}
	}

	// Priority 4: Default currency (no country detected)
	return { currency: DEFAULT_CURRENCIES.DEFAULT, country: null };
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request | Headers): string | null {
	let headers: Headers;

	if (request instanceof Request) {
		headers = request.headers;
	} else {
		headers = request;
	}

	// Check various headers (common in proxies/load balancers)
	const forwarded = headers.get('x-forwarded-for');
	if (forwarded) {
		// x-forwarded-for can contain multiple IPs, take the first one
		const firstIP = forwarded.split(',')[0]?.trim();
		if (firstIP) {
			return firstIP;
		}
	}

	const realIP = headers.get('x-real-ip');
	if (realIP) {
		return realIP.trim();
	}

	const cfConnectingIP = headers.get('cf-connecting-ip'); // Cloudflare
	if (cfConnectingIP) {
		return cfConnectingIP.trim();
	}

	return null;
}
