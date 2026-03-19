#!/usr/bin/env tsx
/**
 * CLI script to manually run database migrations
 * 
 * Usage:
 *   pnpm db:migrate:cli                    # Run migrations against DATABASE_URL
 *   DATABASE_URL=... tsx scripts/cli-migrate.ts  # Run against specific database
 * 
 * This is useful for:
 * - Manually applying migrations to production
 * - Debugging migration issues
 * - Running migrations outside of the build/deploy process
 */

import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

// Load environment variables from .env files
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
	console.log('='.repeat(60));
	console.log('Database Migration CLI');
	console.log('='.repeat(60));

	if (!process.env.DATABASE_URL) {
		console.error('ERROR: DATABASE_URL environment variable is required');
		console.error('');
		console.error('Usage:');
		console.error('  DATABASE_URL=postgres://... tsx scripts/cli-migrate.ts');
		console.error('  Or set DATABASE_URL in .env.local');
		process.exit(1);
	}

	// Mask the connection string for security
	const maskedUrl = process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, '://***:***@');
	console.log(`Database: ${maskedUrl}`);
	console.log('');

	try {
		// First, check current migration state
		console.log('Step 1: Checking current migration state...');
		const { db } = await import('../lib/db/drizzle');
		
		try {
			const result = await db.execute(sql`
				SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC
			`);
			const rows = (result as { rows?: unknown[] }).rows ?? (Array.isArray(result) ? result : []);
			
			if (rows.length === 0) {
				console.log('  No migrations have been applied yet');
			} else {
				console.log(`  Found ${rows.length} applied migrations:`);
				rows.forEach((row, i: number) => {
					const r = row as Record<string, unknown>;
					console.log(`    ${i + 1}. ${r.hash} (${r.created_at})`);
				});
			}
		} catch {
			console.log('  Migration tracking table does not exist (first run)');
		}

		console.log('');
		console.log('Step 2: Running migrations...');
		
		const { runMigrations } = await import('../lib/db/migrate');
		const success = await runMigrations();

		if (!success) {
			console.error('');
			console.error('MIGRATION FAILED');
			process.exit(1);
		}

		console.log('');
		console.log('Step 3: Verifying schema...');

		// Verify critical columns exist
		const verifyResult = await db.execute(sql`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'client_profiles' 
			AND column_name IN ('warning_count', 'suspended_at', 'banned_at')
		`);

		const verifyRows = (verifyResult as { rows?: unknown[] }).rows ?? (Array.isArray(verifyResult) ? verifyResult : []);
		const columns = verifyRows.map((r) => (r as Record<string, unknown>).column_name);

		const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
		const missingColumns = requiredColumns.filter(col => !columns.includes(col));

		if (missingColumns.length > 0) {
			console.error(`  ERROR: Missing columns: ${missingColumns.join(', ')}`);
			console.error('  Migration 0014 may not have been applied correctly');
			process.exit(1);
		}

		console.log('  ✓ All required moderation columns exist');
		console.log('');
		console.log('='.repeat(60));
		console.log('MIGRATION COMPLETED SUCCESSFULLY');
		console.log('='.repeat(60));

		process.exit(0);
	} catch (error) {
		console.error('');
		console.error('ERROR:', error);
		process.exit(1);
	}
}

main();
