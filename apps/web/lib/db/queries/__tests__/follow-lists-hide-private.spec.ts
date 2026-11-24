import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A Private profile (`client_profiles.profile_visibility = 'private'`) is "Hidden from the
 * people directory" and "Only you can see your profile." (`messages/en.json`). When a Private
 * user follows, or is followed by, a public user, the public user's followers / following pages
 * must not list the Private user's row (name, avatar, job title, bio) to anyone but the Private
 * user. `listFollowers` and `listFollowing` drop those rows unless the row's user is the viewer;
 * the two list pages pass the viewer's id. The counts stay as they are (they name nobody). The
 * queries import the database and the pages import Next.js, so neither can be loaded under
 * `tsx --test`; these guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const queries = source('../follows.queries.ts');
const profileDir = '../../../../app/[locale]/client/profile/[username]';
const followersPage = source(`${profileDir}/followers/page.tsx`);
const followingPage = source(`${profileDir}/following/page.tsx`);

/** The text of one function, up to the next top-level function or export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const ends = [' export ', ' async function ', ' function ']
		.map((marker) => src.indexOf(marker, start + signature.length))
		.filter((index) => index >= 0);
	return src.slice(start, ends.length ? Math.min(...ends) : undefined);
};

/** The text from `marker` up to the first `end` after it. */
const between = (src: string, marker: string, end: string) => {
	const start = src.indexOf(marker);
	assert.ok(start >= 0, `${marker} not found`);
	const stop = src.indexOf(end, start + marker.length);
	assert.ok(stop > start, `${end} not found after ${marker}`);
	return src.slice(start, stop);
};

describe('the follow-list rows leave out Private profiles except the viewer', () => {
	it('followListVisibleTo hides Private profiles, except the viewer’s own row', () => {
		const helper = functionBody(queries, 'function followListVisibleTo(');
		assert.ok(
			/function followListVisibleTo\(viewerUserId\?: string \| null\): SQL/.test(helper),
			'followListVisibleTo does not take an optional viewerUserId and return SQL'
		);
		assert.ok(
			helper.includes("ne(clientProfiles.profileVisibility, 'private')"),
			'followListVisibleTo does not exclude profileVisibility = private'
		);
		assert.ok(
			/or\(\s?ne\(clientProfiles\.profileVisibility, 'private'\), eq\(clientProfiles\.userId, viewerUserId\)\s?\)/.test(
				helper
			),
			'followListVisibleTo has no exception for the viewer’s own row'
		);
		// Without a viewer every Private row is left out (the safe default).
		assert.ok(
			/if \(!viewerUserId\) \{? ?return ne\(clientProfiles\.profileVisibility, 'private'\)/.test(helper),
			'followListVisibleTo does not hide every Private row when there is no viewer'
		);
		assert.ok(
			/import \{[^}]*\bne\b[^}]*\} from 'drizzle-orm'/.test(queries) &&
				/import \{[^}]*\bor\b[^}]*\} from 'drizzle-orm'/.test(queries),
			'follows.queries.ts does not import ne and or from drizzle-orm'
		);
	});

	for (const [name, column] of [
		['listFollowers', 'followingId'],
		['listFollowing', 'followerId']
	] as const) {
		it(`${name} takes an optional viewerUserId and filters its rows on it`, () => {
			const body = functionBody(queries, `export async function ${name}(`);
			const signature = between(body, `export async function ${name}(`, '): Promise<FollowListRow[]>');
			assert.ok(
				/viewerUserId\?: string \| null/.test(signature),
				`${name} does not take an optional viewerUserId`
			);
			const where = between(body, '.where(', '.orderBy(');
			assert.ok(where.includes(`eq(userFollows.${column}, userId)`), `${name} lost its ${column} filter`);
			assert.ok(where.includes('eq(userFollows.tenantId, tenantId)'), `${name} lost its tenant filter`);
			assert.ok(
				where.includes('followListVisibleTo(viewerUserId)'),
				`${name} does not leave out Private profiles`
			);
		});
	}

	it('the follower and following counts stay unfiltered', () => {
		for (const name of ['getFollowerCount', 'getFollowingCount']) {
			const body = functionBody(queries, `export async function ${name}(`);
			assert.ok(!body.includes('profileVisibility'), `${name} now filters on profileVisibility`);
			assert.ok(!body.includes('followListVisibleTo'), `${name} now filters on followListVisibleTo`);
		}
	});

	for (const [label, page, signature, listCall] of [
		['followers/page.tsx', followersPage, 'export default async function ProfileFollowersPage(', 'listFollowers('],
		['following/page.tsx', followingPage, 'export default async function ProfileFollowingPage(', 'listFollowing(']
	] as const) {
		it(`${label} passes the viewer to ${listCall}`, () => {
			const body = functionBody(page, signature);
			assert.ok(
				body.includes(
					`${listCall}profile.userId, FOLLOW_LIST_PAGE_SIZE, (page - 1) * FOLLOW_LIST_PAGE_SIZE, viewerUserId)`
				),
				`${label} does not pass viewerUserId to ${listCall}`
			);
		});
	}
});
