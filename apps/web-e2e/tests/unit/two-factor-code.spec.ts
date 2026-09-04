import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import {
	TWO_FACTOR_CODE_LENGTH,
	constantTimeEqualsHex,
	generateTwoFactorCode,
	hashTwoFactorCode,
	isTwoFactorCodeExpired,
	isTwoFactorLocked,
	isWellFormedTwoFactorCode,
	normalizeTwoFactorCode,
	registerFailedAttempt,
	remainingTwoFactorAttempts,
	twoFactorCodeExpiry,
	twoFactorLockRetryAfterSeconds,
	verifyTwoFactorCodeHash
} from '../../../web/lib/auth/two-factor-code';

/**
 * Unit coverage for the pure half of email two-factor authentication
 * (spec 046 — EW-138 code generation, EW-140 expiry, EW-141 lockout).
 *
 * These import `apps/web/lib/auth/two-factor-code.ts` directly and touch
 * no database, mail provider or browser — the module is deliberately free
 * of those imports so this file can exist. The repo has no Jest/Vitest
 * setup (see CLAUDE.md §4), so the Playwright runner doubles as the unit
 * runner; nothing here uses the `page` fixture.
 *
 * The stateful behaviour built on top of these functions (rotate-on-issue,
 * lock persistence, code consumption) is covered by
 * `tests/auth/two-factor-login.spec.ts` and `tests/api/auth-2fa-routes.spec.ts`.
 */
test.describe('Email 2FA: code generation (EW-138)', () => {
	test('generates a zero-padded 6-digit decimal code', () => {
		for (let i = 0; i < 200; i++) {
			const code = generateTwoFactorCode();
			expect(code).toHaveLength(TWO_FACTOR_CODE_LENGTH);
			expect(code).toMatch(/^[0-9]{6}$/);
		}
	});

	test('does not repeat itself over many draws', () => {
		// A constant or low-entropy generator would collapse this set. 500
		// draws from 1e6 values collide rarely (birthday bound ≈ 12%), so a
		// generous floor still catches a broken generator without flaking.
		const seen = new Set<string>();
		for (let i = 0; i < 500; i++) seen.add(generateTwoFactorCode());
		expect(seen.size).toBeGreaterThan(450);
	});

	test('respects a custom length', () => {
		expect(generateTwoFactorCode(4)).toMatch(/^[0-9]{4}$/);
		expect(generateTwoFactorCode(8)).toMatch(/^[0-9]{8}$/);
	});

	test('hashes to a hex SHA-256 digest that is not the code itself', () => {
		const code = '024680';
		const hash = hashTwoFactorCode(code);

		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hash).not.toContain(code);
		// Same digest the database column is expected to hold.
		expect(hash).toBe(crypto.createHash('sha256').update(code).digest('hex'));
	});

	test('hashing is deterministic and collision-free across neighbouring codes', () => {
		expect(hashTwoFactorCode('123456')).toBe(hashTwoFactorCode('123456'));
		expect(hashTwoFactorCode('123456')).not.toBe(hashTwoFactorCode('123457'));
	});

	test('normalises the separators people paste out of an email', () => {
		expect(normalizeTwoFactorCode(' 123 456 ')).toBe('123456');
		expect(normalizeTwoFactorCode('123-456')).toBe('123456');
		expect(hashTwoFactorCode('123 456')).toBe(hashTwoFactorCode('123456'));
	});

	test('rejects malformed submissions before any hashing', () => {
		expect(isWellFormedTwoFactorCode('123456')).toBe(true);
		expect(isWellFormedTwoFactorCode('12345')).toBe(false);
		expect(isWellFormedTwoFactorCode('1234567')).toBe(false);
		expect(isWellFormedTwoFactorCode('12345a')).toBe(false);
		expect(isWellFormedTwoFactorCode('')).toBe(false);
	});
});

test.describe('Email 2FA: constant-time verification', () => {
	test('accepts the matching code and rejects every near miss', () => {
		const code = generateTwoFactorCode();
		const stored = hashTwoFactorCode(code);

		expect(verifyTwoFactorCodeHash(code, stored)).toBe(true);
		expect(verifyTwoFactorCodeHash(code.split('').reverse().join(''), stored)).toBe(
			code === code.split('').reverse().join('')
		);
		expect(verifyTwoFactorCodeHash('000000', hashTwoFactorCode('000001'))).toBe(false);
	});

	test('never compares plaintext — a wrong-length or non-hex digest is refused', () => {
		expect(constantTimeEqualsHex('abcd', 'abcd')).toBe(true);
		expect(constantTimeEqualsHex('abcd', 'abcde')).toBe(false);
		expect(constantTimeEqualsHex('', '')).toBe(false);
		expect(constantTimeEqualsHex('zzzz', 'zzzz')).toBe(false);
	});

	test('a malformed submission cannot verify even against its own digest', () => {
		// `hashTwoFactorCode('12345')` is a perfectly good digest, but the
		// submitted value is not a well-formed code, so verification refuses
		// it up front rather than admitting a short code.
		expect(verifyTwoFactorCodeHash('12345', hashTwoFactorCode('12345'))).toBe(false);
	});
});

test.describe('Email 2FA: expiry (EW-140)', () => {
	test('expiry is the issue time plus the TTL', () => {
		const issuedAt = new Date('2026-01-01T00:00:00.000Z');
		expect(twoFactorCodeExpiry(issuedAt, 10 * 60 * 1000).toISOString()).toBe('2026-01-01T00:10:00.000Z');
	});

	test('a code inside its window is live and one past it is expired', () => {
		const now = new Date('2026-01-01T00:05:00.000Z');
		expect(isTwoFactorCodeExpired(new Date('2026-01-01T00:10:00.000Z'), now)).toBe(false);
		expect(isTwoFactorCodeExpired(new Date('2026-01-01T00:04:59.000Z'), now)).toBe(true);
	});

	test('expiry is inclusive at the boundary — a code is dead the instant it expires', () => {
		const now = new Date('2026-01-01T00:10:00.000Z');
		expect(isTwoFactorCodeExpired(new Date('2026-01-01T00:10:00.000Z'), now)).toBe(true);
	});

	test('the default TTL is the ten minutes the ticket asks for', () => {
		const issuedAt = new Date();
		const delta = twoFactorCodeExpiry(issuedAt).getTime() - issuedAt.getTime();
		expect(delta).toBe(10 * 60 * 1000);
	});
});

test.describe('Email 2FA: brute-force lockout (EW-141)', () => {
	const now = new Date('2026-01-01T00:00:00.000Z');

	test('the first four failures do not lock the account', () => {
		for (let previous = 0; previous < 4; previous++) {
			const outcome = registerFailedAttempt(previous, now, 5, 15 * 60 * 1000);
			expect(outcome.failedAttempts).toBe(previous + 1);
			expect(outcome.locked).toBe(false);
			expect(outcome.lockedUntil).toBeNull();
		}
	});

	test('the fifth failure locks the account for the lock window', () => {
		const outcome = registerFailedAttempt(4, now, 5, 15 * 60 * 1000);
		expect(outcome.failedAttempts).toBe(5);
		expect(outcome.locked).toBe(true);
		expect(outcome.lockedUntil?.toISOString()).toBe('2026-01-01T00:15:00.000Z');
	});

	test('a corrupt negative counter cannot buy extra attempts', () => {
		expect(registerFailedAttempt(-10, now, 5, 1000).failedAttempts).toBe(1);
	});

	test('a lock in the future blocks and one in the past does not', () => {
		expect(isTwoFactorLocked(new Date('2026-01-01T00:10:00.000Z'), now)).toBe(true);
		expect(isTwoFactorLocked(new Date('2025-12-31T23:59:00.000Z'), now)).toBe(false);
		expect(isTwoFactorLocked(null, now)).toBe(false);
		expect(isTwoFactorLocked(undefined, now)).toBe(false);
	});

	test('reports whole seconds until the lock lifts', () => {
		expect(twoFactorLockRetryAfterSeconds(new Date('2026-01-01T00:00:30.500Z'), now)).toBe(31);
		expect(twoFactorLockRetryAfterSeconds(new Date('2025-12-31T00:00:00.000Z'), now)).toBe(0);
		expect(twoFactorLockRetryAfterSeconds(null, now)).toBe(0);
	});

	test('remaining attempts count down to zero and never below', () => {
		expect(remainingTwoFactorAttempts(0, 5)).toBe(5);
		expect(remainingTwoFactorAttempts(3, 5)).toBe(2);
		expect(remainingTwoFactorAttempts(5, 5)).toBe(0);
		expect(remainingTwoFactorAttempts(9, 5)).toBe(0);
	});
});
