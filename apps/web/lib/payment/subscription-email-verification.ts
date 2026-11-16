import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { accounts, users } from '@/lib/db/schema';
import type { EmailVerificationState } from './subscription-ownership';

/**
 * Database lookup for `isEmailVerifiedForOwnership` (see `subscription-ownership.ts`).
 * Account types written by the credentials flow (`credentials`, legacy `email`) say
 * nothing about the address, so only `oauth` and `oidc` rows count.
 */
export async function loadEmailVerificationState(userId: string): Promise<EmailVerificationState | null> {
	const [user] = await db
		.select({ emailVerified: users.emailVerified })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!user) return null;
	if (user.emailVerified) return { emailVerified: user.emailVerified, hasOAuthAccount: false };

	const linked = await db
		.select({ provider: accounts.provider })
		.from(accounts)
		.where(and(eq(accounts.userId, userId), inArray(accounts.type, ['oauth', 'oidc'])))
		.limit(1);
	return { emailVerified: null, hasOAuthAccount: linked.length > 0 };
}
