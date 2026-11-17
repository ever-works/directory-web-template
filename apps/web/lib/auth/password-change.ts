/**
 * Whether a session must end because the password was reset or changed after it signed in.
 *
 * `signedInAt` is the sign-in time (ms since the epoch) that the jwt callback in `./index.ts`
 * stamps on the token when a user signs in. It is not `iat`: Auth.js re-issues the token on
 * every refresh, so `iat` keeps moving forward and would outlive the change. `passwordChangedAt`
 * is `users.password_changed_at`, which `setUserPasswordHash` sets on every reset and change.
 *
 * A token with no stamp (issued before stamping existed, or altered) cannot be shown to be newer
 * than the change, so once the password has changed it ends. While the password has never
 * changed, every session is kept.
 */
export function sessionPredatesPasswordChange(
	signedInAt: unknown,
	passwordChangedAt: Date | null | undefined
): boolean {
	if (passwordChangedAt == null) return false;
	if (typeof signedInAt !== 'number' || !Number.isFinite(signedInAt)) return true;
	return passwordChangedAt.getTime() > signedInAt;
}
