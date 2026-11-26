import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The per-email sign-in password budget (5 failed attempts per 15 minutes) used to live only in
 * signInAction. That action pre-checks the password for the form and then hands over to
 * `signIn('credentials', …)`, which POSTs to /api/auth/callback/credentials and runs the
 * credentials provider's `authorize`. Nothing in `authorize` touched the budget, so anyone could
 * fetch a CSRF token from /api/auth/csrf and post password guesses straight to the callback, for any
 * account (admins included), with no limit (T-2839).
 *
 * `authorize` now reserves a slot on the same key, with the same limit and window, before any
 * account lookup or password check, refuses with RATE_LIMITED once the budget is spent, and gives the
 * slot back only once the password proves correct (so the normal flow, the action and then the
 * callback, does not count a correct sign-in twice).
 *
 * `credentials.ts` loads the database queries and NextAuth, and the action loads NextAuth too, so
 * neither can load under `tsx --test`; their wiring is checked in the source (comments removed,
 * whitespace collapsed). The shared budget module has no imports, so it is loaded for real.
 */
const read = (relative: string) =>
	readFileSync(join(__dirname, relative), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|\s)\/\/[^\n]*/g, ' ')
		.replace(/\s+/g, ' ');

const credentials = read('../credentials.ts');
const authorizeStart = credentials.indexOf('authorize: async (credentials) => {');
const authorize = authorizeStart >= 0 ? credentials.slice(authorizeStart) : '';

const form = read('../../../app/[locale]/auth/components/credentials-form.tsx');

const actions = read('../../../app/[locale]/auth/actions.ts');
const actionStart = actions.indexOf('export const signInAction');
const action = actions.slice(actionStart, actions.indexOf('const signInWithProviderSchema', actionStart));

type BudgetModule = typeof import('../signin-password-budget');

async function loadBudget(): Promise<BudgetModule> {
	try {
		return await import('../signin-password-budget');
	} catch (error) {
		assert.fail(`lib/auth/signin-password-budget.ts cannot be loaded: ${(error as Error).message}`);
	}
}

describe('the shared sign-in password budget', () => {
	it('allows 5 failed attempts per 15 minutes', async () => {
		const budget = await loadBudget();
		assert.equal(budget.AUTH_RATE_LIMIT, 5);
		assert.equal(budget.AUTH_RATE_WINDOW_MS, 15 * 60 * 1000);
	});

	it('keys every spelling of an email to one budget', async () => {
		const { signInPasswordBudgetKey } = await loadBudget();
		assert.equal(signInPasswordBudgetKey('user@example.com'), 'signin:user@example.com');
		// The account lookups lowercase and trim the email, so a padded or re-cased spelling reaches
		// the same account and must not open a fresh budget.
		assert.equal(signInPasswordBudgetKey('  User@Example.COM \t'), 'signin:user@example.com');
	});

	it('is what signInAction uses, instead of a key and limits of its own', () => {
		assert.ok(actionStart >= 0, 'signInAction not found');
		assert.ok(
			actions.includes(
				"import { AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, signInPasswordBudgetKey } from '@/lib/auth/signin-password-budget';"
			),
			'actions.ts does not import the shared budget'
		);
		assert.ok(
			!/const AUTH_RATE_LIMIT\b|const AUTH_RATE_WINDOW_MS\b/.test(actions),
			'actions.ts still declares its own budget constants'
		);
		assert.ok(
			action.includes('const passwordBudgetKey = signInPasswordBudgetKey(email);'),
			'signInAction does not build its key with signInPasswordBudgetKey'
		);
		assert.ok(!action.includes('`signin:'), 'signInAction still builds the signin: key by hand');
	});
});

describe('authorize spends the sign-in password budget', () => {
	it('imports the shared budget and the limiter', () => {
		assert.ok(authorizeStart >= 0, 'authorize not found in lib/auth/credentials.ts');
		assert.ok(
			credentials.includes(
				"import { AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, SIGN_IN_EMAIL_MAX_LENGTH, signInPasswordBudgetKey } from './signin-password-budget';"
			),
			'credentials.ts does not import the shared budget'
		);
		assert.ok(
			credentials.includes("import { ratelimit, refundRateLimit } from '../utils/rate-limit';"),
			'credentials.ts does not import ratelimit and refundRateLimit'
		);
	});

	it('reserves a slot on the same key before any account lookup or password check', () => {
		const key = authorize.indexOf('const passwordBudgetKey = signInPasswordBudgetKey(email);');
		assert.ok(key >= 0, 'authorize does not build the budget key with signInPasswordBudgetKey(email)');
		const reserve = authorize.indexOf(
			'const passwordGate = await ratelimit(passwordBudgetKey, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS);'
		);
		assert.ok(reserve > key, 'authorize does not reserve a slot with ratelimit() on that key');

		for (const check of [
			'getUserByEmail(',
			'isUserAdmin(',
			'comparePasswords(',
			'getClientAccountByEmail(',
			'verifyClientPasswordForSignIn('
		]) {
			const at = authorize.indexOf(check);
			assert.ok(at >= 0, `${check} not found in authorize`);
			assert.ok(at > reserve, `${check} runs before the password slot is reserved`);
		}
	});

	it('refuses an email that is not a string or is longer than the form allows, before it becomes a key', async () => {
		// The limiter keeps every key for its 15-minute window, and the callback's email comes
		// straight from the request body: an unbounded one let each request keep megabytes alive.
		const { SIGN_IN_EMAIL_MAX_LENGTH } = await loadBudget();
		assert.equal(SIGN_IN_EMAIL_MAX_LENGTH, 255, 'the cap is not the 255 characters signInSchema allows');
		assert.ok(
			/email: z\.string\(\)\.email\(\)\.min\(3\)\.max\(255\)/.test(actions),
			"signInSchema's email cap changed; keep SIGN_IN_EMAIL_MAX_LENGTH in step with it"
		);
		const guard = authorize.indexOf(
			"if (typeof credentials.email !== 'string' || credentials.email.length > SIGN_IN_EMAIL_MAX_LENGTH) { throw new Error(AuthErrorCode.ACCOUNT_NOT_FOUND); }"
		);
		assert.ok(guard >= 0, 'authorize does not refuse a non-string or over-long email');
		assert.ok(
			guard < authorize.indexOf('signInPasswordBudgetKey(email)'),
			'the email becomes a budget key before its length is checked'
		);
		assert.ok(!authorize.includes('credentials.email as string'), 'authorize still casts the email unchecked');
	});

	it('refuses with RATE_LIMITED once the budget is spent', () => {
		const reserve = authorize.indexOf('const passwordGate = await ratelimit(');
		assert.ok(reserve >= 0, 'authorize does not reserve a password slot');
		const refused = authorize.indexOf(
			'if (!passwordGate.success) { throw new Error(AuthErrorCode.RATE_LIMITED); }',
			reserve
		);
		assert.ok(refused > reserve, 'a spent budget does not throw RATE_LIMITED');
		assert.ok(
			authorize.indexOf('getUserByEmail(') > refused,
			'the account is looked up before a spent budget is refused'
		);
	});

	it('gives the slot back only after a correct password, on the admin and the client path', () => {
		const definition = authorize.indexOf('const releasePasswordReservation = () =>');
		assert.ok(definition >= 0, 'releasePasswordReservation not found in authorize');
		const body = authorize.slice(definition, authorize.indexOf('};', definition) + 2);
		assert.ok(
			body.includes('refundRateLimit(passwordBudgetKey, passwordGate.resetTime)'),
			'the slot is not refunded to the window that reserved it'
		);
		assert.ok(!body.includes('if ('), 'the refund depends on something other than the password check');

		assert.ok(
			authorize.includes(
				'const isPasswordValid = await comparePasswords(password, foundUser.passwordHash); if (isPasswordValid) { releasePasswordReservation();'
			),
			'the admin path does not give the slot back as soon as the password matched'
		);
		assert.ok(
			authorize.includes(
				'const clientPassword = await verifyClientPasswordForSignIn(email, password); if (clientPassword.valid) { releasePasswordReservation();'
			),
			'the client path does not give the slot back as soon as the password matched'
		);
		assert.equal(
			authorize.split('releasePasswordReservation();').length - 1,
			2,
			'releasePasswordReservation() is called somewhere other than after the two correct-password checks'
		);
		assert.equal(
			authorize.split('refundRateLimit(').length - 1,
			1,
			'authorize refunds the budget outside releasePasswordReservation (a wrong password or an unknown email must keep its slot)'
		);
	});
});

describe('the sign-in form after a refused callback', () => {
	// When the callback refuses (its budget is spent while the action's copy of the limiter is not),
	// the form shows SESSION_REFRESH_FAILED. It used to reset its once-only auto-login guard there,
	// and the effect's identity-unstable dependencies fired signIn again at once: the form posted to
	// the callback in a loop (66 requests in about six seconds in `next dev`).
	it('fires the auto-login once per action result and does not re-arm it after a failure', () => {
		assert.ok(
			form.includes('const autoLoginFiredRef = useRef<ActionState | null>(null);'),
			'the auto-login guard is not keyed on the action result'
		);
		assert.ok(
			form.includes('if (autoLoginFiredRef.current === state) return; autoLoginFiredRef.current = state;'),
			'the auto-login does not fire once per action result'
		);
		assert.ok(!form.includes('autoLoginFiredRef.current = false'), 'a failed auto-login still re-arms the guard');
		assert.ok(
			/\}, \[ state, state\.success,/.test(form),
			'the effect does not re-run for a new action result with the same fields'
		);
	});
});
