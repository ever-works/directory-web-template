/**
 * Stands for a `users.password_changed_at` read that failed (a database error). It is not
 * `undefined`, which a read that found no users row also gives, so the check can fail closed.
 */
export const PASSWORD_CHANGE_UNREADABLE = Symbol('password_changed_at unreadable');

/** What the jwt callback read for `users.password_changed_at`. */
export type PasswordChangeRead = Date | null | undefined | typeof PASSWORD_CHANGE_UNREADABLE;

/**
 * The password version a token stores: `users.password_changed_at` in ms since the epoch, or
 * `null` when no change has been recorded (the column is NULL, or there is no users row).
 */
export function passwordVersionOf(passwordChangedAt: Date | null | undefined): number | null {
	return passwordChangedAt ? passwordChangedAt.getTime() : null;
}

/** The password-change claims of a session token (see `types/next-auth.d.ts`). */
export interface SessionPasswordClaims {
	/** When the user signed in (ms since the epoch), stamped by the jwt callback on sign-in. */
	signedInAt?: unknown;
	/**
	 * Credentials sign-ins only: `users.password_changed_at` (`passwordVersionOf`) read in the SAME
	 * query as the password hash the sign-in checked, so it names the password the session proved.
	 */
	passwordVersion?: unknown;
}

/**
 * Whether a session must end because the password was reset or changed after it signed in.
 *
 * `passwordChangedAt` is `users.password_changed_at`, which `setUserPasswordHash` sets on every
 * reset and change in the transaction that writes the new hash.
 *
 * A credentials sign-in carries `passwordVersion`, the `password_changed_at` value its query read
 * together with the hash it checked: one statement sees one committed state, so the old hash comes
 * with the old version and the new hash with the new one. The session ends as soon as the current
 * value differs. No clock is compared, so a sign-in that read the old hash while a change was being
 * committed (after the change took its time, before the commit) still ends, and a sign-in that
 * checked the committed new password is kept.
 *
 * Other sign-ins (OAuth, email link) check no password and carry only `signedInAt`, the time the
 * jwt callback stamped (not `iat`: Auth.js re-issues the token on every refresh, so `iat` keeps
 * moving forward and would outlive the change). Such a session ends when the change is later than
 * the stamp. A token with neither claim (issued before this check existed) cannot be shown to be
 * newer than the change, so once the password has changed it ends. While the password has never
 * changed, those sessions are kept. A failed read (`PASSWORD_CHANGE_UNREADABLE`) cannot show that
 * no reset ended the session, so it ends it (fails closed): a reset after a password theft must not
 * be undone by a database error while the stolen session is used.
 */
export function sessionPredatesPasswordChange(
	session: SessionPasswordClaims,
	passwordChangedAt: PasswordChangeRead
): boolean {
	if (passwordChangedAt === PASSWORD_CHANGE_UNREADABLE) return true;
	const { signedInAt, passwordVersion } = session;
	if (passwordVersion !== undefined) {
		// Any value that is not the current version (a different time, NaN, a string) ends it.
		return passwordVersion !== passwordVersionOf(passwordChangedAt);
	}
	if (passwordChangedAt == null) return false;
	if (typeof signedInAt !== 'number' || !Number.isFinite(signedInAt)) return true;
	return passwordChangedAt.getTime() > signedInAt;
}

/**
 * The `passwordVersion` claim for a sign-in: what the credentials `authorize`
 * (lib/auth/credentials.ts) returned, a number or `null`. `undefined` for anything else, so a
 * sign-in that checked no password (OAuth, email link) stays on the `signedInAt` check.
 */
export function signInPasswordVersion(fromAuthorize: unknown): number | null | undefined {
	if (fromAuthorize === null) return null;
	if (typeof fromAuthorize === 'number' && Number.isFinite(fromAuthorize)) return fromAuthorize;
	return undefined;
}
