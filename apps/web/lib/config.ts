/**
 * Centralized site configuration for template customization
 *
 * This file provides a single source of truth for site-wide settings
 * that template users need to customize for their own directory.
 *
 * All values can be overridden via environment variables in .env.local
 *
 * NOTE: This file is CLIENT-SAFE. For server-only config (configService, etc.),
 * import directly from '@/lib/config/config-service' in server components/routes.
 */

// Re-export types (types are always safe)
export type {
	AppConfigSchema,
	ConfigValidationResult,
	ConfigValidationError,
	ConfigValidationWarning,
	ConfigSection,
	ConfigSectionType,
	Environment,
	CoreConfig,
	AuthConfig,
	OAuthProvider,
	EmailConfig,
	PaymentConfig,
	AnalyticsConfig,
	IntegrationsConfig,
} from './config/types';
export { isDevelopment, isProduction, isTest, getEnvironment } from './config/types';

export const siteConfig = {
	/**
	 * Site name displayed in metadata, OG images, and schemas
	 * @example "My Directory", "Awesome Tools", "Best Services"
	 */
	name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',

	/**
	 * Site tagline/description for branding
	 * Used in default OG images and homepage
	 * @example "Find the Best Tools", "Professional Services Directory"
	 */
	tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',

	/**
	 * Full site URL (required for metadata, OG images, sitemaps)
	 * Should NOT include trailing slash
	 * @example "https://mydirectory.com"
	 */
	url:
		process.env.NEXT_PUBLIC_APP_URL ??
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works'),

	/**
	 * Site logo path (used as fallback for OG images)
	 * Path should be relative to /public directory
	 * @example "/logo.svg", "/images/brand.png"
	 */
	logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',

	/**
	 * Brand name for schema.org Organization markup
	 * Can be same as site name or parent company name
	 * @example "My Company LLC"
	 */
	brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',

	/**
	 * Site description for SEO metadata
	 * Keep under 160 characters for optimal display
	 */
	description:
		process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
		'Discover and explore professional services and solutions on Ever Works',

	/**
	 * SEO keywords (comma-separated string that will be split into array)
	 * @example "AI Tools, Directory, Open Source"
	 */
	keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS
		? process.env.NEXT_PUBLIC_SITE_KEYWORDS.split(',').map((k) => k.trim())
		: ['Ever Works', 'Directory Builder', 'Open Source', 'AI-Powered', 'Directory Template'],

	/**
	 * OG image theme colors (for dynamic image generation)
	 * Uses CSS gradient format
	 */
	ogImage: {
		gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
		gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
	},

	/**
	 * Social media links for footer
	 * Set to empty string to hide specific social links
	 */
	social: {
		github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || 'https://github.com/ever-works',
		x: process.env.NEXT_PUBLIC_SOCIAL_X || 'https://x.com/everplatform',
		linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || 'https://www.linkedin.com/company/everhq',
		facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || 'https://www.facebook.com/everplatform',
		blog: process.env.NEXT_PUBLIC_SOCIAL_BLOG || 'https://blog.ever.works',
		email: process.env.NEXT_PUBLIC_SOCIAL_EMAIL || 'ever@ever.works'
	},

	/**
	 * Attribution link configuration ("Built with" in footer)
	 * Set url to empty string to disable attribution link
	 */
	attribution: {
		url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
		name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
	}
} as const;

/**
 * Validation helper to check if required config is present
 * Useful for build-time checks
 */
export function validateSiteConfig() {
	const warnings: string[] = [];

	if (!process.env.NEXT_PUBLIC_APP_URL) {
		warnings.push('NEXT_PUBLIC_APP_URL not set, using default. Set this for production!');
	}

	if (!process.env.NEXT_PUBLIC_SITE_URL) {
		warnings.push('NEXT_PUBLIC_SITE_URL not set, using default. Set this for production!');
	}

	if (!process.env.NEXT_PUBLIC_SITE_NAME) {
		warnings.push('NEXT_PUBLIC_SITE_NAME not set, using "Ever Works". Customize for your brand!');
	}

	if (warnings.length > 0) {
		console.warn('⚠️  Site Configuration Warnings:');
		warnings.forEach((warning) => console.warn(`   - ${warning}`));
		console.warn('   See .env.example for all customization options.\n');
	}

	return warnings.length === 0;
}
