import type { ModerationActionValues, ReportContentTypeValues, ReportResolutionValues } from '@/lib/db/schema';
import type { ContentOwnerResult } from './moderation-content-owner';
import type { ModerationResult } from './moderation.service';

/**
 * The moderation action a report resolution runs (`PUT /api/admin/reports/{id}`).
 *
 * The route runs the action before it saves the report, so a failed action leaves the report as it
 * was (#1134). The other order cannot be one transaction either: `content_removed` deletes from the
 * Git data repository. So when the action succeeds and the report save then fails, the admin
 * retries with the same resolution, and the retry must finish the save instead of acting again:
 *
 * - **Ban / suspend** run again and answer `ALREADY_BANNED` / `ALREADY_SUSPENDED`. That counts as
 *   done only when `moderation_history` records the same action for this report: a ban from
 *   another report (or one made by hand) is not this report's, and stays a 409. A user unbanned
 *   since is banned again.
 * - **Warn** has no state that refuses a repeat (`warnUser` adds a warning every time), and
 *   **content removal** of a soft-deleted comment would delete and notify again. Both are skipped
 *   when `moderation_history` records the action for this report, so a retry neither warns twice
 *   nor sends the removal email twice.
 * - **Content removal** answering `NOT_FOUND`: the content is gone, which is what the resolution
 *   says, so the report is saved. This covers content whose owner has no client profile, for which
 *   no `moderation_history` row can be written (see `removeContent`).
 *
 * A resolution equal to the saved one runs nothing (the review dialog sends it back with every
 * edit). The lookups are injected so this can be unit-tested without a database.
 */

/** The resolutions that run an action, and the `moderation_history.action` each writes. */
export const RESOLUTION_ACTIONS = {
	content_removed: 'content_removed',
	user_warned: 'warn',
	user_suspended: 'suspend',
	user_banned: 'ban'
} as const satisfies Partial<Record<ReportResolutionValues, ModerationActionValues>>;

type ActionResolution = keyof typeof RESOLUTION_ACTIONS;

const isActionResolution = (value: unknown): value is ActionResolution =>
	typeof value === 'string' && Object.prototype.hasOwnProperty.call(RESOLUTION_ACTIONS, value);

/** The code a ban or suspension answers when the user is already in that state. */
const ALREADY_IN_STATE: Partial<Record<ActionResolution, string>> = {
	user_suspended: 'ALREADY_SUSPENDED',
	user_banned: 'ALREADY_BANNED'
};

/** Messages for an action this report already took. */
export const ALREADY_APPLIED_MESSAGES: Record<ActionResolution, string> = {
	content_removed: 'The content was already removed for this report; the report was saved',
	user_warned: 'The user was already warned for this report; the report was saved without a second warning',
	user_suspended: 'The user was already suspended for this report; the report was saved',
	user_banned: 'The user was already banned for this report; the report was saved'
};

export const CONTENT_ALREADY_GONE_MESSAGE = 'The content no longer exists; the report was saved';

/**
 * HTTP status for a moderation action that did not run. `ALREADY_*` and `NOT_FOUND` describe the
 * target's current state (already suspended or banned, content or user gone): 409. Anything else
 * failed inside the action: 500.
 */
export function moderationFailureStatus(code: string | undefined): number {
	return code === 'ALREADY_SUSPENDED' || code === 'ALREADY_BANNED' || code === 'NOT_FOUND' ? 409 : 500;
}

export interface ReportModerationDeps {
	/** The `moderation_history.action` values recorded for a report (`getModerationActionsByReport`). */
	reportActions(reportId: string): Promise<ReadonlyArray<string>>;
	removeContent(
		contentType: ReportContentTypeValues,
		contentId: string,
		reportId: string,
		adminId: string
	): Promise<ModerationResult>;
	getContentOwner(contentType: ReportContentTypeValues, contentId: string): Promise<ContentOwnerResult>;
	warnUser(userId: string, reason: string, reportId: string, adminId: string): Promise<ModerationResult>;
	suspendUser(userId: string, reason: string, reportId: string, adminId: string): Promise<ModerationResult>;
	banUser(userId: string, reason: string, reportId: string, adminId: string): Promise<ModerationResult>;
}

export interface ReportModerationInput {
	reportId: string;
	contentType: ReportContentTypeValues;
	contentId: string;
	/** The resolution in the request, already validated (undefined when the body has none). */
	resolution: ReportResolutionValues | undefined;
	/** The resolution saved on the report. */
	savedResolution: string | null | undefined;
	/** The review note in the request: the reason given to the user. */
	reviewNote: unknown;
	adminId: string;
}

export type ReportModerationOutcome =
	/** Save the report. `result` is null when no action ran or was needed. */
	| { ok: true; result: ModerationResult | null }
	/** Answer the error and leave the report as it was. */
	| { ok: false; status: number; error: string };

export async function runReportModeration(
	input: ReportModerationInput,
	deps: ReportModerationDeps
): Promise<ReportModerationOutcome> {
	const { resolution, reportId, adminId } = input;
	if (!isActionResolution(resolution) || resolution === input.savedResolution) return { ok: true, result: null };

	const action = RESOLUTION_ACTIONS[resolution];
	const takenForThisReport = async () => (await deps.reportActions(reportId)).includes(action);
	const alreadyApplied = (): ReportModerationOutcome => ({
		ok: true,
		result: { success: true, message: ALREADY_APPLIED_MESSAGES[resolution] }
	});

	// Nothing refuses a repeated warning or a repeated removal of a soft-deleted comment.
	if ((resolution === 'user_warned' || resolution === 'content_removed') && (await takenForThisReport())) {
		return alreadyApplied();
	}

	let result: ModerationResult;
	if (resolution === 'content_removed') {
		result = await deps.removeContent(input.contentType, input.contentId, reportId, adminId);
		if (!result.success && result.error === 'NOT_FOUND') {
			return { ok: true, result: { success: true, message: CONTENT_ALREADY_GONE_MESSAGE } };
		}
	} else {
		const owner = await deps.getContentOwner(input.contentType, input.contentId);
		if (!owner.success || !owner.userId) {
			return {
				ok: false,
				status: 400,
				error: owner.error || 'Could not identify content owner for moderation action'
			};
		}
		const reason = (typeof input.reviewNote === 'string' && input.reviewNote.trim()) || 'Report violation';
		const act =
			resolution === 'user_warned'
				? deps.warnUser
				: resolution === 'user_suspended'
					? deps.suspendUser
					: deps.banUser;
		result = await act(owner.userId, reason, reportId, adminId);
	}

	if (result.success) return { ok: true, result };
	if (result.error !== undefined && result.error === ALREADY_IN_STATE[resolution] && (await takenForThisReport())) {
		return alreadyApplied();
	}
	return { ok: false, status: moderationFailureStatus(result.error), error: result.message };
}
