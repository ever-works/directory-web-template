import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientAccountByEmail, getClientProfileByUserId, verifyClientPassword } from '@/lib/db/queries';
import { issueTwoFactorCode } from '@/lib/auth/two-factor';
import { TWO_FACTOR_CODE_TTL_MINUTES } from '@/lib/auth/two-factor-code';
import { ratelimit } from '@/lib/utils/rate-limit';

/**
 * Resend budget: 3 per 10 minutes, keyed by IP *and* by email.
 *
 * Deliberately tighter than the sign-in limiter because this endpoint
 * sends mail: without it, a stranger who knows an address could use it
 * to bomb that inbox. Both keys are checked so neither a single noisy
 * IP nor a distributed attempt on one address gets a free pass.
 */
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 10 * 60 * 1000;

const resendSchema = z.object({
	email: z.string().email().max(255),
	// The password is re-checked here, exactly as on the first sign-in leg.
	// There is no session yet at this point in the flow, so it is the only
	// proof that the caller is the person mid-login rather than a passer-by
	// who guessed an email address.
	password: z.string().min(1).max(100)
});

/**
 * @swagger
 * /api/auth/2fa/resend:
 *   post:
 *     tags: ["Authentication"]
 *     summary: "Resend the email two-factor sign-in code"
 *     description: "Issues a fresh one-time code for an account with 2FA enabled and emails it, invalidating any previous code. Requires the account password because no session exists mid-login. Always answers 200 for well-formed requests so it cannot be used to enumerate accounts; rate limited to 3 requests per 10 minutes per IP and per email."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Request accepted; a code was sent when the credentials and 2FA state allow it"
 *       400:
 *         description: "Invalid request body"
 *       429:
 *         description: "Too many resend requests"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest) {
	try {
		const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

		const body = await request.json().catch(() => null);
		const parsed = resendSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
		}

		const email = parsed.data.email.toLowerCase().trim();

		for (const key of [`2fa-resend:ip:${clientIP}`, `2fa-resend:email:${email}`]) {
			const result = await ratelimit(key, RESEND_LIMIT, RESEND_WINDOW_MS);
			if (!result.success) {
				return NextResponse.json(
					{
						success: false,
						error: 'Too many code requests. Please wait before trying again.',
						retryAfter: result.retryAfter
					},
					{ status: 429 }
				);
			}
		}

		// Generic success envelope used for every non-rate-limited outcome so
		// the response body never reveals whether the address exists, whether
		// the password was right, or whether 2FA is on for it.
		const accepted = NextResponse.json({
			success: true,
			data: { expiresInMinutes: TWO_FACTOR_CODE_TTL_MINUTES }
		});

		const clientAccount = await getClientAccountByEmail(email);
		if (!clientAccount) return accepted;

		const passwordValid = await verifyClientPassword(email, parsed.data.password);
		if (!passwordValid) return accepted;

		const profile = await getClientProfileByUserId(clientAccount.userId);
		if (!profile || !profile.twoFactorEnabled) return accepted;

		await issueTwoFactorCode({
			userId: profile.userId,
			email: profile.email,
			tenantId: profile.tenantId,
			userName: profile.displayName || profile.name
		});

		return accepted;
	} catch (error) {
		console.error('Two-factor resend error:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error. Please try again later.' },
			{ status: 500 }
		);
	}
}
