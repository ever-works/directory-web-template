import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

/**
 * Run Drizzle migrations from ./migrations folder
 * 
 * This is safe to call on every startup because Drizzle's migrate() is idempotent:
 * - It tracks applied migrations in a __drizzle_migrations table
 * - It only runs migrations that haven't been applied yet
 * - Already-applied migrations are automatically skipped
 * 
 * @returns Promise<boolean> - true if migrations succeeded (or nothing to do), false if failed
 */
export async function runMigrations(): Promise<boolean> {
	try {
		console.log('[Migration] Running database migrations...');

		const { db } = await import('./drizzle');

		// Log current migration state before running
		try {
			const result = await db.execute(sql`
				SELECT hash, created_at 
				FROM drizzle.__drizzle_migrations 
				ORDER BY created_at DESC 
				LIMIT 5
			`);
			const rows = (result as { rows?: unknown[] }).rows ?? (Array.isArray(result) ? result : []);
			console.log('[Migration] Recent applied migrations:', rows.length > 0 ? JSON.stringify(rows) : 'none');
		} catch {
			console.log('[Migration] No migration history found (first run)');
		}

		// Run migrations from ./migrations folder
		// Drizzle automatically skips already-applied migrations
		await migrate(db, { migrationsFolder: './lib/db/migrations' });

		console.log('[Migration] ✓ Migrations completed (new migrations applied or already up-to-date)');

		// Log migration state after running
		try {
			const result = await db.execute(sql`
				SELECT hash, created_at 
				FROM drizzle.__drizzle_migrations 
				ORDER BY created_at DESC 
				LIMIT 3
			`);
			const rows = (result as { rows?: unknown[] }).rows ?? (Array.isArray(result) ? result : []);
			console.log('[Migration] Latest migrations after run:', JSON.stringify(rows));
		} catch {
			// Ignore errors - migration table should exist after successful migration
		}

		return true;
	} catch (error) {
		console.error('[Migration] ✗ Database migrations failed:', error instanceof Error ? error.message : error);
		if (error instanceof Error && error.stack) {
			console.error('[Migration] Stack trace:', error.stack);
		}
		console.error('[Migration] Please run migrations manually: pnpm db:migrate');
		return false;
	}
}
