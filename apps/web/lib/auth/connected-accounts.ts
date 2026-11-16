import type { AdapterAccountType } from 'next-auth/adapters';

/**
 * Account types Auth.js writes for a linked external provider. OpenID Connect providers
 * (Google, any OIDC issuer) are stored as `oidc`, the rest as `oauth`, so both are
 * "connected accounts". Kept free of database imports so it can be shared and unit tested.
 */
export const OAUTH_ACCOUNT_TYPES = ['oauth', 'oidc'] as const satisfies readonly AdapterAccountType[];

const OAUTH_ACCOUNT_TYPE_SET: ReadonlySet<string> = new Set(OAUTH_ACCOUNT_TYPES);

export function isOAuthAccountType(type: string): boolean {
	return OAUTH_ACCOUNT_TYPE_SET.has(type);
}

export interface ConnectedAccountRow {
	provider: string;
	providerAccountId: string;
	email: string | null;
	type: string;
	passwordHash: string | null;
}

/**
 * True when removing one linked provider would leave the user with no way to sign in:
 * no password and at most one linked provider.
 */
export function wouldLeaveNoSignInMethod(hasPassword: boolean, linkedProviderCount: number): boolean {
	return !hasPassword && linkedProviderCount <= 1;
}

/** Builds the GET response body from a user's `accounts` rows. */
export function summarizeConnectedAccounts(rows: ConnectedAccountRow[]) {
	const linked = rows.filter((row) => isOAuthAccountType(row.type));
	// Client passwords are stored in accounts (type='credentials'), not users.passwordHash
	// 'credentials' accounts exist in the DB but are outside the AdapterAccountType union
	const hasPassword = rows.some((row) => row.type === 'credentials' && !!row.passwordHash);
	const data = linked.map((row) => ({
		provider: row.provider,
		providerAccountId: row.providerAccountId,
		email: row.email ?? null,
		canDisconnect: !wouldLeaveNoSignInMethod(hasPassword, linked.length),
	}));
	return { data, hasPassword };
}
