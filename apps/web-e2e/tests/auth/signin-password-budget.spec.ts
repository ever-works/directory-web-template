import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { postCredentialsCallback } from '../../helpers/credentials-callback';
import { TEST_DATA } from '../../helpers/test-data';

/**
 * The sign-in action keeps a password budget per email: 5 attempts per 15 minutes
 * (`apps/web/app/[locale]/auth/actions.ts`). It reserves a slot up front for every
 * submission and gives the slot back once the password has proven correct, so the
 * budget counts failed attempts (a wrong password or an unknown email), not sign-ins.
 *
 * Before T-2831 only a submission that carried a 2FA code got its slot back, so five
 * correct sign-ins in one window (sign out and back in, or five people sharing an
 * account) refused the sixth with "Too many attempts".
 *
 * Since T-2839 the credentials callback (`authorize` in `apps/web/lib/auth/credentials.ts`)
 * spends the same budget, so wrong passwords posted straight to
 * `/api/auth/callback/credentials` lock the email too, and the form then shows an error
 * instead of signing in or hanging.
 *
 * Every test registers its own account, so the per-email budget starts empty and the
 * tests do not use up each other's (or global-setup's) slots.
 */

const CLIENT_PASSWORD = TEST_DATA.CLIENT_PASSWORD;
const WRONG_PASSWORD = 'WrongPassword123!';
const AUTH_RATE_LIMIT = 5;
const DASHBOARD_URL = /\/client\/dashboard/;

// The copy the sign-in form shows for each error code, read from the app's English
// messages so a wording change does not break the test.
const credentialsFormMessages = (
	JSON.parse(readFileSync(path.resolve(__dirname, '../../../web/messages/en.json'), 'utf8')) as {
		admin: { CREDENTIALS_FORM: Record<string, string> };
	}
).admin.CREDENTIALS_FORM;
const RATE_LIMITED_MESSAGE = credentialsFormMessages.RATE_LIMITED;
const INVALID_PASSWORD_MESSAGE = credentialsFormMessages.INVALID_PASSWORD;
// What the form shows when the server action accepted the password but the credentials
// callback that follows refused the sign-in.
const SESSION_REFRESH_FAILED_MESSAGE = credentialsFormMessages.SESSION_REFRESH_FAILED;

async function registerClient(browser: Browser, email: string) {
	const context = await browser.newContext();
	try {
		const page = await context.newPage();
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page.locator('#name').fill('E2E Password Budget Client');
		await page.locator('#email').fill(email);
		await page.locator('#password').fill(CLIENT_PASSWORD);
		await page.locator('#password').press('Enter');
		await page.waitForURL(DASHBOARD_URL, { timeout: 120_000, waitUntil: 'domcontentloaded' });
	} finally {
		await context.close();
	}
}

async function submitSignIn(page: Page, email: string, password: string) {
	await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
	await page.locator('#email').waitFor({ state: 'visible', timeout: 60_000 });
	await page.locator('#email').fill(email);
	await page.locator('#password').fill(password);
	await page.getByRole('button', { name: /sign in/i }).click();
}

/** Waits until the submission either reached the dashboard or showed an error, and says which. */
async function signInOutcome(page: Page): Promise<string> {
	let outcome = 'pending';
	await expect
		.poll(
			async () => {
				if (DASHBOARD_URL.test(new URL(page.url()).pathname)) {
					outcome = 'dashboard';
				} else {
					const error = page.getByTestId('auth-error');
					if (await error.isVisible()) {
						outcome = `error: ${((await error.textContent()) ?? '').trim()}`;
					} else if (await page.getByText(SESSION_REFRESH_FAILED_MESSAGE).isVisible()) {
						outcome = `error: ${SESSION_REFRESH_FAILED_MESSAGE}`;
					} else {
						outcome = 'pending';
					}
				}
				return outcome;
			},
			{ timeout: 120_000, intervals: [500] }
		)
		.not.toBe('pending');
	return outcome;
}

test.describe('Auth: sign-in password budget', () => {
	test('six correct sign-ins in one window all reach the dashboard', async ({ browser }) => {
		test.setTimeout(420_000);
		const email = TEST_DATA.generateClientEmail();
		await registerClient(browser, email);

		// One more than the budget. Each sign-in runs in a new browser context, the way
		// six separate visits (or six people sharing one account) would.
		for (let attempt = 1; attempt <= AUTH_RATE_LIMIT + 1; attempt++) {
			const context = await browser.newContext();
			try {
				const page = await context.newPage();
				await submitSignIn(page, email, CLIENT_PASSWORD);
				expect(await signInOutcome(page), `correct sign-in ${attempt} of ${AUTH_RATE_LIMIT + 1}`).toBe(
					'dashboard'
				);
			} finally {
				await context.close();
			}
		}
	});

	test('five wrong passwords use up the budget, so the sixth attempt is refused', async ({ browser }) => {
		test.setTimeout(300_000);
		const email = TEST_DATA.generateClientEmail();
		await registerClient(browser, email);

		const context = await browser.newContext();
		try {
			const page = await context.newPage();

			for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
				await submitSignIn(page, email, WRONG_PASSWORD);
				expect(await signInOutcome(page), `wrong password ${attempt} of ${AUTH_RATE_LIMIT}`).toBe(
					`error: ${INVALID_PASSWORD_MESSAGE}`
				);
			}

			// The sixth attempt is refused before the password is checked, so even the
			// right password does not get through while the failed attempts stand.
			await submitSignIn(page, email, CLIENT_PASSWORD);
			expect(await signInOutcome(page), 'sixth attempt, with the right password').toBe(
				`error: ${RATE_LIMITED_MESSAGE}`
			);
			expect(new URL(page.url()).pathname).not.toMatch(DASHBOARD_URL);
		} finally {
			await context.close();
		}
	});

	test('five wrong passwords posted straight to the callback make the form show an error', async ({
		browser,
		playwright,
		baseURL
	}) => {
		test.setTimeout(300_000);
		const email = TEST_DATA.generateClientEmail();
		await registerClient(browser, email);

		// The form is skipped: the wrong passwords go straight to the credentials callback, the
		// way a script would send them (T-2839).
		for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
			const wrong = await postCredentialsCallback(playwright, baseURL!, email, WRONG_PASSWORD);
			expect(wrong.signedIn, `wrong password ${attempt} of ${AUTH_RATE_LIMIT}, posted to the callback`).toBe(
				false
			);
		}

		const context = await browser.newContext();
		try {
			const page = await context.newPage();
			let callbackPosts = 0;
			page.on('request', (request) => {
				if (
					request.method() === 'POST' &&
					new URL(request.url()).pathname === '/api/auth/callback/credentials'
				) {
					callbackPosts++;
				}
			});

			await submitSignIn(page, email, CLIENT_PASSWORD);
			// Where the server action and the route handler load one copy of the in-memory limiter,
			// the action refuses with the rate-limit error. Where each loads its own (as `next dev`
			// does), the action passes and the callback refuses, and the form says the session
			// could not be set up. Either way the form must show an error and stay off the dashboard.
			const outcome = await signInOutcome(page);
			expect([`error: ${RATE_LIMITED_MESSAGE}`, `error: ${SESSION_REFRESH_FAILED_MESSAGE}`]).toContain(outcome);

			// And it must not retry by itself. After a refused callback the form used to re-arm its
			// auto-login, and its identity-unstable effect dependencies fired it again at once, so it
			// posted to the callback in a loop while the error flickered. Nothing else can show that
			// no further request is sent, so this waits a fixed time.
			await page.waitForTimeout(5_000);
			expect(callbackPosts, 'sign-in requests the form sent for one submission').toBeLessThanOrEqual(1);
			expect(await signInOutcome(page), 'the error is still shown').toBe(outcome);
			expect(new URL(page.url()).pathname).not.toMatch(DASHBOARD_URL);

			if (outcome === `error: ${SESSION_REFRESH_FAILED_MESSAGE}`) {
				// Submitting again is a new action result, so the form tries the callback once more
				// (and is refused again), then stops. The action accepted the password, so the submit
				// button reads "Signed in!" next to the error; it stays enabled.
				await page.locator('#email').fill(email);
				await page.locator('#password').fill(CLIENT_PASSWORD);
				await page.getByRole('button', { name: /sign(ed)? in/i }).click();
				await expect.poll(() => callbackPosts, { timeout: 60_000 }).toBe(2);
				await page.waitForTimeout(3_000);
				expect(callbackPosts, 'sign-in requests after the second submission').toBe(2);
				expect(new URL(page.url()).pathname).not.toMatch(DASHBOARD_URL);
			}
		} finally {
			await context.close();
		}
	});
});
