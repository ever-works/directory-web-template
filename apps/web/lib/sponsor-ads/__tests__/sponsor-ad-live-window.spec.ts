import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { isSponsorAdWithinPaidWindow } from '../live-window';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Nothing sets an `active` sponsor ad to `expired` when its window closes, and the public
 * listing (`GET /api/sponsor-ads`) filtered on `status = 'active'` only, so a sponsorship
 * stayed on display after the period its sponsor paid for. The rule is pure and tested
 * directly; the repository imports the database and cannot be loaded under `tsx --test`, so
 * its guard reads the source (same approach as `sponsor-ad-public-fields.spec.ts`).
 */

const NOW = new Date('2026-11-27T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

describe('isSponsorAdWithinPaidWindow', () => {
	it('hides an active ad whose end date has passed', () => {
		const ad = { status: 'active', endDate: new Date(NOW.getTime() - HOUR) };
		assert.equal(isSponsorAdWithinPaidWindow(ad, NOW), false);
	});

	it('hides an active ad that ended a long time ago', () => {
		const ad = { status: 'active', endDate: new Date('2026-01-01T00:00:00.000Z') };
		assert.equal(isSponsorAdWithinPaidWindow(ad, NOW), false);
	});

	it('hides an ad exactly at its end instant', () => {
		assert.equal(isSponsorAdWithinPaidWindow({ status: 'active', endDate: new Date(NOW) }, NOW), false);
	});

	it('keeps showing an active ad whose end date is ahead (a renewed ad)', () => {
		const ad = { status: 'active', endDate: new Date(NOW.getTime() + HOUR) };
		assert.equal(isSponsorAdWithinPaidWindow(ad, NOW), true);
	});

	it('keeps showing an active ad with no recorded end date', () => {
		assert.equal(isSponsorAdWithinPaidWindow({ status: 'active', endDate: null }, NOW), true);
		assert.equal(isSponsorAdWithinPaidWindow({ status: 'active' }, NOW), true);
	});

	it('never shows an ad that is not active, whatever its end date', () => {
		const future = new Date(NOW.getTime() + 24 * HOUR);
		for (const status of ['pending_payment', 'pending', 'rejected', 'expired', 'cancelled']) {
			assert.equal(isSponsorAdWithinPaidWindow({ status, endDate: future }, NOW), false, status);
		}
	});

	it('uses the current time when none is given', () => {
		const past = { status: 'active', endDate: new Date(Date.now() - 60_000) };
		const ahead = { status: 'active', endDate: new Date(Date.now() + 60_000) };
		assert.equal(isSponsorAdWithinPaidWindow(past), false);
		assert.equal(isSponsorAdWithinPaidWindow(ahead), true);
	});
});

describe('the public listing applies the same rule in SQL', () => {
	const repo = readFileSync(join(__dirname, '../../repositories/sponsor-ad.repository.ts'), 'utf8');

	const bodyOf = (signature: string): string => {
		const start = repo.indexOf(signature);
		assert.ok(start >= 0, `${signature} not found`);
		const next = repo.indexOf('\n}\n', start);
		return repo.slice(start, next + 3);
	};

	it('getActiveSponsorAds filters through liveSponsorAdFilter, not on status alone', () => {
		const body = bodyOf('export async function getActiveSponsorAds(');
		assert.ok(body.includes('liveSponsorAdFilter(tenantId)'), 'getActiveSponsorAds does not use the live filter');
		assert.ok(!body.includes('SponsorAdStatus.ACTIVE'), 'getActiveSponsorAds filters on status alone again');
	});

	it('liveSponsorAdFilter requires active status, the tenant, and an end date that is missing or ahead', () => {
		const body = bodyOf('function liveSponsorAdFilter(');
		assert.ok(body.includes('eq(sponsorAds.status, SponsorAdStatus.ACTIVE)'));
		assert.ok(body.includes('eq(sponsorAds.tenantId, tenantId)'));
		assert.ok(body.includes('isNull(sponsorAds.endDate)'));
		assert.ok(body.includes('gt(sponsorAds.endDate, now)'));
	});
});
