import crypto from 'crypto';

/**
 * Pure, dependency-free primitives behind email two-factor authentication
 * (spec 046 — EW-135 … EW-142).
 *
 * Everything here is deliberately free of database, mail, `next/headers`
 * and session imports so that it can be unit-tested directly (see
 * `apps/web-e2e/tests/unit/two-factor-code.spec.ts`) and imported from
 * both the Node and Edge runtimes. The stateful half — reading and
 * writing `twoFactorCodes` / `client_profiles` — lives in
 * `lib/auth/two-factor.ts`.
 *
 * **The plaintext code is never persisted.** `issueTwoFactorCode` stores
 * only `hashTwoFactorCode(code)`; verification re-hashes the submitted
 * value and compares the two digests with
 * {@link constantTimeEqualsHex}. A database dump therefore yields no
 * usable code, and comparison leaks no timing signal about how many
 * leading characters were right.
 */

/** Number of decimal digits in a generated code. */
export const TWO_FACTOR_CODE_LENGTH = 6;

function readPositiveIntEnv(name: string, fallback: number): number {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = Number(raw);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/**
 * Code lifetime in milliseconds. Ten minutes by default (EW-140);
 * override with `TWO_FACTOR_CODE_TTL_MS`.
 */
export const TWO_FACTOR_CODE_TTL_MS = readPositiveIntEnv('TWO_FACTOR_CODE_TTL_MS', 10 * 60 * 1000);

/**
 * Consecutive failed verifications tolerated before the account is
 * temporarily locked out of code validation. Five by default (EW-141);
 * override with `TWO_FACTOR_MAX_ATTEMPTS`.
 */
export const TWO_FACTOR_MAX_ATTEMPTS = readPositiveIntEnv('TWO_FACTOR_MAX_ATTEMPTS', 5);

/**
 * How long the lockout lasts once the threshold is crossed. Fifteen
 * minutes by default; override with `TWO_FACTOR_LOCK_MS`.
 */
export const TWO_FACTOR_LOCK_MS = readPositiveIntEnv('TWO_FACTOR_LOCK_MS', 15 * 60 * 1000);

/** Minutes of validity, for display in the email and the sign-in UI. */
export const TWO_FACTOR_CODE_TTL_MINUTES = Math.max(1, Math.round(TWO_FACTOR_CODE_TTL_MS / 60_000));

/**
 * Generate a cryptographically random zero-padded decimal code.
 *
 * `crypto.randomInt` is used rather than `Math.random()` (not a CSPRNG)
 * and rather than `randomBytes % 10**n` (which would bias the low
 * digits): `randomInt` rejection-samples internally, so every value in
 * `[0, 10**length)` is equally likely.
 */
export function generateTwoFactorCode(length: number = TWO_FACTOR_CODE_LENGTH): string {
	const max = 10 ** length;
	return String(crypto.randomInt(0, max)).padStart(length, '0');
}

/** Hex SHA-256 of a code. The only representation that reaches the database. */
export function hashTwoFactorCode(code: string): string {
	return crypto.createHash('sha256').update(normalizeTwoFactorCode(code)).digest('hex');
}

/**
 * Strip whitespace (and the separators people paste from an email, e.g.
 * `123 456` or `123-456`) so a visually correct code is not rejected for
 * cosmetic reasons.
 */
export function normalizeTwoFactorCode(code: string): string {
	return code.replace(/[\s-]/g, '');
}

/** `true` when the submitted value is a plausible code, before any DB work. */
export function isWellFormedTwoFactorCode(code: string, length: number = TWO_FACTOR_CODE_LENGTH): boolean {
	const normalized = normalizeTwoFactorCode(code);
	return normalized.length === length && /^[0-9]+$/.test(normalized);
}

/**
 * Constant-time comparison of two hex digests.
 *
 * `crypto.timingSafeEqual` throws when the buffers differ in length, so
 * mismatched lengths are rejected up front — safe here because both
 * operands are always SHA-256 digests of the same width, and a
 * length difference therefore carries no secret.
 */
export function constantTimeEqualsHex(a: string, b: string): boolean {
	if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) {
		return false;
	}
	try {
		return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
	} catch {
		return false;
	}
}

/** Verify a submitted plaintext code against a stored digest, in constant time. */
export function verifyTwoFactorCodeHash(submittedCode: string, storedHash: string): boolean {
	if (!isWellFormedTwoFactorCode(submittedCode)) return false;
	return constantTimeEqualsHex(hashTwoFactorCode(submittedCode), storedHash);
}

/** Expiry instant for a code minted at `issuedAt`. */
export function twoFactorCodeExpiry(issuedAt: Date = new Date(), ttlMs: number = TWO_FACTOR_CODE_TTL_MS): Date {
	return new Date(issuedAt.getTime() + ttlMs);
}

/** `true` once `expires` is in the past relative to `now` (EW-140). */
export function isTwoFactorCodeExpired(expires: Date, now: Date = new Date()): boolean {
	return expires.getTime() <= now.getTime();
}

/** `true` while an account-level lockout is still in force (EW-141). */
export function isTwoFactorLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
	if (!lockedUntil) return false;
	return lockedUntil.getTime() > now.getTime();
}

/** Whole seconds until a lockout lifts; `0` once it has. */
export function twoFactorLockRetryAfterSeconds(lockedUntil: Date | null | undefined, now: Date = new Date()): number {
	if (!isTwoFactorLocked(lockedUntil, now)) return 0;
	return Math.ceil(((lockedUntil as Date).getTime() - now.getTime()) / 1000);
}

/** Outcome of recording one failed verification. */
export interface FailedAttemptOutcome {
	/** Failure count after this attempt. */
	failedAttempts: number;
	/** `true` when this attempt crossed the threshold. */
	locked: boolean;
	/** Lock expiry when `locked`, otherwise `null`. */
	lockedUntil: Date | null;
}

/**
 * Decide what a failed verification does to the brute-force budget.
 *
 * Pure so the threshold behaviour is unit-testable without a database:
 * the caller persists whatever this returns.
 */
export function registerFailedAttempt(
	previousFailedAttempts: number,
	now: Date = new Date(),
	maxAttempts: number = TWO_FACTOR_MAX_ATTEMPTS,
	lockMs: number = TWO_FACTOR_LOCK_MS
): FailedAttemptOutcome {
	const failedAttempts = Math.max(0, previousFailedAttempts) + 1;
	const locked = failedAttempts >= maxAttempts;
	return {
		failedAttempts,
		locked,
		lockedUntil: locked ? new Date(now.getTime() + lockMs) : null
	};
}

/** Attempts left before the next failure locks the account. */
export function remainingTwoFactorAttempts(
	failedAttempts: number,
	maxAttempts: number = TWO_FACTOR_MAX_ATTEMPTS
): number {
	return Math.max(0, maxAttempts - Math.max(0, failedAttempts));
}
