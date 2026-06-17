/**
 * Ad-hoc verification script for the security settings page additions.
 * Run: npx ts-node --project apps/web-e2e/tsconfig.json apps/web-e2e/verify-security.ts
 * OR: npx playwright test --config=verify-security-pw.config.ts
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://localhost:3000';
const EMAIL = `verify-sec-${Date.now()}@test.local`;
const PASSWORD = 'TestClient123!';
const SS_DIR = path.resolve(__dirname, 'test-results/security-verify');

async function run() {
	fs.mkdirSync(SS_DIR, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		executablePath: 'C:/Users/HP/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
	});
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await context.newPage();

	// ── 1. Register a fresh client user ───────────────────────────────────────
	console.log('\n[1] Registering test user:', EMAIL);
	await page.goto(`${BASE}/auth/register`, { timeout: 60_000 });
	await page.locator('#name').fill('Security Test User');
	await page.locator('#email').fill(EMAIL);
	await page.locator('#password').fill(PASSWORD);
	await page.locator('#password').press('Enter');
	await page.waitForURL(/\/client\/dashboard/, { timeout: 90_000, waitUntil: 'domcontentloaded' });
	console.log('   ✅ Registered and redirected to dashboard');
	await page.screenshot({ path: `${SS_DIR}/01-dashboard.png`, fullPage: false });

	// ── 2. Navigate to security page ──────────────────────────────────────────
	console.log('\n[2] Navigating to /client/settings/security');
	await page.goto(`${BASE}/en/client/settings/security`, { timeout: 30_000 });
	await page.waitForLoadState('networkidle');
	await page.screenshot({ path: `${SS_DIR}/02-security-page-initial.png`, fullPage: true });
	console.log('   Screenshot: 02-security-page-initial.png');

	// ── 3. SecurityOverview ───────────────────────────────────────────────────
	console.log('\n[3] Checking SecurityOverview');
	const overviewLocator = page.locator('text=Security overview');
	const overviewVisible = await overviewLocator.isVisible({ timeout: 10_000 }).catch(() => false);
	if (overviewVisible) {
		console.log('   ✅ SecurityOverview rendered');
		const score = await page.locator('text=/\\d\\/4/').first().textContent().catch(() => '?');
		console.log('   Score ring text:', score);
	} else {
		console.log('   ❌ SecurityOverview not found');
	}

	// ── 4. ActiveSessionsCard ─────────────────────────────────────────────────
	console.log('\n[4] Checking ActiveSessionsCard');
	const sessionsHeader = page.locator('text=Active Sessions');
	const sessionsVisible = await sessionsHeader.isVisible({ timeout: 10_000 }).catch(() => false);
	if (sessionsVisible) {
		console.log('   ✅ ActiveSessionsCard rendered');
		const thisDevice = await page.locator('text=This device').isVisible().catch(() => false);
		console.log('   "This device" badge visible:', thisDevice);
		const sessionCount = await page.locator('text=/\\d+ device/').first().textContent().catch(() => '?');
		console.log('   Session count text:', sessionCount);
	} else {
		console.log('   ❌ ActiveSessionsCard not found');
	}
	await page.screenshot({ path: `${SS_DIR}/04-active-sessions.png`, fullPage: true });

	// ── 5. LoginHistoryCard ───────────────────────────────────────────────────
	console.log('\n[5] Checking LoginHistoryCard');
	const historyHeader = page.locator('text=Login History');
	const historyVisible = await historyHeader.isVisible({ timeout: 10_000 }).catch(() => false);
	if (historyVisible) {
		console.log('   ✅ LoginHistoryCard rendered');
		const signedIn = await page.locator('text=Signed in').first().isVisible().catch(() => false);
		console.log('   "Signed in" entry visible:', signedIn);
	} else {
		console.log('   ❌ LoginHistoryCard not found');
	}

	// ── 6. ConnectedAccountsCard ──────────────────────────────────────────────
	console.log('\n[6] Checking ConnectedAccountsCard');
	const connectedHeader = page.locator('text=Connected Accounts');
	const connectedVisible = await connectedHeader.isVisible({ timeout: 10_000 }).catch(() => false);
	if (connectedVisible) {
		console.log('   ✅ ConnectedAccountsCard rendered');
		const noOauth = await page.locator('text=No OAuth providers connected').isVisible().catch(() => false);
		console.log('   "No OAuth providers" (expected for creds-only user):', noOauth);
	} else {
		console.log('   ❌ ConnectedAccountsCard not found');
	}

	// ── 7. SecurityNotificationsCard ─────────────────────────────────────────
	console.log('\n[7] Checking SecurityNotificationsCard');
	const notifHeader = page.locator('text=Security Alerts');
	const notifVisible = await notifHeader.isVisible({ timeout: 10_000 }).catch(() => false);
	if (notifVisible) {
		console.log('   ✅ SecurityNotificationsCard rendered');
		const signinAlert = await page.locator('text=New sign-in alert').isVisible().catch(() => false);
		const pwdChanged = await page.locator('text=Password changed').isVisible().catch(() => false);
		console.log('   "New sign-in alert" row:', signinAlert);
		console.log('   "Password changed" row:', pwdChanged);
	} else {
		console.log('   ❌ SecurityNotificationsCard not found');
	}
	await page.screenshot({ path: `${SS_DIR}/07-full-page.png`, fullPage: true });

	// ── 8. API calls with session cookies ─────────────────────────────────────
	console.log('\n[8] Verifying API responses with live session');
	const cookies = await context.cookies();
	const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

	const endpoints = [
		{ url: `${BASE}/api/auth/security/sessions`, label: 'sessions GET' },
		{ url: `${BASE}/api/auth/security/login-activity?page=1&limit=5`, label: 'login-activity GET' },
		{ url: `${BASE}/api/auth/security/connected-accounts`, label: 'connected-accounts GET' },
		{ url: `${BASE}/api/auth/security/notifications`, label: 'notifications GET' },
		{ url: `${BASE}/api/auth/security/settings`, label: 'settings GET' },
	];

	for (const ep of endpoints) {
		const res = await page.evaluate(async ({ url, cookie }) => {
			const r = await fetch(url, { headers: { Cookie: cookie } });
			const body = await r.json();
			return { status: r.status, body };
		}, { url: ep.url, cookie: cookieHeader });
		const ok = res.status === 200 && res.body.success;
		console.log(`   ${ok ? '✅' : '❌'} ${ep.label} → ${res.status} | success=${res.body.success}`);
		if (!ok) console.log('      body:', JSON.stringify(res.body).slice(0, 200));
		else {
			// Print key data
			if (ep.label === 'sessions GET') {
				const sessions = res.body.data;
				console.log(`      sessions: ${Array.isArray(sessions) ? sessions.length : 'NOT ARRAY: ' + typeof sessions}`);
				if (Array.isArray(sessions) && sessions.length > 0) {
					console.log(`      first session: token=···${sessions[0].token} isCurrent=${sessions[0].isCurrent}`);
				}
			}
			if (ep.label === 'login-activity GET') {
				const d = res.body.data;
				console.log(`      activities: ${d?.activities?.length ?? 'N/A'}, total: ${d?.pagination?.total ?? 'N/A'}`);
			}
			if (ep.label === 'connected-accounts GET') {
				console.log(`      oauth accounts: ${res.body.data?.length ?? 'N/A'}, hasPassword: ${res.body.hasPassword}`);
			}
			if (ep.label === 'notifications GET') {
				const d = res.body.data;
				console.log(`      security_alert: in_app=${d?.security_alert?.in_app}, email=${d?.security_alert?.email}`);
			}
			if (ep.label === 'settings GET') {
				const d = res.body.data;
				console.log(`      twoFactorEnabled=${d?.twoFactorEnabled}, activeSessions=${d?.activeSessionsCount}`);
			}
		}
	}

	// ── 9. Probe: toggle a notification ──────────────────────────────────────
	console.log('\n[9] Probe: PATCH notifications toggle');
	const patchRes = await page.evaluate(async ({ url, cookie }) => {
		const r = await fetch(url, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ security_alert: { email: false } }),
		});
		const body = await r.json();
		return { status: r.status, body };
	}, { url: `${BASE}/api/auth/security/notifications`, cookie: cookieHeader });
	const patchOk = patchRes.status === 200 && patchRes.body.success;
	console.log(`   ${patchOk ? '✅' : '❌'} PATCH notifications → ${patchRes.status}`);
	if (patchOk) {
		console.log(`      security_alert.email after toggle: ${patchRes.body.data?.security_alert?.email}`);
	}

	// ── 10. Probe: revoke non-existent session ────────────────────────────────
	console.log('\n[10] Probe: DELETE session/fakeid (should 404)');
	const delRes = await page.evaluate(async ({ url, cookie }) => {
		const r = await fetch(url, {
			method: 'DELETE',
			headers: { Cookie: cookie },
		});
		const body = await r.json();
		return { status: r.status, body };
	}, { url: `${BASE}/api/auth/security/sessions/fakefakefake`, cookie: cookieHeader });
	console.log(`   ${delRes.status === 404 ? '✅' : '⚠️'} DELETE /sessions/fakefakefake → ${delRes.status} (expected 404)`);

	// ── 11. Probe: disconnect non-existent provider ───────────────────────────
	console.log('\n[11] Probe: DELETE connected-accounts/google (should 400 or 404)');
	const discRes = await page.evaluate(async ({ url, cookie }) => {
		const r = await fetch(url, {
			method: 'DELETE',
			headers: { Cookie: cookie },
		});
		const body = await r.json();
		return { status: r.status, body };
	}, { url: `${BASE}/api/auth/security/connected-accounts/google`, cookie: cookieHeader });
	const discExpected = discRes.status === 404 || discRes.status === 400;
	console.log(`   ${discExpected ? '✅' : '⚠️'} DELETE /connected-accounts/google → ${discRes.status} | ${discRes.body.error}`);

	// ── 12. Probe: PATCH notifications with bad body ──────────────────────────
	console.log('\n[12] Probe: PATCH notifications with invalid body (should 422)');
	const badPatch = await page.evaluate(async ({ url, cookie }) => {
		const r = await fetch(url, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ security_alert: { email: 'not-a-boolean' } }),
		});
		const body = await r.json();
		return { status: r.status, body };
	}, { url: `${BASE}/api/auth/security/notifications`, cookie: cookieHeader });
	console.log(`   ${badPatch.status === 422 ? '✅' : '⚠️'} PATCH bad body → ${badPatch.status} (expected 422)`);

	// ── Final screenshot ──────────────────────────────────────────────────────
	await page.reload({ waitUntil: 'networkidle' });
	await page.screenshot({ path: `${SS_DIR}/12-final.png`, fullPage: true });

	await browser.close();
	console.log(`\nDone. Screenshots in ${SS_DIR}\n`);
}

run().catch((e) => {
	console.error('[VERIFY ERROR]', e);
	process.exit(1);
});
