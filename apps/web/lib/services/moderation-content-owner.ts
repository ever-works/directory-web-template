/**
 * Who owns reported content, as the moderation actions need it: a `client_profiles.id`.
 *
 * Kept free of database imports so it can be unit tested; `getContentOwner` in
 * `moderation.service.ts` passes the real profile lookup.
 */

export interface ContentOwnerResult {
	success: boolean;
	/** The owner's `client_profiles.id` (what warn / suspend / ban and `moderation_history` use). */
	userId?: string;
	error?: string;
}

/** Finds the client profile of a `users.id`, or `null` when that user has none. */
export type ClientProfileLookupByUserId = (userId: string) => Promise<{ id: string } | null>;

/**
 * Map an item's `submitted_by` to its submitter's client profile id.
 *
 * `submitted_by` holds a `users.id` (or a marker such as `'anonymous'`, `'import'` or
 * `'admin'`), while `warnUser`, `suspendUser`, `banUser` and `moderation_history.user_id`
 * work with `client_profiles.id`, which is its own random UUID.
 */
export async function resolveItemOwnerProfileId(
	submittedBy: string | null | undefined,
	lookupByUserId: ClientProfileLookupByUserId
): Promise<ContentOwnerResult> {
	if (!submittedBy) {
		return { success: false, error: 'Item has no submitter' };
	}

	const profile = await lookupByUserId(submittedBy);
	if (!profile) {
		return { success: false, error: 'Item submitter has no client profile' };
	}

	return { success: true, userId: profile.id };
}
