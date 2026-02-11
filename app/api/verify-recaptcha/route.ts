import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

/**
 * @swagger
 * /api/verify-recaptcha:
 *   post:
 *     tags: ["Security - ReCAPTCHA"]
 *     summary: "Verify ReCAPTCHA token"
 *     description: "Verifies a Google ReCAPTCHA token by communicating with Google's verification API. Supports both development mode (bypasses verification) and production mode with comprehensive error handling and score reporting."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: "ReCAPTCHA token from client-side verification"
 *                 example: "03AGdBq25SiXT-pmSeBXjzScW-EiocHwwpwqJRCAC7g..."
 *             required: ["token"]
 *     responses:
 *       200:
 *         description: "ReCAPTCHA verification completed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: "Whether the ReCAPTCHA verification was successful"
 *                   example: true
 *                 score:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 1
 *                   description: "ReCAPTCHA v3 score (0.0 = bot, 1.0 = human)"
 *                   example: 0.9
 *                 action:
 *                   type: string
 *                   description: "Action name from ReCAPTCHA verification"
 *                   example: "submit"
 *                 hostname:
 *                   type: string
 *                   description: "Hostname where verification occurred"
 *                   example: "example.com"
 *                 challenge_ts:
 *                   type: string
 *                   format: date-time
 *                   description: "Timestamp of the challenge"
 *                   example: "2024-01-15T10:30:00Z"
 *                 error_codes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: "Error codes from Google ReCAPTCHA API"
 *                   example: []
 *               required: ["success"]
 *             examples:
 *               successful_verification:
 *                 summary: "Successful ReCAPTCHA verification"
 *                 value:
 *                   success: true
 *                   score: 0.9
 *                   action: "submit"
 *                   hostname: "example.com"
 *                   challenge_ts: "2024-01-15T10:30:00Z"
 *                   error_codes: []
 *               failed_verification:
 *                 summary: "Failed ReCAPTCHA verification"
 *                 value:
 *                   success: false
 *                   score: 0.1
 *                   action: "submit"
 *                   hostname: "example.com"
 *                   challenge_ts: "2024-01-15T10:30:00Z"
 *                   error_codes: ["invalid-input-response"]
 *               development_mode:
 *                 summary: "Development mode bypass"
 *                 value:
 *                   success: true
 *       400:
 *         description: "Bad request - Missing or invalid token"
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
 *                   example: "ReCAPTCHA token is required"
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
 *                   example: "Verification failed"
 *             examples:
 *               not_configured:
 *                 summary: "Missing secret key"
 *                 value:
 *                   success: false
 *                   error: "ReCAPTCHA not configured"
 *               verification_failed:
 *                 summary: "Upstream verification failure"
 *                 value:
 *                   success: false
 *                   error: "Failed to verify ReCAPTCHA"
 *               general_error:
 *                 summary: "Unexpected runtime error"
 *                 value:
 *                   success: false
 *                   error: "Verification failed"
 *     x-development-mode:
 *       description: "Development mode behavior"
 *       behavior: "When RECAPTCHA_SECRET_KEY is not configured in development, returns success: true without verification"
 *     x-google-api:
 *       description: "Google ReCAPTCHA API integration"
 *       endpoint: "https://www.google.com/recaptcha/api/siteverify"
 *       method: "POST"
 *       format: "application/x-www-form-urlencoded"
 */

// Types for ReCAPTCHA API response
interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured — bypassing verification in development mode. " +
          "Set RECAPTCHA_SECRET_KEY to enable verification."
        );
        return NextResponse.json({
          success: true,
          score: 1.0,
          action: "bypass",
        });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    // Use server client to make the request to Google's API
    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        secret: secretKey,
        response: token,
      }
    );

    // Check if the request was successful
    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
