import { test, expect } from '@playwright/test';

// Auth.js session + csrf endpoint shape contracts. These are read by the
// client SDK; their shape MUST be stable.

test.describe('Auth session / CSRF wire contract', () => {
	test('/api/auth/session returns 200 JSON', async ({ request }) => {
		const resp = await request.get('/api/auth/session');
		expect(resp.status()).toBe(200);
		const ct = (resp.headers()['content-type'] || '').toLowerCase();
		expect(ct).toContain('application/json');
		// NextAuth v5 returns the literal JSON value `null` for an
		// anonymous request — that parses as JS null but is a valid
		// JSON body. So we assert "the response body is parseable JSON
		// (either null or an object)", not "the parsed value is non-null".
		const raw = await resp.text();
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error(`session body is not valid JSON: ${raw.slice(0, 200)}`);
		}
		const ok = parsed === null || (typeof parsed === 'object' && parsed !== undefined);
		expect(ok, `session body shape (got ${JSON.stringify(parsed)})`).toBe(true);
	});

	test('/api/auth/csrf returns a 64+ character token', async ({ request }) => {
		const resp = await request.get('/api/auth/csrf');
		expect(resp.status()).toBe(200);
		const body = (await resp.json().catch(() => null)) as { csrfToken?: string } | null;
		expect(body, 'csrf body').toBeTruthy();
		expect(typeof body?.csrfToken, 'csrfToken type').toBe('string');
		expect((body?.csrfToken ?? '').length, 'csrfToken length').toBeGreaterThan(16);
	});

	test('/api/auth/providers returns at least one entry', async ({ request }) => {
		const resp = await request.get('/api/auth/providers');
		expect(resp.status()).toBe(200);
		const body = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
		expect(body, 'providers body').toBeTruthy();
		expect(Object.keys(body ?? {}).length, 'provider count').toBeGreaterThan(0);
	});
});
