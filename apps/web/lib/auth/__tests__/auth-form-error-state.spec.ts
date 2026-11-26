import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * signInAction and signUp answer a failed submission with an error result that `useActionState`
 * keeps in the browser, and the result travels there in the server action response. They used to
 * build it as `{ error, ...data }`, so the submitted password, the 2FA code and the captcha token
 * went back to the browser with every wrong password or taken email (T-2855).
 * `authFormErrorState` builds that result from the parsed form data and keeps only the fields the
 * form fills in again: email, name and authProvider.
 */
type ErrorStateModule = typeof import('../auth-form-error-state');

async function load(): Promise<ErrorStateModule> {
	try {
		return await import('../auth-form-error-state');
	} catch (error) {
		assert.fail(`lib/auth/auth-form-error-state.ts cannot be loaded: ${(error as Error).message}`);
	}
}

const PASSWORD = 'Sup3r-Secret-Pa55word!';
const CODE = '482913';
const CAPTCHA_TOKEN = 'captcha-token-value-03AFcWeA';

describe('authFormErrorState', () => {
	it('drops the password, the 2FA code and the captcha token of a sign-in submission', async () => {
		const { authFormErrorState } = await load();
		const state = authFormErrorState('INVALID_PASSWORD', {
			email: 'User@Example.com',
			password: PASSWORD,
			authProvider: 'next-auth',
			captchaToken: CAPTCHA_TOKEN,
			code: CODE
		});

		assert.deepEqual(state, { error: 'INVALID_PASSWORD', email: 'User@Example.com', authProvider: 'next-auth' });
		for (const field of ['password', 'code', 'captchaToken']) {
			assert.equal(field in state, false, `the error result still has ${field}`);
		}
	});

	it('keeps the name and the email of a register submission and drops its password and captcha token', async () => {
		const { authFormErrorState } = await load();
		const state = authFormErrorState('EMAIL_ALREADY_REGISTERED', {
			name: 'Duplicate User',
			email: 'taken@example.com',
			password: PASSWORD,
			authProvider: 'next-auth',
			captchaToken: CAPTCHA_TOKEN
		});

		assert.deepEqual(state, {
			error: 'EMAIL_ALREADY_REGISTERED',
			name: 'Duplicate User',
			email: 'taken@example.com',
			authProvider: 'next-auth'
		});
	});

	it('sends none of the secret values to the browser, whatever the field is called', async () => {
		const { authFormErrorState } = await load();
		const state = authFormErrorState('GENERIC_ERROR', {
			email: 'user@example.com',
			password: PASSWORD,
			code: CODE,
			captchaToken: CAPTCHA_TOKEN,
			// A field a later schema might add: only the three listed fields are ever copied.
			confirmPassword: PASSWORD
		});

		const serialized = JSON.stringify(state);
		for (const secret of [PASSWORD, CODE, CAPTCHA_TOKEN]) {
			assert.ok(!serialized.includes(secret), `the error result still carries ${secret}`);
		}
		assert.deepEqual(Object.keys(state).sort(), ['email', 'error']);
	});

	it('leaves out a field the submission did not have instead of sending it as undefined', async () => {
		const { authFormErrorState } = await load();
		const state = authFormErrorState('RATE_LIMITED', {
			email: 'user@example.com',
			password: PASSWORD
		});

		assert.deepEqual(state, { error: 'RATE_LIMITED', email: 'user@example.com' });
		assert.equal('name' in state, false);
		assert.equal('authProvider' in state, false);
	});

	it('copies only string values of the kept fields', async () => {
		const { authFormErrorState } = await load();
		const state = authFormErrorState('GENERIC_ERROR', {
			email: 'user@example.com',
			name: { toString: () => PASSWORD }
		});

		assert.deepEqual(state, { error: 'GENERIC_ERROR', email: 'user@example.com' });
	});
});
