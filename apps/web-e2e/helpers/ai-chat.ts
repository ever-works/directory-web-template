import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

/**
 * Helpers for the enabled-state AI chat e2e flows (Spec 023, T-013b).
 *
 * The web app honours an `ai-chat-test-override` cookie only when
 * `E2E_ALLOW_TEST_OVERRIDES=true` AND `NODE_ENV !== production`. The
 * dev / E2E server is started with those env vars by the e2e runner
 * (see `apps/web-e2e/global-setup.ts` / the package script that
 * launches `pnpm dev`).
 *
 * The upstream OpenAI-compatible provider is replaced by the gated
 * test route at `/api/__test__/openai-mock`. Tests need only set
 * the override cookie — the env var pointing the SDK at the mock is
 * provisioned by the e2e launcher.
 */

const OVERRIDE_COOKIE_NAME = 'ai-chat-test-override';
const OVERRIDE_COOKIE_VALUE = process.env.E2E_TEST_OVERRIDE_TOKEN ?? 'enabled';

function originFromBaseUrl(): { domain: string; secure: boolean } {
	const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
	const url = new URL(baseURL);
	return { domain: url.hostname, secure: url.protocol === 'https:' };
}

export async function enableAiChatOverride(context: BrowserContext): Promise<void> {
	const { domain, secure } = originFromBaseUrl();
	await context.addCookies([
		{
			name: OVERRIDE_COOKIE_NAME,
			value: OVERRIDE_COOKIE_VALUE,
			domain,
			path: '/',
			httpOnly: false,
			secure,
			sameSite: 'Lax'
		}
	]);
}

export type ApiOverrideHeaders = Record<string, string>;

export function apiOverrideHeaders(): ApiOverrideHeaders {
	return { cookie: `${OVERRIDE_COOKIE_NAME}=${OVERRIDE_COOKIE_VALUE}` };
}

/**
 * Convenience: opens a page with the override cookie pre-set on the
 * context, then navigates to `path`. Use when you need a one-shot
 * page hookup.
 */
export async function gotoWithAiChat(page: Page, path: string): Promise<void> {
	await enableAiChatOverride(page.context());
	await page.goto(path, { waitUntil: 'domcontentloaded' });
}

/**
 * True when the running test environment has the gates the override
 * relies on. Tests should `test.skip(!aiChatOverrideAvailable(), ...)`
 * so missing infra is a skip, not a flaky failure.
 */
export function aiChatOverrideAvailable(): boolean {
	return process.env.E2E_ALLOW_TEST_OVERRIDES === 'true';
}

export async function apiPostChat(
	request: APIRequestContext,
	body: unknown
): Promise<ReturnType<APIRequestContext['post']>> {
	return request.post('/api/chat', {
		data: body,
		headers: apiOverrideHeaders()
	});
}
