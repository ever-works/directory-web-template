'use server';

import { z } from 'zod';
import { ActivityType, users, clientProfiles, accounts, verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { AdapterAccountType } from 'next-auth/adapters';
import { db } from '@/lib/db/drizzle';
import { getTenantId } from '@/lib/auth/tenant';

import { redirect } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { validatedAction, validatedActionWithUser } from '@/lib/auth/middleware';
import { comparePasswords, hashPassword, AuthProviders, AuthErrorCode } from '@/lib/auth/credentials';
import {
	deletePasswordResetToken,
	deleteVerificationToken,
	getPasswordResetTokenByToken,
	getUserByEmail,
	getVerificationTokenByToken,
	getVerificationTokenByEmail,
	logActivity,
	softDeleteUser,
	updateUser,
	updateUserPassword,
	updateUserVerification,
	getClientAccountByEmail,
	updateClientProfileName,
	verifyClientPassword,
	isUserAdmin
} from '@/lib/db/queries';
import { generatePasswordResetToken } from '@/lib/db/tokens';
import { sendPasswordResetEmail, sendVerificationEmailWithTemplate } from '@/lib/mail';
import { authServiceFactory } from '@/lib/auth/services';
import { ratelimit } from '@/lib/utils/rate-limit';

const PASSWORD_MIN_LENGTH = 8;
// Rate limiting: 5 attempts per 15 minutes per email
const AUTH_RATE_LIMIT = 5;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
const authProviderTypes = ['supabase', 'next-auth', 'both'] as const;

const signInSchema = z.object({
	email: z.string().email().min(3).max(255),
	password: z.string().min(PASSWORD_MIN_LENGTH).max(100),
	authProvider: z.enum(authProviderTypes).default('next-auth'),
	captchaToken: z.string().optional()
});

export const signInAction = validatedAction(signInSchema, async (data) => {
	try {
		const { email, password } = data;

		// Rate limiting check (by email to prevent brute force on specific accounts)
		const rateLimitKey = `signin:${email.toLowerCase()}`;
		const rateLimitResult = await ratelimit(rateLimitKey, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS);
		if (!rateLimitResult.success) {
			return { error: AuthErrorCode.RATE_LIMITED, ...data };
		}

		// Normalize email for consistent lookup
		const normalizedEmail = email.toLowerCase().trim();

		// Step 1: Validate credentials FIRST to get specific error messages
		// (NextAuth returns generic "CredentialsSignin" which loses the specific error code)
		const foundUser = await getUserByEmail(normalizedEmail);
		const clientAccount = await getClientAccountByEmail(normalizedEmail);

		// No account found with this email
		if (!foundUser && !clientAccount) {
			return { error: AuthErrorCode.ACCOUNT_NOT_FOUND, ...data };
		}

		// Determine if this is an admin user via role-based check
		const isAdmin = foundUser ? await isUserAdmin(foundUser.id) : false;

		// Check password for admin user
		if (isAdmin && foundUser) {
			const isValid = await comparePasswords(password, foundUser.passwordHash);
			if (!isValid) {
				return { error: AuthErrorCode.INVALID_PASSWORD, ...data };
			}
		}
		// Check password for client user (has passwordHash in accounts table)
		else if (clientAccount) {
			const isValid = await verifyClientPassword(email, password);
			if (!isValid) {
				return { error: AuthErrorCode.INVALID_PASSWORD, ...data };
			}
		}
		// OAuth-only user trying to use credentials form
		else {
			return { error: AuthErrorCode.USE_OAUTH_PROVIDER, ...data };
		}

		// Step 2: Credentials validated - signal client to perform signIn
		// SECURITY: Only return email, not password. Client will use form state for password.
		// This ensures cookies are properly set in the browser context (fixes Vercel deployment issue)
		const redirectPath = isAdmin ? '/admin' : '/client/dashboard';

		return {
			success: true,
			redirect: redirectPath,
			preserveLocale: true,
			autoLogin: true,
			email: normalizedEmail // Only return email, password sourced from client form state
		};
	} catch (error) {
		console.error('SignIn error:', error);
		return { error: AuthErrorCode.GENERIC_ERROR, ...data };
	}
});

const signInWithProviderSchema = z.object({
	authProvider: z.enum(authProviderTypes).default('next-auth'),
	redirect: z
		.union([z.boolean(), z.string()])
		.transform((val) => (typeof val === 'string' ? val === 'true' : val))
		.default(true),
	callbackUrl: z.string().default('/client/dashboard'),
	provider: z.enum([AuthProviders.GOOGLE, AuthProviders.FACEBOOK, AuthProviders.GITHUB, AuthProviders.TWITTER])
});

export const signInWithProvider = validatedAction(signInWithProviderSchema, async (data) => {
	try {
		const authService = authServiceFactory(data.authProvider);

		const result = await authService.signInWithOAuth(data.provider, {
			...data,
			callbackUrl: data.callbackUrl
		});
		if (result.url) {
			return {
				success: true,
				url: result.url
			};
		}

		return {
			success: true
		};
	} catch (error) {
		console.error(error);
		return {
			error: 'Authentication failed. Please try again.',
			...data
		};
	}
});

const signUpSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(PASSWORD_MIN_LENGTH),
	authProvider: z.enum(authProviderTypes).default('next-auth'),
	captchaToken: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data) => {
	try {
		const tenantId = await getTenantId();
		if (!tenantId) throw new Error('Tenant ID not found');

		const { name, email, password } = data;
		const normalizedEmail = email.toLowerCase().trim();

		// Rate limiting check (by email to prevent spam registrations)
		const rateLimitKey = `signup:${normalizedEmail}`;
		const rateLimitResult = await ratelimit(rateLimitKey, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS);
		if (!rateLimitResult.success) {
			return { error: AuthErrorCode.RATE_LIMITED, ...data };
		}

		// OPTIMIZATION 1: Parallelize password hashing with duplicate email check
		// hashPassword is CPU-bound (~100ms), checking for existing user is I/O-bound
		const [passwordHash, existingUser] = await Promise.all([
			hashPassword(password),
			getUserByEmail(normalizedEmail).catch(() => null)
		]);

		// Fail fast if email already exists
		if (existingUser) {
			return {
				error: 'An account with this email already exists.',
				...data
			};
		}

		// Handle Supabase auth if needed (after duplicate check to avoid unnecessary calls)
		const authService = authServiceFactory(data.authProvider);
		if (data.authProvider === 'supabase') {
			const { error } = await authService.signUp(email, password);
			if (error) {
				throw error;
			}
		}

		// OPTIMIZATION 2: Single transaction for ALL database operations
		// - users insert
		// - clientProfiles insert (with username retry)
		// - accounts insert (was createClientAccount)
		// - verificationTokens cleanup + insert (was generateVerificationToken)
		const result = await db.transaction(async (tx) => {
			// 1) Create user record
			const userId = crypto.randomUUID();
			const [user] = await tx
				.insert(users)
				.values({
					id: userId,
					email: normalizedEmail,
					tenantId
				})
				.returning();

			// 2) Create client profile with unique username
			const extractedUsername = normalizedEmail.split('@')[0] || 'user';
			const base = (extractedUsername.replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'user').slice(0, 30);

			let counter = 1;
			let clientProfile;
			for (;;) {
				const candidate = counter === 1 ? base : `${base}${counter}`;
				const inserted = await tx
					.insert(clientProfiles)
					.values({
						userId: user.id,
						email: normalizedEmail,
						name,
						displayName: name,
						username: candidate,
						bio: "Welcome! I'm a new user on this platform.",
						jobTitle: 'User',
						company: 'Unknown',
						status: 'active',
						plan: 'free',
						accountType: 'individual',
						tenantId
					})
					.onConflictDoNothing({ target: clientProfiles.username })
					.returning();
				if (inserted.length) {
					clientProfile = inserted[0];
					break;
				}
				counter++;
				if (counter > 50) throw new Error('Failed to allocate unique username after 50 attempts');
			}

			// 3) Create credentials account (was separate createClientAccount call)
			const [account] = await tx
				.insert(accounts)
				.values({
					userId: user.id,
					type: 'credentials' as AdapterAccountType,
					provider: 'credentials',
					providerAccountId: normalizedEmail,
					email: normalizedEmail,
					passwordHash,
					tenantId
				})
				.returning();

			if (!account) {
				throw new Error('Failed to create client account');
			}

			// 4) Generate verification token (was separate generateVerificationToken call)
			// Delete any existing tokens for this email first
			const existingToken = await getVerificationTokenByEmail(normalizedEmail);
			if (existingToken) {
				await tx.delete(verificationTokens).where(eq(verificationTokens.email, normalizedEmail));
			}

			const token = crypto.randomUUID();
			const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
			const [verificationToken] = await tx
				.insert(verificationTokens)
				.values({
					identifier: token,
					email: normalizedEmail,
					token,
					expires,
					tenantId
				})
				.returning();

			return { user, clientProfile, account, verificationToken };
		});

		const { clientProfile, verificationToken } = result;

		// Fire and forget - don't block signup response
		void logActivity(ActivityType.SIGN_UP, clientProfile.id, 'client').catch((err) =>
			console.error('[SignUp] Activity logging failed:', err)
		);

		if (verificationToken) {
			sendVerificationEmailWithTemplate(normalizedEmail, verificationToken.token, name)
				.then(() => console.log(`[SignUp] Verification email sent to ${normalizedEmail}`))
				.catch((err) => console.error(`[SignUp] Failed to send verification email:`, err));
		}

		// Defer the session-cookie issuance to the client-side signIn() call in the
		// CredentialsForm useEffect. Earlier rounds of Spec 027 tried doing this
		// server-side via Auth.js v5's `signIn('credentials', …)` from inside the
		// signUp server action — that DID set `__Secure-authjs.session-token` in the
		// response, but the very next `/api/auth/session` (triggered by the form's
		// `refreshSession()`) silently *cleared* the cookie. Auth.js v5 beta.30's
		// server-action signIn appears to encrypt/sign the token along a slightly
		// different code path than the standard `/api/auth/callback/credentials`
		// endpoint, and the verifier on `/api/auth/session` then can't read it. The
		// sign-in form's client-side `signIn('credentials', …)` does NOT have this
		// regression (it goes through `/api/auth/callback/credentials` which is what
		// every subsequent verify also uses), so mirror that path on register.
		//
		// The double-fire race that motivated the original move server-side is now
		// blocked by the `autoLoginFiredRef` useRef guard in credentials-form.tsx.
		return {
			success: true,
			redirect: '/client/dashboard',
			preserveLocale: true,
			autoLogin: true,
			email: normalizedEmail
		};
	} catch (error) {
		console.error('SignUp error:', error);
		return {
			error: 'Failed to create user. Please try again.',
			...data
		};
	}
});

const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(PASSWORD_MIN_LENGTH).max(100),
		newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(100),
		confirmPassword: z.string().min(PASSWORD_MIN_LENGTH).max(100)
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	});

export const updatePassword = validatedActionWithUser(updatePasswordSchema, async (data, _, user) => {
	const { currentPassword, newPassword } = data;

	const dbUser = await getUserByEmail(user.email!).catch(() => null);
	if (!dbUser) {
		return { error: 'User not found' };
	}

	const isPasswordValid = await comparePasswords(currentPassword, dbUser.passwordHash);

	if (!isPasswordValid) {
		return { error: 'Current password is incorrect.' };
	}

	if (currentPassword === newPassword) {
		return {
			error: 'New password must be different from the current password.'
		};
	}

	const newPasswordHash = await hashPassword(newPassword);

	await Promise.all([
		updateUserPassword(newPasswordHash, dbUser.id),
		logActivity(ActivityType.UPDATE_PASSWORD, dbUser.id, 'user')
	]);

	return { success: 'Password updated successfully.' };
});

const deleteAccountSchema = z.object({
	password: z.string().min(PASSWORD_MIN_LENGTH).max(100),
	provider: z.enum(authProviderTypes).default('next-auth')
});

export const deleteAccount = validatedActionWithUser(deleteAccountSchema, async (data, _, user) => {
	const { password } = data;
	const dbUser = await getUserByEmail(user.email!).catch(() => null);
	if (!dbUser) {
		return { error: 'User not found' };
	}

	// Two password stores coexist (mirrors signInAction):
	// - Client users (the common case): hash lives on accounts.passwordHash
	//   (provider='credentials'), verified via verifyClientPassword.
	// - Admin users: hash lives on users.passwordHash, verified directly.
	// Try the client path first, then fall back to the admin path so this
	// works for either user type without forcing the caller to know which.
	const isClientPasswordValid = await verifyClientPassword(user.email!, password);
	const isPasswordValid =
		isClientPasswordValid || (await comparePasswords(password, dbUser.passwordHash));
	if (!isPasswordValid) {
		return { error: 'Incorrect password. Account deletion failed.' };
	}

	await logActivity(ActivityType.DELETE_ACCOUNT, dbUser.id, 'user');
	await softDeleteUser(dbUser.id);

	// Clear the session cookie without letting NextAuth issue its own redirect —
	// its redirectTo path doesn't propagate reliably through useActionState, and
	// the `await ... .signOut()` wrapper used to return undefined which made the
	// caller's destructure throw before we ever reached redirect(). Call signOut
	// with redirect:false, then issue the redirect ourselves so the client lands
	// on /auth/signin every time.
	await signOut({ redirect: false });
	redirect('/auth/signin');
});

const updateAccountSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(updateAccountSchema, async (data, _, user) => {
	const { name, email } = data;
	// Normalize email to lowercase to prevent case-variant duplicates
	const normalizedEmail = email.toLowerCase().trim();

	const dbUser = await getUserByEmail(user.email!).catch(() => null);
	if (!dbUser) {
		return { error: 'User not found' };
	}
	await Promise.all([
		updateUser({ email: normalizedEmail }, dbUser.id),
		updateClientProfileName(dbUser.id, name),
		logActivity(ActivityType.UPDATE_ACCOUNT, dbUser.id, 'user')
	]);

	return { success: 'Account updated successfully.' };
});

export const signOutAction = async (provider?: string) => {
	const authService = authServiceFactory(provider || 'next-auth');
	const { error } = await authService.signOut();
	if (error) return { error };
	return { success: true };
};

const forgotPasswordSchema = z.object({
	email: z.string().email()
});

export const forgotPassword = validatedAction(forgotPasswordSchema, async ({ email }) => {
	// Normalize email for consistent lookup
	const normalizedEmail = email.toLowerCase().trim();
	const dbUser = await getUserByEmail(normalizedEmail).catch(() => null);
	if (!dbUser) {
		return { success: true, email };
	}

	const passwordResetToken = await generatePasswordResetToken(normalizedEmail);

	if (passwordResetToken) {
		// Email is optional - won't throw if not configured
		await sendPasswordResetEmail(passwordResetToken.email, passwordResetToken.token);
	}

	return { success: true, email };
});

export const verifyEmailAction = async (token: string) => {
	const existingToken = await getVerificationTokenByToken(token);
	if (!existingToken) {
		return { error: 'Invalid token!' };
	}

	const hasExpired = existingToken.expires < new Date();
	if (hasExpired) {
		return { error: 'The token has expired.' };
	}

	const existingUser = await getUserByEmail(existingToken.email);
	if (!existingUser) {
		return { error: 'No account is associated with this token!' };
	}

	await Promise.all([
		updateUserVerification(existingToken.email, true),
		deleteVerificationToken(existingToken.token)
	]);

	await logActivity(ActivityType.VERIFY_EMAIL, existingUser.id, 'user');

	return { success: true };
};

export const verifyPasswordTokenAction = async (token: string) => {
	const existingToken = await getPasswordResetTokenByToken(token);
	if (!existingToken) {
		return { error: 'Invalid token!' };
	}

	const hasExpired = existingToken.expires < new Date();
	if (hasExpired) {
		return { error: 'The token has expired.' };
	}

	const existingUser = await getUserByEmail(existingToken.email);
	if (!existingUser) {
		return { error: 'No account is associated with this token!' };
	}

	return { success: true, userId: existingUser.id };
};

const newPasswordSchema = z
	.object({
		token: z.string(),
		newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(100),
		confirmPassword: z.string().min(PASSWORD_MIN_LENGTH).max(100)
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	});

export const newPasswordAction = validatedAction(newPasswordSchema, async (data) => {
	const result = await verifyPasswordTokenAction(data.token);
	if (!result.success) {
		return result;
	}

	const hashedPassword = await hashPassword(data.newPassword);

	await Promise.all([updateUserPassword(hashedPassword, result.userId), deletePasswordResetToken(data.token)]);

	await logActivity(ActivityType.UPDATE_PASSWORD, result.userId, 'user');

	return { success: true };
});
