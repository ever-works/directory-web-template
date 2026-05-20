import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getClientProfileById } from '@/lib/db/queries/client.queries';

/**
 * @swagger
 * /api/current-user:
 *   get:
 *     tags: ["Authentication"]
 *     summary: "Get current authenticated user"
 *     description: "Returns the current authenticated user's safe profile information including ID, name, email, avatar, provider, and admin status. Returns null if no user is authenticated. This endpoint provides sanitized user data without sensitive information like password hashes or internal metadata."
 *     responses:
 *       200:
 *         description: "Current user information retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: "Authenticated user information"
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "User unique identifier"
 *                       example: "user_123abc"
 *                     name:
 *                       type: string
 *                       nullable: true
 *                       description: "User's full name"
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       format: email
 *                       nullable: true
 *                       description: "User's email address"
 *                       example: "john.doe@example.com"
 *                     image:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: "User's profile image URL"
 *                       example: "https://example.com/avatars/john.jpg"
 *                     provider:
 *                       type: string
 *                       nullable: true
 *                       description: "Authentication provider used"
 *                       example: "google"
 *                     isAdmin:
 *                       type: boolean
 *                       description: "Whether the user has admin privileges"
 *                       example: false
 *                     tenantId:
 *                       type: string
 *                       nullable: true
 *                       description: "The ID of the tenant the user belongs to"
 *                       example: "tenant_123xyz"
 *                   required: ["id", "isAdmin"]
 *                 - type: "null"
 *                   description: "No authenticated user"
 *             examples:
 *               authenticated_user:
 *                 summary: "Authenticated user"
 *                 value:
 *                   id: "user_123abc"
 *                   name: "John Doe"
 *                   email: "john.doe@example.com"
 *                   image: "https://example.com/avatars/john.jpg"
 *                   provider: "google"
 *                   isAdmin: false
 *                   tenantId: "tenant_123xyz"
 *               authenticated_admin:
 *                 summary: "Authenticated admin user"
 *                 value:
 *                   id: "user_456def"
 *                   name: "Jane Admin"
 *                   email: "jane.admin@example.com"
 *                   image: "https://example.com/avatars/jane.jpg"
 *                   provider: "credentials"
 *                   isAdmin: true
 *                   tenantId: null
 *               oauth_user:
 *                 summary: "OAuth user with minimal info"
 *                 value:
 *                   id: "user_789ghi"
 *                   name: "GitHub User"
 *                   email: "github.user@example.com"
 *                   image: "https://avatars.githubusercontent.com/u/123456"
 *                   provider: "github"
 *                   isAdmin: false
 *                   tenantId: "tenant_456abc"
 *               credentials_user:
 *                 summary: "Credentials user"
 *                 value:
 *                   id: "user_101jkl"
 *                   name: "Local User"
 *                   email: "local.user@example.com"
 *                   image: null
 *                   provider: "credentials"
 *                   isAdmin: false
 *                   tenantId: "tenant_789def"
 *               unauthenticated:
 *                 summary: "No authenticated user"
 *                 value: null
 */
// Per-user response — must never be cached by a shared CDN. Set the
// header explicitly so the public caching contract (e2e) sees it
// regardless of the runtime default.
const NO_CACHE_HEADERS = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0'
};

export const dynamic = 'force-dynamic';

export async function GET() {
	const session = await auth();

	if (!session?.user) {
		return NextResponse.json(null, { headers: NO_CACHE_HEADERS });
	}

	// Prefer the freshly-saved avatar and display name from `client_profiles`
	// over the NextAuth session claims (set at sign-in time and never refreshed
	// when the user changes them). Falls back to the session values for
	// accounts without a client profile (e.g. admins).
	let image: string | null | undefined = session.user.image;
	let name: string | null | undefined = session.user.name;
	if (session.user.clientProfileId) {
		try {
			const profile = await getClientProfileById(session.user.clientProfileId);
			if (profile?.avatar) image = profile.avatar;
			if (profile?.displayName || profile?.name) {
				name = profile.displayName || profile.name;
			}
		} catch {
			// best-effort — fall back to the session values
		}
	}

	const safeUser = {
		id: session.user.id,
		name,
		email: session.user.email,
		image,
		provider: session.user.provider,
		isAdmin: session.user.isAdmin || false,
		tenantId: session.user.tenantId
	};

	return NextResponse.json(safeUser, { headers: NO_CACHE_HEADERS });
}
