import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect, type Browser, type Page } from '@playwright/test';
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
					outcome = (await error.isVisible())
						? `error: ${((await error.textContent()) ?? '').trim()}`
						: 'pending';
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
});
