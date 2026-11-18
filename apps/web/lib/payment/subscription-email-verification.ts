import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { accounts, users } from '@/lib/db/schema';
import { isOAuthAccountType } from '@/lib/auth/connected-accounts';
import { getTenantId } from '@/lib/auth/tenant';
import type { EmailVerificationState } from './subscription-ownership';

/**
 * Up to two of the current tenant's users whose email equals `email` ignoring case, for the
 * LemonSqueezy verified-email match (`lemonsqueezy-verified-email-user.ts`): two already show the
 * address is ambiguous. A database error throws, so the webhook answers 503 and is redelivered.
 */
export async function getUsersByEmailIgnoringCase(email: string): Promise<Array<{ id: string }>> {
	const normalised = email.trim().toLowerCase();
	if (!normalised) return [];
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.select({ id: users.id })
		.from(users)
		.where(and(sql`lower(${users.email}) = ${normalised}`, eq(users.tenantId, tenantId)))
		.limit(2);
}

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
	const oauthAccounts = rows.filter((row) => isOAuthAccountType(row.type)).map((row) => ({ email: row.email }));
	const hasPasswordSignIn = hasUserPassword || rows.some((row) => !isOAuthAccountType(row.type));
	return { email, emailVerified, oauthAccounts, hasPasswordSignIn };
}
