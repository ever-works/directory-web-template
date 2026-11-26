import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect, type Page, type Route } from '@playwright/test';
import { registerClient } from '../../helpers/credentials-callback';
import { TEST_DATA } from '../../helpers/test-data';

/**
 * The sign-in form runs in two steps: the `signInAction` server action checks the password, then
 * the browser calls `signIn('credentials', …)`, which posts to `/api/auth/callback/credentials` to
 * set up the session. The callback can still refuse after the action accepted the password (its
 * password budget is spent, the two requests reached different instances, a 2FA code expired in
 * between) or the request can fail. The form then shows SESSION_REFRESH_FAILED and no redirect
 * follows.
 *
 * It used to show that red error next to the green "Login Successful! — Redirecting..." banner and a
 * "Signed in!" submit button, because both read only the action's `success`. Now the error means
 * the sign-in failed: no success banner, the normal "Sign In" label, and the user can submit again.
 * The register form runs the same two steps after `signUp` and gets the same treatment.
 *
 * The error belongs to the submission whose session could not be set up. When the next submission
 * is refused (a wrong password), only its own error shows; the old session error used to stay above
 * it, so the user saw two errors and the stale one pointed at the wrong problem.
 *
 * The callback is made to fail with `page.route`, so the tests do not depend on the rate limiter.
 * Every test uses its own new account, so it does not share a password budget with other specs.
 */

const CLIENT_PASSWORD = TEST_DATA.CLIENT_PASSWORD;
const WRONG_PASSWORD = 'WrongPassword123!';
const DASHBOARD_URL = /\/client\/dashboard/;

// Copy read from the app's English messages, so a wording change does not break the test.
const messages = JSON.parse(readFileSync(path.resolve(__dirname, '../../../web/messages/en.json'), 'utf8')) as {
	auth: Record<string, string>;
	admin: { CREDENTIALS_FORM: Record<string, string> };
};
const credentialsFormMessages = messages.admin.CREDENTIALS_FORM;
const SESSION_REFRESH_FAILED_MESSAGE = credentialsFormMessages.SESSION_REFRESH_FAILED;
const INVALID_PASSWORD_MESSAGE = credentialsFormMessages.INVALID_PASSWORD;
const LOGIN_SUCCESSFUL_MESSAGE = credentialsFormMessages.LOGIN_SUCCESSFUL;
const SIGNED_IN_LABEL = credentialsFormMessages.SIGNED_IN;
const SIGNING_IN_LABEL = credentialsFormMessages.SIGNING_IN;
const SIGN_IN_LABEL = messages.auth.SIGN_IN;
const ACCOUNT_CREATED_MESSAGE = credentialsFormMessages.ACCOUNT_CREATED_SUCCESSFULLY;
const ACCOUNT_CREATED_LABEL = credentialsFormMessages.ACCOUNT_CREATED;
const CREATE_ACCOUNT_LABEL = messages.auth.CREATE_ACCOUNT;

const isCredentialsCallback = (url: URL) => url.pathname === '/api/auth/callback/credentials';
// The sign-in server action posts to the page's own URL.
const isSignInPage = (url: URL) => url.pathname.endsWith('/auth/signin');

/** The request fails (a network error): `signIn` throws. */
const abortCallback = (route: Route) => route.abort('failed');

/**
 * The callback refuses the sign-in: Auth.js answers `signIn`'s X-Auth-Return-Redirect request with a
 * URL carrying `?error=`, which `signIn` hands back as `res.error`.
 */
const refuseCallback = (route: Route) => {
	const url = new URL('/api/auth/signin?error=CredentialsSignin&code=credentials', route.request().url());
	return route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ url: url.href })
	});
};

/** The two ways the callback can fail after the action accepted the password. */
const callbackFailures: { name: string; answer: (route: Route) => Promise<void> }[] = [
	{ name: 'the callback request fails', answer: abortCallback },
	{ name: 'the callback refuses the sign-in', answer: refuseCallback }
];

/** The form's submit button, found by its normal label only ("Sign In", or "Register"). */
function submitButton(page: Page, label: string = SIGN_IN_LABEL) {
	return page
		.locator('form')
		.filter({ has: page.locator('#email') })
		.getByRole('button', { name: label, exact: true });
}

/**
 * Opens a form page and waits until React has hydrated the form. A click on the submit button before
 * then can be lost (a cold page can take a while under `next dev`), so the tests click only once React
 * has attached its props to the form element.
 */
async function openForm(page: Page, formPath: '/auth/signin' | '/auth/register') {
	await page.goto(formPath, { waitUntil: 'domcontentloaded' });
	await page.locator('#email').waitFor({ state: 'visible', timeout: 60_000 });
	await page.waitForFunction(
		() => {
			const form = document.querySelector('#email')?.closest('form');
			return !!form && Object.keys(form).some((key) => key.startsWith('__reactProps$'));
		},
		undefined,
		{ timeout: 60_000 }
	);
}

async function submitSignIn(page: Page, email: string, password: string) {
	await page.locator('#email').fill(email);
	await page.locator('#password').fill(password);
	await submitButton(page).click();
}

test.describe('Auth: sign-in when the session cannot be set up', () => {
	for (const failure of callbackFailures) {
		test(`${failure.name}: the form shows the error, no success, and signs in on the next submit`, async ({
			browser
		}) => {
			test.setTimeout(300_000);
			const email = TEST_DATA.generateClientEmail();
			await registerClient(browser, email);

			const context = await browser.newContext();
			try {
				const page = await context.newPage();
				let callbackPosts = 0;
				await page.route(isCredentialsCallback, async (route) => {
					callbackPosts++;
					await failure.answer(route);
				});

				await openForm(page, '/auth/signin');
				await submitSignIn(page, email, CLIENT_PASSWORD);

				// The action accepted the password; the callback that follows did not set up a session.
				await expect(page.getByText(SESSION_REFRESH_FAILED_MESSAGE)).toBeVisible({ timeout: 120_000 });
				expect(callbackPosts, 'sign-in requests the form sent for one submission').toBe(1);

				// Nothing may claim the sign-in worked.
				await expect(page.getByText(LOGIN_SUCCESSFUL_MESSAGE)).toHaveCount(0);
				await expect(page.getByText(SIGNED_IN_LABEL)).toHaveCount(0);

				// The submit button is back to its normal label and can be used again.
				await expect(submitButton(page)).toBeVisible();
				await expect(submitButton(page)).toBeEnabled();
				expect(new URL(page.url()).pathname).not.toMatch(DASHBOARD_URL);

				// Once the callback works again, submitting again signs in.
				await page.unroute(isCredentialsCallback);
				await submitSignIn(page, email, CLIENT_PASSWORD);
				await page.waitForURL(DASHBOARD_URL, { timeout: 120_000, waitUntil: 'domcontentloaded' });
				expect(callbackPosts, 'the second submission went to the real callback, not the stub').toBe(1);
			} finally {
				await context.close();
			}
		});

		test(`${failure.name}, then a wrong password: only the wrong-password error shows`, async ({ browser }) => {
			test.setTimeout(300_000);
			const email = TEST_DATA.generateClientEmail();
			await registerClient(browser, email);

			const context = await browser.newContext();
			let releaseAction = () => {};
			try {
				const page = await context.newPage();
				await page.route(isCredentialsCallback, (route) => failure.answer(route));

				await openForm(page, '/auth/signin');
				await submitSignIn(page, email, CLIENT_PASSWORD);
				await expect(page.getByText(SESSION_REFRESH_FAILED_MESSAGE)).toBeVisible({ timeout: 120_000 });
				await page.unroute(isCredentialsCallback);

				// Hold the next sign-in action request, to look at the form while that submission is
				// pending: the accepted result is still the current one then, and its session error must
				// stay up rather than give way to the success banner or the "Signed in!" label.
				const actionReleased = new Promise<void>((resolve) => {
					releaseAction = resolve;
				});
				let markActionHeld = () => {};
				const actionHeld = new Promise<void>((resolve) => {
					markActionHeld = resolve;
				});
				await page.route(isSignInPage, async (route) => {
					const request = route.request();
					if (request.method() === 'POST' && request.headers()['next-action']) {
						markActionHeld();
						await actionReleased;
					}
					await route.fallback();
				});

				await submitSignIn(page, email, WRONG_PASSWORD);
				await actionHeld;
				await expect(page.getByText(SIGNING_IN_LABEL)).toBeVisible();
				await expect(page.getByText(LOGIN_SUCCESSFUL_MESSAGE)).toHaveCount(0);
				await expect(page.getByText(SIGNED_IN_LABEL)).toHaveCount(0);
				releaseAction();

				// The action refuses the password. Its error replaces the old one instead of showing below it.
				await expect(page.getByText(INVALID_PASSWORD_MESSAGE)).toBeVisible({ timeout: 120_000 });
				await expect(page.getByText(SESSION_REFRESH_FAILED_MESSAGE)).toHaveCount(0);
				await expect(page.getByText(LOGIN_SUCCESSFUL_MESSAGE)).toHaveCount(0);
				await expect(submitButton(page)).toBeEnabled();
				expect(new URL(page.url()).pathname).not.toMatch(DASHBOARD_URL);
			} finally {
				releaseAction();
				await context.close();
			}
		});
	}

	test('an earlier submission whose session setup fails last does not hide the current session error', async ({
		browser
	}) => {
		test.setTimeout(300_000);
		const email = TEST_DATA.generateClientEmail();
		await registerClient(browser, email);

		const context = await browser.newContext();
		let releaseFirstCallback = () => {};
		try {
			const page = await context.newPage();

			// The first submission's callback is held, so its `signIn` is still pending when the second
			// submission's answer becomes the current result. The second callback fails at once; the
			// first fails only after that.
			const firstCallbackReleased = new Promise<void>((resolve) => {
				releaseFirstCallback = resolve;
			});
			let markFirstCallbackHeld = () => {};
			const firstCallbackHeld = new Promise<void>((resolve) => {
				markFirstCallbackHeld = resolve;
			});
			let callbackPosts = 0;
			await page.route(isCredentialsCallback, async (route) => {
				callbackPosts++;
				if (callbackPosts === 1) {
					markFirstCallbackHeld();
					await firstCallbackReleased;
					await refuseCallback(route);
					return;
				}
				await abortCallback(route);
			});
			// The form logs every failed session setup ("Auto-login failed:" / "Auto-login error:") just
			// before it records it, so the test knows when the first submission's failure has landed.
			const sessionSetupFailures: string[] = [];
			page.on('console', (message) => {
				if (message.type() === 'error' && message.text().includes('Auto-login')) {
					sessionSetupFailures.push(message.text());
				}
			});

			await openForm(page, '/auth/signin');
			await submitSignIn(page, email, CLIENT_PASSWORD);
			await firstCallbackHeld;

			// The submit button does not wait for that `signIn`: it reads "Signed in!" and can be used.
			await page.locator('#email').fill(email);
			await page.locator('#password').fill(CLIENT_PASSWORD);
			await expect(submitButton(page, SIGNED_IN_LABEL)).toBeEnabled();
			await submitButton(page, SIGNED_IN_LABEL).click();

			// The second submission's session setup fails first: its error shows.
			await expect(page.getByText(SESSION_REFRESH_FAILED_MESSAGE)).toBeVisible({ timeout: 120_000 });
			expect(callbackPosts, 'sign-in requests the form sent for two submissions').toBe(2);

			// Now the first submission's session setup fails too. It is no longer the current result,
			// so it must not replace the current error: that left the form with no error for the current
			// result, which it then showed as a success ("Login Successful!", "Signed in!") with no session.
			releaseFirstCallback();
			await expect.poll(() => sessionSetupFailures.length, { timeout: 60_000 }).toBe(2);
			// Let React render whatever that failure changed before looking at the form.
			await page.evaluate(
				() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
			);

			await expect(page.getByText(SESSION_REFRESH_FAILED_MESSAGE)).toBeVisible();
			await expect(page.getByText(LOGIN_SUCCESSFUL_MESSAGE)).toHaveCount(0);
			await expect(page.getByText(SIGNED_IN_LABEL)).toHaveCount(0);
			await expect(submitButton(page)).toBeEnabled();
			expect(new URL(page.url()).pathname).not.toMatch(DASHBOARD_URL);
		} finally {
			releaseFirstCallback();
			await context.close();
		}
	});

	test('registering when the callback request fails: the form shows the error and no success', async ({ page }) => {
		test.setTimeout(300_000);
		let callbackPosts = 0;
		await page.route(isCredentialsCallback, async (route) => {
			callbackPosts++;
			await route.abort('failed');
		});

		await openForm(page, '/auth/register');
		await page.locator('#name').fill('E2E Session Setup Client');
		await page.locator('#email').fill(TEST_DATA.generateClientEmail());
		await page.locator('#password').fill(CLIENT_PASSWORD);
		// Enter, as the other register helpers do: the password tips under the field close when it
		// loses focus, and the layout shift can make a click land beside the button.
		await page.locator('#password').press('Enter');

		await expect(page.getByText(SESSION_REFRESH_FAILED_MESSAGE)).toBeVisible({ timeout: 120_000 });
		expect(callbackPosts, 'sign-in requests the form sent for one submission').toBe(1);

		await expect(page.getByText(ACCOUNT_CREATED_MESSAGE)).toHaveCount(0);
		await expect(page.getByText(ACCOUNT_CREATED_LABEL)).toHaveCount(0);
		await expect(submitButton(page, CREATE_ACCOUNT_LABEL)).toBeVisible();
		await expect(submitButton(page, CREATE_ACCOUNT_LABEL)).toBeEnabled();
		expect(new URL(page.url()).pathname).not.toMatch(DASHBOARD_URL);
	});
});
