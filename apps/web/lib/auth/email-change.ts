/**
 * Whether writing `next` to a user's email replaces the address they have now. Case and surrounding
 * spaces are ignored, so re-saving the same address in another case is not a change. `undefined`
 * means the update does not touch the email.
 *
 * Every write that changes `users.email` clears `users.emailVerified` when this is true: a
 * verification belongs to the address that was verified and must not prove the new one (see
 * `isEmailVerifiedForOwnership` in `lib/payment/subscription-ownership.ts`). The profile edit
 * (`updateUser` in `lib/db/queries/user.queries.ts`) and the admin user edit
 * (`UserDbService.updateUser`) both use it.
 */
export function replacesEmailAddress(previous: string | null | undefined, next: string | null | undefined): boolean {
	if (next === undefined) return false;
	return normalise(previous) !== normalise(next);
}

const normalise = (email: string | null | undefined) => (email ?? '').trim().toLowerCase();
