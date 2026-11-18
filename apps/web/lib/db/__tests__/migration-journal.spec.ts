import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Drizzle's migrator (drizzle-orm 0.45, `PgDialect.migrate` in `pg-core/dialect.js`) reads only the
 * NEWEST row of `drizzle.__drizzle_migrations` and runs a journal entry only when
 * `Number(lastDbMigration.created_at) < migration.folderMillis`, where `folderMillis` is the entry's
 * `when`. It never compares hashes or tags. An entry whose `when` is not later than an entry before
 * it is therefore skipped, silently and for good, on every database that already ran that entry.
 *
 * `0042_email_two_factor_auth` (spec 053) carried an older `when` than
 * `0041_billing_issue_refund_claim`, so a database that had run 0041 never got the `twoFactorCodes`
 * table or the `client_profiles` brute-force columns, and email 2FA failed there. The fix moves
 * 0042's `when` after 0041 and adds `0044_reapply_email_two_factor_auth`, which re-runs 0042's
 * statements for the databases that already ran 0043 and so can no longer reach 0042.
 */

const MIGRATIONS = join(__dirname, '../migrations');

interface JournalEntry {
	idx: number;
	version: string;
	when: number;
	tag: string;
	breakpoints: boolean;
}

const journal = (): JournalEntry[] =>
	(JSON.parse(readFileSync(join(MIGRATIONS, 'meta/_journal.json'), 'utf8')) as { entries: JournalEntry[] }).entries;

/**
 * 0009_add_integration_mappings and 0010_convert_comments_timestamps_to_timestamptz carry 2024
 * timestamps, earlier than 0008 (2025-10-23). They stay as they are: moving them after 0008 would
 * make the migrator re-run them on a database whose newest row is 0008, and neither is safe to run
 * twice (0009 is a plain CREATE TABLE, 0010 converts timestamptz columns again with
 * `AT TIME ZONE 'UTC'`). Every entry from 0011 on is later than 0008, so nothing after them is
 * skipped. The exception is pinned to these exact values so it cannot cover any other entry.
 */
const HISTORIC_OUT_OF_ORDER = new Map<number, number>([
	[9, 1730563200000],
	[10, 1730563260000]
]);

const SKIPPED = '0042_email_two_factor_auth';
const REAPPLY = '0044_reapply_email_two_factor_auth';
/** The newest migration released while 0042 was being skipped. */
const LAST_RELEASED_BEFORE_FIX = '0043_add_password_changed_at';

/** The statements of a migration file: whole-line comments dropped, whitespace collapsed. */
const statements = (tag: string): string[] =>
	readFileSync(join(MIGRATIONS, `${tag}.sql`), 'utf8')
		.split('--> statement-breakpoint')
		.map((statement) =>
			statement
				.split('\n')
				.filter((line) => !line.trim().startsWith('--'))
				.join(' ')
				.replace(/\s+/g, ' ')
				.trim()
		)
		.filter(Boolean);

/** Statement shapes that do nothing (and do not fail) when the object already exists. */
const IDEMPOTENT = [
	/^CREATE TABLE IF NOT EXISTS "[^"]+" \(.*\);$/,
	/^ALTER TABLE "[^"]+" ADD COLUMN IF NOT EXISTS "[^"]+" [^;]*;$/,
	/^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS "[^"]+" ON [^;]*;$/,
	/^DO \$\$ BEGIN ALTER TABLE "[^"]+" ADD CONSTRAINT "[^"]+" [^;]*; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;$/
];

/** Every object 0042 creates (spec 053), in the order 0042 creates them. */
const OBJECTS_0042 = {
	tables: ['twoFactorCodes'],
	columns: [
		'client_profiles.two_factor_failed_attempts',
		'client_profiles.two_factor_locked_until',
		'users.deactivated_at'
	],
	constraints: ['twoFactorCodes_userId_users_id_fk', 'twoFactorCodes_tenant_id_tenant_id_fk'],
	indexes: [
		'two_factor_codes_user_id_idx',
		'two_factor_codes_expires_idx',
		'two_factor_codes_tenant_id_idx',
		'two_factor_codes_active_user_idx'
	]
};

/** The objects a list of statements creates, with the statement that creates each. */
const objectsCreatedBy = (sql: string[]) => {
	const found = {
		tables: new Map<string, string>(),
		columns: new Map<string, string>(),
		constraints: new Map<string, string>(),
		indexes: new Map<string, string>()
	};
	for (const statement of sql) {
		for (const m of statement.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"/g)) {
			found.tables.set(m[1], statement);
		}
		for (const m of statement.matchAll(/ALTER TABLE "([^"]+)" ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)"/g)) {
			found.columns.set(`${m[1]}.${m[2]}`, statement);
		}
		for (const m of statement.matchAll(/ADD CONSTRAINT "([^"]+)"/g)) {
			found.constraints.set(m[1], statement);
		}
		for (const m of statement.matchAll(/CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?"([^"]+)"/g)) {
			found.indexes.set(m[1], statement);
		}
	}
	return found;
};

describe('drizzle migration journal', () => {
	it('lists the entries in idx order, 0 to n-1, each with its .sql file, and every .sql file', () => {
		const entries = journal();
		entries.forEach((entry, position) => {
			assert.equal(entry.idx, position, `journal entry ${entry.tag} is out of idx order`);
			assert.ok(existsSync(join(MIGRATIONS, `${entry.tag}.sql`)), `${entry.tag}.sql is missing`);
		});
		const tags = new Set(entries.map((entry) => entry.tag));
		const unjournaled = readdirSync(MIGRATIONS)
			.filter((name) => name.endsWith('.sql'))
			.filter((name) => !tags.has(name.replace(/\.sql$/, '')));
		assert.deepEqual(unjournaled, [], 'a migration file that is not in the journal never runs');
	});

	it('gives every entry a `when` later than every entry before it, or drizzle skips it', () => {
		let latest = Number.NEGATIVE_INFINITY;
		let latestTag = '(none)';
		for (const entry of journal()) {
			assert.ok(Number.isSafeInteger(entry.when), `${entry.tag} has no integer \`when\``);
			const pinned = HISTORIC_OUT_OF_ORDER.get(entry.idx);
			if (pinned !== undefined) {
				assert.equal(entry.when, pinned, `historic entry ${entry.tag} changed its \`when\``);
				continue;
			}
			assert.ok(
				entry.when > latest,
				`${entry.tag} (when ${entry.when}) is not later than ${latestTag} (when ${latest}): ` +
					`drizzle never runs it on a database that already ran ${latestTag}`
			);
			latest = entry.when;
			latestTag = entry.tag;
		}
	});
});

describe(`${REAPPLY} restores what ${SKIPPED} created on databases that skipped it`, () => {
	it(`is journaled after ${LAST_RELEASED_BEFORE_FIX}, later than every migration before it`, () => {
		const entries = journal();
		const reapply = entries.find((entry) => entry.tag === REAPPLY);
		assert.ok(reapply, `${REAPPLY} is not in the drizzle journal`);
		const released = entries.findIndex((entry) => entry.tag === LAST_RELEASED_BEFORE_FIX);
		assert.ok(released >= 0, `${LAST_RELEASED_BEFORE_FIX} is not in the drizzle journal`);
		assert.ok(reapply.idx > released, `${REAPPLY} does not come after ${LAST_RELEASED_BEFORE_FIX}`);
		const newestBefore = Math.max(...entries.slice(0, reapply.idx).map((entry) => entry.when));
		assert.ok(
			reapply.when > newestBefore,
			`${REAPPLY} (when ${reapply.when}) is not later than every migration before it (${newestBefore})`
		);
	});

	it(`runs every statement of ${SKIPPED}, word for word`, () => {
		assert.ok(existsSync(join(MIGRATIONS, `${REAPPLY}.sql`)), `${REAPPLY}.sql is missing`);
		const reapply = new Set(statements(REAPPLY));
		for (const statement of statements(SKIPPED)) {
			assert.ok(reapply.has(statement), `${REAPPLY} does not run: ${statement}`);
		}
	});

	it(`creates every object ${SKIPPED} creates, each guarded so it is a no-op where it exists`, () => {
		const skipped = objectsCreatedBy(statements(SKIPPED));
		// Pins the parser: if 0042 reads as creating anything else, this list (and spec 053) is stale.
		for (const kind of ['tables', 'columns', 'constraints', 'indexes'] as const) {
			assert.deepEqual([...skipped[kind].keys()], OBJECTS_0042[kind], `${SKIPPED} ${kind}`);
		}
		assert.ok(existsSync(join(MIGRATIONS, `${REAPPLY}.sql`)), `${REAPPLY}.sql is missing`);
		const reapply = objectsCreatedBy(statements(REAPPLY));
		for (const kind of ['tables', 'columns', 'constraints', 'indexes'] as const) {
			for (const name of OBJECTS_0042[kind]) {
				const statement = reapply[kind].get(name);
				assert.ok(statement, `${REAPPLY} does not create ${kind.replace(/s$/, '')} ${name}`);
				assert.ok(
					IDEMPOTENT.some((shape) => shape.test(statement)),
					`${REAPPLY} creates ${name} with a statement that fails or changes data where it exists: ${statement}`
				);
			}
		}
	});

	it(`${SKIPPED} and ${REAPPLY} are safe to run on a database that already has their objects`, () => {
		// 0042's new `when` makes a database whose newest row is 0041 run it, including one that ran
		// it before under the old `when`; 0044 runs on every database that has 0043, 0042 or not.
		for (const tag of [SKIPPED, REAPPLY]) {
			assert.ok(existsSync(join(MIGRATIONS, `${tag}.sql`)), `${tag}.sql is missing`);
			for (const statement of statements(tag)) {
				assert.ok(
					IDEMPOTENT.some((shape) => shape.test(statement)),
					`${tag} has a statement that is not safe to run twice: ${statement}`
				);
			}
		}
	});
});
