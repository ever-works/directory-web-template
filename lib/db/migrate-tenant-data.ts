import { sql } from 'drizzle-orm';

/**
 * All tables that have a `tenant_id` column.
 * Uses the actual PostgreSQL table name (snake_case / as-defined in migrations).
 */
const TABLES_WITH_TENANT_ID = [
	'users',
	'roles',
	'permissions',
	'role_permissions',
	'user_roles',
	'accounts',
	'client_profiles',
	'sessions',
	'"verificationTokens"',
	'authenticators',
	'"activityLogs"',
	'"passwordResetTokens"',
	'"newsletterSubscriptions"',
	'comments',
	'votes',
	'subscriptions',
	'"subscriptionHistory"',
	'"paymentProviders"',
	'"paymentAccounts"',
	'notifications',
	'favorites',
	'featured_items',
	'sponsor_ads',
	'twenty_crm_config',
	'integration_mappings',
	'companies',
	'items_companies',
	'reports',
	'moderation_history',
	'surveys',
	'survey_responses',
	'item_views',
	'seed_status',
	'item_audit_logs',
	'item_location_index',
	'location_index_meta'
];

/**
 * Migrates existing rows with NULL tenant_id to the resolved default tenant.
 *
 * This is safe to call on every startup:
 * - If no rows have NULL tenant_id, it's a no-op.
 * - Only updates rows where tenant_id IS NULL.
 * - Skips tables that don't exist yet (e.g. before certain migrations).
 *
 * @param tenantId - The tenant ID to assign to NULL rows
 */
export async function migrateNullTenantIds(tenantId: string): Promise<void> {
	const { db } = await import('./drizzle');

	console.log(`[Tenant Migration] Checking for NULL tenant_id rows to assign to tenant '${tenantId}'...`);

	let totalUpdated = 0;

	for (const tableName of TABLES_WITH_TENANT_ID) {
		try {
			// Use raw SQL to handle quoted table names properly
			const result = await db.execute(
				sql.raw(`UPDATE ${tableName} SET tenant_id = '${tenantId}' WHERE tenant_id IS NULL`)
			);

			// Extract row count from the result
			const rowCount = (result as { rowCount?: number }).rowCount ?? 0;

			if (rowCount > 0) {
				console.log(`[Tenant Migration] ✓ ${tableName}: updated ${rowCount} rows`);
				totalUpdated += rowCount;
			}
		} catch (error) {
			// Table might not exist yet (migrations not applied) — skip silently
			const msg = error instanceof Error ? error.message : String(error);
			if (msg.includes('does not exist') || msg.includes('relation')) {
				// Table doesn't exist yet, skip
				continue;
			}
			console.warn(`[Tenant Migration] ⚠ ${tableName}: ${msg}`);
		}
	}

	if (totalUpdated === 0) {
		console.log('[Tenant Migration] No NULL tenant_id rows found — nothing to migrate.');
	} else {
		console.log(`[Tenant Migration] ✅ Migration complete: ${totalUpdated} total rows updated across all tables.`);
	}
}
