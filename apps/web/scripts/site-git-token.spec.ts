import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

/**
 * The build-time twin of `lib/git/site-git-token.ts` that `scripts/clone.cjs`
 * requires (spec 054). Run with: `pnpm --filter @ever-works/web test:unit`
 */
const requireCjs = createRequire(__filename);
const { resolveSiteGitToken } = requireCjs('./site-git-token.cjs') as {
	resolveSiteGitToken: (
		env: Record<string, string | undefined>,
		fetchImpl: (url: string, init: RequestInit) => Promise<Response>
	) => Promise<string>;
};

const BROKER_ENV = {
	EVER_WORKS_SITE_GIT_TOKEN_URL: 'https://api.ever.works/api/sites/work-1/git-token',
	EVER_WORKS_SITE_GIT_TOKEN_SECRET: 'ewsgt_secret',
	GH_TOKEN: 'ghs_bootstrap'
};

const answering = (status: number, body: unknown) => {
	const calls: Array<{ url: string; init: RequestInit }> = [];
	const fetchImpl = async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
	};
	return { fetchImpl, calls };
};

describe('build-time site git token (scripts/site-git-token.cjs)', () => {
	it('CONTROL: without the broker it is GH_TOKEN, and nothing is fetched', async () => {
		const { fetchImpl, calls } = answering(200, { token: 'never' });
		assert.equal(await resolveSiteGitToken({ GH_TOKEN: 'ghp_static' }, fetchImpl), 'ghp_static');
		assert.equal(calls.length, 0);
	});

	it('POSTs the site secret as a bearer and uses the broker token', async () => {
		const { fetchImpl, calls } = answering(200, { token: 'ghs_fresh' });
		assert.equal(await resolveSiteGitToken(BROKER_ENV, fetchImpl), 'ghs_fresh');
		assert.equal(calls[0].url, BROKER_ENV.EVER_WORKS_SITE_GIT_TOKEN_URL);
		assert.equal(calls[0].init.method, 'POST');
		assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer ewsgt_secret');
	});

	it('falls back to GH_TOKEN on a broker error status', async () => {
		const { fetchImpl } = answering(503, {});
		assert.equal(await resolveSiteGitToken(BROKER_ENV, fetchImpl), 'ghs_bootstrap');
	});

	it('falls back to GH_TOKEN on an answer without a token', async () => {
		const { fetchImpl } = answering(200, { token: '' });
		assert.equal(await resolveSiteGitToken(BROKER_ENV, fetchImpl), 'ghs_bootstrap');
	});

	it('falls back to GH_TOKEN when the broker is unreachable', async () => {
		const fetchImpl = async () => {
			throw new Error('ECONNREFUSED');
		};
		assert.equal(await resolveSiteGitToken(BROKER_ENV, fetchImpl), 'ghs_bootstrap');
	});
});
