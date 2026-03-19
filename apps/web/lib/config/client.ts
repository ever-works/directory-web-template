/**
 * Client-safe site configuration
 *
 * This module contains only NEXT_PUBLIC_* environment variables,
 * safe to import in client components.
 *
 * For server-only config (secrets, API keys), use:
 * import { configService } from '@/lib/config';
 */

// Helper to parse price with proper NaN fallback
const parsePrice = (envVar: string | undefined, defaultValue: number): number => {
	const parsed = parseFloat(envVar ?? '');
	return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const siteConfig = {
	name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
	tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
	url: process.env.NEXT_PUBLIC_APP_URL || 'https://demo.ever.works',
	logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
	brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
	description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Discover and explore professional services and solutions on Ever Works',
	keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS
		? process.env.NEXT_PUBLIC_SITE_KEYWORDS.split(',').map((k) => k.trim())
		: ['Ever Works', 'Directory Builder', 'Open Source', 'AI-Powered', 'Directory Template'],
	ogImage: {
		gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
		gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
	},
	social: {
		github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || 'https://github.com/ever-works',
		x: process.env.NEXT_PUBLIC_SOCIAL_X || 'https://x.com/everplatform',
		linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || 'https://www.linkedin.com/company/everhq',
		facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || 'https://www.facebook.com/everplatform',
		blog: process.env.NEXT_PUBLIC_SOCIAL_BLOG || 'https://blog.ever.works',
		email: process.env.NEXT_PUBLIC_SOCIAL_EMAIL || 'ever@ever.works'
	},
	attribution: {
		url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
		name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
	}
} as const;

/**
 * Client-safe pricing configuration
 * Uses NEXT_PUBLIC_PRODUCT_PRICE_* environment variables with NaN-safe parsing
 */
export const pricingConfig = {
	free: parsePrice(process.env.NEXT_PUBLIC_PRODUCT_PRICE_FREE, 0),
	standard: parsePrice(process.env.NEXT_PUBLIC_PRODUCT_PRICE_STANDARD, 10),
	premium: parsePrice(process.env.NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM, 20),
} as const;

/**
 * Client-safe environment utilities
 * NODE_ENV is inlined at build time by Next.js, safe to use in client components
 */
export const clientEnv = {
	NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
	isDevelopment: process.env.NODE_ENV === 'development',
	isProduction: process.env.NODE_ENV === 'production',
	isTest: process.env.NODE_ENV === 'test',
} as const;
