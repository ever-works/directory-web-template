import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { accounts } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';

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

		const [credRows, [{ oauthCount }]] = await Promise.all([
			db
				.select({ passwordHash: accounts.passwordHash })
				.from(accounts)
				.where(
					and(
						eq(accounts.userId, userId),
						// 'credentials' is outside AdapterAccountType union but valid at runtime
						eq(accounts.type, 'credentials' as any),
						eq(accounts.tenantId, tenantId)
					)
				)
				.limit(1),

			db
				.select({ oauthCount: count() })
				.from(accounts)
				.where(
					and(
						eq(accounts.userId, userId),
						eq(accounts.type, 'oauth'),
						eq(accounts.tenantId, tenantId)
					)
				),
		]);

		// Client passwords are stored in accounts (type='credentials'), not users.passwordHash
		const hasPassword = credRows.length > 0 && !!credRows[0].passwordHash;
		const wouldHaveNoAuth = !hasPassword && oauthCount <= 1;

		if (wouldHaveNoAuth) {
			return NextResponse.json(
				{
					success: false,
					error: 'Cannot disconnect your only sign-in method. Set a password first.',
				},
				{ status: 400 }
			);
		}

		const result = await db
			.delete(accounts)
			.where(
				and(
					eq(accounts.userId, userId),
					eq(accounts.provider, provider),
					eq(accounts.tenantId, tenantId)
				)
			)
			.returning({ provider: accounts.provider });

		if (result.length === 0) {
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
