import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A Private profile (`client_profiles.profile_visibility = 'private'`) shows visitors only a
 * placeholder on `/client/profile/{username}`. Its follower / following lists and its counts
 * must stay with the owner too: the two list pages 404 for everyone else, and
 * `GET /api/user/profile/follow/{username}` (no session needed) answers `followers: null,
 * following: null` while it keeps `isFollowing` / `isSelf` for the follow buttons. A
 * deactivated account 404s there like its profile page. The pages and the route import the
 * database / Next.js and cannot be loaded under `tsx --test`, so these guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const profileDir = '../../../../app/[locale]/client/profile/[username]';
const followersPage = source(`${profileDir}/followers/page.tsx`);
const followingPage = source(`${profileDir}/following/page.tsx`);
const followRoute = source('../../../../app/api/user/profile/follow/[username]/route.ts');

/** The text of one function, up to the next top-level function or export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const ends = [' export ', ' async function ', ' function ']
		.map((marker) => src.indexOf(marker, start + signature.length))
		.filter((index) => index >= 0);
	return src.slice(start, ends.length ? Math.min(...ends) : undefined);
};

/** The owner-only check: a Private profile 404s for every viewer but its owner. */
const privateCheck = /profile\.profileVisibility === 'private' && viewerUserId !== profile\.userId\) \{? ?notFound\(\)/;

describe('the follower / following lists of a Private profile are owner-only', () => {
	for (const [label, page, signature, listCall] of [
		['followers/page.tsx', followersPage, 'export default async function ProfileFollowersPage(', 'listFollowers('],
		['following/page.tsx', followingPage, 'export default async function ProfileFollowingPage(', 'listFollowing(']
	] as const) {
		it(`${label} 404s a Private profile for non-owners before ${listCall}`, () => {
			const body = functionBody(page, signature);
			const check = body.search(privateCheck);
			assert.ok(check >= 0, `${label} does not 404 a Private profile for non-owners`);
			const list = body.indexOf(listCall);
			assert.ok(list >= 0, `${label} no longer calls ${listCall}`);
			assert.ok(check < list, `${label} reads ${listCall} before the Private check`);
		});

		it(`${label} keeps the deactivated-owner check`, () => {
			const body = functionBody(page, signature);
			const check = body.indexOf('isUserAccountDeactivated(profile.userId)');
			assert.ok(check >= 0, `${label} lost the deactivated-owner check`);
			assert.ok(check < body.indexOf(listCall), `${label} reads ${listCall} before the deactivated check`);
		});
	}
});

describe('GET/POST/DELETE /api/user/profile/follow/{username} honour Private and deactivated profiles', () => {
	const handler = (method: 'GET' | 'POST' | 'DELETE') =>
		functionBody(followRoute, `export async function ${method}(`);

	it('resolveTargetUserId returns the profile visibility and whether the account is deactivated', () => {
		const resolve = functionBody(followRoute, 'async function resolveTargetUserId(');
		assert.ok(
			resolve.includes('profileVisibility: profile.profileVisibility'),
			'resolveTargetUserId does not return profileVisibility'
		);
		assert.ok(
			resolve.includes('isUserAccountDeactivated(profile.userId)'),
			'resolveTargetUserId does not check isUserAccountDeactivated'
		);
	});

	it('the counts are null for a Private or deactivated target that is not the viewer', () => {
		const counts = functionBody(followRoute, 'async function readFollowCounts(');
		assert.ok(
			counts.includes("target.profileVisibility === 'private'"),
			'readFollowCounts does not check profileVisibility'
		);
		assert.ok(counts.includes('target.isDeactivated'), 'readFollowCounts does not check isDeactivated');
		assert.ok(
			counts.includes('target.userId !== viewerUserId'),
			'readFollowCounts hides the counts from the owner too'
		);
		const hidden = counts.indexOf('return { followers: null, following: null }');
		assert.ok(hidden >= 0, 'readFollowCounts never answers null counts');
		assert.ok(hidden < counts.indexOf('getFollowerCount('), 'readFollowCounts counts before the privacy check');
		assert.ok(
			/followers: number \| null; following: number \| null/.test(counts),
			'counts are not typed number | null'
		);
	});

	for (const method of ['GET', 'POST', 'DELETE'] as const) {
		it(`${method} reads the counts only through readFollowCounts`, () => {
			const body = handler(method);
			assert.ok(body.includes('readFollowCounts(target, '), `${method} does not use readFollowCounts`);
			assert.ok(!body.includes('getFollowerCount('), `${method} reads getFollowerCount directly`);
			assert.ok(!body.includes('getFollowingCount('), `${method} reads getFollowingCount directly`);
			assert.ok(body.includes('isFollowing'), `${method} no longer answers isFollowing`);
		});
	}

	it('GET 404s a deactivated target for everyone but its owner, before reading anything else', () => {
		const get = handler('GET');
		const check = get.search(
			/if \(target\.isDeactivated && !isSelf\) \{? ?return NextResponse\.json\([^;]*status: 404/
		);
		assert.ok(check >= 0, 'GET does not 404 a deactivated target for non-owners');
		assert.ok(check < get.indexOf('readFollowCounts('), 'GET reads the counts before the deactivated check');
		assert.ok(get.includes('isSelf,'), 'GET no longer answers isSelf');
	});
});
