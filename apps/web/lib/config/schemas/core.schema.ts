/**
 * Core configuration schema
 * Defines essential application configuration (URLs, site info, database, content)
 */

import { z } from 'zod';
import { getAppUrl } from '../utils/env-parser';

/**
 * Node environment schema
 */
export const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');

/**
 * Social media links configuration
 */
export const socialLinksSchema = z.object({
	github: z.string().url().optional().catch(undefined),
	x: z.string().url().optional().catch(undefined),
	linkedin: z.string().url().optional().catch(undefined),
	facebook: z.string().url().optional().catch(undefined),
	blog: z.string().url().optional().catch(undefined),
	email: z.string().email().optional().catch(undefined),
});

/**
 * Attribution configuration
 */
export const attributionSchema = z.object({
	url: z.string().url().optional().catch(undefined),
	name: z.string().optional(),
});

/**
 * OG Image theming configuration
 */
export const ogThemeSchema = z.object({
	gradientStart: z.string().default('#667eea'),
	gradientEnd: z.string().default('#764ba2'),
});

/**
 * Content repository configuration
 */
export const contentSchema = z.object({
	dataRepository: z.string().url().optional().catch(undefined),
	ghToken: z.string().optional(),
	githubToken: z.string().optional(),
	githubBranch: z.string().default('master'),
});

/**
 * Core configuration schema
 */
export const coreConfigSchema = z.object({
	// Environment
	NODE_ENV: nodeEnvSchema,

	// Database
	DATABASE_URL: z.string().optional(),

	// URLs
	APP_URL: z.string().url().catch('http://localhost:3000'),
	SITE_URL: z.string().url().optional().catch(undefined),
	API_BASE_URL: z.string().url().optional().catch(undefined),

	// Site information
	SITE_NAME: z.string().default('Ever Works'),
	SITE_TAGLINE: z.string().optional(),
	BRAND_NAME: z.string().default('Ever Works'),
	SITE_DESCRIPTION: z.string().optional(),
	SITE_KEYWORDS: z.array(z.string()).default([]),
	SITE_LOGO: z.string().default('/logo-ever-works.svg'),

	// Demo mode
	DEMO_MODE: z.boolean().default(false),

	// Dev-only flags
	DISABLE_AUTO_SYNC: z.boolean().default(false),

	// OG Image theming
	ogTheme: ogThemeSchema.optional().default({ gradientStart: '#667eea', gradientEnd: '#764ba2' }),

	// Social links
	socialLinks: socialLinksSchema.optional().default({}),

	// Attribution
	attribution: attributionSchema.optional().default({}),

	// Content repository
	content: contentSchema.optional().default({ githubBranch: 'master' }),
});

/**
 * Type inference for core configuration
 */
export type CoreConfig = z.infer<typeof coreConfigSchema>;

/**
 * Collects core configuration from environment variables
 */
export function collectCoreConfig(): z.input<typeof coreConfigSchema> {
	const keywords = process.env.NEXT_PUBLIC_SITE_KEYWORDS;

	return {
		NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined,
		DATABASE_URL: process.env.DATABASE_URL,
		APP_URL: getAppUrl('http://localhost:3000'),
		SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
		SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
		SITE_TAGLINE: process.env.NEXT_PUBLIC_SITE_TAGLINE,
		BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
		SITE_DESCRIPTION: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
		SITE_KEYWORDS: keywords ? keywords.split(',').map((k) => k.trim()) : [],
		SITE_LOGO: process.env.NEXT_PUBLIC_SITE_LOGO,
		DEMO_MODE: process.env.NEXT_PUBLIC_DEMO === 'true',
		DISABLE_AUTO_SYNC: process.env.DISABLE_AUTO_SYNC === 'true',
		ogTheme: {
			gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START,
			gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END,
		},
		socialLinks: {
			github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB,
			x: process.env.NEXT_PUBLIC_SOCIAL_X,
			linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
			facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
			blog: process.env.NEXT_PUBLIC_SOCIAL_BLOG,
			email: process.env.NEXT_PUBLIC_SOCIAL_EMAIL,
		},
		attribution: {
			url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL,
			name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME,
		},
		content: {
			dataRepository: process.env.DATA_REPOSITORY,
			ghToken: process.env.GH_TOKEN,
			githubToken: process.env.GITHUB_TOKEN,
			githubBranch: process.env.GITHUB_BRANCH,
		},
	};
}
