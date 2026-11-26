import { test, expect } from '@playwright/test';
import { postCredentialsCallback, registerClient } from '../../helpers/credentials-callback';
import { TEST_DATA } from '../../helpers/test-data';

/**
 * The per-email sign-in password budget (5 failed attempts per 15 minutes) has to hold at
 * `POST /api/auth/callback/credentials`, not only in the sign-in form's server action.
 *
 * Before T-2839 only `signInAction` (`apps/web/app/[locale]/auth/actions.ts`) spent it. The form
 * calls that action first and then `signIn('credentials', …)`, which posts to the callback and runs
 * `authorize` in `apps/web/lib/auth/credentials.ts`, and `authorize` never touched the budget. So
 * anyone could take a CSRF token from `/api/auth/csrf` and post password guesses straight to the
 * callback, for any account (admins included), with no limit. `authorize` now reserves a slot on
 * the same `signin:<email>` key before it looks the account up, refuses once the budget is spent,
 * and gives the slot back when the password is right.
 *
 * Every test registers its own account, so the per-email budget starts empty and the tests do not
 * use up each other's (or global-setup's) slots. The seeded admin is never used: five wrong
 * passwords would lock it for 15 minutes.
 */

const CLIENT_PASSWORD = TEST_DATA.CLIENT_PASSWORD;
const WRONG_PASSWORD = 'WrongPassword123!';
const AUTH_RATE_LIMIT = 5;

test.describe('API: credentials callback password budget', () => {
	test('five wrong passwords posted to the callback use up the budget, so the right password is refused there too', async ({
		browser,
		playwright,
		baseURL
	}) => {
		test.setTimeout(300_000);
		const email = TEST_DATA.generateClientEmail();
		await registerClient(browser, email);

		// The callback signs the account in with the right password (so a refusal below is the
		// budget, not a broken request), and that correct sign-in does not use a slot up.
		const first = await postCredentialsCallback(playwright, baseURL!, email, CLIENT_PASSWORD);
		expect(first.signedIn, 'the right password, before any wrong one').toBe(true);

		for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
			const wrong = await postCredentialsCallback(playwright, baseURL!, email, WRONG_PASSWORD);
			expect(wrong.signedIn, `wrong password ${attempt} of ${AUTH_RATE_LIMIT}`).toBe(false);
			expect(wrong.error, `wrong password ${attempt} of ${AUTH_RATE_LIMIT} carries an error`).toBeTruthy();
		}

		// The budget is spent, so the callback refuses before it checks the password: even the right
		// one does not get a session while the five failed attempts stand.
		const refused = await postCredentialsCallback(playwright, baseURL!, email, CLIENT_PASSWORD);
		expect(refused.signedIn, 'the right password after five wrong ones').toBe(false);
		expect(refused.error, 'the refused sign-in carries an error').toBeTruthy();

		// The account lookups lowercase and trim the email, so a re-cased, padded spelling reaches the
		// same account; it must not open a fresh budget either.
		const respelled = await postCredentialsCallback(
			playwright,
			baseURL!,
			`  ${email.toUpperCase()} `,
			CLIENT_PASSWORD
		);
		expect(respelled.signedIn, 'the right password under a re-cased, padded spelling of the email').toBe(false);
	});

	test('correct passwords posted to the callback give their slot back, so six in a row all sign in', async ({
		browser,
		playwright,
		baseURL
	}) => {
		test.setTimeout(300_000);
		const email = TEST_DATA.generateClientEmail();
		await registerClient(browser, email);

		// One more than the budget: if a correct password kept its slot, the sixth would be refused.
		for (let attempt = 1; attempt <= AUTH_RATE_LIMIT + 1; attempt++) {
			const result = await postCredentialsCallback(playwright, baseURL!, email, CLIENT_PASSWORD);
			expect(result.signedIn, `correct sign-in ${attempt} of ${AUTH_RATE_LIMIT + 1}`).toBe(true);
			expect(result.error, `correct sign-in ${attempt} of ${AUTH_RATE_LIMIT + 1} carries no error`).toBeNull();
		}
	});
});
