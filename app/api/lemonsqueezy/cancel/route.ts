import { auth } from "@/lib/auth";
import { getOrCreateLemonsqueezyProvider } from "@/lib/payment/config/payment-provider-manager";
import { safeErrorResponse } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

/**
 * @swagger
 * /api/lemonsqueezy/cancel:
 *   post:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "Cancel subscription"
 *     description: "Cancels a LemonSqueezy subscription for the authenticated user. Supports immediate cancellation or cancellation at the end of the current billing period. Requires user authentication and valid subscription ID."
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
 *                 description: "LemonSqueezy subscription ID to cancel"
 *                 example: "sub_123abc456def"
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 default: true
 *                 description: "Whether to cancel at the end of current period (true) or immediately (false)"
 *                 example: true
 *             required: ["subscriptionId"]
 *     responses:
 *       200:
 *         description: "Subscription cancelled successfully"
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
 *                       example: "cancelled"
 *                     cancelAtPeriodEnd:
 *                       type: boolean
 *                       example: true
 *                     endsAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-02-20T10:30:00.000Z"
 *                 message:
 *                   type: string
 *                   examples:
 *                     period_end: "Subscription will be cancelled at the end of the current period"
 *                     immediate: "Subscription cancelled immediately"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
 *               required: ["success", "data", "message", "timestamp"]
 *             examples:
 *               cancel_at_period_end:
 *                 summary: "Cancel at period end"
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "sub_123abc456def"
 *                     status: "active"
 *                     cancelAtPeriodEnd: true
 *                     endsAt: "2024-02-20T10:30:00.000Z"
 *                   message: "Subscription will be cancelled at the end of the current period"
 *                   timestamp: "2024-01-20T10:30:00.000Z"
 *               cancel_immediately:
 *                 summary: "Cancel immediately"
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "sub_123abc456def"
 *                     status: "cancelled"
 *                     cancelAtPeriodEnd: false
 *                     endsAt: "2024-01-20T10:30:00.000Z"
 *                   message: "Subscription cancelled immediately"
 *                   timestamp: "2024-01-20T10:30:00.000Z"
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
 *                   example: "Failed to cancel subscription"
 *                 message:
 *                   type: string
 *                   example: "Unknown error occurred"
 *                 code:
 *                   type: string
 *                   example: "CANCEL_FAILED"
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
    const validationResult = cancelSubscriptionSchema.safeParse(body);
    
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

    const { subscriptionId, cancelAtPeriodEnd } = validationResult.data;

    const lemonsqueezy = getOrCreateLemonsqueezyProvider();

    const result = await lemonsqueezy.cancelSubscription(
      subscriptionId,
      cancelAtPeriodEnd,
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: cancelAtPeriodEnd 
        ? 'Subscription will be cancelled at the end of the current period'
        : 'Subscription cancelled immediately',
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to cancel subscription');
  }
}
