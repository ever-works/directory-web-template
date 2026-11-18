import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	ALREADY_APPLIED_MESSAGES,
	CONTENT_ALREADY_GONE_MESSAGE,
	moderationFailureStatus,
	runReportModeration,
	type ReportModerationDeps,
	type ReportModerationInput
} from '../report-moderation';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `PUT /api/admin/reports/{id}` runs the moderation action before it saves the report. When the
 * action succeeded and the save failed, the admin's retry used to run the action again: a ban or
 * suspension answered 409 ALREADY_* and the report never saved, and a warning was issued twice.
 */

type Call = [string, ...unknown[]];

function world(state: {
	history?: Record<string, string[]>;
	userStatus?: 'active' | 'suspended' | 'banned';
	content?: boolean;
}) {
	const calls: Call[] = [];
	const history = state.history ?? {};
	let userStatus = state.userStatus ?? 'active';
	let contentExists = state.content ?? true;
	const record = (reportId: string, action: string) => {
		(history[reportId] ??= []).push(action);
	};
	const deps: ReportModerationDeps = {
		reportActions: async (reportId) => {
			calls.push(['reportActions', reportId]);
			return history[reportId] ?? [];
		},
		removeContent: async (contentType, contentId, reportId) => {
			calls.push(['removeContent', contentType, contentId, reportId]);
			if (!contentExists) return { success: false, message: 'Item not found', error: 'NOT_FOUND' };
			contentExists = false;
			record(reportId, 'content_removed');
			return { success: true, message: 'Item removed successfully' };
		},
		getContentOwner: async (contentType, contentId) => {
			calls.push(['getContentOwner', contentType, contentId]);
			return { success: true, userId: 'profile-1' };
		},
		warnUser: async (userId, reason, reportId) => {
			calls.push(['warnUser', userId, reason, reportId]);
			record(reportId, 'warn');
			return { success: true, message: 'User warned successfully. Total warnings: 1' };
		},
		suspendUser: async (userId, reason, reportId) => {
			calls.push(['suspendUser', userId, reason, reportId]);
			if (userStatus === 'suspended')
				return { success: false, message: 'User is already suspended', error: 'ALREADY_SUSPENDED' };
			if (userStatus === 'banned')
				return { success: false, message: 'User is already banned', error: 'ALREADY_BANNED' };
			userStatus = 'suspended';
			record(reportId, 'suspend');
			return { success: true, message: 'User suspended successfully' };
		},
		banUser: async (userId, reason, reportId) => {
			calls.push(['banUser', userId, reason, reportId]);
			if (userStatus === 'banned')
				return { success: false, message: 'User is already banned', error: 'ALREADY_BANNED' };
			userStatus = 'banned';
			record(reportId, 'ban');
			return { success: true, message: 'User banned successfully' };
		}
	};
	const actions = () =>
		calls.filter(([name]) => name !== 'reportActions' && name !== 'getContentOwner').map(([name]) => name);
	return { deps, calls, actions, history };
}

const input = (
	resolution: ReportModerationInput['resolution'],
	extra: Partial<ReportModerationInput> = {}
): ReportModerationInput => ({
	reportId: 'report-1',
	contentType: 'comment',
	contentId: 'comment-1',
	resolution,
	savedResolution: null,
	reviewNote: undefined,
	adminId: 'admin-1',
	...extra
});

describe('runReportModeration', () => {
	it('runs the action of a new resolution with the review note as the reason', async () => {
		const { deps, calls } = world({});
		const outcome = await runReportModeration(input('user_banned', { reviewNote: '  spam links  ' }), deps);
		assert.deepEqual(outcome, { ok: true, result: { success: true, message: 'User banned successfully' } });
		assert.deepEqual(
			calls.find(([name]) => name === 'banUser'),
			['banUser', 'profile-1', 'spam links', 'report-1']
		);
	});

	it('runs nothing for no_action, no resolution, or the resolution the report already has', async () => {
		const { deps, calls } = world({});
		for (const outcome of [
			await runReportModeration(input('no_action'), deps),
			await runReportModeration(input(undefined), deps),
			await runReportModeration(input('user_banned', { savedResolution: 'user_banned' }), deps)
		]) {
			assert.deepEqual(outcome, { ok: true, result: null });
		}
		assert.deepEqual(calls, []);
	});

	describe('a retry after the action ran but the report save failed', () => {
		// The first PUT ran the action (recording it for report-1); the report still has no resolution.
		it('saves a ban without a 409 when this report banned the user', async () => {
			const w = world({});
			await runReportModeration(input('user_banned'), w.deps);
			const retry = await runReportModeration(input('user_banned'), w.deps);
			assert.deepEqual(retry, {
				ok: true,
				result: { success: true, message: ALREADY_APPLIED_MESSAGES.user_banned }
			});
			assert.deepEqual(w.actions(), ['banUser', 'banUser']);
			assert.deepEqual(w.history['report-1'], ['ban']);
		});

		it('saves a suspension without a 409 when this report suspended the user', async () => {
			const w = world({});
			await runReportModeration(input('user_suspended'), w.deps);
			const retry = await runReportModeration(input('user_suspended'), w.deps);
			assert.deepEqual(retry, {
				ok: true,
				result: { success: true, message: ALREADY_APPLIED_MESSAGES.user_suspended }
			});
			assert.deepEqual(w.history['report-1'], ['suspend']);
		});

		it('does not warn the user a second time', async () => {
			const w = world({});
			await runReportModeration(input('user_warned'), w.deps);
			const retry = await runReportModeration(input('user_warned'), w.deps);
			assert.deepEqual(retry, {
				ok: true,
				result: { success: true, message: ALREADY_APPLIED_MESSAGES.user_warned }
			});
			assert.deepEqual(w.actions(), ['warnUser']);
			assert.deepEqual(w.history['report-1'], ['warn']);
		});

		it('does not remove (and notify) the content a second time', async () => {
			const w = world({});
			await runReportModeration(input('content_removed'), w.deps);
			const retry = await runReportModeration(input('content_removed'), w.deps);
			assert.deepEqual(retry, {
				ok: true,
				result: { success: true, message: ALREADY_APPLIED_MESSAGES.content_removed }
			});
			assert.deepEqual(w.actions(), ['removeContent']);
		});

		it('saves content_removed when the content is gone and no history row could be written', async () => {
			// Content whose owner has no client profile: removeContent deletes it but records no history.
			const w = world({ content: false });
			const outcome = await runReportModeration(input('content_removed', { contentType: 'item' }), w.deps);
			assert.deepEqual(outcome, { ok: true, result: { success: true, message: CONTENT_ALREADY_GONE_MESSAGE } });
		});
	});

	it('keeps the 409 for a ban or suspension this report did not make', async () => {
		// Banned by another report (or by hand): saving this report as user_banned would claim a ban it did not make.
		const banned = world({ userStatus: 'banned', history: { 'report-2': ['ban'] } });
		assert.deepEqual(await runReportModeration(input('user_banned'), banned.deps), {
			ok: false,
			status: 409,
			error: 'User is already banned'
		});
		assert.deepEqual(await runReportModeration(input('user_suspended'), banned.deps), {
			ok: false,
			status: 409,
			error: 'User is already banned'
		});
		// This report suspended the user, who was banned since: suspending is not banning.
		const suspendedThenBanned = world({ userStatus: 'banned', history: { 'report-1': ['suspend'] } });
		assert.equal((await runReportModeration(input('user_suspended'), suspendedThenBanned.deps)).ok, false);
	});

	it('bans again a user this report banned who was unbanned since', async () => {
		const w = world({ userStatus: 'active', history: { 'report-1': ['ban'] } });
		const outcome = await runReportModeration(input('user_banned'), w.deps);
		assert.deepEqual(outcome, { ok: true, result: { success: true, message: 'User banned successfully' } });
		assert.deepEqual(w.actions(), ['banUser']);
	});

	it('warns for a new report even when another report warned the same user', async () => {
		const w = world({ history: { 'report-2': ['warn'] } });
		await runReportModeration(input('user_warned'), w.deps);
		assert.deepEqual(w.actions(), ['warnUser']);
	});

	it('answers 400 when the content owner cannot be identified, before any action', async () => {
		const w = world({});
		w.deps.getContentOwner = async () => ({ success: false, error: 'Item submitter has no client profile' });
		assert.deepEqual(await runReportModeration(input('user_suspended'), w.deps), {
			ok: false,
			status: 400,
			error: 'Item submitter has no client profile'
		});
		assert.deepEqual(w.actions(), []);
	});

	it('answers 500 when an action fails inside', async () => {
		const w = world({});
		w.deps.warnUser = async () => ({ success: false, message: 'Failed to warn user', error: 'connection reset' });
		assert.deepEqual(await runReportModeration(input('user_warned'), w.deps), {
			ok: false,
			status: 500,
			error: 'Failed to warn user'
		});
	});

	it('lets a failing history lookup fail the request (500 from the route) instead of acting blind', async () => {
		const w = world({});
		w.deps.reportActions = async () => {
			throw new Error('db down');
		};
		await assert.rejects(runReportModeration(input('user_warned'), w.deps), /db down/);
		assert.deepEqual(w.actions(), []);
	});
});

describe('moderationFailureStatus', () => {
	it('answers 409 for a state conflict and 500 otherwise', () => {
		for (const code of ['ALREADY_SUSPENDED', 'ALREADY_BANNED', 'NOT_FOUND'])
			assert.equal(moderationFailureStatus(code), 409);
		for (const code of [undefined, 'UNKNOWN_ERROR', 'INVALID_TYPE'])
			assert.equal(moderationFailureStatus(code), 500);
	});
});
