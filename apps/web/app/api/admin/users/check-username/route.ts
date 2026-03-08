import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRepository } from '@/lib/repositories/user.repository';

/**
 * @swagger
 * /api/admin/users/check-username:
 *   post:
 *     tags: ["Admin - Users"]
 *     summary: "Check username availability"
 *     description: "Checks if a username is available for use or already exists in the system. Supports excluding a specific user ID for update scenarios where a user keeps their current username. Used for real-time validation in user forms and registration. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: "Username to check"
 *                 example: "johndoe"
 *               excludeId:
 *                 type: string
 *                 description: "User ID to exclude from the check (for updates)"
 *                 example: "user_123abc"
 *             required: ["username"]
 *     responses:
 *       200:
 *         description: "Username availability check completed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   description: "Whether the username is available for use"
 *                   example: false
 *                 exists:
 *                   type: boolean
 *                   description: "Whether the username already exists in the system"
 *                   example: true
 *               required: ["available", "exists"]
 *             examples:
 *               username_available:
 *                 summary: "Username is available"
 *                 value:
 *                   available: true
 *                   exists: false
 *               username_taken:
 *                 summary: "Username is already taken"
 *                 value:
 *                   available: false
 *                   exists: true
 *       400:
 *         description: "Bad request - Username is required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Username is required"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: "Forbidden - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { username, excludeId } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Check username availability
    const userRepository = new UserRepository();
    const exists = await userRepository.usernameExists(username, excludeId);

    return NextResponse.json({ 
      available: !exists,
      exists 
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users/check-username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 