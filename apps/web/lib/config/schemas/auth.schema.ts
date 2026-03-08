/**
 * Authentication configuration schema
 * Defines auth secrets, JWT config, and OAuth provider settings
 */

import { z } from 'zod';

/**
 * OAuth provider configuration schema
 * Automatically determines if provider is enabled based on credentials
 */
export const oauthProviderSchema = z
	.object({
		clientId: z.string().optional(),
		clientSecret: z.string().optional(),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.clientId && data.clientSecret),
	}));

/**
 * Supabase configuration schema
 */
export const supabaseConfigSchema = z
	.object({
		url: z.string().url().optional().catch(undefined),
		anonKey: z.string().optional(),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.url && data.anonKey),
	}));

/**
 * JWT configuration schema
 */
export const jwtConfigSchema = z.object({
	accessTokenExpiresIn: z.string().default('15m'),
	refreshTokenExpiresIn: z.string().default('7d'),
});

/**
 * Cookie configuration schema
 */
export const cookieConfigSchema = z.object({
	secret: z.string().optional(),
	domain: z.string().default('localhost'),
	secure: z.boolean().default(false),
});

/**
 * Seed user configuration (for development/demo)
 */
export const seedUserSchema = z.object({
	adminEmail: z.string().email().optional().catch(undefined),
	adminPassword: z.string().optional(),
	fakeUserCount: z.number().int().min(0).default(10),
});

/**
 * Authentication configuration schema
 */
export const authConfigSchema = z.object({
	// Core auth secret (required for session signing)
	AUTH_SECRET: z.string().min(1).optional(),

	// JWT configuration
	jwt: jwtConfigSchema.optional().default({ accessTokenExpiresIn: '15m', refreshTokenExpiresIn: '7d' }),

	// Cookie configuration
	cookie: cookieConfigSchema.optional().default({ domain: 'localhost', secure: false }),

	// OAuth Providers
	google: oauthProviderSchema.optional().default({ enabled: false }),
	github: oauthProviderSchema.optional().default({ enabled: false }),
	microsoft: oauthProviderSchema.optional().default({ enabled: false }),
	facebook: oauthProviderSchema.optional().default({ enabled: false }),
	twitter: oauthProviderSchema.optional().default({ enabled: false }),
	linkedin: oauthProviderSchema.optional().default({ enabled: false }),

	// Supabase (optional auth backend)
	supabase: supabaseConfigSchema.optional().default({ enabled: false }),

	// Seed users (development/demo)
	seedUser: seedUserSchema.optional().default({ fakeUserCount: 10 }),
});

/**
 * Type inference for authentication configuration
 */
export type AuthConfig = z.infer<typeof authConfigSchema>;

/**
 * Type for OAuth provider (after transform)
 */
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

/**
 * Safely parses an integer, returning undefined if NaN
 */
function parseIntOrUndefined(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = parseInt(value, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Collects authentication configuration from environment variables
 */
export function collectAuthConfig(): z.input<typeof authConfigSchema> {
	return {
		AUTH_SECRET: process.env.AUTH_SECRET,
		jwt: {
			accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
			refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
		},
		cookie: {
			secret: process.env.COOKIE_SECRET,
			domain: process.env.COOKIE_DOMAIN,
			secure: process.env.COOKIE_SECURE === 'true',
		},
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
		},
		microsoft: {
			clientId: process.env.MICROSOFT_CLIENT_ID,
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
		},
		facebook: {
			clientId: process.env.FB_CLIENT_ID,
			clientSecret: process.env.FB_CLIENT_SECRET,
		},
		twitter: {
			clientId: process.env.X_CLIENT_ID,
			clientSecret: process.env.X_CLIENT_SECRET,
		},
		linkedin: {
			clientId: process.env.LINKEDIN_CLIENT_ID,
			clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
		},
		supabase: {
			url: process.env.NEXT_PUBLIC_SUPABASE_URL,
			anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		},
		seedUser: {
			adminEmail: process.env.SEED_ADMIN_EMAIL,
			adminPassword: process.env.SEED_ADMIN_PASSWORD,
			fakeUserCount: parseIntOrUndefined(process.env.SEED_FAKE_USER_COUNT),
		},
	};
}
