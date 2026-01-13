import { z } from 'zod';
import { API_BASE_URL } from '../constants';

/**
 * Environment variable schema using Zod for validation
 */
const envSchema = z.object({
	API_BASE_URL: z.string().url(),
	API_TIMEOUT: z.number().default(5000),
	API_RETRY_ATTEMPTS: z.number().default(3),
	API_RETRY_DELAY: z.number().default(1000),
	AUTH_ENDPOINT_LOGIN: z.string().url().optional(),
	AUTH_ENDPOINT_REFRESH: z.string().url().optional(),
	AUTH_ENDPOINT_LOGOUT: z.string().url().optional(),
	AUTH_ENDPOINT_CHECK: z.string().url().optional(),
	// Platform API configuration (for Ever Works Platform API integration)
	PLATFORM_API_URL: z.string().url().optional(),
	PLATFORM_API_SECRET_TOKEN: z.string().optional(),
	NODE_ENV: z.enum([ 'development', 'production', 'test' ]).default('development')
});

/**
 * Type inference for environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * 
 * Note: API_BASE_URL is for the internal website API (Next.js API routes)
 * PLATFORM_API_URL is for the external Ever Works Platform API (separate service)
 */
export const env = envSchema.parse({
	API_BASE_URL: API_BASE_URL.value || 'http://localhost:3000/api',
	API_TIMEOUT: Number(process.env.API_TIMEOUT) || 5000,
	API_RETRY_ATTEMPTS: Number(process.env.API_RETRY_ATTEMPTS) || 3,
	API_RETRY_DELAY: Number(process.env.API_RETRY_DELAY) || 1000,
	NODE_ENV: process.env.NODE_ENV,
	AUTH_ENDPOINT_LOGIN: process.env.AUTH_ENDPOINT_LOGIN?.trim() || undefined,
	AUTH_ENDPOINT_REFRESH: process.env.AUTH_ENDPOINT_REFRESH?.trim() || undefined,
	AUTH_ENDPOINT_LOGOUT: process.env.AUTH_ENDPOINT_LOGOUT?.trim() || undefined,
	AUTH_ENDPOINT_CHECK: process.env.AUTH_ENDPOINT_CHECK?.trim() || undefined,
	PLATFORM_API_URL: process.env.PLATFORM_API_URL?.trim() || undefined,
	PLATFORM_API_SECRET_TOKEN: process.env.PLATFORM_API_SECRET_TOKEN?.trim() || undefined
});
