import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `searchPublicProfiles` feeds the people directory at `/client/users`, which any
 * signed-in user can open and search with `?q=`. A profile set to Private is
 * "Hidden from the people directory" (`messages/en.json`, PRIVATE_BULLET_1), and a
 * location set to private (the default) is hidden on the profile page, so the
 * directory may neither list a private profile, nor show or match a private location.
 * The query imports the database and cannot be loaded under `tsx --test`, so these
 * guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const queries = source('../client.queries.ts');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

/** The text from `marker` up to the first `end` after it. */
const between = (src: string, marker: string, end: string) => {
	const start = src.indexOf(marker);
	assert.ok(start >= 0, `${marker} not found`);
	const stop = src.indexOf(end, start + marker.length);
	assert.ok(stop > start, `${end} not found after ${marker}`);
	return src.slice(start, stop);
};

const body = functionBody(queries, 'export async function searchPublicProfiles(');

describe('the people directory (searchPublicProfiles) honours profile and location privacy', () => {
	it('filters out private profiles in the shared where clause', () => {
		const conditions = between(body, 'const whereConditions: SQL[] = [', '];');
		assert.ok(
			conditions.includes("ne(clientProfiles.profileVisibility, 'private')"),
			'whereConditions does not exclude profileVisibility = private'
		);
		assert.ok(
			/import \{[^}]*\bne\b[^}]*\} from 'drizzle-orm'/.test(queries),
			'client.queries.ts does not import ne from drizzle-orm'
		);
		// The count and the rows both read whereClause, so the total and the pages agree.
		assert.ok(body.includes('const whereClause = and(...whereConditions);'), 'whereClause no longer built');
		assert.equal(
			body.split('.where(and(whereClause, excludeAdmins))').length - 1,
			2,
			'the count and the rows queries must both filter on whereClause'
		);
	});

	it('matches the search on location only where the location is not private', () => {
		const search = between(body, 'if (params.query && params.query.trim()) {', 'const whereClause');
		const gated =
			"(${clientProfiles.locationPrivacy} IS DISTINCT FROM 'private' AND ${clientProfiles.location} ILIKE ${like})";
		assert.ok(search.includes(gated), 'the location ILIKE is not gated on location_privacy');
		assert.ok(
			!search.split(gated).join(' ').includes('${clientProfiles.location} ILIKE'),
			'the search still matches location without checking location_privacy'
		);
		// The other public fields stay searchable.
		for (const column of ['displayName', 'username', 'name', 'jobTitle', 'bio']) {
			assert.ok(search.includes(`\${clientProfiles.${column}} ILIKE \${like}`), `the search lost ${column}`);
		}
	});

	it('returns location only where the location is not private', () => {
		const select = between(body, '.select({ userId: clientProfiles.userId,', '.from(clientProfiles)');
		assert.ok(
			select.includes('locationPrivacy: clientProfiles.locationPrivacy'),
			'the rows query does not read location_privacy'
		);

		const rawName = /const (\w+) = await db \.select\(\{ userId: clientProfiles\.userId,/.exec(body)?.[1];
		assert.ok(rawName, 'the rows query result is no longer assigned to a variable');
		assert.ok(
			/location: locationPrivacy === 'private' \? null : /.test(body),
			"location is not set to null where locationPrivacy is 'private'"
		);

		const result = body.slice(body.lastIndexOf('return {'));
		assert.ok(
			!new RegExp(`\\brows: ${rawName}\\b`).test(result) && !(rawName === 'rows' && /[{,] rows[,}]/.test(result)),
			'searchPublicProfiles returns the selected rows, location included, unchanged'
		);
	});

	it('keeps the PublicProfileRow shape (no locationPrivacy field)', () => {
		const row = between(queries, 'export interface PublicProfileRow {', '}');
		assert.ok(row.includes('location: string | null;'), 'PublicProfileRow lost location');
		assert.ok(!row.includes('locationPrivacy'), 'PublicProfileRow now carries locationPrivacy');
	});
});
