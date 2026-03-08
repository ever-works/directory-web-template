import crypto from 'crypto';
import { db } from './drizzle';
import { getPasswordResetTokenByEmail, getVerificationTokenByEmail } from './queries';
import { passwordResetTokens, verificationTokens } from './schema';
import { and, eq } from 'drizzle-orm';
import { getTenantId } from '../auth/tenant';

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
