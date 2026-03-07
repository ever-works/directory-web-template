import { and, eq } from 'drizzle-orm';
import { db } from '../drizzle';
import { passwordResetTokens, verificationTokens } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

// ===================== Password Reset Token Queries =====================

/**
 * Get password reset token by email
 * @param email - User email
 * @returns Password reset token or undefined
 */
export async function getPasswordResetTokenByEmail(email: string) {
	const tenantId = await getTenantId();
	if (!tenantId) return null;
	const tokens = await db
		.select()
		.from(passwordResetTokens)
		.where(and(eq(passwordResetTokens.email, email), eq(passwordResetTokens.tenantId, tenantId)))
		.limit(1);

	return tokens[0];
}

/**
 * Get password reset token by token string
 * @param token - Reset token string
 * @returns Password reset token or undefined
 */
export async function getPasswordResetTokenByToken(token: string) {
	const tenantId = await getTenantId();
	if (!tenantId) return null;
	const tokens = await db
		.select()
		.from(passwordResetTokens)
		.where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.tenantId, tenantId)))
		.limit(1);

	return tokens.at(0);
}

/**
 * Delete password reset token
 * @param token - Reset token string to delete
 */
export async function deletePasswordResetToken(token: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.delete(passwordResetTokens)
		.where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.tenantId, tenantId)));
}

// ===================== Verification Token Queries =====================

/**
 * Get verification token by email
 * @param email - User email
 * @returns Verification token or undefined
 */
export async function getVerificationTokenByEmail(email: string) {
	const tenantId = await getTenantId();
	if (!tenantId) return null;
	const tokens = await db
		.select()
		.from(verificationTokens)
		.where(and(eq(verificationTokens.email, email), eq(verificationTokens.tenantId, tenantId)))
		.limit(1);

	return tokens[0];
}

/**
 * Get verification token by token string
 * @param token - Verification token string
 * @returns Verification token or undefined
 */
export async function getVerificationTokenByToken(token: string) {
	const tenantId = await getTenantId();
	if (!tenantId) return null;
	const tokens = await db
		.select()
		.from(verificationTokens)
		.where(and(eq(verificationTokens.token, token), eq(verificationTokens.tenantId, tenantId)))
		.limit(1);

	return tokens.at(0);
}

/**
 * Delete verification token
 * @param token - Verification token string to delete
 */
export async function deleteVerificationToken(token: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.delete(verificationTokens)
		.where(and(eq(verificationTokens.token, token), eq(verificationTokens.tenantId, tenantId)));
}
