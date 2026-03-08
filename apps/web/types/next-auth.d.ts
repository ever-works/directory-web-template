import { DefaultSession, DefaultUser } from 'next-auth';

// Extend NextAuth session and user types to include isAdmin

declare module 'next-auth' {
	interface Session {
		user: {
			id?: string;
			clientProfileId?: string;
			provider?: string;
			isAdmin?: boolean;
			customerId?: string;
			tenantId?: string;
		} & DefaultSession['user'];
	}
	interface User extends DefaultUser {
		isAdmin?: boolean;
		clientProfileId?: string;
		customerId?: string;
		tenantId?: string;
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
	}
}
