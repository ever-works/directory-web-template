import { DefaultSession, DefaultUser } from 'next-auth';

// Extend NextAuth session and user types to include isAdmin and isDeactivated

declare module 'next-auth' {
	interface Session {
		user: {
			id?: string;
			clientProfileId?: string;
			provider?: string;
			isAdmin?: boolean;
			customerId?: string;
			tenantId?: string;
			/** True when the user's account has a non-null deactivatedAt timestamp. */
			isDeactivated?: boolean;
		} & DefaultSession['user'];
	}
	interface User extends DefaultUser {
		isAdmin?: boolean;
		clientProfileId?: string;
		customerId?: string;
		tenantId?: string;
		username?: string;
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		userId?: string;
		clientProfileId?: string;
		provider?: string;
		isAdmin?: boolean;
		customerId?: string;
		tenantId?: string;
		/** True when the user's account has a non-null deactivatedAt timestamp. */
		isDeactivated?: boolean;
		/**
		 * When the user signed in (ms since the epoch), stamped by the jwt callback on sign-in only.
		 * A password reset or change after it ends the session (lib/auth/password-change.ts).
		 */
		signedInAt?: number;
		/**
		 * Credentials sign-ins only: users.password_changed_at (ms since the epoch, or null) read in
		 * the same query as the password hash the sign-in checked. Any later value ends the session.
		 */
		passwordVersion?: number | null;
	}
}
