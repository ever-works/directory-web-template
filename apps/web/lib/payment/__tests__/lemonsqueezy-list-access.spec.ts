import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveListAccess, type ListAccessChecks } from '../lemonsqueezy-list-access';

/** Run with: `pnpm --filter @ever-works/web test:unit` */
function checks(options: { admin?: boolean; verified?: boolean }) {
	const calls = { admin: 0, verified: 0 };
	const impl: ListAccessChecks = {
		isAdmin: async () => {
			calls.admin++;
			return options.admin ?? false;
		},
		isEmailVerified: async () => {
			calls.verified++;
			return options.verified ?? false;
		}
	};
	return { impl, calls };
}

const user = { id: 'user-1', email: 'me@example.com' };

test('an unverified caller listing their own purchases gets EMAIL_NOT_VERIFIED', async () => {
	for (const requested of [undefined, '', 'me@example.com', ' ME@Example.com ']) {
		const { impl } = checks({ verified: false });
		assert.deepEqual(await resolveListAccess(user, requested, impl), {
			allowed: false,
			reason: 'EMAIL_NOT_VERIFIED'
		});
	}
});

test('a verified caller lists their own purchases under the session email', async () => {
	const { impl } = checks({ verified: true });
	assert.deepEqual(await resolveListAccess(user, undefined, impl), { allowed: true, email: 'me@example.com' });
	assert.deepEqual(await resolveListAccess(user, 'ME@example.com', impl), { allowed: true, email: 'me@example.com' });
});

test('an unverified admin cannot list their own purchases either', async () => {
	const { impl } = checks({ admin: true, verified: false });
	assert.deepEqual(await resolveListAccess(user, undefined, impl), { allowed: false, reason: 'EMAIL_NOT_VERIFIED' });
});

test('a non-admin asking for another email is ACCESS_DENIED, verified or not', async () => {
	for (const verified of [true, false]) {
		const { impl } = checks({ admin: false, verified });
		assert.deepEqual(await resolveListAccess(user, 'victim@example.com', impl), {
			allowed: false,
			reason: 'ACCESS_DENIED'
		});
	}
});

test('a live admin may list another email without their own email being verified', async () => {
	const { impl, calls } = checks({ admin: true, verified: false });
	assert.deepEqual(await resolveListAccess(user, 'victim@example.com', impl), {
		allowed: true,
		email: 'victim@example.com'
	});
	assert.equal(calls.verified, 0);
});

test('a caller without a user id cannot be admin and is never verified', async () => {
	const { impl, calls } = checks({ admin: true, verified: false });
	assert.deepEqual(await resolveListAccess({ email: 'me@example.com' }, 'victim@example.com', impl), {
		allowed: false,
		reason: 'ACCESS_DENIED'
	});
	assert.equal(calls.admin, 0);
	assert.deepEqual(await resolveListAccess({ email: 'me@example.com' }, undefined, impl), {
		allowed: false,
		reason: 'EMAIL_NOT_VERIFIED'
	});
});

test('the admin lookup only runs when another email is requested', async () => {
	const { impl, calls } = checks({ verified: true });
	await resolveListAccess(user, undefined, impl);
	await resolveListAccess(user, 'me@example.com', impl);
	assert.equal(calls.admin, 0);
});
