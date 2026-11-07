import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
	getSiteGitToken,
	hasSiteGitCredentials,
	isSiteGitTokenBrokerConfigured,
	resetSiteGitTokenCache,
	siteGitAuthCallbacks
} from '../site-git-token';

/**
 * The site's data-repo credential (security audit 2026-11-07, spec 062).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * With the Ever Works site git-token broker configured, the site holds no
 * long-lived git token: it trades its per-site secret for a ~1h token scoped
 * to its own data repo, and falls back to GH_TOKEN (the platform's bootstrap
 * token) only when the broker cannot answer.
 */

const BROKER_ENV = {
	EVER_WORKS_SITE_GIT_TOKEN_URL: 'https://api.ever.works/api/sites/work-1/git-token',
	EVER_WORKS_SITE_GIT_TOKEN_SECRET: 'ewsgt_secret',
	GH_TOKEN: 'ghs_bootstrap'
};

type Call = { url: string; init: RequestInit };

function brokerReturning(...answers: Array<{ status?: number; token?: string; expiresInMs?: number } | Error>) {
	const calls: Call[] = [];
	const fetchImpl = async (url: string, init: RequestInit): Promise<Response> => {
		calls.push({ url, init });
		const answer = answers[Math.min(calls.length - 1, answers.length - 1)];
		if (answer instanceof Error) throw answer;
		const status = answer.status ?? 200;
		return {
			ok: status >= 200 && status < 300,
			status,
			json: async () => ({
				token: answer.token,
				expiresAt: new Date(Date.now() + (answer.expiresInMs ?? 60 * 60_000)).toISOString()
			})
		} as Response;
	};
	return { fetchImpl, calls };
}

describe('site git token', () => {
	afterEach(() => resetSiteGitTokenCache());

	it('CONTROL: without the broker it is GH_TOKEN, and nothing is fetched', async () => {
		const { fetchImpl, calls } = brokerReturning({ token: 'never' });
		const env = { GH_TOKEN: 'ghp_static' };
		assert.equal(isSiteGitTokenBrokerConfigured(env), false);
		assert.equal(await getSiteGitToken({ env, fetchImpl }), 'ghp_static');
		assert.equal(calls.length, 0);
	});

	it("prefers the caller's own static token over GH_TOKEN when there is no broker", async () => {
		const env = { GH_TOKEN: 'ghp_static' };
		assert.equal(await getSiteGitToken({ env, fallbackToken: 'ghp_route' }), 'ghp_route');
	});

	it('needs BOTH broker variables', () => {
		assert.equal(isSiteGitTokenBrokerConfigured({ EVER_WORKS_SITE_GIT_TOKEN_URL: 'https://x' }), false);
		assert.equal(isSiteGitTokenBrokerConfigured({ EVER_WORKS_SITE_GIT_TOKEN_SECRET: 's' }), false);
		assert.equal(isSiteGitTokenBrokerConfigured(BROKER_ENV), true);
	});

	it('counts the broker as credentials even with no GH_TOKEN (bootstrap mint failed)', () => {
		const env = { ...BROKER_ENV, GH_TOKEN: undefined };
		assert.equal(hasSiteGitCredentials(env), true);
		assert.equal(hasSiteGitCredentials({}), false);
		assert.equal(hasSiteGitCredentials({}, 'ghp_route'), true);
	});

	it('POSTs the site secret as a bearer to the broker and returns its token', async () => {
		const { fetchImpl, calls } = brokerReturning({ token: 'ghs_fresh' });
		assert.equal(await getSiteGitToken({ env: BROKER_ENV, fetchImpl }), 'ghs_fresh');
		assert.equal(calls.length, 1);
		assert.equal(calls[0].url, BROKER_ENV.EVER_WORKS_SITE_GIT_TOKEN_URL);
		assert.equal(calls[0].init.method, 'POST');
		assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer ewsgt_secret');
	});

	it('caches the token until five minutes before it expires', async () => {
		const { fetchImpl, calls } = brokerReturning({ token: 'ghs_a' }, { token: 'ghs_b' });
		await getSiteGitToken({ env: BROKER_ENV, fetchImpl });
		assert.equal(await getSiteGitToken({ env: BROKER_ENV, fetchImpl }), 'ghs_a');
		assert.equal(calls.length, 1);
	});

	it('refreshes a token that is about to expire', async () => {
		const { fetchImpl, calls } = brokerReturning({ token: 'ghs_a', expiresInMs: 60_000 }, { token: 'ghs_b' });
		await getSiteGitToken({ env: BROKER_ENV, fetchImpl });
		assert.equal(await getSiteGitToken({ env: BROKER_ENV, fetchImpl }), 'ghs_b');
		assert.equal(calls.length, 2);
	});

	it('falls back to GH_TOKEN when the broker fails and nothing is cached', async () => {
		const { fetchImpl } = brokerReturning({ status: 503 });
		assert.equal(await getSiteGitToken({ env: BROKER_ENV, fetchImpl }), 'ghs_bootstrap');
	});

	it('falls back to GH_TOKEN when the broker is unreachable', async () => {
		const { fetchImpl } = brokerReturning(new Error('ECONNREFUSED'));
		assert.equal(await getSiteGitToken({ env: BROKER_ENV, fetchImpl }), 'ghs_bootstrap');
	});

	it('keeps using a still-valid cached token when a refresh fails', async () => {
		const { fetchImpl } = brokerReturning({ token: 'ghs_a', expiresInMs: 2 * 60_000 }, { status: 502 });
		await getSiteGitToken({ env: BROKER_ENV, fetchImpl });
		assert.equal(await getSiteGitToken({ env: BROKER_ENV, fetchImpl }), 'ghs_a');
	});

	it('backs off after a failure instead of calling the broker on every request', async () => {
		const { fetchImpl, calls } = brokerReturning({ status: 503 });
		await getSiteGitToken({ env: BROKER_ENV, fetchImpl });
		await getSiteGitToken({ env: BROKER_ENV, fetchImpl });
		assert.equal(calls.length, 1);
	});

	it('shares one in-flight broker call between concurrent callers', async () => {
		const { fetchImpl, calls } = brokerReturning({ token: 'ghs_a' });
		const [a, b] = await Promise.all([
			getSiteGitToken({ env: BROKER_ENV, fetchImpl }),
			getSiteGitToken({ env: BROKER_ENV, fetchImpl })
		]);
		assert.equal(a, 'ghs_a');
		assert.equal(b, 'ghs_a');
		assert.equal(calls.length, 1);
	});

	it('refuses a broker answer without a token', async () => {
		const { fetchImpl } = brokerReturning({ token: '' });
		assert.equal(await getSiteGitToken({ env: BROKER_ENV, fetchImpl }), 'ghs_bootstrap');
	});

	it('a forced refresh reuses a newer cached token instead of calling the broker again', async () => {
		// Concurrent 401s on an old token: the first refresh already cached a new one.
		const { fetchImpl, calls } = brokerReturning({ token: 'ghs_a' }, { token: 'ghs_b' });
		await getSiteGitToken({ env: BROKER_ENV, fetchImpl });
		const token = await getSiteGitToken({
			env: BROKER_ENV,
			fetchImpl,
			forceRefresh: true,
			rejectedToken: 'ghs_old'
		});
		assert.equal(token, 'ghs_a');
		assert.equal(calls.length, 1);
	});

	it('a forced refresh never settles for the in-flight answer that GitHub just rejected', async () => {
		const { fetchImpl, calls } = brokerReturning({ token: 'ghs_a' }, { token: 'ghs_b' });
		const [normal, forced] = await Promise.all([
			getSiteGitToken({ env: BROKER_ENV, fetchImpl }),
			getSiteGitToken({ env: BROKER_ENV, fetchImpl, forceRefresh: true, rejectedToken: 'ghs_a' })
		]);
		assert.equal(normal, 'ghs_a');
		assert.equal(forced, 'ghs_b');
		assert.equal(calls.length, 2);
	});

	describe('isomorphic-git callbacks', () => {
		it('never hands the token to a remote other than https://github.com', async () => {
			const { fetchImpl, calls } = brokerReturning({ token: 'ghs_a' });
			const auth = siteGitAuthCallbacks('ghp_static', { env: BROKER_ENV, fetchImpl });
			assert.equal(await auth.onAuth('https://gitlab.com/x/y'), undefined);
			assert.equal(await auth.onAuth('http://github.com/x/y'), undefined);
			assert.equal(await auth.onAuth('https://github.com.evil.example/x/y'), undefined);
			assert.equal(await auth.onAuthFailure('https://gitlab.com/x/y', { password: 'ghs_a' }), undefined);
			assert.equal(calls.length, 0);
			assert.deepEqual(await auth.onAuth('https://github.com/x/y'), {
				username: 'x-access-token',
				password: 'ghs_a'
			});
		});

		it('onAuth answers x-access-token + the current token', async () => {
			const { fetchImpl } = brokerReturning({ token: 'ghs_a' });
			const auth = siteGitAuthCallbacks(undefined, { env: BROKER_ENV, fetchImpl });
			assert.deepEqual(await auth.onAuth(), { username: 'x-access-token', password: 'ghs_a' });
		});

		it('onAuth answers nothing when there is no token at all (no pointless retry)', async () => {
			const auth = siteGitAuthCallbacks(undefined, { env: {} });
			assert.equal(await auth.onAuth(), undefined);
		});

		it('onAuthFailure forces ONE refresh and retries with the new token', async () => {
			const { fetchImpl, calls } = brokerReturning({ token: 'ghs_a' }, { token: 'ghs_b' });
			const auth = siteGitAuthCallbacks(undefined, { env: BROKER_ENV, fetchImpl });
			await auth.onAuth();
			assert.deepEqual(await auth.onAuthFailure('https://github.com/x/y', { password: 'ghs_a' }), {
				username: 'x-access-token',
				password: 'ghs_b'
			});
			assert.equal(calls.length, 2);
		});

		it('onAuthFailure stops when the refresh returns the token that just failed', async () => {
			// isomorphic-git keeps calling onAuthFailure while it returns credentials,
			// so answering the same token again would loop.
			const { fetchImpl } = brokerReturning({ token: 'ghs_a' });
			const auth = siteGitAuthCallbacks(undefined, { env: BROKER_ENV, fetchImpl });
			assert.equal(await auth.onAuthFailure('https://github.com/x/y', { password: 'ghs_a' }), undefined);
		});

		it('onAuthFailure refreshes at most once per git operation (no bouncing between tokens)', async () => {
			const { fetchImpl, calls } = brokerReturning({ token: 'ghs_b' }, { token: 'ghs_c' });
			const auth = siteGitAuthCallbacks(undefined, { env: BROKER_ENV, fetchImpl });
			assert.ok(await auth.onAuthFailure('https://github.com/x/y', { password: 'ghs_a' }));
			assert.equal(await auth.onAuthFailure('https://github.com/x/y', { password: 'ghs_b' }), undefined);
			assert.equal(calls.length, 1);
		});

		it('onAuthFailure never retries without the broker (a static token cannot change)', async () => {
			const auth = siteGitAuthCallbacks('ghp_static', { env: {} });
			assert.equal(await auth.onAuthFailure('https://github.com/x/y', { password: 'ghp_static' }), undefined);
		});
	});
});
