import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { isSponsorAdWithinPaidWindow } from '../live-window';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Since T-2859 an ad leaves the public sponsor slots at its `endDate`, but nothing set the row
 * to `expired`. So a sponsor who did not renew could not buy a new sponsorship for the same
 * item ("You already have an active sponsorship for this item": `hasActiveSponsorAdForItem`
 * checked the status alone), and the admin and user stats kept counting the ad as active and
 * its amount as revenue. Now `expireEndedSponsorAds` sets ended `active` rows to `expired`
 * from the daily expiration job, and the create check applies the paid-window rule so it is
 * right between two sweeps.
 *
 * The rules are pure and tested directly; the repository, service, cron route and scheduler
 * import the database or Next.js and cannot be loaded under `tsx --test`, so their guards read
 * the source (same approach as `sponsor-ad-live-window.spec.ts`).
 */

const NOW = new Date('2026-11-28T00:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const WEB = join(__dirname, '../../..');

type Ad = { id: string; status: string; endDate?: Date | null };

/** Loaded per test, so a missing export fails each test on its own. */
const loadModule = async <T>(path: string, name: string): Promise<T> => {
	const mod = (await import(path)) as Record<string, unknown>;
	assert.equal(typeof mod[name], 'function', `${name} is not exported by ${path}`);
	return mod[name] as T;
};
const loadDueForExpiry = () =>
	loadModule<(ad: Omit<Ad, 'id'>, now?: Date) => boolean>('../live-window', 'isSponsorAdDueForExpiry');

type SweepResult = { expired: number; error?: string };
type Sweep = (
	expire: () => Promise<readonly unknown[]>,
	logger?: { log: (...args: unknown[]) => void; error: (...args: unknown[]) => void }
) => Promise<SweepResult>;
const loadSweep = () => loadModule<Sweep>('../expiry-sweep', 'runSponsorAdExpirySweep');
const silent = { log: () => {}, error: () => {} };

/** LF line endings, so the `\n` markers below also match a CRLF checkout. */
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

const REPO = 'lib/repositories/sponsor-ad.repository.ts';
const SERVICE = 'lib/services/sponsor-ad.service.ts';
const CRON = 'app/api/cron/subscription-expiration/route.ts';
const SCHEDULER = 'lib/background-jobs/initialize-jobs.ts';

// A mix of rows, as the sweep meets them in one tenant
const ROWS: Ad[] = [
	{ id: 'ended-week', status: 'active', endDate: new Date(NOW.getTime() - 7 * 24 * HOUR) },
	{ id: 'ended-hour', status: 'active', endDate: new Date(NOW.getTime() - HOUR) },
	{ id: 'ends-now', status: 'active', endDate: new Date(NOW) },
	{ id: 'live', status: 'active', endDate: new Date(NOW.getTime() + HOUR) },
	{ id: 'no-end', status: 'active', endDate: null },
	{ id: 'already-expired', status: 'expired', endDate: new Date(NOW.getTime() - HOUR) },
	{ id: 'cancelled', status: 'cancelled', endDate: new Date(NOW.getTime() - HOUR) },
	{ id: 'pending', status: 'pending', endDate: null },
	{ id: 'pending-payment', status: 'pending_payment', endDate: null },
	{ id: 'rejected', status: 'rejected', endDate: new Date(NOW.getTime() - HOUR) }
];

describe('isSponsorAdDueForExpiry: the rows the daily sweep sets to expired', () => {
	it('the sweep picks exactly the active rows whose end date has passed', async () => {
		const isDue = await loadDueForExpiry();
		const picked = ROWS.filter((ad) => isDue(ad, NOW)).map((ad) => ad.id);
		assert.deepEqual(picked, ['ended-week', 'ended-hour', 'ends-now']);
	});

	it('leaves an active ad inside its window, and one with no end date, alone', async () => {
		const isDue = await loadDueForExpiry();
		assert.equal(isDue({ status: 'active', endDate: new Date(NOW.getTime() + 1) }, NOW), false);
		assert.equal(isDue({ status: 'active', endDate: null }, NOW), false);
		assert.equal(isDue({ status: 'active' }, NOW), false);
	});

	it('never touches a row that is not active, whatever its end date', async () => {
		const isDue = await loadDueForExpiry();
		const past = new Date(NOW.getTime() - HOUR);
		for (const status of ['pending_payment', 'pending', 'rejected', 'expired', 'cancelled']) {
			assert.equal(isDue({ status, endDate: past }, NOW), false, status);
		}
	});

	it('is the exact complement of the paid window for active ads with an end date', async () => {
		const isDue = await loadDueForExpiry();
		for (const offset of [-24 * HOUR, -1, 0, 1, 24 * HOUR]) {
			const ad = { status: 'active', endDate: new Date(NOW.getTime() + offset) };
			assert.equal(isDue(ad, NOW), !isSponsorAdWithinPaidWindow(ad, NOW), `offset ${offset} ms`);
		}
	});

	it('uses the current time when none is given', async () => {
		const isDue = await loadDueForExpiry();
		assert.equal(isDue({ status: 'active', endDate: new Date(Date.now() - 60_000) }), true);
		assert.equal(isDue({ status: 'active', endDate: new Date(Date.now() + 60_000) }), false);
	});
});

describe('expireEndedSponsorAds applies the same rule in SQL', () => {
	it('updates active rows of the current tenant with end_date <= now to expired, with updatedAt', () => {
		const body = functionBody(code(REPO), 'export async function expireEndedSponsorAds(');
		assert.ok(body.includes('await getTenantId()'), 'not scoped by tenant');
		assert.ok(body.includes("throw new Error('Tenant ID not found')"), 'runs without a tenant');
		assert.ok(body.includes('.update(sponsorAds)'));
		assert.ok(body.includes('status: SponsorAdStatus.EXPIRED'));
		assert.ok(/updatedAt: \w+/.test(body), 'does not set updatedAt');
		assert.ok(body.includes('eq(sponsorAds.status, SponsorAdStatus.ACTIVE)'), 'would expire non-active rows');
		assert.ok(body.includes('eq(sponsorAds.tenantId, tenantId)'), 'would expire other tenants');
		assert.ok(body.includes('lte(sponsorAds.endDate, now)'), 'does not stop at the end date');
		assert.ok(!body.includes('isNull(sponsorAds.endDate)'), 'would expire rows with no end date');
	});

	it('returns the rows it changed', () => {
		const body = functionBody(code(REPO), 'export async function expireEndedSponsorAds(');
		assert.ok(body.includes('Promise<SponsorAd[]>'));
		assert.ok(body.includes('.returning()'));
	});

	it('is reachable through the service', () => {
		const body = functionBody(code(SERVICE), 'async expireEndedSponsorAds(');
		assert.ok(body.includes('sponsorAdRepo.expireEndedSponsorAds('));
	});
});

describe('a new sponsorship is blocked only by an ad inside its paid window', () => {
	const ended = { status: 'active', endDate: new Date(NOW.getTime() - HOUR) };
	const live = { status: 'active', endDate: new Date(NOW.getTime() + 7 * 24 * HOUR) };

	it('an ended active ad no longer blocks a new create, even before the sweep', () => {
		assert.equal(isSponsorAdWithinPaidWindow(ended, NOW), false);
		const body = functionBody(code(REPO), 'export async function hasActiveSponsorAdForItem(');
		assert.ok(body.includes('isNull(sponsorAds.endDate)'), 'the check ignores the end date');
		assert.ok(body.includes('gt(sponsorAds.endDate, now)'), 'an ended ad still counts as active');
	});

	it('an ad inside its window still blocks it', () => {
		assert.equal(isSponsorAdWithinPaidWindow(live, NOW), true);
		const body = functionBody(code(REPO), 'export async function hasActiveSponsorAdForItem(');
		assert.ok(body.includes('eq(sponsorAds.userId, userId)'));
		assert.ok(body.includes('eq(sponsorAds.itemSlug, itemSlug)'));
		assert.ok(body.includes('eq(sponsorAds.status, SponsorAdStatus.ACTIVE)'));
		assert.ok(body.includes('or(isNull(sponsorAds.endDate), gt(sponsorAds.endDate, now))'));
	});

	it('createSponsorAd still refuses a second sponsorship while that check is true', () => {
		const service = code(SERVICE);
		const start = service.indexOf('async createSponsorAd(');
		assert.ok(start >= 0, 'createSponsorAd not found');
		const body = service.slice(start, service.indexOf('return await sponsorAdRepo.createSponsorAd(', start));
		assert.ok(body.includes('sponsorAdRepo.hasActiveSponsorAdForItem('));
		assert.ok(body.includes('You already have an active sponsorship for this item'));
	});
});

describe('runSponsorAdExpirySweep: a failing sweep never stops the job that runs it', () => {
	it('reports how many ads it expired', async () => {
		const run = await loadSweep();
		assert.deepEqual(await run(async () => [{ id: 'a' }, { id: 'b' }], silent), { expired: 2 });
		assert.deepEqual(await run(async () => [], silent), { expired: 0 });
	});

	it('returns the error instead of throwing it', async () => {
		const run = await loadSweep();
		const result = await run(async () => {
			throw new Error('connection reset');
		}, silent);
		assert.equal(result.expired, 0);
		assert.match(result.error ?? '', /sponsor ads/i);
		assert.match(result.error ?? '', /connection reset/);
	});
});

describe('the daily expiration job runs the sweep', () => {
	it('the subscription-expiration cron GET calls it after the subscriptions, and reports the count', () => {
		const body = functionBody(code(CRON), 'export async function GET(');
		const subscriptions = body.indexOf('subscriptionService.processExpiredSubscriptions()');
		const sweep = body.indexOf('runSponsorAdExpirySweep(');
		assert.ok(subscriptions >= 0, 'the cron no longer processes subscriptions');
		assert.ok(sweep > subscriptions, 'the cron does not run the sponsor-ad sweep after the subscriptions');
		assert.ok(body.includes('sponsorAdService.expireEndedSponsorAds()'), 'the sweep is not the repository sweep');
		assert.ok(/sponsorAdsExpired: \w+\.expired/.test(body), 'the response does not report the count');
	});

	it('the local scheduler runs it in the same daily job', () => {
		const src = code(SCHEDULER);
		const start = src.indexOf("'subscription-expired-cleanup'");
		assert.ok(start >= 0, 'subscription-expired-cleanup job not found');
		const job = src.slice(start, src.indexOf("'0 0 * * *'", start));
		assert.ok(job.includes('subscriptionService.processExpiredSubscriptions()'));
		assert.ok(job.includes('runSponsorAdExpirySweep('), 'the local scheduler does not sweep sponsor ads');
		assert.ok(job.includes('sponsorAdService.expireEndedSponsorAds()'));
	});

	it('the service state diagram names the sweep instead of a job that did not exist', () => {
		const service = raw(SERVICE);
		assert.ok(!service.includes('via separate job'), 'the diagram still names a separate job');
		assert.ok(service.includes('expireEndedSponsorAds'), 'the diagram does not name the sweep');
	});
});
