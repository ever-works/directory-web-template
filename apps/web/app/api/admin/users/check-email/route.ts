import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRepository } from '@/lib/repositories/user.repository';

/**
 * @swagger
 * /api/admin/users/check-email:
 *   post:
 *     tags: ["Admin - Users"]
 *     summary: "Check email availability"
 *     description: "Checks if an email address is available for use or already exists in the system. Supports excluding a specific user ID for update scenarios where a user keeps their current email. Used for real-time validation in user forms. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "Email address to check"
 *                 example: "john.doe@example.com"
 *               excludeId:
 *                 type: string
 *                 description: "User ID to exclude from the check (for updates)"
 *                 example: "user_123abc"
 *             required: ["email"]
 *     responses:
 *       200:
 *         description: "Email availability check completed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   description: "Whether the email is available for use"
 *                   example: false
 *                 exists:
 *                   type: boolean
 *                   description: "Whether the email already exists in the system"
 *                   example: true
 *               required: ["available", "exists"]
 *             examples:
 *               email_available:
 *                 summary: "Email is available"
 *                 value:
 *                   available: true
 *                   exists: false
 *               email_taken:
 *                 summary: "Email is already taken"
 *                 value:
 *                   available: false
 *                   exists: true
 *       400:
 *         description: "Bad request - Email is required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email is required"
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
    const { email, excludeId } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check email availability
    const userRepository = new UserRepository();
    const exists = await userRepository.emailExists(email, excludeId);

    return NextResponse.json({ 
      available: !exists,
      exists 
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users/check-email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 