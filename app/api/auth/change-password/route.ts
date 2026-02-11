import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ratelimit } from "@/lib/utils/rate-limit";
import { sendPasswordChangeConfirmationEmail } from "@/lib/mail";
import { passwordSchema } from "@/lib/validations/auth";

// Validation schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Rate limiting: 5 attempts per 15 minutes per IP
const rateLimitConfig = {
  requests: 5,
  window: 15 * 60 * 1000, // 15 minutes
};

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: ["Authentication"]
 *     summary: "Change user password"
 *     description: "Changes the authenticated user's password with comprehensive security measures including current password verification, strong password validation, rate limiting, duplicate password prevention, and email confirmation. Includes protection against OAuth accounts and sends security notification emails."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: "Current password for verification"
 *                 example: "CurrentPass123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$"
 *                 description: "New password (min 8 chars, must contain uppercase, lowercase, number, and special character)"
 *                 example: "NewSecurePass456@"
 *               confirmPassword:
 *                 type: string
 *                 description: "Confirmation of new password (must match newPassword)"
 *                 example: "NewSecurePass456@"
 *             required: ["currentPassword", "newPassword", "confirmPassword"]
 *     responses:
 *       200:
 *         description: "Password changed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Password changed successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "Password changed successfully"
 *       400:
 *         description: "Bad request - Validation errors or business logic violations"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   examples:
 *                     validation_error: "Invalid input data"
 *                     wrong_current: "Current password is incorrect"
 *                     same_password: "New password must be different from current password"
 *                     oauth_account: "Password change not available for OAuth accounts. Please contact support."
 *                 details:
 *                   type: array
 *                   description: "Detailed validation errors (when applicable)"
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "too_small"
 *                       minimum:
 *                         type: integer
 *                         example: 8
 *                       type:
 *                         type: string
 *                         example: "string"
 *                       inclusive:
 *                         type: boolean
 *                         example: true
 *                       exact:
 *                         type: boolean
 *                         example: false
 *                       message:
 *                         type: string
 *                         example: "Password must be at least 8 characters"
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["newPassword"]
 *             examples:
 *               validation_error:
 *                 summary: "Password validation failed"
 *                 value:
 *                   success: false
 *                   error: "Invalid input data"
 *                   details:
 *                     - code: "too_small"
 *                       minimum: 8
 *                       type: "string"
 *                       inclusive: true
 *                       exact: false
 *                       message: "Password must be at least 8 characters"
 *                       path: ["newPassword"]
 *               wrong_current:
 *                 summary: "Current password incorrect"
 *                 value:
 *                   success: false
 *                   error: "Current password is incorrect"
 *               same_password:
 *                 summary: "New password same as current"
 *                 value:
 *                   success: false
 *                   error: "New password must be different from current password"
 *               oauth_account:
 *                 summary: "OAuth account restriction"
 *                 value:
 *                   success: false
 *                   error: "Password change not available for OAuth accounts. Please contact support."
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Please sign in."
 *       404:
 *         description: "User not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       429:
 *         description: "Too many requests - Rate limit exceeded"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Too many password change attempts. Please try again later."
 *                 retryAfter:
 *                   type: integer
 *                   description: "Seconds until next attempt is allowed"
 *                   example: 900
 *             example:
 *               success: false
 *               error: "Too many password change attempts. Please try again later."
 *               retryAfter: 900
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error. Please try again later."
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get("x-forwarded-for") ||
                    request.headers.get("x-real-ip") ||
                    "unknown";

    console.log("Client IP:", clientIP);

    // Apply rate limiting
    const rateLimitResult = await ratelimit(
      `change-password:${clientIP}`,
      rateLimitConfig.requests,
      rateLimitConfig.window
    );

    if (!rateLimitResult.success) {
      console.log("Rate limit exceeded for IP:", clientIP);
      return NextResponse.json(
        {
          success: false,
          error: "Too many password change attempts. Please try again later.",
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    const body = await request.json();
    const validationResult = changePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      console.log("Validation failed:", validationResult.error.issues);
    }

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has a password (OAuth users might not have one)
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Password change not available for OAuth accounts. Please contact support."
        },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await db
      .update(users)
      .set({
        passwordHash: hashedNewPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, session.user.id));

    // Send confirmation email
    try {
      const clientIP = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      const emailData = {
        email: user.email || session.user.email!,
        userName: session.user.name || undefined,
        clientIP,
        userAgent
      };


      const emailResult = await sendPasswordChangeConfirmationEmail(
        emailData.email,
        emailData.userName,
        emailData.clientIP,
        emailData.userAgent
      );

      console.log("📧 Email result:", emailResult);
    } catch (emailError) {
      // Log email error but don't fail the password change
      console.error("Email error details:", {
        message: emailError instanceof Error ? emailError.message : 'Unknown error',
        stack: emailError instanceof Error ? emailError.stack : undefined
      });
    }

    // Log security event (optional)
    console.log(`Password changed for user ${session.user.id} at ${new Date().toISOString()}`);

    return NextResponse.json(
      {
        success: true,
        message: "Password changed successfully"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Password change error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later."
      },
      { status: 500 }
    );
  }
}
