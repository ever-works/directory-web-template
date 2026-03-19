import Credentials from 'next-auth/providers/credentials';
import {
	getUserByEmail,
	logActivity,
	getClientAccountByEmail,
	verifyClientPassword,
	getClientProfileByUserId,
	isUserAdmin
} from '../db/queries';
import { ActivityType } from '../db/schema';
import { AuthErrorCode } from './auth-error-codes';

// Re-export AuthErrorCode for backwards compatibility
export { AuthErrorCode } from './auth-error-codes';

const SALT_ROUNDS = 10;

// Dynamic import to avoid bundling bcryptjs in Edge Runtime
async function getBcrypt() {
	const bcryptjs = await import('bcryptjs');
	return bcryptjs;
}

export enum AuthProviders {
	CREDENTIALS = 'credentials',
	GOOGLE = 'google',
	FACEBOOK = 'facebook',
	GITHUB = 'github',
	TWITTER = 'twitter',
	X = 'x',
	MICROSOFT = 'microsoft'
}

export async function hashPassword(password: string) {
	const { hash } = await getBcrypt();
	return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(plainTextPassword: string, hashedPassword: string | null) {
	if (!hashedPassword) {
		return false;
	}
	const { compare } = await getBcrypt();
	return compare(plainTextPassword, hashedPassword);
}

export const credentialsProvider = Credentials({
	name: AuthProviders.CREDENTIALS,
	credentials: {
		email: { type: 'email' },
		password: { type: 'password' }
	},
	authorize: async (credentials) => {
		try {
			const email = credentials.email as string;
			const password = credentials.password as string;

			// Check admin user first via role-based check
			const foundUser = await getUserByEmail(email);
			const isAdmin = foundUser ? await isUserAdmin(foundUser.id) : false;

			if (isAdmin && foundUser && foundUser.passwordHash) {
				const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);

				if (isPasswordValid) {
					void logActivity(ActivityType.SIGN_IN, foundUser.id, 'user', undefined, foundUser.tenantId || undefined).catch(() => {});

					return {
						...foundUser,
						tenantId: foundUser.tenantId ?? undefined,
						isClient: false,
						isAdmin: true
					};
				}
				// Admin user found but password is invalid
				throw new Error(AuthErrorCode.INVALID_PASSWORD);
			}

			// Check client account
			const clientAccount = await getClientAccountByEmail(email);

			if (clientAccount) {
				const isClientPasswordValid = await verifyClientPassword(email, password);

				if (isClientPasswordValid) {
					const clientProfile = await getClientProfileByUserId(clientAccount.userId);
					if (!clientProfile) {
						throw new Error(AuthErrorCode.PROFILE_NOT_FOUND);
					}
					const clientUser = {
						id: clientProfile.userId,
						clientProfileId: clientProfile.id,
						name: clientProfile.name || clientProfile.displayName,
						email: clientProfile.email,
						image: null,
						isClient: true,
						isAdmin: false
					};
					void logActivity(ActivityType.SIGN_IN, clientProfile.id, 'client', undefined, clientProfile.tenantId || undefined).catch(() => {});
					return clientUser;
				}
				// Client account found but password is invalid
				throw new Error(AuthErrorCode.INVALID_PASSWORD);
			}

			// No account found with this email
			throw new Error(AuthErrorCode.ACCOUNT_NOT_FOUND);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : AuthErrorCode.GENERIC_ERROR;
			console.error('Authentication error:', errorMessage);
			throw new Error(errorMessage);
		}
	}
});
