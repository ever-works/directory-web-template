/**
 * The site's credential for ITS OWN data repository.
 *
 * Two sources, in this order:
 *
 * 1. **The platform's site git-token broker**, when both
 *    `EVER_WORKS_SITE_GIT_TOKEN_URL` and `EVER_WORKS_SITE_GIT_TOKEN_SECRET`
 *    are set (Ever Works sets them on deploy). The site POSTs its per-site
 *    secret and gets back a GitHub token narrowed to its one data repo with
 *    Contents: write, valid about one hour. It is cached in memory and
 *    refreshed five minutes before it expires, and once more when GitHub
 *    rejects it (see {@link siteGitAuthCallbacks}).
 * 2. **A static token**: `GH_TOKEN` (or the caller's own fallback). With the
 *    broker on, `GH_TOKEN` is the first token the platform minted at deploy,
 *    so it covers a broker outage for up to an hour after a deploy.
 *
 * The site therefore never needs a long-lived git credential, and a
 * compromised site can reach only its own data repo.
 *
 * No `server-only` import on purpose: `node --test` loads this file
 * directly. It is still server code (it reads secrets from `process.env`).
 */

export const SITE_GIT_TOKEN_URL_ENV = 'EVER_WORKS_SITE_GIT_TOKEN_URL';
export const SITE_GIT_TOKEN_SECRET_ENV = 'EVER_WORKS_SITE_GIT_TOKEN_SECRET';

/** isomorphic-git's username for a GitHub token. */
const GIT_USERNAME = 'x-access-token';
/** Refresh this long before the token's own expiry. */
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000;
/** After a failed broker call, wait this long before calling it again. */
const FAILURE_BACKOFF_MS = 30_000;
const FETCH_TIMEOUT_MS = 10_000;
/** Used when the broker answers without a parseable `expiresAt`. */
const FALLBACK_TTL_MS = 50 * 60_000;

type Env = Record<string, string | undefined>;
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface SiteGitAuth {
	username: string;
	password: string;
}

/** The `onAuth` / `onAuthFailure` pair isomorphic-git accepts on every network call. */
export interface SiteGitAuthCallbacks {
	onAuth: (url?: string) => Promise<SiteGitAuth | undefined>;
	onAuthFailure: (url: string, auth: { password?: string }) => Promise<SiteGitAuth | undefined>;
}

interface CachedToken {
	token: string;
	expiresAtMs: number;
}

let cached: CachedToken | null = null;
let inflight: Promise<string | null> | null = null;
let lastFailureAtMs = 0;

function trimmed(value: string | undefined): string {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * The per-site secret is a bearer, so it only ever goes to an https URL
 * (plain http only for a local platform on localhost / 127.0.0.1). Any other
 * URL means the broker is not configured, and the site keeps `GH_TOKEN`.
 */
export function isSafeBrokerUrl(value: string): boolean {
	try {
		const url = new URL(value);
		const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
		return url.protocol === 'https:' || (local && url.protocol === 'http:');
	} catch {
		return false;
	}
}

let warnedUnsafeUrl = false;

/** Both broker variables are set and the URL is safe to send the secret to. */
export function isSiteGitTokenBrokerConfigured(env: Env = process.env): boolean {
	const url = trimmed(env[SITE_GIT_TOKEN_URL_ENV]);
	if (!url || !trimmed(env[SITE_GIT_TOKEN_SECRET_ENV])) return false;
	if (isSafeBrokerUrl(url)) return true;
	// Say so once: a misconfigured URL otherwise looks like "no broker".
	if (!warnedUnsafeUrl) {
		warnedUnsafeUrl = true;
		console.warn(`[site-git-token] ${SITE_GIT_TOKEN_URL_ENV} is not https; ignoring the broker and using GH_TOKEN`);
	}
	return false;
}

/**
 * Whether the site has ANY way to authenticate to its data repo. Use this
 * where code used to test `process.env.GH_TOKEN`.
 */
export function hasSiteGitCredentials(env: Env = process.env, fallbackToken?: string): boolean {
	return isSiteGitTokenBrokerConfigured(env) || Boolean(trimmed(env.GH_TOKEN)) || Boolean(trimmed(fallbackToken));
}

async function fetchFromBroker(env: Env, fetchImpl: FetchLike): Promise<CachedToken> {
	const url = trimmed(env[SITE_GIT_TOKEN_URL_ENV]);
	const secret = trimmed(env[SITE_GIT_TOKEN_SECRET_ENV]);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetchImpl(url, {
			method: 'POST',
			headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
			signal: controller.signal,
			cache: 'no-store'
		});
		if (!response.ok) {
			throw new Error(`site git token broker answered ${response.status}`);
		}
		const body = (await response.json()) as { token?: unknown; expiresAt?: unknown };
		const token = typeof body.token === 'string' ? body.token.trim() : '';
		if (!token) throw new Error('site git token broker answered without a token');
		const parsed = typeof body.expiresAt === 'string' ? Date.parse(body.expiresAt) : Number.NaN;
		return { token, expiresAtMs: Number.isFinite(parsed) ? parsed : Date.now() + FALLBACK_TTL_MS };
	} finally {
		clearTimeout(timer);
	}
}

function startRefresh(env: Env, fetchImpl: FetchLike): Promise<string | null> {
	const request = fetchFromBroker(env, fetchImpl)
		.then((fresh) => {
			// Two overlapping refreshes (two forced ones racing) must not let the
			// older answer replace a newer cached token.
			if (!cached || fresh.expiresAtMs >= cached.expiresAtMs) cached = fresh;
			if (inflight === request) lastFailureAtMs = 0;
			return fresh.token;
		})
		.catch((error: unknown) => {
			if (inflight === request) lastFailureAtMs = Date.now();
			// Never log the secret or a token; the status is enough.
			console.warn(
				`[site-git-token] broker refresh failed: ${error instanceof Error ? error.message : String(error)}`
			);
			return null;
		})
		.finally(() => {
			if (inflight === request) inflight = null;
		});
	inflight = request;
	return request;
}

/**
 * The token to use right now, or '' when there is none.
 *
 * Broker configured: a cached broker token while it has more than five
 * minutes left, else a fresh one. If the broker fails, a cached token that
 * has not expired yet, else the static token. Without the broker: the static
 * token (`fallbackToken`, else `GH_TOKEN`).
 *
 * `forceRefresh` (GitHub just rejected `rejectedToken`): a cached or
 * in-flight token that is NOT the rejected one is used as is (another request
 * already refreshed); otherwise a new broker call is made, never joined to a
 * call that started before the rejection.
 */
export async function getSiteGitToken(
	options: {
		forceRefresh?: boolean;
		rejectedToken?: string;
		fallbackToken?: string;
		env?: Env;
		fetchImpl?: FetchLike;
	} = {}
): Promise<string> {
	const env = options.env ?? process.env;
	const staticToken = trimmed(options.fallbackToken) || trimmed(env.GH_TOKEN);
	if (!isSiteGitTokenBrokerConfigured(env)) return staticToken;
	const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);

	const now = Date.now();
	if (options.forceRefresh) {
		const rejected = trimmed(options.rejectedToken);
		if (cached && cached.expiresAtMs > now && cached.token !== rejected) return cached.token;
		if (inflight) {
			const joined = await inflight;
			if (joined && joined !== rejected) return joined;
		}
		const fresh = await startRefresh(env, fetchImpl);
		if (fresh) return fresh;
		return cached && cached.expiresAtMs > Date.now() ? cached.token : staticToken;
	}

	if (cached && cached.expiresAtMs - now > REFRESH_BEFORE_EXPIRY_MS) {
		return cached.token;
	}
	// Back off after a failure so a broker outage is not hammered by every
	// request; a forced refresh (GitHub just said 401) still tries.
	if (lastFailureAtMs && now - lastFailureAtMs < FAILURE_BACKOFF_MS) {
		return cached && cached.expiresAtMs > now ? cached.token : staticToken;
	}

	const fresh = await (inflight ?? startRefresh(env, fetchImpl));
	if (fresh) return fresh;
	return cached && cached.expiresAtMs > Date.now() ? cached.token : staticToken;
}

/** Drop the cached broker token (tests, or after the platform rotates the site secret). */
export function resetSiteGitTokenCache(): void {
	cached = null;
	inflight = null;
	lastFailureAtMs = 0;
}

/**
 * The token is a GitHub credential: it is only ever handed to github.com,
 * whatever remote a checkout's config or a caller points a git call at. A
 * missing URL (a direct call, as in the unit tests) is allowed.
 */
function isGitHubRemote(url: string | undefined): boolean {
	// isomorphic-git always passes the remote: a caller that does not is never handed the token
	if (url === undefined) return false;
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'github.com';
	} catch {
		return false;
	}
}

/**
 * `onAuth` / `onAuthFailure` for isomorphic-git. Spread it into a call:
 * `git.push({ ...siteGitAuthCallbacks(token), fs, http, dir })`.
 *
 * `onAuth` resolves the token when GitHub first asks (so a long-running
 * process always presents a current one). `onAuthFailure` runs when GitHub
 * rejected it: it forces ONE broker refresh per git operation and retries only
 * with a different token. Returning nothing stops isomorphic-git's retry loop,
 * which otherwise keeps calling `onAuthFailure`. Neither answers for a remote
 * that is not https://github.com.
 */
export function siteGitAuthCallbacks(
	fallbackToken?: string,
	options: { env?: Env; fetchImpl?: FetchLike } = {}
): SiteGitAuthCallbacks {
	const toAuth = (token: string): SiteGitAuth | undefined =>
		token ? { username: GIT_USERNAME, password: token } : undefined;
	// ONE forced refresh per callbacks object (one git operation). Comparing
	// with the failed token alone is not enough: behind several API replicas
	// each may hand out its own cached token, and retries could bounce
	// between them until the broker's rate limit stops them.
	let refreshed = false;
	return {
		onAuth: async (url) => {
			if (!isGitHubRemote(url)) return undefined;
			return toAuth(await getSiteGitToken({ fallbackToken, ...options }));
		},
		onAuthFailure: async (url, failed) => {
			if (!isGitHubRemote(url)) return undefined;
			if (refreshed || !isSiteGitTokenBrokerConfigured(options.env ?? process.env)) return undefined;
			refreshed = true;
			const fresh = await getSiteGitToken({
				fallbackToken,
				forceRefresh: true,
				rejectedToken: failed?.password,
				...options
			});
			if (!fresh || fresh === failed?.password) return undefined;
			return toAuth(fresh);
		}
	};
}
