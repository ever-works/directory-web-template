import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { replacesEmailAddress } from '../email-change';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A verification belongs to the address that was verified. Every write that changes
 * `users.email` must clear `users.emailVerified`, or the old verification proves the new
 * address (`isEmailVerifiedForOwnership`). The writers import the database and cannot be
 * loaded under `tsx --test`, so their guards read the source.
 */
const squash = (source: string) => source.replace(/\s+/g, ' ');
const body = (file: string, start: string) => {
	const source = squash(readFileSync(join(__dirname, '..', '..', file), 'utf8'));
	const from = source.indexOf(start);
	assert.ok(from >= 0, `${start} is missing from ${file}`);
	// Up to the next function or method (`async (tx) =>` callbacks inside the body do not match).
	const next = source.slice(from + start.length).search(/ async (function )?\w+\(/);
	return next < 0 ? source.slice(from) : source.slice(from, from + start.length + next);
};

describe('replacesEmailAddress', () => {
	it('is true when the update writes a different address', () => {
		assert.equal(replacesEmailAddress('old@example.com', 'new@example.com'), true);
		assert.equal(replacesEmailAddress(null, 'new@example.com'), true);
		assert.equal(replacesEmailAddress('old@example.com', null), true);
		assert.equal(replacesEmailAddress('old@example.com', ''), true);
	});

	it('ignores case and surrounding spaces, so re-saving the same address keeps the verification', () => {
		assert.equal(replacesEmailAddress('Jane@Example.com', ' jane@example.COM '), false);
		assert.equal(replacesEmailAddress('jane@example.com', 'jane@example.com'), false);
		assert.equal(replacesEmailAddress(null, null), false);
	});

	it('is false when the update does not touch the email', () => {
		assert.equal(replacesEmailAddress('old@example.com', undefined), false);
	});
});

describe('writers of users.email clear emailVerified on a change', () => {
	it('the profile edit (updateUser in user.queries.ts)', () => {
		const update = body('db/queries/user.queries.ts', 'export async function updateUser(');
		assert.ok(update.includes('replacesEmailAddress(current.email, values.email)'));
		assert.ok(update.includes('emailVerified: null'));
	});

	it('the admin user edit (UserDbService.updateUser)', () => {
		const update = body('services/user-db.service.ts', 'async updateUser(');
		assert.ok(
			update.includes('if (current && replacesEmailAddress(current.email, data.email)) userSet.emailVerified = null;'),
			'UserDbService.updateUser keeps emailVerified when an admin changes the address'
		);
		assert.ok(update.includes('.update(users).set(userSet)'), 'UserDbService.updateUser does not write userSet');
		assert.ok(
			update.indexOf('replacesEmailAddress(') < update.indexOf('.update(users).set(userSet)'),
			'the check must run before the users row is written'
		);
	});
});
