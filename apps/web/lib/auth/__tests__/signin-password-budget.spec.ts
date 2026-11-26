import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * signInAction keeps a password budget per email (5 attempts per 15 minutes). It reserves a slot
 * up front for every submission and used to give it back only when the submission carried a 2FA
 * code, so every correct sign-in without a code kept its slot and the sixth correct sign-in in a
 * window was refused with RATE_LIMITED (T-2831). The slot now comes back once the password has
 * proven correct, on the admin and the client path; a wrong password or an unknown email keeps it.
 * The action imports NextAuth and the database, which cannot load under `tsx --test`, so this guard
 * reads the source (comments removed, whitespace collapsed).
 */
const source = readFileSync(join(__dirname, '../../../app/[locale]/auth/actions.ts'), 'utf8')
	.replace(/\/\*[\s\S]*?\*\//g, ' ')
	.replace(/(^|\s)\/\/[^\n]*/g, ' ')
	.replace(/\s+/g, ' ');

const start = source.indexOf('export const signInAction');
const action = source.slice(start, source.indexOf('const signInWithProviderSchema', start));

describe('sign-in password budget wiring', () => {
	it('reserves a password slot before the account is looked up', () => {
		assert.ok(start >= 0, 'signInAction not found');
		const reserve = action.indexOf(
			'const passwordGate = await ratelimit(passwordBudgetKey, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS);'
		);
		assert.ok(reserve >= 0, 'the password slot is not reserved with ratelimit()');
		const refused = action.indexOf(
			'if (!passwordGate.success) { return { error: AuthErrorCode.RATE_LIMITED, ...data }; }',
			reserve
		);
		assert.ok(refused > reserve, 'a spent budget does not answer RATE_LIMITED');
		assert.ok(
			action.indexOf('await getUserByEmail(normalizedEmail)') > refused,
			'the account is looked up before the budget is checked'
		);
	});

	it('gives the slot back for every correct password, with or without a code', () => {
		const definition = action.indexOf('const releasePasswordReservation = () =>');
		assert.ok(definition >= 0, 'releasePasswordReservation not found');
		const body = action.slice(definition, action.indexOf('const normalizedEmail', definition));
		assert.ok(
			body.includes('refundRateLimit(passwordBudgetKey, passwordGate.resetTime)'),
			'the slot is not refunded to the window that reserved it'
		);
		assert.ok(
			!body.includes('submittedCode') && !body.includes('if ('),
			'the refund still depends on the submission (only code-carrying submissions get the slot back)'
		);
	});

	it('gives it back on the admin and the client path only after the password matched', () => {
		const invalid = 'if (!isValid) { return { error: AuthErrorCode.INVALID_PASSWORD, ...data }; }';
		assert.ok(
			action.includes(
				`const isValid = await comparePasswords(password, foundUser.passwordHash); ${invalid} releasePasswordReservation();`
			),
			'the admin path does not give the slot back after a correct password'
		);
		assert.ok(
			action.includes(
				`const isValid = await verifyClientPassword(email, password); ${invalid} releasePasswordReservation();`
			),
			'the client path does not give the slot back after a correct password'
		);
		assert.equal(
			action.split('releasePasswordReservation();').length - 1,
			2,
			'releasePasswordReservation() is called somewhere other than after the two password checks'
		);
	});
});
