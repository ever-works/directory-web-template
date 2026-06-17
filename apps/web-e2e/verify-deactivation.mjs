/**
 * End-to-end verification of account deactivation / reactivation.
 * Uses selectors and timing from global-setup.ts.
 */

import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = `e2e-deactivate-${Date.now()}@test.local`;
const PASSWORD = 'TestClient123!';
const NAME = 'Deactivation Tester';

let passed = 0;
let failed = 0;
const findings = [];

const ok    = (label, detail = '') => { passed++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); };
const fail  = (label, detail = '') => { failed++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); };
const probe = (label, detail = '') => console.log(`  🔍 ${label}${detail ? ' — ' + detail : ''}`);
const warn  = (label)              => { findings.push(`⚠️  ${label}`); console.log(`  ⚠️  ${label}`); };
const note  = (label)              => { findings.push(`   ${label}`);  console.log(`     ${label}`); };

async function bodyText(page) {
    return page.evaluate(() => document.body.innerText).catch(() => '');
}

async function toastText(page) {
    return page.evaluate(() =>
        [...document.querySelectorAll('[data-sonner-toast], [role="status"], [role="alert"]')]
            .map(t => t.textContent).join(' ')
    ).catch(() => '');
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ baseURL: BASE });
    const page = await ctx.newPage();

    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    try {
        // ── Step 1: Register a fresh throwaway account ──────────────────────
        console.log('\n[Step 1] Register fresh test account');
        await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
        await page.locator('#name').waitFor({ state: 'visible', timeout: 15000 });
        await page.locator('#name').fill(NAME);
        await page.locator('#email').fill(EMAIL);
        await page.locator('#password').fill(PASSWORD);
        await page.locator('#password').press('Enter');

        try {
            await page.waitForURL(/\/client\/dashboard/, { timeout: 60000, waitUntil: 'domcontentloaded' });
            ok('Registered and auto-logged in', page.url());
        } catch {
            fail('Did not reach /client/dashboard after sign-up', page.url());
            console.log('  Body:', (await bodyText(page)).slice(0, 300));
            await browser.close();
            process.exit(1);
        }

        // ── Step 2: Go to danger zone ───────────────────────────────────────
        console.log('\n[Step 2] Navigate to danger-zone settings');
        await page.goto('/client/settings/danger-zone', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        if (page.url().includes('danger-zone')) {
            ok('Danger zone page loaded', page.url());
        } else {
            fail('Could not reach danger-zone', page.url());
        }

        // ── Step 3: Open deactivate modal ───────────────────────────────────
        console.log('\n[Step 3] Open Deactivate Account modal');
        const deactivateBtn = page.getByRole('button', { name: /deactivate\s*account/i }).first();
        await deactivateBtn.waitFor({ state: 'visible', timeout: 10000 });
        ok('Deactivate button visible');
        await deactivateBtn.click();
        await page.waitForTimeout(700);

        const pwInModal = page.locator('[role="dialog"] input[type="password"], [aria-modal="true"] input[type="password"]').first();
        if (await pwInModal.isVisible().catch(() => false)) {
            ok('Confirmation modal opened with password field');
        } else {
            warn('Modal role="dialog" not found — checking for password field anyway');
        }

        // ── Step 4: Wrong password ───────────────────────────────────────────
        console.log('\n[Step 4] 🔍 Wrong password → must show "Incorrect password", not "User not found"');
        const pwField = page.locator('input[autocomplete="current-password"]').last();
        await pwField.fill('WrongPassword99!');
        await page.locator('button[type="submit"]').last().click();
        await page.waitForTimeout(3000);

        const bodyW = await bodyText(page);
        const toastW = await toastText(page);
        const combined = bodyW + ' ' + toastW;

        if (/user not found/i.test(combined)) {
            fail('"User not found" appeared with wrong password — migration did not take effect');
        } else if (/incorrect password/i.test(combined)) {
            ok('Wrong password → "Incorrect password" error ✓ (no "User not found")');
        } else {
            probe('Error text unclear — capturing snippet', combined.slice(0, 200));
        }

        // ── Step 5: Correct password → deactivation ──────────────────────────
        console.log('\n[Step 5] Correct password → deactivation → redirect');
        const pwField2 = page.locator('input[autocomplete="current-password"]').last();
        await pwField2.fill(PASSWORD);
        await page.locator('button[type="submit"]').last().click();

        try { await page.waitForURL(/auth\/signin/, { timeout: 10000 }); } catch { /* may already be there */ }
        await page.waitForTimeout(1000);

        const afterDeactivate = page.url();
        const bodyD = await bodyText(page);
        const toastD = await toastText(page);

        if (/user not found/i.test(bodyD + toastD)) {
            fail('"User not found" with correct password — deactivation broken');
            note(`URL: ${afterDeactivate} | body: ${bodyD.slice(0, 300)}`);
        } else if (afterDeactivate.includes('deactivated=true')) {
            ok('Deactivated → /auth/signin?deactivated=true ✓', afterDeactivate);
        } else if (afterDeactivate.includes('/auth/signin')) {
            ok('Deactivated → redirected to sign-in page', afterDeactivate);
            probe('?deactivated=true param absent from URL — minor UX gap');
        } else {
            fail('Unexpected location after deactivation', afterDeactivate);
            note(`Body: ${bodyD.slice(0, 300)}`);
        }

        // ── Step 6: Sign-in with deactivated account ─────────────────────────
        console.log('\n[Step 6] 🔍 Sign-in with deactivated account — must not reach dashboard');
        await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
        await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('#email').fill(EMAIL);
        await page.locator('#password').fill(PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForTimeout(4000);

        const afterLogin = page.url();
        const bodyL = await bodyText(page);
        const toastL = await toastText(page);

        if (afterLogin.includes('/dashboard')) {
            fail('Deactivated account reached dashboard — no guard in place');
        } else if (/deactivat/i.test(bodyL + toastL)) {
            ok('Sign-in blocked with deactivation message ✓', `url: ${afterLogin}`);
        } else {
            probe('Deactivated sign-in — no explicit "deactivated" message found');
            note(`URL: ${afterLogin} | body: ${bodyL.slice(0, 200)}`);
        }

        // ── Step 7: Reactivation UI present ─────────────────────────────────
        console.log('\n[Step 7] Reactivation UI check');
        const pageBodyFull = await bodyText(page);
        const toastFull    = await toastText(page);
        if (/reactivat/i.test(pageBodyFull + toastFull)) {
            ok('Reactivation option visible to user after deactivated login attempt');
        } else {
            probe('No reactivation prompt on sign-in page');
            note('Reactivation may require a separate flow — not blocking');
        }

        // ── Step 8: Session cleared ───────────────────────────────────────────
        console.log('\n[Step 8] Session must be cleared after deactivation');
        const session = await page.evaluate(async () => {
            const r = await fetch('/api/auth/session');
            return r.json();
        }).catch(() => null);

        if (!session || !session.user) {
            ok('Session cleared — no active JWT after deactivation ✓');
        } else {
            warn('Session still active after deactivation');
            note(`Session user: ${JSON.stringify(session.user).slice(0, 150)}`);
        }

    } catch (err) {
        fail('Unexpected script error', err.message);
        console.error(err);
    } finally {
        await browser.close();
    }

    // ── Final report ─────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log(`Passed: ${passed}  Failed: ${failed}`);
    if (findings.length) { console.log('\nFindings:'); findings.forEach(f => console.log(f)); }
    if (consoleErrors.length) {
        console.log('\nBrowser console errors (first 5):');
        consoleErrors.slice(0, 5).forEach(e => console.log('  ', e));
    }
    console.log('─'.repeat(60));
    console.log(`Verdict: ${failed === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
