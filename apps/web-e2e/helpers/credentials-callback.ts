import { expect, type Browser, type PlaywrightWorkerArgs } from '@playwright/test';
import { TEST_DATA } from './test-data';

/** What one POST to `/api/auth/callback/credentials` came back with. */
export interface CredentialsCallbackResult {
	/** A session cookie was set: the callback signed the email in. */
	signedIn: boolean;
	/** The `error` query parameter of the URL Auth.js answered with, if any. */
	error: string | null;
}

/**
 * Signs in by posting straight to the credentials callback, the way a script would: a CSRF token
 * from `GET /api/auth/csrf`, then `POST /api/auth/callback/credentials` with the email and password.
 * This skips the sign-in server action (and its pre-check) entirely. Each call uses a fresh request
 * context, so no cookie carries over from an earlier call.
 *
 * `X-Auth-Return-Redirect` is the header `next-auth/react`'s `signIn()` sends: Auth.js then answers
 * with JSON `{ url }` instead of a redirect, and a refused sign-in puts `?error=` on that URL.
 */
export async function postCredentialsCallback(
	playwright: PlaywrightWorkerArgs['playwright'],
	baseURL: string,
	email: string,
	password: string
): Promise<CredentialsCallbackResult> {
	const api = await playwright.request.newContext({ baseURL });
	try {
		const csrf = await api.get('/api/auth/csrf');
		expect(csrf.status(), 'GET /api/auth/csrf').toBe(200);
		const { csrfToken } = (await csrf.json()) as { csrfToken: string };
		expect(csrfToken, 'csrfToken').toBeTruthy();

		const response = await api.post('/api/auth/callback/credentials', {
			form: { csrfToken, email, password },
			headers: { 'X-Auth-Return-Redirect': '1' },
			maxRedirects: 0
		});
		expect(response.status(), 'POST /api/auth/callback/credentials').toBeLessThan(500);

		const body = (await response.json().catch(() => null)) as { url?: string } | null;
		const error = body?.url ? new URL(body.url, baseURL).searchParams.get('error') : null;
		const { cookies } = await api.storageState();
		const signedIn = cookies.some((cookie) => cookie.name.includes('session-token') && cookie.value !== '');
		return { signedIn, error };
	} finally {
		await api.dispose();
	}
}

/** Registers a fresh client account through the register form, in its own browser context. */
export async function registerClient(
	browser: Browser,
	email: string,
	password: string = TEST_DATA.CLIENT_PASSWORD
): Promise<void> {
	const context = await browser.newContext();
	try {
		const page = await context.newPage();
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page.locator('#name').fill('E2E Callback Budget Client');
		await page.locator('#email').fill(email);
		await page.locator('#password').fill(password);
		await page.locator('#password').press('Enter');
		await page.waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' });
	} finally {
		await context.close();
	}
}
