import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `GET /api/items/[slug]/activity`, `GET /api/items/[slug]/votes/count` and `GET
 * /api/items/engagement?slugs=` read the engagement rows keyed by the slug in the URL and looked
 * no item up. So after an admin rejected an item, moved it back to draft or soft-deleted it,
 * anyone could still read its views, net votes, favorites, comment count, average rating and daily
 * series, and a nonzero answer showed that an unpublished slug exists, which the T-2853 routes no
 * longer show. The three routes now answer for an unpublished item as for an unknown slug (zero
 * totals with a zero-filled series of `days` entries; count 0; zeros), without a database query
 * for it (T-2857).
 *
 * The real route modules are loaded with `next/server`, the database check and the engagement and
 * vote queries replaced. The query stubs answer as if every slug they are asked for had stored
 * engagement (rows left while an item was public stay in the database), and record the slugs they
 * were asked for. `findPublicItem` and `findPublicItemSlugs` (`lib/public-item.ts`) are the real
 * ones: they read a temporary content folder (process.cwd()/.content), as in public-item.spec.ts.
 * `server-only` is stubbed. The module graph is CommonJS under `tsx --test`, so intercepting
 * `Module._load` is enough.
 */
type Metrics = { views: number; votes: number; favorites: number; comments: number; avgRating: number };
type Day = { date: string; views: number; votes: number; favorites: number; comments: number };
type Handler = (request: unknown, context?: unknown) => Promise<Response>;

const ZERO: Metrics = { views: 0, votes: 0, favorites: 0, comments: 0, avgRating: 0 };
const STORED: Metrics = { views: 7, votes: 3, favorites: 2, comments: 1, avgRating: 4 };
const STORED_VOTE_COUNT = 3;

/** The slugs each query was asked for. */
const asked = { metrics: [] as string[][], series: [] as string[], voteCount: [] as string[] };

class StubNextResponse extends Response {
	static json(body: unknown, init?: ResponseInit) {
		return new StubNextResponse(JSON.stringify(body), {
			...init,
			headers: { 'content-type': 'application/json' }
		});
	}
}

const stubs: Record<string, unknown> = {
	'server-only': {},
	'next/server': { NextResponse: StubNextResponse, NextRequest: Request },
	'@/lib/utils/database-check': { checkDatabaseAvailability: () => null },
	'@/lib/db/queries/engagement.queries': {
		getEngagementMetricsPerItem: async (slugs: string[]) => {
			asked.metrics.push([...slugs]);
			return new Map(slugs.map((slug) => [slug, { ...STORED }]));
		},
		getItemActivityTimeSeries: async (slug: string, days: number) => {
			asked.series.push(slug);
			return Array.from({ length: days }, (_, index) => ({
				date: `stored-${index}`,
				views: 1,
				votes: 1,
				favorites: 1,
				comments: 1
			}));
		}
	},
	'@/lib/db/queries': {
		getVoteCountForItem: async (slug: string) => {
			asked.voteCount.push(slug);
			return STORED_VOTE_COUNT;
		}
	}
};

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const activityRoute = require('../../app/api/items/[slug]/activity/route') as { GET: Handler };
const voteCountRoute = require('../../app/api/items/[slug]/votes/count/route') as { GET: Handler };
const engagementRoute = require('../../app/api/items/engagement/route') as { GET: Handler };
loader._load = originalLoad;

const PUBLIC = 'approved-item';
const UNPUBLISHED = ['draft-item', 'pending-item', 'rejected-item', 'deleted-item'];
const UNKNOWN = 'no-such-item';

/** Extra YAML lines per item: everything else is the same for all. */
const ITEMS: Record<string, string[]> = {
	'approved-item': ['status: approved'],
	'draft-item': ['status: draft'],
	'pending-item': ['status: pending', 'submitted_by: client-user'],
	'rejected-item': ['status: rejected', 'review_notes: Not a fit'],
	'deleted-item': ['status: approved', "deleted_at: '2026-11-20 10:00'"]
};

let root: string;
let previousCwd: string;
let previousDataRepository: string | undefined;

function write(file: string, lines: string[]) {
	const target = path.join(root, '.content', file);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, `${lines.join('\n')}\n`);
}

const request = (url: string) => {
	const nextUrl = new URL(url, 'http://localhost');
	return { url: nextUrl.toString(), nextUrl };
};
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

/** The last `days` UTC dates, oldest first, as `getItemActivityTimeSeries` builds them. */
function lastUtcDates(days: number): string[] {
	const now = new Date();
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return Array.from({ length: days }, (_, index) =>
		new Date(today - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10)
	);
}

const zeroSeries = (days: number): Day[] =>
	lastUtcDates(days).map((date) => ({ date, views: 0, votes: 0, favorites: 0, comments: 0 }));

before(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-item-engagement-'));
	write('.works/works.yml', ['company_name: Test', 'item_name: Item', 'items_name: Items']);
	write('categories.yml', ['- id: tools', '  name: Tools']);
	write('tags.yml', ['- id: shared', '  name: Shared']);
	for (const [slug, extra] of Object.entries(ITEMS)) {
		write(`data/${slug}/${slug}.yml`, [
			`name: ${slug}`,
			`description: The ${slug} fixture`,
			`source_url: https://example.com/${slug}`,
			'category: tools',
			'tags:',
			'  - shared',
			"updated_at: '2026-11-01 10:00'",
			...extra
		]);
	}
	// A translation cannot publish an item: the base YAML decides
	write('data/draft-item/draft-item.fr.yml', ['name: Brouillon', 'status: approved']);

	previousCwd = process.cwd();
	previousDataRepository = process.env.DATA_REPOSITORY;
	// No repository to sync: the temporary folder is the whole content
	delete process.env.DATA_REPOSITORY;
	process.chdir(root);
});

after(() => {
	process.chdir(previousCwd);
	if (previousDataRepository !== undefined) process.env.DATA_REPOSITORY = previousDataRepository;
	fs.rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
	asked.metrics = [];
	asked.series = [];
	asked.voteCount = [];
});

describe('GET /api/items/[slug]/activity answers only for a public item', () => {
	for (const slug of [...UNPUBLISHED, UNKNOWN]) {
		it(`answers zero totals and a zero-filled series for ${slug}, without a query`, async () => {
			const response = await activityRoute.GET(request(`/api/items/${slug}/activity?days=7`), params(slug));
			assert.equal(response.status, 200);
			assert.deepEqual(await response.json(), { totals: ZERO, series: zeroSeries(7) });
			assert.deepEqual(asked.metrics, [], 'the engagement totals were queried');
			assert.deepEqual(asked.series, [], 'the daily series was queried');
		});
	}

	it('answers 30 zero-filled days for an unpublished item when days is not given', async () => {
		const response = await activityRoute.GET(request('/api/items/rejected-item/activity'), params('rejected-item'));
		assert.deepEqual(await response.json(), { totals: ZERO, series: zeroSeries(30) });
	});

	it('keeps the 1-90 bounds of days for an unpublished item', async () => {
		const response = await activityRoute.GET(
			request('/api/items/rejected-item/activity?days=500'),
			params('rejected-item')
		);
		assert.equal(((await response.json()) as { series: Day[] }).series.length, 90);
	});

	it('answers the stored totals and series for the public item', async () => {
		const response = await activityRoute.GET(request(`/api/items/${PUBLIC}/activity?days=7`), params(PUBLIC));
		assert.equal(response.status, 200);
		const body = (await response.json()) as { totals: Metrics; series: Day[] };
		assert.deepEqual(body.totals, STORED);
		assert.equal(body.series.length, 7);
		assert.equal(body.series[0].date, 'stored-0');
		assert.deepEqual(asked.metrics, [[PUBLIC]]);
		assert.deepEqual(asked.series, [PUBLIC]);
	});
});

describe('GET /api/items/[slug]/votes/count answers only for a public item', () => {
	for (const slug of [...UNPUBLISHED, UNKNOWN]) {
		it(`answers a count of 0 for ${slug}, without a query`, async () => {
			const response = await voteCountRoute.GET(request(`/api/items/${slug}/votes/count`), params(slug));
			assert.equal(response.status, 200);
			assert.deepEqual(await response.json(), { success: true, count: 0 });
			assert.deepEqual(asked.voteCount, [], 'the vote count was queried');
		});
	}

	it('answers the stored count for the public item', async () => {
		const response = await voteCountRoute.GET(request(`/api/items/${PUBLIC}/votes/count`), params(PUBLIC));
		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), { success: true, count: STORED_VOTE_COUNT });
		assert.deepEqual(asked.voteCount, [PUBLIC]);
	});
});

describe('GET /api/items/engagement answers only for public items', () => {
	const get = async (slugs: string[]) => {
		const response = await engagementRoute.GET(
			request(`/api/items/engagement?slugs=${encodeURIComponent(slugs.join(','))}`)
		);
		assert.equal(response.status, 200);
		return ((await response.json()) as { metrics: Record<string, Metrics> }).metrics;
	};

	it('answers zeros for every unpublished and unknown slug and queries the public one only', async () => {
		const metrics = await get([PUBLIC, ...UNPUBLISHED, UNKNOWN]);
		const expected: Record<string, Metrics> = { [PUBLIC]: STORED };
		for (const slug of [...UNPUBLISHED, UNKNOWN]) expected[slug] = ZERO;
		assert.deepEqual(metrics, expected);
		assert.deepEqual(asked.metrics, [[PUBLIC]]);
	});

	it('answers zeros, without a query, when no slug is a public item', async () => {
		const metrics = await get(UNPUBLISHED);
		assert.deepEqual(metrics, Object.fromEntries(UNPUBLISHED.map((slug) => [slug, ZERO])));
		assert.deepEqual(asked.metrics, [], 'the engagement totals were queried');
	});

	it('answers the same for an unpublished slug as for an unknown one', async () => {
		const metrics = await get(['rejected-item', UNKNOWN]);
		assert.deepEqual(metrics['rejected-item'], metrics[UNKNOWN]);
	});

	it('still refuses more than 200 slugs', async () => {
		const slugs = Array.from({ length: 201 }, (_, index) => `item-${index}`);
		const response = await engagementRoute.GET(request(`/api/items/engagement?slugs=${slugs.join(',')}`));
		assert.equal(response.status, 400);
		assert.deepEqual(asked.metrics, []);
	});
});
