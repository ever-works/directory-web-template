import { NextRequest, NextResponse } from 'next/server';
import { subscriptionRenewalReminderJob } from '@/lib/services/subscription-jobs';
import crypto from 'crypto';

// Verify cron secret to prevent unauthorized access (timing-safe comparison)
function verifyCronSecret(request: NextRequest): boolean {
	const authHeader = request.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		console.error('[Cron] CRON_SECRET not configured - denying access');
		return false;
	}

	if (!authHeader) {
		return false;
	}

	const expectedValue = `Bearer ${cronSecret}`;

	// Use timing-safe comparison to prevent timing attacks
	// Both buffers must have the same length for timingSafeEqual
	if (authHeader.length !== expectedValue.length) {
		return false;
	}

	return crypto.timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedValue, 'utf8'));
}

/**
 * GET /api/cron/subscription-reminders
 * Daily cron job to send renewal reminder emails
 *
 * This endpoint can be called by:
 * 1. Vercel Cron (configure in vercel.json)
 * 2. External scheduler (with CRON_SECRET)
 * 3. BackgroundJobManager (LocalJobManager or Trigger.dev)
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/subscription-reminders",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
	try {
		// Verify authorization
		if (!verifyCronSecret(request)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Run the subscription reminder job
		const result = await subscriptionRenewalReminderJob();

		if (!result.success) {
			return NextResponse.json(
				{
					error: 'Job completed with errors',
					...result
				},
				{ status: 207 } // Multi-Status - partial success
			);
		}

		return NextResponse.json({
			message: 'Subscription reminder job completed',
			...result
		});
	} catch (error) {
		console.error('[Cron] Subscription reminders job failed:', error);
		return NextResponse.json(
			{
				error: 'Cron job failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// Also support POST for Vercel Cron
export async function POST(request: NextRequest) {
	return GET(request);
}
