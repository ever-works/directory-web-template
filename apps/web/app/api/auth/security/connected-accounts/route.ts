import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { accounts } from '@/lib/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';
import { summarizeConnectedAccounts } from '@/lib/auth/connected-accounts';

/**
 * @swagger
 * /api/auth/security/connected-accounts:
 *   get:
 *     tags: ["Authentication"]
 *     summary: "List connected OAuth accounts"
 *     description: "Returns all OAuth providers linked to the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "List of connected accounts"
 *       401:
 *         description: "Unauthorized"
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const userId = session.user.id;

		const connectedAccounts = await db
			.select({
				provider: accounts.provider,
				providerAccountId: accounts.providerAccountId,
				email: accounts.email,
				type: accounts.type,
				passwordHash: accounts.passwordHash,
			})
			.from(accounts)
			.where(
				and(
					eq(accounts.userId, userId),
					// The Auth.js adapter links OAuth/OIDC accounts without a tenant (NULL
					// `tenant_id`), so those rows must match too or they never appear.
					or(eq(accounts.tenantId, tenantId), isNull(accounts.tenantId))
				)
			);

		const { data, hasPassword } = summarizeConnectedAccounts(connectedAccounts);

		return NextResponse.json({ success: true, data, hasPassword });
	} catch (error) {
		console.error('Connected accounts list error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}
