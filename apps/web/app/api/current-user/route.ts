import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

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
export async function GET() {
	const session = await auth();

	if (!session?.user) {
		return NextResponse.json(null);
	}

	const safeUser = {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
		image: session.user.image,
		provider: session.user.provider,
		isAdmin: session.user.isAdmin || false,
		tenantId: session.user.tenantId
	};

	return NextResponse.json(safeUser);
}
