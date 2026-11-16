import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { accounts, users } from '@/lib/db/schema';
import { eq, and, inArray, isNull, or } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';
import { OAUTH_ACCOUNT_TYPES, canDisconnectProvider } from '@/lib/auth/connected-accounts';

/**
 * @swagger
 * /api/auth/security/connected-accounts/{provider}:
 *   delete:
 *     tags: ["Authentication"]
 *     summary: "Disconnect an OAuth provider"
 *     description: "Removes an OAuth account link. Blocked if it would leave the user with no sign-in method."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Provider disconnected"
 *       400:
 *         description: "Cannot disconnect — no other sign-in method"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Provider not connected"
 */
export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ provider: string }> }
) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const { provider } = await params;
		const userId = session.user.id;

		// The Auth.js adapter links OAuth/OIDC accounts without a tenant, so those rows have a
		// NULL `tenant_id`; matching only `tenantId` would hide (and refuse to delete) them.
		const inTenant = or(eq(accounts.tenantId, tenantId), isNull(accounts.tenantId));

		const outcome = await db.transaction(async (tx) => {
			// Lock the user row first so two disconnects sent at the same time run one after
			// the other. Without the lock each request can count the other's link as the one
			// that remains, both delete, and the user is left with no way to sign in.
			await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');

			const rows = await tx
				.select({
					type: accounts.type,
					provider: accounts.provider,
					passwordHash: accounts.passwordHash,
					tenantId: accounts.tenantId,
				})
				.from(accounts)
				.where(and(eq(accounts.userId, userId), inTenant));

			// Refuse unless a password or a link to ANOTHER provider remains: the delete below
			// removes every row of `provider`, so a second link of the same provider is no fallback.
			if (!canDisconnectProvider(rows, provider, tenantId)) return 'last-sign-in-method' as const;

			const deleted = await tx
				.delete(accounts)
				.where(
					and(
						eq(accounts.userId, userId),
						eq(accounts.provider, provider),
						// Only OAuth links can be disconnected here. Removing the password row
						// would turn a password user into an OAuth-only one, and an OAuth-only
						// user's address counts as verified (`isEmailVerifiedForOwnership`).
						inArray(accounts.type, [...OAUTH_ACCOUNT_TYPES]),
						inTenant
					)
				)
				.returning({ provider: accounts.provider });

			return deleted.length === 0 ? ('not-connected' as const) : ('disconnected' as const);
		});

		if (outcome === 'last-sign-in-method') {
			return NextResponse.json(
				{
					success: false,
					error: 'Cannot disconnect your only sign-in method. Set a password first.',
				},
				{ status: 400 }
			);
		}

		if (outcome === 'not-connected') {
			return NextResponse.json(
				{ success: false, error: `Provider "${provider}" is not connected to your account.` },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, message: `${provider} has been disconnected.` });
	} catch (error) {
		console.error('Disconnect provider error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}
