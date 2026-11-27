import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `DELETE /api/items/[slug]/votes` checked only the session and the client profile, removed the
 * caller's vote and sent back `getVoteCountForItem(slug)`. So any signed-in user with a client
 * profile got the net votes of a draft, pending, rejected or soft-deleted item that still had
 * votes from when it was public, and a nonzero count showed that the unpublished slug exists,
 * which `GET .../votes` and `GET .../votes/count` no longer show (T-2853, T-2857). The route now
 * asks `findPublicItem` after the session check and answers 404 `Item not found` for any slug
 * with no public item, as `POST .../votes` does, without a vote query (T-2864).
 *
 * The real route module is loaded with `next/server`, `@/lib/auth`, the vote and client profile
 * queries and the moderation queries replaced. The query stubs answer as if the caller had a
 * stored vote on every item slug (rows left while an item was public stay in the database) and
 * none on the unknown slug, and record what they were asked. `findPublicItem` (`lib/public-item.ts`) is the real one: it reads a
 * temporary content folder (process.cwd()/.content), as in public-item-engagement-routes.spec.ts.
 * `server-only` is stubbed. The module graph is CommonJS under `tsx --test`, so intercepting
 * `Module._load` is enough.
 */
type Handler = (request: unknown, context: unknown) => Promise<Response>;
type Session = { user: { id: string } } | null;

const USER_ID = 'user-1';
const CLIENT_PROFILE = { id: 'client-1', status: 'active' };
/** The net votes a slug still has in the database once the caller's vote is gone. */
const STORED_VOTE_COUNT = 4;
const NOT_FOUND = { success: false, error: 'Item not found' };

let session: Session = { user: { id: USER_ID } };

/** What each query was asked for. */
const asked = {
	profile: [] as string[],
	vote: [] as [string, string][],
	deleted: [] as string[],
	voteCount: [] as string[]
};

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
	'@/lib/auth': { auth: async () => session },
	'@/lib/db/queries': {
		getClientProfileByUserId: async (userId: string) => {
			asked.profile.push(userId);
			return CLIENT_PROFILE;
		},
		getVoteByUserIdAndItemId: async (userId: string, slug: string) => {
			asked.vote.push([userId, slug]);
			return slug === UNKNOWN ? [] : [{ id: `vote-${slug}`, userId, itemId: slug, voteType: 'upvote' }];
		},
		deleteVote: async (id: string) => {
			asked.deleted.push(id);
		},
		getVoteCountForItem: async (slug: string) => {
			asked.voteCount.push(slug);
			return slug === UNKNOWN ? 0 : STORED_VOTE_COUNT;
		},
		createVote: async () => {
			throw new Error('DELETE must not create a vote');
		}
	},
	'@/lib/db/queries/moderation.queries': {
		isUserBlocked: () => false,
		getBlockReasonMessage: () => 'Your account is blocked'
	}
};

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const votesRoute = require('../../app/api/items/[slug]/votes/route') as { DELETE: Handler };
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

const remove = (slug: string) =>
	votesRoute.DELETE(new Request(`http://localhost/api/items/${slug}/votes`, { method: 'DELETE' }), {
		params: Promise.resolve({ slug })
	});

before(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-item-vote-delete-'));
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
	session = { user: { id: USER_ID } };
	asked.profile = [];
	asked.vote = [];
	asked.deleted = [];
	asked.voteCount = [];
});

describe('DELETE /api/items/[slug]/votes answers only for a public item', () => {
	for (const slug of [...UNPUBLISHED, UNKNOWN]) {
		it(`answers 404 Item not found for ${slug}, without a vote query`, async () => {
			const response = await remove(slug);
			assert.equal(response.status, 404);
			assert.deepEqual(await response.json(), NOT_FOUND);
			assert.deepEqual(asked.vote, [], 'the caller vote was looked up');
			assert.deepEqual(asked.deleted, [], 'a vote was deleted');
			assert.deepEqual(asked.voteCount, [], 'the vote count was queried');
			assert.deepEqual(asked.profile, [], 'the client profile was looked up');
		});
	}

	it('answers the same for an unpublished slug as for an unknown one', async () => {
		const rejected = await remove('rejected-item');
		const unknown = await remove(UNKNOWN);
		assert.equal(rejected.status, unknown.status);
		assert.deepEqual(await rejected.json(), await unknown.json());
	});

	it("still deletes the caller's vote on the public item and answers its count", async () => {
		const response = await remove(PUBLIC);
		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), { success: true, count: STORED_VOTE_COUNT, userVote: null });
		assert.deepEqual(asked.profile, [USER_ID]);
		assert.deepEqual(asked.vote, [[CLIENT_PROFILE.id, PUBLIC]]);
		assert.deepEqual(asked.deleted, [`vote-${PUBLIC}`]);
		assert.deepEqual(asked.voteCount, [PUBLIC]);
	});

	it('still answers 401 with no session, for any slug', async () => {
		session = null;
		for (const slug of [PUBLIC, 'rejected-item', UNKNOWN]) {
			const response = await remove(slug);
			assert.equal(response.status, 401, slug);
			assert.deepEqual(await response.json(), { success: false, error: 'Unauthorized' });
		}
		assert.deepEqual(asked.vote, []);
		assert.deepEqual(asked.deleted, []);
		assert.deepEqual(asked.voteCount, []);
	});
});
