import { eq, sql } from 'drizzle-orm';
import { seedStatus } from './schema';
import type { SeedStatus } from './schema';
import { getDatabaseUrl, getNodeEnv } from './config';

/** How long to wait for another instance to complete seeding (ms) */
const SEED_WAIT_TIMEOUT = 60000; // 60 seconds
/** How often to check if seeding completed (ms) */
const SEED_CHECK_INTERVAL = 2000; // 2 seconds
/** How old a 'seeding' status can be before we consider it stale (ms) */
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes

/**
 * Get the current seed status from the database
 * @returns Promise<SeedStatus | null> - seed status record or null if not found
 */
async function getSeedStatus(): Promise<SeedStatus | null> {
	try {
		const { db } = await import('./drizzle');

		const result = await db
			.select()
			.from(seedStatus)
			.where(eq(seedStatus.id, 'singleton'))
			.limit(1);

		return result[0] || null;
	} catch (error) {
		// If seed_status table doesn't exist or query fails, return null
		console.warn('[DB Init] Error checking seed status:', error instanceof Error ? error.message : error);
		return null;
	}
}

/**
 * Wait for seeding to complete (used when another instance holds the lock)
 */
async function waitForSeedingToComplete(): Promise<boolean> {
	const startTime = Date.now();

	while (Date.now() - startTime < SEED_WAIT_TIMEOUT) {
		await new Promise((resolve) => setTimeout(resolve, SEED_CHECK_INTERVAL));

		const status = await getSeedStatus();

		if (status?.status === 'completed') {
			console.log('[DB Init] Seeding completed by another instance');
			return true;
		}

		if (status?.status === 'failed') {
			console.log('[DB Init] Seeding failed in another instance');
			return false;
		}

		// Still seeding or no status yet
		console.log('[DB Init] Waiting for seeding to complete...');
	}

	console.warn('[DB Init] Timed out waiting for seeding to complete');
	return false;
}

/**
 * Check if database has been seeded by checking seed_status table
 * @returns Promise<boolean> - true if database has been successfully seeded
 */
export async function isDatabaseSeeded(): Promise<boolean> {
	const status = await getSeedStatus();

	if (!status) {
		// No seed status record - database not seeded
		return false;
	}

	// Database is seeded if status is 'completed'
	const isSeeded = status.status === 'completed';

	if (getNodeEnv() === 'development') {
		console.log('[DB Init] Seed status:', {
			status: status.status,
			startedAt: status.startedAt,
			completedAt: status.completedAt,
			isSeeded
		});
	}

	return isSeeded;
}

/**
 * Run database seeding with status tracking
 * Assumes caller has already acquired advisory lock
 */
async function seedDatabase(): Promise<void> {
	const { db } = await import('./drizzle');

	console.log('[DB Init] Creating seed status record...');

	// Create seed status record to indicate seeding is in progress
	// Seed status is a system-level singleton, not tenant-scoped
	await db
		.insert(seedStatus)
		.values({
			id: 'singleton',
			status: 'seeding',
			startedAt: new Date()
		})
		.onConflictDoNothing();

	// Verify the record was created
	const statusCheck = await getSeedStatus();
	if (!statusCheck) {
		throw new Error('Failed to create seed status record');
	}
	console.log('[DB Init] Seed status record created:', statusCheck.status);

	try {
		console.log('[DB Init] Running database seed...');
		const { runSeed } = await import('./seed');
		await runSeed();

		// Mark seed as completed
		await db
			.update(seedStatus)
			.set({
				status: 'completed',
				completedAt: new Date()
			})
			.where(eq(seedStatus.id, 'singleton'));

		console.log('[DB Init] Database seeding completed successfully');
	} catch (error) {
		console.error('[DB Init] Seed error:', error);

		// Mark seed as failed
		await db
			.update(seedStatus)
			.set({
				status: 'failed',
				error: error instanceof Error ? error.message : 'Unknown error',
				completedAt: new Date()
			})
			.where(eq(seedStatus.id, 'singleton'));

		throw error;
	}
}

/**
 * Initialize database by auto-migrating and seeding if needed
 * - Silent skip if DATABASE_URL is not configured (optional DB)
 * - Automatically checks if database is seeded on every startup
 * - Seeds database if not already seeded
 * - Uses Postgres advisory locks to prevent race conditions in multi-process deployments
 * - Throws error if DATABASE_URL exists but initialization fails
 */
export async function initializeDatabase(): Promise<void> {
	// Silent skip if DATABASE_URL not configured (DB is optional)
	if (!getDatabaseUrl()) {
		if (getNodeEnv() === 'development') {
			console.log('[DB Init] DATABASE_URL not configured - skipping database initialization');
		}
		return;
	}

	try {
		console.log('[DB Init] Starting database initialization...');
		console.log('[DB Init] DATABASE_URL is configured (length:', getDatabaseUrl()!.length, ')');

		// STEP 1: Always run migrations first (Drizzle handles idempotency - only runs new ones)
		console.log('[DB Init] Running migrations (Drizzle will skip already-applied)...');
		const { runMigrations } = await import('./migrate');
		const migrationSuccess = await runMigrations();

		if (!migrationSuccess) {
			// Migration failed - this is a critical error
			const errorMsg = 'Database migrations failed - schema may be out of sync';
			console.error('[DB Init] ❌ ' + errorMsg);
			console.error('[DB Init] ❌ Please run migrations manually: pnpm db:migrate');

			// In production, throw to signal the error
			// This allows monitoring systems to detect the failure
			if (getNodeEnv() === 'production' || process.env.VERCEL_ENV === 'production') {
				throw new Error(errorMsg);
			}

			// In development/preview, warn but continue (allows debugging)
			console.warn('[DB Init] ⚠️  Continuing despite migration failure (non-production)');
			return;
		}

		// STEP 2: Check if already seeded (only matters for seeding, not migrations)
		const isSeeded = await isDatabaseSeeded();

		if (isSeeded) {
			console.log('[DB Init] Database already seeded - skipping seed step');
			return;
		}

		// Get current status to check for edge cases
		const status = await getSeedStatus();
		console.log('[DB Init] Current seed status:', status ? JSON.stringify(status) : 'null');

		// If previous seed failed, delete the failed status record so we can start fresh
		if (status?.status === 'failed') {
			console.log('[DB Init] Previous seed failed - deleting failed status record');
			const { db } = await import('./drizzle');
			await db.delete(seedStatus).where(eq(seedStatus.id, 'singleton'));
		}

		// If seed is marked as 'seeding' but started too long ago, treat it as stale
		if (status?.status === 'seeding' && status.startedAt) {
			const startedAtMs = new Date(status.startedAt).getTime();
			const now = Date.now();
			if (now - startedAtMs > STALE_SEEDING_THRESHOLD) {
				console.log(
					'[DB Init] Found stale seeding status (started',
					Math.round((now - startedAtMs) / 1000),
					'seconds ago) - cleaning up'
				);
				const { db } = await import('./drizzle');
				await db.delete(seedStatus).where(eq(seedStatus.id, 'singleton'));
			} else {
				// Another instance is actively seeding - wait for it
				console.log('[DB Init] Another instance is seeding - waiting for completion...');
				const completed = await waitForSeedingToComplete();
				if (completed) {
					return;
				}
				// If wait timed out, continue to try seeding ourselves
				console.log('[DB Init] Wait timed out - attempting to seed ourselves');
			}
		}

		console.log('[DB Init] Database not seeded - proceeding with seeding...');

		console.log('[DB Init] Attempting to acquire seed lock...');

		const { db } = await import('./drizzle');

		// Try to acquire advisory lock (12345 is arbitrary lock ID)
		// This prevents race conditions in multi-process deployments
		const lockResult = await db.execute(sql`SELECT pg_try_advisory_lock(12345) as locked`);
		const rows = (lockResult as { rows?: unknown[] }).rows ?? (Array.isArray(lockResult) ? lockResult : []);
		const gotLock = rows.length > 0 ? (rows[0] as { locked: boolean }).locked : false;

		console.log('[DB Init] Advisory lock result:', { gotLock, rows: JSON.stringify(rows) });

		if (!gotLock) {
			console.log('[DB Init] Could not acquire lock - another instance may be seeding');
			// Wait for the other instance to complete
			const completed = await waitForSeedingToComplete();
			if (completed) {
				return;
			}
			// If wait timed out and still not seeded, log warning but don't fail
			console.warn('[DB Init] ⚠️  Could not seed database - another instance may have the lock');
			return;
		}

		try {
			console.log('[DB Init] Seed lock acquired successfully');

			// Double-check if seeding is still needed (in case another instance just finished)
			const finalCheck = await isDatabaseSeeded();
			if (finalCheck) {
				console.log('[DB Init] Database was seeded while waiting for lock - skipping');
				return;
			}

			await seedDatabase();
		} finally {
			// Always release the advisory lock
			console.log('[DB Init] Releasing advisory lock...');
			await db.execute(sql`SELECT pg_advisory_unlock(12345)`);
		}
	} catch (error) {
		// If DATABASE_URL is configured but initialization fails, this is an error
		console.error('[DB Init] Database initialization failed:', error);

		throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
