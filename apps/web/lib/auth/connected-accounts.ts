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

/** The `accounts` columns the "last sign-in method" rule reads. */
export interface SignInAccountRow {
	type: string;
	provider: string;
	passwordHash: string | null;
	tenantId: string | null;
}

export interface ConnectedAccountRow extends SignInAccountRow {
	providerAccountId: string;
	email: string | null;
}

/**
 * True when one of the rows is a password the user can sign in with in `tenantId`. Client
 * sign-in (`verifyClientPassword`) reads the `credentials` provider row of the current
 * tenant only, so a password row with a NULL or other tenant does not count. Older password
 * rows were written as `type: 'email'`, so the provider counts as well as the type (as in
 * `two-factor.ts`). Client passwords live in `accounts`, not `users.passwordHash`.
 */
export function hasPasswordSignIn(rows: readonly SignInAccountRow[], tenantId: string): boolean {
	return rows.some(
		(row) =>
			(row.type === 'credentials' || row.provider === 'credentials') &&
			!!row.passwordHash &&
			row.tenantId === tenantId
	);
}

/**
 * True when the user can still sign in after every linked `provider` row is removed:
 * they have a password, or a link to a different provider. The disconnect route deletes
 * all rows of the provider, so two links of the same provider (two Google accounts)
 * never count as each other's fallback. A link counts whatever its tenant: Auth.js signs
 * in by provider account and writes these rows without a tenant.
 */
export function canDisconnectProvider(rows: readonly SignInAccountRow[], provider: string, tenantId: string): boolean {
	return (
		hasPasswordSignIn(rows, tenantId) ||
		rows.some((row) => isOAuthAccountType(row.type) && row.provider !== provider)
	);
}

/** Builds the GET response body from a user's `accounts` rows. */
export function summarizeConnectedAccounts(rows: ConnectedAccountRow[], tenantId: string) {
	const hasPassword = hasPasswordSignIn(rows, tenantId);
	const data = rows
		.filter((row) => isOAuthAccountType(row.type))
		.map((row) => ({
			provider: row.provider,
			providerAccountId: row.providerAccountId,
			email: row.email ?? null,
			canDisconnect: canDisconnectProvider(rows, row.provider, tenantId),
		}));
	return { data, hasPassword };
}
