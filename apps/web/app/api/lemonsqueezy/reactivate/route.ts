import { auth } from "@/lib/auth";
import { getOrCreateLemonsqueezyProvider } from "@/lib/payment/config/payment-provider-manager";
import { safeErrorResponse } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reactivateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
});

/**
 * @swagger
 * /api/lemonsqueezy/reactivate:
 *   post:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "Reactivate subscription"
 *     description: "Reactivates a previously cancelled LemonSqueezy subscription for the authenticated user. Sets cancelAtPeriodEnd to false and adds reactivation metadata. Requires user authentication and valid subscription ID."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 minLength: 1
 *                 description: "LemonSqueezy subscription ID to reactivate"
 *                 example: "sub_123abc456def"
 *             required: ["subscriptionId"]
 *     responses:
 *       200:
 *         description: "Subscription reactivated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: "Updated subscription data from LemonSqueezy"
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "sub_123abc456def"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     cancelAtPeriodEnd:
 *                       type: boolean
 *                       example: false
 *                     endsAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         action:
 *                           type: string
 *                           example: "reactivate"
 *                         reactivateAction:
 *                           type: boolean
 *                           example: true
 *                         reactivatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-20T10:30:00.000Z"
 *                         reactivatedBy:
 *                           type: string
 *                           format: email
 *                           example: "user@example.com"
 *                 message:
 *                   type: string
 *                   example: "Subscription reactivated successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
 *               required: ["success", "data", "message", "timestamp"]
 *             example:
 *               success: true
 *               data:
 *                 id: "sub_123abc456def"
 *                 status: "active"
 *                 cancelAtPeriodEnd: false
 *                 endsAt: null
 *                 metadata:
 *                   action: "reactivate"
 *                   reactivateAction: true
 *                   reactivatedAt: "2024-01-20T10:30:00.000Z"
 *                   reactivatedBy: "user@example.com"
 *               message: "Subscription reactivated successfully"
 *               timestamp: "2024-01-20T10:30:00.000Z"
 *       400:
 *         description: "Bad request - Invalid request data"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid request data"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                   example: [{"code": "too_small", "path": ["subscriptionId"], "message": "String must contain at least 1 character(s)"}]
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
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
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 *                 code:
 *                   type: string
 *                   example: "AUTH_REQUIRED"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to reactivate subscription"
 *                 message:
 *                   type: string
 *                   example: "Unknown error occurred"
 *                 code:
 *                   type: string
 *                   example: "REACTIVATE_FAILED"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = reactivateSubscriptionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { subscriptionId } = validationResult.data;

    const lemonsqueezy = getOrCreateLemonsqueezyProvider();

    const result = await lemonsqueezy.updateSubscription({
      subscriptionId,
      cancelAtPeriodEnd: false,
      metadata: {
        action: 'reactivate',
        reactivateAction: true,
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: session.user.email
      }
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Subscription reactivated successfully',
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to reactivate subscription');
  }
}
