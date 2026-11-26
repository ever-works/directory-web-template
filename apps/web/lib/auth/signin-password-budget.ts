/**
 * The per-email sign-in password budget: 5 failed attempts (a wrong password or an unknown email)
 * per 15 minutes. A correct password gives its slot back, so it does not count.
 *
 * Both legs of a credentials sign-in spend it, on the same key:
 * - `signInAction` (`app/[locale]/auth/actions.ts`), which pre-checks the password so the form can
 *   show a specific error, and then has the browser call `signIn('credentials', …)`;
 * - the credentials provider's `authorize` (`lib/auth/credentials.ts`), which that call runs at
 *   `POST /api/auth/callback/credentials` and which is the only place a session is minted.
 *
 * Posting straight to the callback skips the action, so the budget has to hold in `authorize` too
 * (T-2839). Each leg reserves a slot with `ratelimit()` before it looks the account up and gives it
 * back with `refundRateLimit()` once the password proves correct, so the normal flow (the action,
 * then the callback) does not count a correct sign-in twice.
 *
 * No imports, so the values can be checked under `tsx --test`.
 */
export const AUTH_RATE_LIMIT = 5;
export const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * The longest email a sign-in accepts: the cap `signInSchema` in `app/[locale]/auth/actions.ts`
 * puts on the form's email. `authorize` reads the email straight from the request body, with no
 * schema in front of it, and every budget key stays in the in-memory limiter for its whole window.
 * It refuses a longer email (or one that is not a string) before building the key, so one request
 * cannot keep megabytes of memory alive for 15 minutes.
 */
export const SIGN_IN_EMAIL_MAX_LENGTH = 255;

/**
 * The budget's key for an email. Lowercased and trimmed the way the account lookups normalize it,
 * so a re-cased or padded spelling of an address reaches the same budget as well as the same account.
 */
export function signInPasswordBudgetKey(email: string): string {
	return `signin:${email.toLowerCase().trim()}`;
}
