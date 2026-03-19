#!/usr/bin/env tsx
/**
 * Build-time database migration script for Vercel deployments
 * 
 * This script runs migrations during the build process, ensuring:
 * 1. Database schema is up-to-date before deployment
 * 2. Build fails if migrations fail (preventing broken deployments)
 * 3. All serverless functions have a consistent schema
 * 
 * Usage: tsx scripts/build-migrate.ts
 * 
 * Environment:
 * - Requires DATABASE_URL to be set
 * - Set SKIP_BUILD_MIGRATIONS=true to skip (e.g., for preview deployments without DB)
 */

import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

// Load environment variables from .env files
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
	console.log('[Build Migration] Starting database migration check...');

	// Allow skipping migrations for environments without database
	if (process.env.SKIP_BUILD_MIGRATIONS === 'true') {
		console.log('[Build Migration] SKIP_BUILD_MIGRATIONS=true, skipping migrations');
		process.exit(0);
	}

	// Skip migrations in CI environments (GitHub Actions, etc.)
	// CI builds don't have a real database - they just verify the code compiles
	const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
	const isVercel = Boolean(process.env.VERCEL);
	
	if (isCI && !isVercel) {
		console.log('[Build Migration] CI environment detected (not Vercel), skipping migrations');
		console.log('[Build Migration] CI builds verify code compilation, not database state');
		process.exit(0);
	}

	// Check if DATABASE_URL is configured
	if (!process.env.DATABASE_URL) {
		console.log('[Build Migration] DATABASE_URL not configured, skipping migrations');
		console.log('[Build Migration] Set DATABASE_URL to enable build-time migrations');
		process.exit(0);
	}

	try {
		console.log('[Build Migration] DATABASE_URL is configured');
		console.log('[Build Migration] Running Drizzle migrations...');

		// Import and run migrations
		const { runMigrations } = await import('../lib/db/migrate');
		const success = await runMigrations();

		if (!success) {
			console.error('[Build Migration] ❌ Migrations failed!');
			console.error('[Build Migration] Please check your database connection and migration files');
			process.exit(1);
		}

		console.log('[Build Migration] ✅ Migrations completed successfully');

		// Verify critical tables/columns exist
		console.log('[Build Migration] Verifying schema...');
		const { db } = await import('../lib/db/drizzle');
		
		// Quick verification query to ensure warning_count column exists
		const result = await db.execute(sql`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'client_profiles' 
			AND column_name IN ('warning_count', 'suspended_at', 'banned_at')
		`);

		const rows = (result as { rows?: unknown[] }).rows ?? (Array.isArray(result) ? result : []);
		const columns = rows.map((r) => (r as Record<string, unknown>).column_name);

		const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
		const missingColumns = requiredColumns.filter(col => !columns.includes(col));

		if (missingColumns.length > 0) {
			console.error('[Build Migration] ❌ Missing required columns:', missingColumns.join(', '));
			console.error('[Build Migration] Migration 0014 may not have been applied correctly');
			process.exit(1);
		}

		console.log('[Build Migration] ✅ Schema verification passed');
		console.log('[Build Migration] All required moderation columns exist:', requiredColumns.join(', '));

		process.exit(0);
	} catch (error) {
		console.error('[Build Migration] ❌ Migration error:', error);
		
		// Determine if this is a production deployment
		// VERCEL_ENV: 'production', 'preview', or 'development'
		const isProduction = process.env.VERCEL_ENV === 'production';
		const isPreview = process.env.VERCEL_ENV === 'preview';
		
		// In production, ALL migration failures should fail the build
		// We cannot safely deploy with an unknown schema state
		if (isProduction) {
			console.error('[Build Migration] ❌ PRODUCTION BUILD FAILED');
			console.error('[Build Migration] ❌ Database must be accessible during production builds');
			console.error('[Build Migration] ❌ Check DATABASE_URL and database connectivity');
			process.exit(1);
		}
		
		// Only for preview/development deployments on Vercel:
		// Allow connection errors to pass (DB might not be provisioned for previews)
		if ((isPreview || process.env.VERCEL) && error instanceof Error) {
			const errorMsg = error.message.toLowerCase();
			const errorCode = (error as NodeJS.ErrnoException).code?.toLowerCase() || '';
			
			// Comprehensive connection error detection
			const isConnectionError = 
				// Network-level errors
				errorMsg.includes('econnrefused') ||
				errorMsg.includes('etimedout') ||
				errorMsg.includes('enotfound') ||
				errorMsg.includes('econnreset') ||
				errorMsg.includes('ehostunreach') ||
				errorMsg.includes('enetunreach') ||
				errorCode === 'econnrefused' ||
				errorCode === 'etimedout' ||
				errorCode === 'enotfound' ||
				// Connection string/timeout issues
				errorMsg.includes('timeout') ||
				errorMsg.includes('connect') ||
				errorMsg.includes('connection') ||
				// SSL/TLS errors (often indicate network issues in preview)
				errorMsg.includes('ssl') ||
				errorMsg.includes('tls') ||
				errorMsg.includes('certificate');
			
			// Auth/permission errors should FAIL - they indicate misconfiguration, not missing DB
			const isAuthError = 
				errorMsg.includes('password authentication failed') ||
				errorMsg.includes('permission denied') ||
				errorMsg.includes('authentication failed') ||
				errorMsg.includes('access denied') ||
				errorMsg.includes('unauthorized');
			
			if (isConnectionError && !isAuthError) {
				console.log('[Build Migration] ⚠️ Preview deployment: Database not reachable during build');
				console.log('[Build Migration] ⚠️ This is acceptable for preview deployments');
				console.log('[Build Migration] ⚠️ Migrations will be attempted at runtime');
				console.log('[Build Migration] ⚠️ NOTE: If runtime migrations also fail, the app will return 503 errors');
				process.exit(0);
			}
			
			if (isAuthError) {
				console.error('[Build Migration] ❌ Authentication/permission error detected');
				console.error('[Build Migration] ❌ Check DATABASE_URL credentials');
			}
		}

		process.exit(1);
	}
}

main();
