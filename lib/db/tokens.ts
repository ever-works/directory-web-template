import crypto from 'crypto';
import { db } from './drizzle';
import { getPasswordResetTokenByEmail, getVerificationTokenByEmail } from './queries';
import { passwordResetTokens, verificationTokens } from './schema';
import { eq } from 'drizzle-orm';

export const generateVerificationToken = async (email: string, tenantId: string) => {
	const token = crypto.randomUUID();
	const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

	const existingToken = await getVerificationTokenByEmail(email, tenantId);

	if (existingToken) {
		// Remove any stale tokens for this email to avoid duplicates
		await db.delete(verificationTokens).where(eq(verificationTokens.email, email));
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

export const generatePasswordResetToken = async (email: string, tenantId: string) => {
	const token = crypto.randomUUID();
	const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

	const existingToken = await getPasswordResetTokenByEmail(email, tenantId);

	if (existingToken) {
		await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, existingToken.id));
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
