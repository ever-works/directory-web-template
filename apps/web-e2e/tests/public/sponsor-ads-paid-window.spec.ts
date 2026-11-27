import postgres from 'postgres';
import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, TEST_DATA } from '../../helpers/test-data';

/**
 * A sponsor ad leaves the public sponsor slots when its paid period ends (T-2859, spec 004 AC-8).
 *
 * An ad is activated with a start and an end date (one week or one month), but nothing sets an
 * `active` row to `expired`, and `GET /api/sponsor-ads` (the only source of the home, category
 * and item-page sponsor slots, through `SponsorAdsProvider`) filtered on `status = 'active'`
 * alone. So an ad whose period had ended stayed on the public site until someone cancelled it.
 *
 * The spec writes `sponsor_ads` rows straight into the database (no payment provider in CI), as
 * the app writes them: UTC instants in a `timestamp` column. All rows are `active`:
 *   - `ended`: ended an hour ago, for the approved CI item `sample-item-two`, so on develop it is
 *     the sponsor shown in the item-page sidebar;
 *   - `just-ended`: ended a second ago;
 *   - `live`: ends in a week. Its slug names no item, so the sponsor cards skip it and the
 *     rest of the suite never sees a sponsor card from this spec.
 * With no session, `GET /api/sponsor-ads` must return `live` and neither ended ad, and the
 * item-page sidebar must show no sponsor. The admin list must still return all three. The rows
 * are deleted at the end.
 *
 * `postgres` is the driver `apps/web` uses; `shamefully-hoist=true` puts it in the root
 * `node_modules` (see `helpers/two-factor-db.ts`).
 */

const HOUR = 60 * 60 * 1000;

type Fixture = { key: 'ended' | 'just-ended' | 'live'; slug: string; endsInMs: number };

test.describe('Public: a sponsor ad leaves the public slots after its paid period ends', () => {
	test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is needed to write sponsor_ads rows');

	let sql: postgres.Sql | null = null;
	const createdIds: string[] = [];

	test.afterAll(async () => {
		if (!sql) return;
		if (createdIds.length > 0) {
			await sql`DELETE FROM sponsor_ads WHERE id IN ${sql(createdIds)}`;
		}
		await sql.end({ timeout: 5 });
		sql = null;
	});

	test('an ended ad is not returned by GET /api/sponsor-ads nor shown in the item sidebar, but admins still list it', async ({
		page,
		playwright,
		baseURL
	}) => {
		test.slow();
		sql = postgres(process.env.DATABASE_URL!, { max: 1, idle_timeout: 5, connect_timeout: 15, prepare: false });

		const anonymous = await playwright.request.newContext({
			baseURL,
			storageState: { cookies: [], origins: [] },
			timeout: 90_000
		});
		const admin = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE_FILE, timeout: 90_000 });

		try {
			// The first anonymous request creates the default tenant when there is none yet.
			expect((await anonymous.get('/api/sponsor-ads')).ok()).toBe(true);

			// The tenant an anonymous request resolves to (`resolveFromDatabase` in lib/auth/tenant.ts)
			const [tenant] = await sql<{ id: string }[]>`
				SELECT id FROM tenant WHERE status = 'active' ORDER BY created_at ASC LIMIT 1
			`;
			const [owner] = await sql<{ id: string }[]>`
				SELECT id FROM users WHERE lower(email) = lower(${TEST_DATA.ADMIN_EMAIL}) LIMIT 1
			`;
			expect(tenant?.id, 'an active tenant').toBeTruthy();
			expect(owner?.id, 'the seeded admin user').toBeTruthy();

			const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
			const fixtures: Fixture[] = [
				{ key: 'ended', slug: 'sample-item-two', endsInMs: -HOUR },
				{ key: 'just-ended', slug: `e2e-t2859-just-ended-${suffix}`, endsInMs: -1_000 },
				{ key: 'live', slug: `e2e-t2859-live-${suffix}`, endsInMs: 7 * 24 * HOUR }
			];
			const ids: Record<Fixture['key'], string> = { ended: '', 'just-ended': '', live: '' };
			const now = Date.now();
			for (const fixture of fixtures) {
				const id = `e2e-t2859-${fixture.key}-${suffix}`;
				// ISO instants cast to `timestamp`, as drizzle writes them (UTC, zone dropped).
				await sql`
					INSERT INTO sponsor_ads
						(id, user_id, item_slug, status, interval, amount, currency, tenant_id,
						 payment_provider, start_date, end_date, created_at, updated_at)
					VALUES
						(${id}, ${owner.id}, ${fixture.slug}, 'active', 'weekly', 1, 'usd', ${tenant.id},
						 'stripe', ${new Date(now - 8 * 24 * HOUR).toISOString()}::timestamp,
						 ${new Date(now + fixture.endsInMs).toISOString()}::timestamp, now(), now())
				`;
				createdIds.push(id);
				ids[fixture.key] = id;
			}

			// The public listing, as every sponsor slot reads it
			const listing = await anonymous.get('/api/sponsor-ads?limit=50');
			expect(listing.ok()).toBe(true);
			const body = (await listing.json()) as { success: boolean; data: { sponsor: { id: string } }[] };
			expect(body.success).toBe(true);
			const shown = body.data.map((entry) => entry.sponsor.id);
			expect(shown, 'the ad still inside its paid period').toContain(ids.live);
			expect.soft(shown, 'the ad that ended an hour ago').not.toContain(ids.ended);
			expect.soft(shown, 'the ad that ended a second ago').not.toContain(ids['just-ended']);

			// An item-page sponsor slot: on develop it shows the ended ad's item
			const sponsorsLoaded = page.waitForResponse(
				(response) => response.url().includes('/api/sponsor-ads?') && response.request().method() === 'GET',
				{ timeout: 90_000 }
			);
			await page.goto('/items/sample-item-one', { timeout: 90_000 });
			await sponsorsLoaded;
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await expect.soft(page.getByRole('heading', { level: 3, name: 'Sponsored', exact: true })).toHaveCount(0);

			// Admins still see every row, ended or not
			const adminList = await admin.get(`/api/admin/sponsor-ads?search=${encodeURIComponent(suffix)}&limit=50`);
			expect(adminList.ok()).toBe(true);
			const adminIds = ((await adminList.json()) as { data: { id: string }[] }).data.map((row) => row.id);
			expect(adminIds).toEqual(expect.arrayContaining([ids['just-ended'], ids.live]));
			const ended = await admin.get(`/api/admin/sponsor-ads?search=sample-item-two&limit=50`);
			expect(ended.ok()).toBe(true);
			expect(((await ended.json()) as { data: { id: string }[] }).data.map((row) => row.id)).toContain(ids.ended);
		} finally {
			await anonymous.dispose();
			await admin.dispose();
		}
	});
});
