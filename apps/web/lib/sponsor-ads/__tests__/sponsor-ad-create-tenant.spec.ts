import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `createSponsorAd` inserted the row the service built (user, item, interval, amount, currency,
 * provider, status) with no `tenant_id`, and the column has no default, so a new sponsor ad was
 * stored with `tenant_id` NULL. Every reader filters by the current tenant, so right after
 * `POST /api/sponsor-ads/user` answered 201, `POST /api/sponsor-ads/checkout` answered 404
 * "Sponsor ad not found", and the ad was missing from the owner's list, the admin review queue
 * and the expiry sweep until a restart ran the NULL-tenant backfill (`migrateNullTenantIds`),
 * which gives the row the default tenant, not the one it was created on.
 *
 * `createSponsorAd` now resolves the tenant like the rest of the repository (throws
 * "Tenant ID not found" without one) and inserts the row `newSponsorAdRow` builds with it. The
 * helper is pure and tested directly; the repository imports the database and cannot be loaded
 * under `tsx --test`, so its guards read the source (same approach as
 * `sponsor-ad-public-fields.spec.ts`).
 */

const WEB = join(__dirname, '../../..');
const REPO = 'lib/repositories/sponsor-ad.repository.ts';
const HELPER = 'lib/sponsor-ads/new-sponsor-ad-row.ts';
const NOW = new Date('2026-11-28T12:00:00.000Z');

type Row = Record<string, unknown>;
type BuildRow = (data: Row, tenantId: string, now?: Date) => Row;

/** Loaded per test, so a missing module fails each test on its own. */
const loadBuildRow = async (): Promise<BuildRow> => {
	const mod = (await import('../new-sponsor-ad-row')) as unknown as { newSponsorAdRow?: BuildRow };
	assert.equal(typeof mod.newSponsorAdRow, 'function', 'newSponsorAdRow is not exported');
	return mod.newSponsorAdRow!;
};

/** The row `sponsorAdService.createSponsorAd` hands to the repository. */
const serviceRow = (): Row => ({
	userId: 'user_1',
	itemSlug: 'featured-tool',
	interval: 'monthly',
	amount: 100,
	currency: 'usd',
	paymentProvider: 'stripe',
	status: 'pending_payment'
});

/** LF line endings, so the markers below also match a CRLF checkout. */
const raw = (relative: string) => readFileSync(join(WEB, relative), 'utf8').replace(/\r\n/g, '\n');

/** Code only, on one line: comments are dropped, since they may name the old behaviour. */
const code = (relative: string) =>
	raw(relative)
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/^\s*\/\/.*$/gm, ' ')
		.replace(/\s+/g, ' ');

/** The text of one top-level function, up to the next top-level `export`. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

describe('newSponsorAdRow stamps the resolved tenant on a new sponsor ad', () => {
	it('sets tenantId on the row the service builds, which has none', async () => {
		const newSponsorAdRow = await loadBuildRow();
		const row = newSponsorAdRow(serviceRow(), 'tenant_a', NOW);
		assert.equal(row.tenantId, 'tenant_a');
	});

	it('never takes the tenantId from data', async () => {
		const newSponsorAdRow = await loadBuildRow();
		const row = newSponsorAdRow({ ...serviceRow(), tenantId: 'tenant_other' }, 'tenant_a', NOW);
		assert.equal(row.tenantId, 'tenant_a', 'a tenantId passed in data replaced the resolved tenant');
	});

	it('keeps every service field and stamps createdAt and updatedAt with the same time', async () => {
		const newSponsorAdRow = await loadBuildRow();
		const data = serviceRow();
		const row = newSponsorAdRow(data, 'tenant_a', NOW);
		assert.deepEqual(row, { ...serviceRow(), tenantId: 'tenant_a', createdAt: NOW, updatedAt: NOW });
		assert.deepEqual(data, serviceRow(), 'newSponsorAdRow changed the data it was given');
	});

	it('refuses an empty tenant instead of storing a row no tenant can read', async () => {
		const newSponsorAdRow = await loadBuildRow();
		assert.throws(() => newSponsorAdRow(serviceRow(), '', NOW), /Tenant ID not found/);
	});

	it('imports no database or server-only code, so it can be loaded anywhere', () => {
		const src = code(HELPER);
		const imports = src.match(/\bimport\b[^;]*;/g) ?? [];
		for (const statement of imports) {
			assert.ok(statement.startsWith('import type '), `new-sponsor-ad-row.ts has a runtime import: ${statement}`);
		}
		assert.ok(!src.includes("'server-only'"), 'new-sponsor-ad-row.ts imports server-only');
	});
});

describe('createSponsorAd inserts the tenant its readers filter by', () => {
	it('resolves the tenant first and throws "Tenant ID not found" without one', () => {
		const body = functionBody(code(REPO), 'export async function createSponsorAd(');
		const resolve = body.indexOf('const tenantId = await getTenantId();');
		const guard = body.indexOf("if (!tenantId) throw new Error('Tenant ID not found');");
		const insert = body.indexOf('.insert(sponsorAds)');
		assert.ok(resolve >= 0, 'createSponsorAd does not resolve the tenant');
		assert.ok(guard > resolve, 'createSponsorAd does not throw when there is no tenant');
		assert.ok(insert > guard, 'createSponsorAd inserts before it has a tenant');
	});

	it('inserts the row newSponsorAdRow builds with that tenant, not the raw data', () => {
		const repo = code(REPO);
		assert.ok(
			/import \{[^}]*\bnewSponsorAdRow\b[^}]*\} from '@\/lib\/sponsor-ads\/new-sponsor-ad-row';/.test(repo),
			'the repository does not import newSponsorAdRow'
		);
		const body = functionBody(repo, 'export async function createSponsorAd(');
		assert.ok(
			/\.insert\(sponsorAds\) ?\.values\(newSponsorAdRow\(data, tenantId\)\)/.test(body),
			'createSponsorAd does not insert newSponsorAdRow(data, tenantId)'
		);
		assert.ok(!body.includes('...data'), 'createSponsorAd still spreads data into the insert');
	});

	it('every insert into sponsor_ads goes through newSponsorAdRow', () => {
		const repo = code(REPO);
		const inserts = [...repo.matchAll(/\.insert\(sponsorAds\)/g)].length;
		const stamped = [...repo.matchAll(/\.insert\(sponsorAds\) ?\.values\(newSponsorAdRow\(/g)].length;
		assert.ok(inserts > 0, 'no insert into sponsorAds found');
		assert.equal(stamped, inserts, 'an insert into sponsorAds does not stamp the tenant');
	});

	it('checkout, the owner list and the expiry sweep still read by that tenant', () => {
		const repo = code(REPO);
		for (const signature of [
			'export async function getSponsorAdById(',
			'export async function getSponsorAdsByUserId(',
			'export async function expireEndedSponsorAds('
		]) {
			const body = functionBody(repo, signature);
			assert.ok(body.includes('eq(sponsorAds.tenantId, tenantId)'), `${signature} no longer filters by tenant`);
		}
	});
});
