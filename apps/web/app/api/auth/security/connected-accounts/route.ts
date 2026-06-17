import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { accounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';

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
					eq(accounts.tenantId, tenantId)
				)
			);

		const oauthAccounts = connectedAccounts.filter((a) => a.type === 'oauth');
		// Client passwords are stored in accounts (type='credentials'), not users.passwordHash
		// 'credentials' accounts exist in the DB but are outside the AdapterAccountType union
		const hasPassword = connectedAccounts.some((a) => (a.type as string) === 'credentials' && !!a.passwordHash);

		const data = oauthAccounts.map((a) => ({
			provider: a.provider,
			providerAccountId: a.providerAccountId,
			email: a.email ?? null,
			canDisconnect: hasPassword || oauthAccounts.length > 1,
		}));

		return NextResponse.json({ success: true, data, hasPassword });
	} catch (error) {
		console.error('Connected accounts list error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}
