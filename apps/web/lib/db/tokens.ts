import crypto from 'crypto';
import { db } from './drizzle';
import { getPasswordResetTokenByEmail, getVerificationTokenByEmail } from './queries';
import { passwordResetTokens, verificationTokens } from './schema';
import { and, eq } from 'drizzle-orm';
import { getTenantId } from '../auth/tenant';

/**
 * Mint a fresh email-verification token for `email` (tenant-scoped).
 *
 * Token strategy is **rotate-on-issue**, not update-in-place: any
 * existing verification tokens for this email + tenant are deleted
 * before a new one is inserted. This guarantees that
 *  (a) at most one active token exists per email at any time, so an
 *      attacker who exfiltrated a previous token cannot extend its
 *      life by triggering a re-send, and
 *  (b) the user can rely on "the most recent email" being the only
 *      valid link — older copies become inert immediately.
 *
 * Token value is a `crypto.randomUUID()` (cryptographically random,
 * URL-safe). Expiry is 1h from issue; that floor balances "long enough
 * for the user to find the email" against "short enough to limit the
 * attack window if the inbox is compromised".
 */
export const generateVerificationToken = async (email: string) => {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const token = crypto.randomUUID();
	const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

	const existingToken = await getVerificationTokenByEmail(email);

	if (existingToken) {
		// Remove any stale tokens for this email to avoid duplicates
		await db
			.delete(verificationTokens)
			.where(and(eq(verificationTokens.email, email), eq(verificationTokens.tenantId, tenantId)));
	}

	const items = await db
		.insert(verificationTokens)
		.values({
			identifier: token,
			email,
			token,
			expires,
			tenantId
		})
		.returning();

	return items.at(0);
};

/**
 * Mint a fresh password-reset token for `email` (tenant-scoped).
 *
 * Same rotate-on-issue semantics as
 * {@link generateVerificationToken}: any existing reset token for this
 * email + tenant is deleted before a new one is inserted, so only the
 * most recent reset email is ever valid. `crypto.randomUUID()` value,
 * 1h expiry — same rationale as the verification flow.
 */
export const generatePasswordResetToken = async (email: string) => {
	const token = crypto.randomUUID();
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

	const existingToken = await getPasswordResetTokenByEmail(email);

	if (existingToken) {
		await db
			.delete(passwordResetTokens)
			.where(and(eq(passwordResetTokens.id, existingToken.id), eq(passwordResetTokens.tenantId, tenantId)));
	}

	const items = await db
		.insert(passwordResetTokens)
		.values({
			email,
			token,
			expires,
			tenantId
		})
		.returning();

	return items.at(0);
};
