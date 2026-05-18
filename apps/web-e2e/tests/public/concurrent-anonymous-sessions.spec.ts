import { test, expect } from '@playwright/test';

// Two anonymous browsers should be completely isolated — no session
// crossover, no shared csrf token reuse, no shared favorites local state.
// Catches the entire class of Spec 027-style "server module state leaks
// across requests" regressions.

test.describe('Concurrent anonymous sessions are isolated', () => {
	test('two anonymous contexts hitting /api/auth/session get independent state', async ({
		browser
	}) => {
		const ctxA = await browser.newContext();
		const ctxB = await browser.newContext();

		const respA = await ctxA.request.get('/api/auth/session');
		const respB = await ctxB.request.get('/api/auth/session');
		expect(respA.status()).toBeLessThan(400);
		expect(respB.status()).toBeLessThan(400);

		const bodyA = await respA.json();
		const bodyB = await respB.json();
		// Both should report no session.
		const isAnonA = !bodyA || Object.keys(bodyA).length === 0 || !bodyA.user;
		const isAnonB = !bodyB || Object.keys(bodyB).length === 0 || !bodyB.user;
		expect(isAnonA, 'context A should see no session').toBe(true);
		expect(isAnonB, 'context B should see no session').toBe(true);

		await ctxA.close();
		await ctxB.close();
	});

	test('csrf tokens are per-session (not shared across contexts)', async ({ browser }) => {
		const ctxA = await browser.newContext();
		const ctxB = await browser.newContext();
		const respA = await ctxA.request.get('/api/auth/csrf');
		const respB = await ctxB.request.get('/api/auth/csrf');
		const tokenA = (await respA.json()).csrfToken;
		const tokenB = (await respB.json()).csrfToken;
		expect(tokenA).toBeTruthy();
		expect(tokenB).toBeTruthy();
		// Tokens are randomly generated per CSRF cookie; collision is
		// astronomically unlikely.
		expect(tokenA).not.toBe(tokenB);
		await ctxA.close();
		await ctxB.close();
	});

	test('signing into context A does not affect context B', async ({ browser }) => {
		test.setTimeout(120_000);
		const ctxA = await browser.newContext();
		const ctxB = await browser.newContext();

		// Use the admin credentials available in CI/local. If unavailable, skip.
		const email = process.env.SEED_ADMIN_EMAIL;
		const password = process.env.SEED_ADMIN_PASSWORD;
		if (!email || !password) {
			test.skip(true, 'SEED_ADMIN_* not set');
			return;
		}

		const pageA = await ctxA.newPage();
		await pageA.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		await pageA.locator('#email').fill(email);
		await pageA.locator('#password').fill(password);
		await pageA.locator('#password').press('Enter');
		// Wait for any post-signin transition.
		await pageA.waitForLoadState('domcontentloaded');
		await pageA.waitForTimeout(2000);

		// Now from context B (fresh, no auth), session must still be empty.
		const respB = await ctxB.request.get('/api/auth/session');
		const bodyB = await respB.json();
		const isAnonB = !bodyB || Object.keys(bodyB).length === 0 || !bodyB.user;
		expect(isAnonB, 'context B should remain anonymous').toBe(true);

		await ctxA.close();
		await ctxB.close();
	});
});
