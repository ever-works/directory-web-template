/**
 * Main authentication configuration file
 * Sets up NextAuth.js with Drizzle adapter and custom callbacks
 */

import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, getDrizzleInstance } from '../db/drizzle';
import { eq } from 'drizzle-orm';
import { users, accounts, sessions, verificationTokens } from '../db/schema';
import authConfig from '../../auth.config';
import { invalidateSessionCache } from './cached-session';
import { getClientProfileByUserId, createClientProfile } from '../db/queries/client.queries';
import { coreConfig } from '@/lib/config/config-service';
export * from '../payment/config/payment-provider-manager';

// Define proper interface for user objects with admin/client properties
interface ExtendedUser {
	id?: string;
	email?: string;
	isAdmin?: boolean;
	isClient?: boolean;
	clientProfileId?: string;
	tenantId?: string;
}

// Check if DATABASE_URL is set and database is properly initialized
const isDatabaseAvailable = !!coreConfig.DATABASE_URL && typeof db !== 'undefined';

// Only create the base Drizzle adapter if we have a real database connection
const baseAdapter = isDatabaseAvailable
	? DrizzleAdapter(getDrizzleInstance(), {
			usersTable: users as any,
			accountsTable: accounts as any,
			sessionsTable: sessions as any,
			verificationTokensTable: verificationTokens as any
		})
	: undefined;

// Wrap the adapter to automatically inject tenantId on user creation (e.g., OAuth flows)
const drizzle = baseAdapter
	? {
			...baseAdapter,
			createUser: async (data: any) => {
				// Dynamically import to prevent circular dependency with lib/auth/tenant.ts
				const { getTenantId } = await import('./tenant');
				const tenantId = await getTenantId();
				
				if (!tenantId) {
					console.warn('[auth] Could not resolve tenantId during OAuth user creation');
				}

				return baseAdapter.createUser!({
					...data,
					// Fallback dynamically ensuring tenant ID isn't completely entirely empty
					tenantId: tenantId || undefined
				});
			}
		}
	: undefined;

/**
 * Stripe Provider Singleton
 * Ensures single instance across the application
 */

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
	adapter: drizzle,
	session: {
		strategy: 'jwt',
		maxAge: 30 * 24 * 60 * 60, // 30 days
		updateAge: 24 * 60 * 60 // 24 hours
	},
	jwt: {
		maxAge: 30 * 24 * 60 * 60 // 30 days
	},
	callbacks: {
		authorized: ({ auth }) => auth?.user != null,
		redirect: async ({ url, baseUrl }) => {
			if (url.startsWith('/')) {
				url = `${baseUrl}${url}`;
			}
			if (url.startsWith(baseUrl)) {
				return url;
			}
			return baseUrl;
		},
		signIn: async ({ user, account, profile }) => {
			const isCredentials = account?.provider === 'credentials';
			console.log('Sign-in attempt', { user, account, profile });

			try {
				if (!user?.email) {
					console.warn('Sign-in attempt without email', { provider: account?.provider });
					return !isCredentials;
				}

				// If DATABASE_URL is not set, we can't validate against the database
				if (!isDatabaseAvailable) {
					console.warn('DATABASE_URL is not set, skipping database validation');
					return !isCredentials;
				}

				// For OAuth providers, allow account linking to prevent OAuthAccountNotLinked errors
				if (!isCredentials && account?.provider) {
					console.log(`OAuth sign-in with ${account.provider} for email: ${user.email}`);
					return true;
				}

				return true;
			} catch (error) {
				console.error(
					'Error during sign-in validation',
					error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error' }
				);
				// Fail closed on validation errors
				return false;
			}
		},
		jwt: async ({ token, user, account }) => {
			const extendedUser = user as ExtendedUser;

			try {
				if (extendedUser?.id && typeof extendedUser.id === 'string') {
					token.userId = extendedUser.id;
				}
				if (!token.userId && typeof token.sub === 'string') {
					token.userId = token.sub;
				}
				if (extendedUser?.clientProfileId && typeof extendedUser.clientProfileId === 'string') {
					token.clientProfileId = extendedUser.clientProfileId;
				}
				if (account?.provider) {
					token.provider = account.provider;
				}

				// For OAuth users: ensure client profile exists and populate clientProfileId
				const isOAuthProvider = token.provider && token.provider !== 'credentials';
				if (isOAuthProvider && !token.clientProfileId && token.userId && isDatabaseAvailable) {
					try {
						// Check if client profile already exists
						let clientProfile = await getClientProfileByUserId(token.userId);

						if (!clientProfile) {
							// Create client profile for OAuth user
							const userEmail = token.email || extendedUser?.email || '';
							const userName = token.name || extendedUser?.email?.split('@')[0] || 'User';

							if (userEmail) {
								clientProfile = await createClientProfile({
									userId: token.userId,
									email: userEmail,
									name: userName,
									displayName: userName
								});
								console.log(`[auth][jwt] Created client profile for OAuth user: ${userEmail}`);
							}
						}

						if (clientProfile) {
							token.clientProfileId = clientProfile.id;
						}
					} catch (error) {
						// Log error but don't fail the session - user can still authenticate
						console.error('[auth][jwt] Error creating/fetching client profile for OAuth user:', error);
						// Profile creation will be retried on next session refresh
					}
				}

				// Resolve tenantId from the user record on first sign-in.
				// NOTE: We use an unscoped direct query here instead of getUserById()
				// because getUserById now filters by tenantId internally, creating
				// a circular dependency (we need tenantId to fetch the user, but we
				// need the user to get the tenantId).
				if (!token.tenantId && !token.tenantIdChecked && token.userId && isDatabaseAvailable) {
					try {
						// Mark that we've checked the DB to prevent looping on every request
						// for users who legitimately don't have a tenantId
						token.tenantIdChecked = true;

						const [dbUser] = await getDrizzleInstance()
							.select({ tenantId: users.tenantId })
							.from(users)
							.where(eq(users.id, token.userId))
							.limit(1);
						if (dbUser?.tenantId) {
							token.tenantId = dbUser.tenantId;
						}
					} catch (error) {
						console.error('[auth][jwt] Error resolving tenantId:', error);
					}
				}

				// Detect and update currency/country for client profiles on login
				// Note: Full detection with headers happens on first API call with request context
				// This is just a placeholder - actual detection happens in getUserCurrency with request headers

				if (user) {
					if (typeof extendedUser?.isClient === 'boolean') {
						token.isAdmin = !extendedUser.isClient;
					} else if (typeof extendedUser?.isAdmin === 'boolean') {
						token.isAdmin = extendedUser.isAdmin;
					} else if (typeof token.isAdmin !== 'boolean') {
						// First time without explicit flags: default to non-admin
						token.isAdmin = false;
					}
				}

				// Debug (dev only): trace non-PII auth token composition
				if (coreConfig.NODE_ENV === 'development') {
					try {
						console.debug('[auth][jwt] token composed', {
							provider: token.provider,
							isAdmin: token.isAdmin,
							hasUser: !!user,
							accountProvider: account?.provider,
							hasClientProfileId: !!token.clientProfileId,
							tenantId: token.tenantId
						});
					} catch {}
				}
			} catch (error) {
				// Log unexpected errors for debugging
				console.error('[auth][jwt] Critical error in jwt callback:', error);
				// Re-throw: critical token operations failed, auth should not proceed with corrupt token
				throw error;
			}

			return token;
		},
		session: async ({ session, token }) => {
			if (token && session.user) {
				if (typeof token.userId === 'string') {
					session.user.id = token.userId;
				}
				if (typeof token.clientProfileId === 'string') {
					session.user.clientProfileId = token.clientProfileId;
				}
				session.user.provider = typeof token.provider === 'string' ? token.provider : 'credentials';
				if (typeof token.isAdmin === 'boolean') {
					session.user.isAdmin = token.isAdmin;
				}
				if (typeof token.tenantId === 'string') {
					session.user.tenantId = token.tenantId;
				}
			}

			// Debug (dev only): trace session payload without PII
			if (coreConfig.NODE_ENV === 'development') {
				try {
					console.debug('[auth][session] session built', {
						isAdmin: (session.user as any)?.isAdmin,
						provider: (session.user as any)?.provider
					});
				} catch {}
			}

			return session;
		}
	},
	events: {
		signOut: async (event) => {
			// Invalidate cached session on sign-out
			const token = 'token' in event ? event.token : undefined;
			if (token?.userId && typeof token.userId === 'string') {
				try {
					await invalidateSessionCache(undefined, token.userId);

					if (coreConfig.NODE_ENV === 'development') {
						console.log('[SessionCache] Invalidated cache on sign-out for user:', token.userId);
					}
				} catch (error) {
					console.error('[SessionCache] Error invalidating cache on sign-out:', error);
				}
			}
		},
		updateUser: async ({ user }) => {
			// Invalidate cached session when user data is updated
			if (user?.id) {
				try {
					await invalidateSessionCache(undefined, user.id);

					if (coreConfig.NODE_ENV === 'development') {
						console.log('[SessionCache] Invalidated cache on user update for user:', user.id);
					}
				} catch (error) {
					console.error('[SessionCache] Error invalidating cache on user update:', error);
				}
			}
		}
	},
	pages: {
		signIn: '/auth/signin',
		signOut: '/auth/signout',
		error: '/auth/error',
		verifyRequest: '/auth/verify-request',
		newUser: '/auth/register'
	},
	...authConfig
});
