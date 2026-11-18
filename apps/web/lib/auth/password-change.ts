/**
 * Whether a session must end because the password was reset or changed after it signed in.
 *
 * `signedInAt` is the sign-in time (ms since the epoch) that the jwt callback in `./index.ts`
 * stamps on the token when a user signs in (see `signInStamp`). It is not `iat`: Auth.js
 * re-issues the token on every refresh, so `iat` keeps moving forward and would outlive the
 * change. `passwordChangedAt` is `users.password_changed_at`, which `setUserPasswordHash` sets on
 * every reset and change.
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

/**
 * The `signedInAt` stamp for a sign-in.
 *
 * `authorizedAt` is the time the credentials `authorize` (lib/auth/credentials.ts) started,
 * before it read any password hash. Checking the password takes hundreds of milliseconds
 * (bcrypt), so stamping `now` in the jwt callback would let a sign-in that checked the OLD
 * password, while a reset committed, look newer than the reset and survive it. Other providers
 * check no password and pass nothing: `now`. A value that is not a finite number, or lies in the
 * future, is ignored.
 */
export function signInStamp(authorizedAt: unknown, now: number): number {
	if (typeof authorizedAt !== 'number' || !Number.isFinite(authorizedAt)) return now;
	return Math.min(authorizedAt, now);
}
