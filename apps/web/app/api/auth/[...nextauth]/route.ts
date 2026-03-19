import { NextRequest } from 'next/server';
import { handleWithErrorHandling } from './error-wrapper';

// Force Node.js runtime to avoid Edge Runtime database/crypto issues
export const runtime = 'nodejs';

/**
 * @swagger
 * /api/auth/{...nextauth}:
 *   get:
 *     tags: ["Authentication"]
 *     summary: "NextAuth.js GET handler"
 *     description: "Handles NextAuth.js GET requests including session retrieval, provider configuration, CSRF token generation, and authentication callbacks. This endpoint is managed by NextAuth.js and supports various authentication flows including OAuth providers, email sign-in, and session management."
 *     parameters:
 *       - name: "nextauth"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: "NextAuth.js dynamic route segments (e.g., ['signin'], ['session'], ['providers'], ['csrf'])"
 *         examples:
 *           session:
 *             summary: "Get current session"
 *             value: ["session"]
 *           providers:
 *             summary: "Get available providers"
 *             value: ["providers"]
 *           csrf:
 *             summary: "Get CSRF token"
 *             value: ["csrf"]
 *           signin:
 *             summary: "Sign-in page"
 *             value: ["signin"]
 *     responses:
 *       200:
 *         description: "Successful response (varies by endpoint)"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: "Session response"
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "user_123abc"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         image:
 *                           type: string
 *                           example: "https://example.com/avatar.jpg"
 *                         isAdmin:
 *                           type: boolean
 *                           example: false
 *                     expires:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-02-20T10:30:00.000Z"
 *                 - type: object
 *                   description: "Providers response"
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       signinUrl:
 *                         type: string
 *                       callbackUrl:
 *                         type: string
 *                 - type: object
 *                   description: "CSRF token response"
 *                   properties:
 *                     csrfToken:
 *                       type: string
 *                       example: "abc123def456"
 *             examples:
 *               session_authenticated:
 *                 summary: "Authenticated session"
 *                 value:
 *                   user:
 *                     id: "user_123abc"
 *                     name: "John Doe"
 *                     email: "john.doe@example.com"
 *                     image: "https://example.com/avatar.jpg"
 *                     isAdmin: false
 *                   expires: "2024-02-20T10:30:00.000Z"
 *               session_unauthenticated:
 *                 summary: "Unauthenticated session"
 *                 value: null
 *               providers:
 *                 summary: "Available providers"
 *                 value:
 *                   google:
 *                     id: "google"
 *                     name: "Google"
 *                     type: "oauth"
 *                     signinUrl: "/api/auth/signin/google"
 *                     callbackUrl: "/api/auth/callback/google"
 *                   github:
 *                     id: "github"
 *                     name: "GitHub"
 *                     type: "oauth"
 *                     signinUrl: "/api/auth/signin/github"
 *                     callbackUrl: "/api/auth/callback/github"
 *               csrf:
 *                 summary: "CSRF token"
 *                 value:
 *                   csrfToken: "abc123def456ghi789"
 *           text/html:
 *             schema:
 *               type: string
 *               description: "HTML response for sign-in/sign-out pages"
 *       302:
 *         description: "Redirect response for authentication flows"
 *       400:
 *         description: "Bad request - Invalid parameters or configuration"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(req: NextRequest) {
  return handleWithErrorHandling(req, 'GET');
}

/**
 * @swagger
 * /api/auth/{...nextauth}:
 *   post:
 *     tags: ["Authentication"]
 *     summary: "NextAuth.js POST handler"
 *     description: "Handles NextAuth.js POST requests including sign-in, sign-out, callback processing, and session updates. Supports various authentication methods including OAuth providers, email/password, and magic links. Manages authentication state and session creation/destruction."
 *     parameters:
 *       - name: "nextauth"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: "NextAuth.js dynamic route segments"
 *         examples:
 *           signin:
 *             summary: "Sign-in request"
 *             value: ["signin", "credentials"]
 *           signout:
 *             summary: "Sign-out request"
 *             value: ["signout"]
 *           callback:
 *             summary: "OAuth callback"
 *             value: ["callback", "google"]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 description: "Credentials sign-in"
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: "User email"
 *                     example: "john.doe@example.com"
 *                   password:
 *                     type: string
 *                     description: "User password"
 *                     example: "SecurePass123!"
 *                   csrfToken:
 *                     type: string
 *                     description: "CSRF protection token"
 *                     example: "abc123def456"
 *                 required: ["email", "password", "csrfToken"]
 *               - type: object
 *                 description: "Email sign-in"
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: "User email for magic link"
 *                     example: "john.doe@example.com"
 *                   csrfToken:
 *                     type: string
 *                     description: "CSRF protection token"
 *                     example: "abc123def456"
 *                 required: ["email", "csrfToken"]
 *               - type: object
 *                 description: "Sign-out request"
 *                 properties:
 *                   csrfToken:
 *                     type: string
 *                     description: "CSRF protection token"
 *                     example: "abc123def456"
 *                 required: ["csrfToken"]
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               csrfToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Successful authentication response"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: "Successful sign-in"
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: "Redirect URL after successful authentication"
 *                       example: "/dashboard"
 *                 - type: object
 *                   description: "Email sent confirmation"
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: "Redirect URL to check email page"
 *                       example: "/auth/verify-request"
 *             examples:
 *               successful_signin:
 *                 summary: "Successful credentials sign-in"
 *                 value:
 *                   url: "/dashboard"
 *               email_sent:
 *                 summary: "Magic link email sent"
 *                 value:
 *                   url: "/auth/verify-request"
 *       302:
 *         description: "Redirect response for successful authentication or OAuth flows"
 *       400:
 *         description: "Bad request - Invalid credentials or missing CSRF token"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     invalid_credentials: "Invalid email or password"
 *                     missing_csrf: "CSRF token missing"
 *                     invalid_email: "Invalid email format"
 *       401:
 *         description: "Unauthorized - Authentication failed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Authentication failed"
 *       429:
 *         description: "Too many requests - Rate limit exceeded"
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
export async function POST(req: NextRequest) {
  return handleWithErrorHandling(req, 'POST');
}
