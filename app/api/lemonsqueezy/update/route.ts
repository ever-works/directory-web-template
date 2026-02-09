import { auth } from '@/lib/auth';
import { PaymentProviderManager } from '@/lib/auth';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for update subscription request
const updateSubscriptionSchema = z.object({
	subscriptionId: z.string().min(1, 'Subscription ID is required'),
	status: z.enum(['active', 'cancelled', 'expired', 'on_trial', 'past_due', 'paused', 'unpaid']).optional(),
	cancelAtPeriodEnd: z.boolean().optional(),
	priceId: z.string().optional(),
	metadata: z.record(z.string(), z.any()).optional()
});

export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionSchema>;

/**
 * @swagger
 * /api/lemonsqueezy/update:
 *   post:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "Update subscription"
 *     description: "Updates a LemonSqueezy subscription with new parameters such as status, cancellation settings, price, or metadata. Includes development mode support and comprehensive error handling with request tracking."
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
 *               status:
 *                 type: string
 *                 enum: ["active", "cancelled", "expired", "on_trial", "past_due", "paused", "unpaid"]
 *                 description: "New subscription status"
 *                 example: "active"
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 description: "Whether to cancel at the end of current period"
 *                 example: false
 *               priceId:
 *                 type: string
 *                 description: "New price/variant ID"
 *                 example: "price_456def789ghi"
 *               metadata:
 *                 type: object
 *                 description: "Additional metadata to update"
 *                 additionalProperties: true
 *                 example:
 *                   updatedReason: "user_request"
 *                   previousPlan: "basic"
 *             required: ["subscriptionId"]
 *     responses:
 *       200:
 *         description: "Subscription updated successfully"
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
 *                     priceId:
 *                       type: string
 *                       example: "price_456def789ghi"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T10:30:00.000Z"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     duration:
 *                       type: string
 *                       example: "150ms"
 *                     userId:
 *                       type: string
 *                       example: "user_123abc"
 *               required: ["success", "data", "metadata"]
 *         headers:
 *           Cache-Control:
 *             description: "Cache control header"
 *             schema:
 *               type: string
 *               example: "no-cache, no-store, must-revalidate"
 *           X-Request-ID:
 *             description: "Request tracking ID"
 *             schema:
 *               type: string
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *           X-Response-Time:
 *             description: "Response time"
 *             schema:
 *               type: string
 *               example: "150ms"
 *       400:
 *         description: "Bad request - Invalid request data"
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
 *                   example: "Invalid request data"
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                   example: [{"code": "too_small", "path": ["subscriptionId"], "message": "Subscription ID is required"}]
 *                 requestId:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
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
 *                   example: "Unauthorized"
 *                 code:
 *                   type: string
 *                   example: "UNAUTHORIZED"
 *                 requestId:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
 *       404:
 *         description: "Subscription not found"
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
 *                   example: "Subscription not found or update failed"
 *                 code:
 *                   type: string
 *                   example: "SUBSCRIPTION_NOT_FOUND"
 *                 requestId:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
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
 *                   example: "Failed to update subscription"
 *                 code:
 *                   type: string
 *                   enum: ["INTERNAL_ERROR", "PROVIDER_UNAVAILABLE"]
 *                   example: "INTERNAL_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Unknown error occurred"
 *                 requestId:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
 *                 duration:
 *                   type: string
 *                   example: "150ms"
 *       503:
 *         description: "Service unavailable - Provider unavailable"
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
 *                   example: "Failed to update subscription"
 *                 code:
 *                   type: string
 *                   example: "PROVIDER_UNAVAILABLE"
 */
export async function POST(request: NextRequest) {
	const requestId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
	const startTime = Date.now();

	try {
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json(
				{
					success: false,
					error: 'Unauthorized',
					code: 'UNAUTHORIZED',
					requestId,
					timestamp: new Date().toISOString()
				},
				{ status: 401 }
			);
		}

		const body = await request.json();
		const validationResult = updateSubscriptionSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid request data',
					code: 'VALIDATION_ERROR',
					details: validationResult.error.issues,
					requestId,
					timestamp: new Date().toISOString()
				},
				{ status: 400 }
			);
		}

		const { subscriptionId, status, cancelAtPeriodEnd, priceId, metadata } = validationResult.data;

		if (process.env.NODE_ENV === 'development') {
			return NextResponse.json(
				{
					success: true,
					data: {
						subscriptionId,
						status,
						cancelAtPeriodEnd,
						priceId,
						metadata
					}
				},
				{ status: 200 }
			);
		}

		const lemonsqueezy = PaymentProviderManager.getLemonsqueezyProvider();
		const subscription = await lemonsqueezy.updateSubscription({
			subscriptionId,
			priceId,
			cancelAtPeriodEnd,
			metadata
		});
		console.log('Subscription updated:', subscription);
		if (!subscription) {
			return NextResponse.json(
				{
					success: false,
					error: 'Subscription not found or update failed',
					code: 'SUBSCRIPTION_NOT_FOUND',
					requestId,
					timestamp: new Date().toISOString()
				},
				{ status: 404 }
			);
		}

		// Log successful update
		const duration = Date.now() - startTime;
		console.log(`[${requestId}] Successfully updated subscription`, {
			subscriptionId,
			newStatus: subscription.status,
			duration: `${duration}ms`,
			timestamp: new Date().toISOString()
		});

		return NextResponse.json(
			{
				success: true,
				data: subscription,
				metadata: {
					requestId,
					timestamp: new Date().toISOString(),
					duration: `${duration}ms`,
					userId: session.user.id
				}
			},
			{
				status: 200,
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'X-Request-ID': requestId,
					'X-Response-Time': `${duration}ms`
				}
			}
		);
	} catch (error) {
		const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'INTERNAL_ERROR';
		const statusCode =
			errorCode === 'VALIDATION_ERROR'
				? 400
				: errorCode === 'UNAUTHORIZED'
					? 401
					: errorCode === 'SUBSCRIPTION_NOT_FOUND'
						? 404
						: errorCode === 'PROVIDER_UNAVAILABLE'
							? 503
							: 500;

		return safeErrorResponse(error, 'Failed to update subscription', statusCode);
	}
}
