import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { isGitHubRemote as runtimeIsGitHubRemote } from '../lib/git/site-git-token';

/**
 * The build-time twin of `lib/git/site-git-token.ts` that `scripts/clone.cjs`
 * requires (spec 054). Run with: `pnpm --filter @ever-works/web test:unit`
 */
const requireCjs = createRequire(__filename);
const { resolveSiteGitToken, isGitHubRemote, gitHubOnlyOnAuth } = requireCjs('./site-git-token.cjs') as {
	resolveSiteGitToken: (
		env: Record<string, string | undefined>,
		fetchImpl: (url: string, init: RequestInit) => Promise<Response>
	) => Promise<string>;
	isGitHubRemote: (value: unknown) => boolean;
	gitHubOnlyOnAuth: (token: string) => (remoteUrl?: string) => { username: string; password: string } | undefined;
};

/** Remotes that must never receive the GitHub token (spec 054). */
const NOT_GITHUB = [
	// plain http, even to github.com
	'http://github.com/ever-works/data',
	'HTTP://github.com/ever-works/data',
	// other hosts
	'https://gitlab.com/ever-works/data',
	'https://example.com/ever-works/data',
	'https://api.github.com/ever-works/data',
	'https://www.github.com/ever-works/data',
	// look-alike hosts
	'https://github.com.evil.com/ever-works/data',
	'https://github.com./ever-works/data',
	'https://evil.com/github.com/ever-works/data',
	// userinfo: the host after `@` is the real one
	'https://github.com@evil.com/ever-works/data',
	'https://github.com:443@evil.com/ever-works/data',
	'https://x-access-token:ghp_x@evil.com/ever-works/data',
	// userinfo on github.com itself: the URL already carries a credential
	'https://x-access-token:ghp_x@github.com/ever-works/data',
	'https://evil.com@github.com/ever-works/data',
	// a port other than https's own
	'https://github.com:8443/ever-works/data',
	// not a URL / not a git remote
	'git@github.com:ever-works/data.git',
	'ssh://git@github.com/ever-works/data.git',
	'file:///tmp/github.com/data',
	'github.com/ever-works/data',
	''
];

const GITHUB = [
	'https://github.com/ever-works/data',
	'https://github.com/ever-works/data.git',
	'https://GitHub.com/ever-works/data',
	'https://github.com:443/ever-works/data'
];

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

	it('never sends the site secret to a non-https broker URL', async () => {
		const { fetchImpl, calls } = answering(200, { token: 'ghs_fresh' });
		const env = { ...BROKER_ENV, EVER_WORKS_SITE_GIT_TOKEN_URL: 'http://api.ever.works/api/sites/w/git-token' };
		assert.equal(await resolveSiteGitToken(env, fetchImpl), 'ghs_bootstrap');
		assert.equal(calls.length, 0);
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

describe('build-time clone hands the token to https://github.com only (scripts/site-git-token.cjs)', () => {
	it('isGitHubRemote refuses http, other hosts, look-alikes, userinfo and ports', () => {
		for (const remote of NOT_GITHUB) assert.equal(isGitHubRemote(remote), false, remote);
		assert.equal(isGitHubRemote(undefined), false);
		assert.equal(isGitHubRemote(null), false);
	});

	it('isGitHubRemote accepts https://github.com', () => {
		for (const remote of GITHUB) assert.equal(isGitHubRemote(remote), true, remote);
	});

	it('onAuth answers nothing for a remote that is not https://github.com', () => {
		const onAuth = gitHubOnlyOnAuth('ghs_fresh');
		for (const remote of NOT_GITHUB) assert.equal(onAuth(remote), undefined, remote);
		assert.equal(onAuth(), undefined);
	});

	it('onAuth answers x-access-token + the token for https://github.com', () => {
		assert.deepEqual(gitHubOnlyOnAuth('ghs_fresh')('https://github.com/ever-works/data.git'), {
			username: 'x-access-token',
			password: 'ghs_fresh'
		});
	});

	it('onAuth answers nothing without a token (no pointless retry)', () => {
		assert.equal(gitHubOnlyOnAuth('')('https://github.com/ever-works/data.git'), undefined);
	});

	it('agrees with the runtime check in lib/git/site-git-token.ts', () => {
		for (const remote of [...NOT_GITHUB, ...GITHUB]) {
			assert.equal(isGitHubRemote(remote), runtimeIsGitHubRemote(remote), remote);
		}
	});

	it('refuses hosts only new URL() reads as github.com (percent-encoding, a backslash or ? before @)', () => {
		const onAuth = gitHubOnlyOnAuth('ghs_fresh');
		for (const remote of [
			'https://github%2Ecom/ever-works/data',
			'https://%67ithub.com/ever-works/data',
			'https://github%E3%80%82com/ever-works/data',
			'https://github.com\\@evil.com/ever-works/data',
			'https://github.com?@evil.com/ever-works/data'
		]) {
			assert.equal(isGitHubRemote(remote), false, remote);
			assert.equal(runtimeIsGitHubRemote(remote), false, remote);
			assert.equal(onAuth(remote), undefined, remote);
		}
	});

	it('clone.cjs hands isomorphic-git the GitHub-only onAuth for both the clone and the pull', () => {
		const clone = readFileSync(join(__dirname, 'clone.cjs'), 'utf8').replace(/\s+/g, ' ');
		assert.ok(clone.includes('const onAuth = gitHubOnlyOnAuth(token);'), 'clone.cjs does not build the onAuth');
		assert.ok(clone.includes('pullOptions.onAuth = onAuth;'), 'the pull does not use the GitHub-only onAuth');
		assert.ok(clone.includes('cloneOptions.onAuth = onAuth;'), 'the clone does not use the GitHub-only onAuth');
		assert.equal(/onAuth = \(\) =>/.test(clone), false, 'an onAuth that ignores the remote is still there');
	});
});
