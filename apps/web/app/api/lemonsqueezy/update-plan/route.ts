import { auth } from "@/lib/auth";
import { getOrCreateLemonsqueezyProvider } from "@/lib/payment/config/payment-provider-manager";
import { safeErrorResponse } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updatePlanSchema = z.object({
  subscriptionId: z.string().min(1),
  variantId: z.coerce.number().positive('Variant ID must be a positive number'),
  proration: z.enum(['immediate', 'next_period']).optional().default('immediate'),
  invoiceImmediately: z.boolean().optional().default(false),
  disableProrations: z.boolean().optional().default(false),
  billingAnchor: z.number().min(1).max(31).optional(),
});

/**
 * @swagger
 * /api/lemonsqueezy/update-plan:
 *   post:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "Update subscription plan"
 *     description: "Updates a LemonSqueezy subscription to a different plan/variant. Supports proration options, immediate invoicing, and billing anchor customization. Includes comprehensive metadata tracking for plan changes."
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
 *                 description: "LemonSqueezy subscription ID to update"
 *                 example: "sub_123abc456def"
 *               variantId:
 *                 type: integer
 *                 minimum: 1
 *                 description: "New product variant ID (will be converted to number)"
 *                 example: 789012
 *               proration:
 *                 type: string
 *                 enum: ["immediate", "next_period"]
 *                 default: "immediate"
 *                 description: "When to apply the plan change"
 *                 example: "immediate"
 *               invoiceImmediately:
 *                 type: boolean
 *                 default: false
 *                 description: "Whether to invoice immediately for the change"
 *                 example: false
 *               disableProrations:
 *                 type: boolean
 *                 default: false
 *                 description: "Whether to disable proration calculations"
 *                 example: false
 *               billingAnchor:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *                 description: "Day of month for billing (1-31)"
 *                 example: 15
 *             required: ["subscriptionId", "variantId"]
 *     responses:
 *       200:
 *         description: "Subscription plan updated successfully"
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
 *                     variantId:
 *                       type: string
 *                       example: "789012"
 *                     priceId:
 *                       type: string
 *                       example: "789012"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         action:
 *                           type: string
 *                           example: "update_plan"
 *                         proration:
 *                           type: string
 *                           example: "immediate"
 *                         invoiceImmediately:
 *                           type: boolean
 *                           example: false
 *                         disableProrations:
 *                           type: boolean
 *                           example: false
 *                         billingAnchor:
 *                           type: integer
 *                           example: 15
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-20T10:30:00.000Z"
 *                         updatedBy:
 *                           type: string
 *                           format: email
 *                           example: "user@example.com"
 *                 message:
 *                   type: string
 *                   example: "Subscription plan updated successfully"
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
 *                 variantId: "789012"
 *                 priceId: "789012"
 *                 updatedAt: "2024-01-20T10:30:00.000Z"
 *                 metadata:
 *                   action: "update_plan"
 *                   proration: "immediate"
 *                   invoiceImmediately: false
 *                   disableProrations: false
 *                   billingAnchor: 15
 *                   updatedAt: "2024-01-20T10:30:00.000Z"
 *                   updatedBy: "user@example.com"
 *               message: "Subscription plan updated successfully"
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
 *                   example: "Failed to update subscription plan"
 *                 message:
 *                   type: string
 *                   example: "Unknown error occurred"
 *                 code:
 *                   type: string
 *                   example: "UPDATE_FAILED"
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
    const validationResult = updatePlanSchema.safeParse(body);
    
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

    const { subscriptionId, variantId, proration, invoiceImmediately, disableProrations, billingAnchor } = validationResult.data;

    // Initialize LemonSqueezy provider
    const lemonsqueezy = getOrCreateLemonsqueezyProvider();

    // Update the subscription plan
    const result = await lemonsqueezy.updateSubscription({
      subscriptionId,
      priceId: variantId.toString(),
      metadata: {
        action: 'update_plan',
        proration,
        invoiceImmediately,
        disableProrations,
        billingAnchor,
        updatedAt: new Date().toISOString(),
        updatedBy: session.user.email
      }
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Subscription plan updated successfully',
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to update subscription plan');
  }
}
