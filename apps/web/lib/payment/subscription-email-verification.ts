import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { accounts, users } from '@/lib/db/schema';
import type { EmailVerificationState } from './subscription-ownership';

const OAUTH_ACCOUNT_TYPES: ReadonlySet<string> = new Set(['oauth', 'oidc']);

/**
 * Database lookup for `isEmailVerifiedForOwnership` (see `subscription-ownership.ts`).
 * Account types written by the credentials flow (`credentials`, legacy `email`) say
 * nothing about the address, so only `oauth` and `oidc` rows are returned as proof,
 * and any other row (or `users.passwordHash`) marks the user as a password user.
 */
export async function loadEmailVerificationState(userId: string): Promise<EmailVerificationState | null> {
	const [user] = await db
		.select({ email: users.email, emailVerified: users.emailVerified, passwordHash: users.passwordHash })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!user) return null;
	const { email, emailVerified } = user;
	const hasUserPassword = user.passwordHash !== null && user.passwordHash !== undefined;
	// A verified address needs no OAuth proof, so the accounts are not read.
	if (emailVerified) return { email, emailVerified, oauthAccounts: [], hasPasswordSignIn: hasUserPassword };

	const rows = await db
		.select({ type: accounts.type, email: accounts.email })
		.from(accounts)
		.where(eq(accounts.userId, userId));
	const oauthAccounts = rows.filter((row) => OAUTH_ACCOUNT_TYPES.has(row.type)).map((row) => ({ email: row.email }));
	const hasPasswordSignIn = hasUserPassword || rows.some((row) => !OAUTH_ACCOUNT_TYPES.has(row.type));
	return { email, emailVerified, oauthAccounts, hasPasswordSignIn };
}
