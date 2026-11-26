import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A wrong password on sign-in, or a taken email on register, made signInAction and signUp answer
 * `{ error, ...data }`. The server action result is sent to the browser and kept in
 * `useActionState`, so it carried the plain password, the 2FA code and the captcha token back to
 * the page, where devtools, saved HAR files and any script that reads React state could see them
 * (T-2855). Every error result of the two actions is now built by `authFormErrorState`, which keeps
 * only email, name and authProvider. The actions import NextAuth and the database, which cannot
 * load under `tsx --test`, so this guard reads the source (comments removed, whitespace collapsed).
 */
const source = readFileSync(join(__dirname, '../../../app/[locale]/auth/actions.ts'), 'utf8')
	.replace(/\/\*[\s\S]*?\*\//g, ' ')
	.replace(/(^|\s)\/\/[^\n]*/g, ' ')
	.replace(/\s+/g, ' ');

function body(signature: string, next: string): string {
	const start = source.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found in actions.ts`);
	const end = source.indexOf(next, start);
	assert.ok(end > start, `${next} not found after ${signature} in actions.ts`);
	return source.slice(start, end);
}

const count = (text: string, needle: string) => text.split(needle).length - 1;

describe('sign-in and register error results do not send the password back', () => {
	it('actions.ts imports authFormErrorState', () => {
		assert.ok(
			source.includes("import { authFormErrorState } from '@/lib/auth/auth-form-error-state';"),
			'actions.ts does not import authFormErrorState from lib/auth/auth-form-error-state'
		);
	});

	it('signInAction does not spread the submitted form data into a result', () => {
		const signIn = body('export const signInAction', 'const signInWithProviderSchema');
		assert.ok(
			!signIn.includes('...data'),
			'signInAction still returns ...data, which sends the password, the 2FA code and the captcha token to the browser'
		);
	});

	it('signUp does not spread the submitted form data into a result', () => {
		const signUp = body('export const signUp = ', 'const updatePasswordSchema');
		assert.ok(
			!signUp.includes('...data'),
			'signUp still returns ...data, which sends the password and the captcha token to the browser'
		);
	});

	it('every signInAction error result is built by authFormErrorState, except the two 2FA prompts', () => {
		const signIn = body('export const signInAction', 'const signInWithProviderSchema');
		// RATE_LIMITED (password budget), RATE_LIMITED (code budget), ACCOUNT_NOT_FOUND,
		// INVALID_PASSWORD (admin), INVALID_PASSWORD (client), USE_OAUTH_PROVIDER, GENERIC_ERROR (catch).
		assert.equal(
			count(signIn, 'return authFormErrorState('),
			7,
			'signInAction has an error result not built by authFormErrorState'
		);
		assert.equal(
			count(signIn, 'return { error:'),
			2,
			'signInAction builds an error result by hand outside the 2FA prompts'
		);
		for (let at = signIn.indexOf('return { error:'); at >= 0; at = signIn.indexOf('return { error:', at + 1)) {
			const result = signIn.slice(at, signIn.indexOf('email: normalizedEmail };', at));
			assert.ok(
				result.includes('twoFactorRequired: true'),
				'a hand-built signInAction error result is not a 2FA prompt'
			);
			assert.ok(
				!/\bpassword\b|\bdata\b/.test(result),
				'a 2FA prompt result carries the password or the form data'
			);
		}
	});

	it('every signUp error result is built by authFormErrorState', () => {
		const signUp = body('export const signUp = ', 'const updatePasswordSchema');
		// RATE_LIMITED, EMAIL_ALREADY_REGISTERED, the generic catch.
		assert.equal(
			count(signUp, 'return authFormErrorState('),
			3,
			'signUp has an error result not built by authFormErrorState'
		);
		assert.equal(count(signUp, 'return { error:'), 0, 'signUp builds an error result by hand');
	});
});
