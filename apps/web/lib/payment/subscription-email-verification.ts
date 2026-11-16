import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { accounts, users } from '@/lib/db/schema';
import type { EmailVerificationState } from './subscription-ownership';

/**
 * Database lookup for `isEmailVerifiedForOwnership` (see `subscription-ownership.ts`).
 * Account types written by the credentials flow (`credentials`, legacy `email`) say
 * nothing about the address, so only `oauth` and `oidc` rows are returned.
 */
export async function loadEmailVerificationState(userId: string): Promise<EmailVerificationState | null> {
	const [user] = await db
		.select({ email: users.email, emailVerified: users.emailVerified })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!user) return null;
	if (user.emailVerified) return { ...user, oauthAccounts: [] };

	const oauthAccounts = await db
		.select({ email: accounts.email })
		.from(accounts)
		.where(and(eq(accounts.userId, userId), inArray(accounts.type, ['oauth', 'oidc'])));
	return { ...user, oauthAccounts };
}
