import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resolveItemOwnerProfileId } from '../moderation-content-owner';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * An item's `submitted_by` holds a `users.id`, but `warnUser` / `suspendUser` / `banUser`
 * look the target up by `client_profiles.id` and `moderation_history.user_id` references
 * `client_profiles.id`. `getContentOwner` used to return `submitted_by` as is, so every
 * warn / suspend / ban on an item report failed with 'User not found' while the report
 * route still saved the report and answered `success: true`.
 */
describe('resolveItemOwnerProfileId', () => {
	it("maps the submitter's user id to their client profile id", async () => {
		const lookups: string[] = [];
		const result = await resolveItemOwnerProfileId('user-1', async (userId) => {
			lookups.push(userId);
			return userId === 'user-1' ? { id: 'profile-9', userId: 'user-1' } : null;
		});
		assert.deepEqual(result, { success: true, userId: 'profile-9' });
		assert.deepEqual(lookups, ['user-1']);
	});

	it('fails for a submitter with no client profile (anonymous, import, admin)', async () => {
		for (const submittedBy of ['anonymous', 'import', 'admin']) {
			const result = await resolveItemOwnerProfileId(submittedBy, async () => null);
			assert.deepEqual(
				result,
				{ success: false, error: 'Item submitter has no client profile' },
				`submitted_by ${submittedBy} was accepted`
			);
		}
	});

	it('fails for an item with no submitter without looking anything up', async () => {
		for (const submittedBy of [undefined, null, '']) {
			let looked = false;
			const result = await resolveItemOwnerProfileId(submittedBy, async () => {
				looked = true;
				return null;
			});
			assert.deepEqual(result, { success: false, error: 'Item has no submitter' });
			assert.equal(looked, false, `submitted_by ${JSON.stringify(submittedBy)} was looked up`);
		}
	});
});

/**
 * `moderation.service.ts` and the route import the database and Next.js and cannot be
 * loaded under `tsx --test`, so these guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

describe('getContentOwner returns a client profile id for items', () => {
	const service = source('../moderation.service.ts');
	const getContentOwner = functionBody(service, 'export async function getContentOwner(');

	it('maps submitted_by through getClientProfileByUserId', () => {
		assert.ok(
			getContentOwner.includes('resolveItemOwnerProfileId(item.submitted_by, getClientProfileByUserId)'),
			'the ITEM branch does not map submitted_by to a client profile'
		);
		assert.ok(
			!getContentOwner.includes('userId: item.submitted_by'),
			'the ITEM branch still returns the raw users.id'
		);
	});
});

describe('PUT /api/admin/reports/{id} runs the moderation action before it saves the report', () => {
	const route = source('../../../app/api/admin/reports/[id]/route.ts');
	const put = functionBody(route, 'export async function PUT(');

	it('looks up the owner and runs the action before updateReport', () => {
		const save = put.indexOf('await updateReport(id, {');
		assert.ok(save > 0, 'PUT does not call updateReport');
		for (const call of [
			'await removeContent(',
			'await getContentOwner(',
			'await warnUser(',
			'await suspendUser(',
			'await banUser('
		]) {
			const at = put.indexOf(call);
			assert.ok(at > 0, `PUT does not call ${call}`);
			assert.ok(at < save, `PUT saves the report before ${call}`);
		}
	});

	it('answers an error with the action message and leaves the report as it was when the action fails', () => {
		const save = put.indexOf('await updateReport(id, {');
		const failed = put.indexOf('if (moderationResult && !moderationResult.success) {');
		assert.ok(failed > 0 && failed < save, 'PUT does not stop on a failed moderation action before it saves');
		const branch = put.slice(failed, put.indexOf('}', put.indexOf('return NextResponse.json(', failed)) + 1);
		assert.ok(branch.includes('return NextResponse.json('), 'a failed moderation action does not return');
		assert.ok(
			branch.includes('error: moderationResult.message'),
			'the error response does not carry the action message'
		);
		assert.ok(!branch.includes('success: true'), 'a failed moderation action still answers success: true');
		assert.ok(!put.includes("don't fail the request"), 'PUT still swallows a failed moderation action');
	});
});
