import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `GET /api/sponsor-ads` is public (no session; `proxy.ts` guards only `/api/admin/`). It used
 * to answer with the whole `sponsor_ads` row of every active sponsorship, so a signed-out
 * request got the sponsor's user id, the payment provider's customer and subscription ids,
 * the amount paid and the id of the admin who reviewed it. `toPublicSponsorAd` now copies only
 * the fields the sponsor cards need, and `getActiveSponsorAdsWithItems` maps every row through
 * it. The projection is pure and is tested directly; the repository, service and route import
 * the database or Next.js and cannot be loaded under `tsx --test`, so those guards read the
 * source (same approach as `lib/db/queries/__tests__/comment-public-fields.spec.ts`).
 */

const WEB = join(__dirname, '../../..');

/** The fields a public sponsor ad may carry, in the order the swagger lists them. */
const PUBLIC_FIELDS = ['id', 'itemSlug', 'status', 'interval', 'startDate', 'endDate'];

/** Columns of `sponsor_ads` that must never reach the public response. */
const PRIVATE_FIELDS = [
	'userId',
	'customerId',
	'subscriptionId',
	'amount',
	'currency',
	'paymentProvider',
	'reviewedBy',
	'reviewedAt',
	'rejectionReason',
	'cancelReason',
	'cancelledAt',
	'tenantId',
	'createdAt',
	'updatedAt'
];

/** A full `sponsor_ads` row, as `db.select().from(sponsorAds)` returns it. */
const fullRow = () => ({
	id: 'sp_public_1',
	userId: 'user_private_1',
	itemSlug: 'featured-tool',
	status: 'active',
	interval: 'monthly',
	amount: 4900,
	currency: 'usd',
	tenantId: 'tenant_private_1',
	paymentProvider: 'provider_private',
	subscriptionId: 'sub_private_1',
	customerId: 'cus_private_1',
	startDate: new Date('2026-11-01T00:00:00.000Z'),
	endDate: new Date('2026-12-01T00:00:00.000Z'),
	reviewedBy: 'admin_private_1',
	reviewedAt: new Date('2026-10-30T00:00:00.000Z'),
	rejectionReason: 'private rejection note',
	cancelledAt: new Date('2026-10-31T00:00:00.000Z'),
	cancelReason: 'private cancel note',
	createdAt: new Date('2026-10-29T00:00:00.000Z'),
	updatedAt: new Date('2026-10-31T00:00:00.000Z')
});

type Projection = (row: Record<string, unknown>) => Record<string, unknown>;

/** Loaded per test, so a missing module fails each test on its own. */
const loadProjection = async (): Promise<Projection> => {
	const mod = (await import('../public-sponsor-ad')) as unknown as { toPublicSponsorAd?: Projection };
	assert.equal(typeof mod.toPublicSponsorAd, 'function', 'toPublicSponsorAd is not exported');
	return mod.toPublicSponsorAd!;
};

const raw = (relative: string) => readFileSync(join(WEB, relative), 'utf8');

/**
 * Code only, on one line: block comments and whole-line `//` comments are dropped, since
 * comments may name the old shapes when they explain the change.
 */
const code = (relative: string) =>
	raw(relative)
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/^\s*\/\/.*$/gm, ' ')
		.replace(/\s+/g, ' ');

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

describe('toPublicSponsorAd keeps only the public sponsor fields', () => {
	it('drops the user, payment, review and cancellation columns of a full row', async () => {
		const toPublicSponsorAd = await loadProjection();
		const result = toPublicSponsorAd(fullRow());
		for (const field of PRIVATE_FIELDS) {
			assert.ok(!(field in result), `the public sponsor ad still carries ${field}`);
		}
	});

	it('returns exactly the public fields, with their values', async () => {
		const toPublicSponsorAd = await loadProjection();
		const row = fullRow();
		const result = toPublicSponsorAd(row);
		assert.deepEqual(Object.keys(result).sort(), [...PUBLIC_FIELDS].sort());
		for (const field of PUBLIC_FIELDS) {
			assert.equal(result[field], row[field as keyof typeof row], `${field} changed`);
		}
	});

	it('copies an allowlist, so a column added to the table later stays private', async () => {
		const toPublicSponsorAd = await loadProjection();
		const result = toPublicSponsorAd({ ...fullRow(), paymentMethodId: 'pm_private_1' });
		assert.ok(!('paymentMethodId' in result), 'an unknown column passed through the projection');
	});

	it('serialises to JSON without any private value', async () => {
		const toPublicSponsorAd = await loadProjection();
		const json = JSON.stringify({ sponsor: toPublicSponsorAd(fullRow()), item: null });
		for (const value of [
			'user_private_1',
			'cus_private_1',
			'sub_private_1',
			'admin_private_1',
			'tenant_private_1',
			'provider_private',
			'private rejection note',
			'private cancel note',
			'4900'
		]) {
			assert.ok(!json.includes(value), `the JSON response still contains ${value}`);
		}
	});

	it('imports no database or server-only code, so it can be loaded anywhere', () => {
		const src = code('lib/sponsor-ads/public-sponsor-ad.ts');
		const imports = src.match(/\bimport\b[^;]*;/g) ?? [];
		for (const statement of imports) {
			assert.ok(statement.startsWith('import type '), `public-sponsor-ad.ts has a runtime import: ${statement}`);
		}
		assert.ok(!src.includes("'server-only'"), 'public-sponsor-ad.ts imports server-only');
	});
});

describe('GET /api/sponsor-ads answers with the projection, not the raw row', () => {
	it('getActiveSponsorAdsWithItems maps every row through toPublicSponsorAd', () => {
		const repo = code('lib/repositories/sponsor-ad.repository.ts');
		assert.ok(
			/import \{[^}]*\btoPublicSponsorAd\b[^}]*\} from '@\/lib\/sponsor-ads\/public-sponsor-ad';/.test(repo),
			'the repository does not import toPublicSponsorAd'
		);
		const body = functionBody(repo, 'export async function getActiveSponsorAdsWithItems(');
		assert.ok(
			body.includes('Promise<PublicSponsorWithItem[]>'),
			'getActiveSponsorAdsWithItems no longer returns PublicSponsorWithItem[]'
		);
		assert.ok(
			/sponsor: toPublicSponsorAd\(\w+\)/.test(body),
			'getActiveSponsorAdsWithItems does not build sponsor from toPublicSponsorAd'
		);
		assert.ok(!/[{,] sponsor[,}]/.test(body), 'getActiveSponsorAdsWithItems still returns the raw row as sponsor');
	});

	it('the service returns PublicSponsorWithItem[] and the route answers with it', () => {
		const service = functionBody(code('lib/services/sponsor-ad.service.ts'), 'async getActiveSponsorAdsWithItems(');
		assert.ok(
			/^async getActiveSponsorAdsWithItems\(limit\?: number\): Promise<PublicSponsorWithItem\[\]>/.test(service),
			'sponsorAdService.getActiveSponsorAdsWithItems no longer returns PublicSponsorWithItem[]'
		);
		const get = functionBody(code('app/api/sponsor-ads/route.ts'), 'export async function GET(');
		assert.ok(
			get.includes('await sponsorAdService.getActiveSponsorAdsWithItems(limit)'),
			'GET no longer reads getActiveSponsorAdsWithItems'
		);
		assert.ok(!get.includes('.getActiveSponsorAds('), 'GET reads the raw active sponsor ad rows');
	});

	it('the PublicSponsorWithItem type carries a PublicSponsorAd, not the SponsorAd row', () => {
		const types = code('lib/types/sponsor-ad.ts');
		const shape = between(types, 'export interface PublicSponsorWithItem {', '}');
		assert.ok(
			shape.includes('sponsor: PublicSponsorAd;'),
			'PublicSponsorWithItem.sponsor is not a PublicSponsorAd'
		);
		const publicType = between(types, 'export type PublicSponsorAd =', ';');
		for (const field of PRIVATE_FIELDS) {
			assert.ok(!publicType.includes(`'${field}'`), `PublicSponsorAd still picks ${field}`);
		}
	});

	it('the hook, the context and both sponsor components use PublicSponsorWithItem', () => {
		for (const file of [
			'hooks/use-active-sponsor-ads.ts',
			'components/sponsor-ads/sponsor-ads-context.tsx',
			'components/sponsor-ads/sponsor-card.tsx',
			'components/sponsor-ads/sidebar-sponsor.tsx'
		]) {
			const src = code(file);
			assert.ok(
				src.includes('PublicSponsorWithItem[]'),
				`${file} does not type its sponsors as PublicSponsorWithItem[]`
			);
			assert.ok(!/(?<!Public)SponsorWithItem\[\]/.test(src), `${file} still types sponsors as SponsorWithItem[]`);
		}
	});

	it('the route swagger documents exactly the public sponsor fields', () => {
		const swagger = between(raw('app/api/sponsor-ads/route.ts'), ' sponsor:\n', ' item:\n');
		const documented = [...swagger.matchAll(/\*\s+(\w+):\s*$/gm)]
			.map((match) => match[1])
			.filter((name) => !['sponsor', 'properties', 'type', 'format', 'nullable', 'enum'].includes(name));
		assert.deepEqual(documented, PUBLIC_FIELDS);
	});
});
