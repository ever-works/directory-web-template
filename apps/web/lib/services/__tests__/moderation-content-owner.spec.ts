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

describe('removeContent records an item removal even when the item has no owner profile', () => {
	const service = source('../moderation.service.ts');
	const removeContent = functionBody(service, 'export async function removeContent(');

	it('passes the admin to itemRepository.delete, which writes the item audit log row', () => {
		// moderation_history needs a client profile, so an item submitted anonymously or by an
		// import got deleted with no record at all; the item audit log takes an unknown owner.
		assert.ok(
			removeContent.includes('await itemRepository.delete(contentId, { id: adminId });'),
			'removeContent deletes the item without naming the admin in the item audit log'
		);
		assert.ok(
			!removeContent.includes('await itemRepository.delete(contentId);'),
			'removeContent still deletes the item with no audit user'
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
		const branch = put.slice(failed, put.indexOf(');', put.indexOf('return NextResponse.json(', failed)) + 2);
		assert.ok(branch.includes('return NextResponse.json('), 'a failed moderation action does not return');
		assert.ok(
			branch.includes('error: moderationResult.message'),
			'the error response does not carry the action message'
		);
		assert.ok(
			branch.includes('status: moderationFailureStatus(moderationResult.error)'),
			'a failed moderation action does not answer an error status'
		);
		assert.ok(!branch.includes('success: true'), 'a failed moderation action still answers success: true');
		assert.ok(!put.includes("don't fail the request"), 'PUT still swallows a failed moderation action');

		const statusFn = functionBody(route, 'function moderationFailureStatus(');
		assert.ok(statusFn.includes('? 409 : 500'), 'moderationFailureStatus does not answer 409 or 500');
	});

	it('rejects an invalid status, resolution or review note (null included) before any action runs', () => {
		// `status && ...` let `status: null` through; the action then ran and the report save
		// failed on the NOT NULL status column, leaving the action applied and the report unchanged.
		const firstAction = Math.min(
			...['await removeContent(', 'await getContentOwner('].map((call) => put.indexOf(call))
		);
		const checks = [
			'if (status !== undefined && !isReportStatus(status)) {',
			'if (resolution !== undefined && !isReportResolution(resolution)) {',
			"if (reviewNote !== undefined && typeof reviewNote !== 'string') {",
			"if (!body || typeof body !== 'object' || Array.isArray(body)) {"
		];
		for (const check of checks) {
			const at = put.indexOf(check);
			assert.ok(at > 0, `PUT does not check: ${check}`);
			assert.ok(at < firstAction, `PUT runs a moderation action before: ${check}`);
			const branch = put.slice(at, put.indexOf(');', put.indexOf('return NextResponse.json(', at)) + 2);
			assert.ok(branch.includes('{ status: 400 }'), `an invalid field does not answer 400: ${check}`);
		}
		assert.ok(!put.includes('if (status && '), 'PUT still skips the status check for a falsy status');
		assert.ok(!put.includes('if (resolution && !'), 'PUT still skips the resolution check for a falsy resolution');

		const guards = route.slice(0, route.indexOf('function moderationFailureStatus('));
		assert.ok(
			guards.includes("typeof value === 'string' && (VALID_STATUSES as string[]).includes(value)"),
			'isReportStatus accepts a value that is not one of the statuses'
		);
		assert.ok(
			guards.includes("typeof value === 'string' && (VALID_RESOLUTIONS as string[]).includes(value)"),
			'isReportResolution accepts a value that is not one of the resolutions'
		);
	});

	it('does not run the action again for a resolution the report already has', () => {
		// The review dialog sends the saved resolution with every edit; re-running a ban or
		// suspension fails with ALREADY_BANNED / ALREADY_SUSPENDED and would block the edit.
		assert.ok(
			put.includes('const resolutionChanged = resolution !== existingReport.resolution;'),
			'PUT does not compare the resolution with the saved one'
		);
		assert.ok(
			put.includes('if (resolution && resolution !== ReportResolution.NO_ACTION && resolutionChanged) {'),
			'PUT runs the moderation action for an unchanged resolution'
		);
	});
});
