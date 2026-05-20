import { chromium, type FullConfig } from '@playwright/test';
import { createInterface } from 'readline/promises';
import path from 'path';
import fs from 'fs';
import {
	TEST_DATA,
	ADMIN_STATE_FILE,
	CLIENT_STATE_FILE,
	AUTH_STATE_DIR,
	REQUIRED_ENV_VARS,
} from './helpers/test-data';

async function promptForMissingEnv(): Promise<void> {
	const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
	if (missing.length === 0) return;

	if (process.env.CI) {
		throw new Error(`Missing required environment variables in CI: ${missing.join(', ')}`);
	}

	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		for (const name of missing) {
			const answer = await rl.question(`[global-setup] Enter ${name}: `);
			if (!answer.trim()) {
				throw new Error(`${name} cannot be empty`);
			}
			process.env[name] = answer.trim();
		}
	} finally {
		rl.close();
	}
}

async function globalSetup(config: FullConfig) {
	await promptForMissingEnv();

	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

	const authStatesDir = path.resolve(__dirname, AUTH_STATE_DIR);
	if (!fs.existsSync(authStatesDir)) {
		fs.mkdirSync(authStatesDir, { recursive: true });
	}

	const adminStatePath = path.resolve(__dirname, ADMIN_STATE_FILE);
	const clientStatePath = path.resolve(__dirname, CLIENT_STATE_FILE);

	const browser = await chromium.launch();

	// Generate admin auth state
	let adminContext;
	let adminPage;
	try {
		adminContext = await browser.newContext();
		adminPage = await adminContext.newPage();

		await adminPage.goto(`${baseURL}/auth/signin`, { timeout: 60_000 });
		// Wait for the form to actually render. The signin form is gated on
		// `config.auth.credentials` (loaded from .content/.works/works.yml).
		// If that file is missing the form never appears — surface that as a
		// clear error here instead of as an opaque locator timeout below.
		await adminPage.locator('#email').waitFor({ state: 'visible', timeout: 30_000 });
		await adminPage.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await adminPage.locator('#password').fill(TEST_DATA.ADMIN_PASSWORD);
		await adminPage.getByRole('button', { name: /sign in/i }).click();
		await adminPage.waitForURL(/\/(admin|client\/dashboard)/, { timeout: 60_000 });

		await adminContext.storageState({ path: adminStatePath });
		await adminPage.close();
		await adminContext.close();
		console.log('[global-setup] Admin auth state saved');
	} catch (error) {
		// Capture diagnostics before tearing down so CI artifacts include
		// enough context to debug (URL, page snippet, screenshot).
		if (adminPage) {
			try {
				const diagDir = path.resolve(__dirname, 'test-results');
				if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
				await adminPage
					.screenshot({ path: path.join(diagDir, 'global-setup-admin-failure.png'), fullPage: true })
					.catch(() => undefined);
				const url = adminPage.url();
				const bodySnippet = await adminPage
					.locator('body')
					.innerText({ timeout: 5_000 })
					.catch(() => '<unable to read body>');
				fs.writeFileSync(
					path.join(diagDir, 'global-setup-admin-failure.txt'),
					`url: ${url}\n\n--- body (first 2000 chars) ---\n${bodySnippet.slice(0, 2000)}\n`,
				);
				console.error(`[global-setup] Admin failure at ${url}. Body excerpt: ${bodySnippet.slice(0, 300)}`);
			} catch {
				// Diagnostics are best-effort.
			}
		}
		await browser.close();
		throw new Error(`[global-setup] Failed to create admin auth state: ${error}`);
	}

	// Generate client auth state
	try {
		const clientContext = await browser.newContext();
		const clientPage = await clientContext.newPage();

		const clientEmail = TEST_DATA.generateClientEmail();
		await clientPage.goto(`${baseURL}/auth/register`, { timeout: 60_000 });
		await clientPage.locator('#name').fill('E2E Test Client');
		await clientPage.locator('#email').fill(clientEmail);
		await clientPage.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await clientPage.locator('#password').press('Enter');
		await clientPage.waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' });

		await clientContext.storageState({ path: clientStatePath });
		await clientPage.close();
		await clientContext.close();
		console.log('[global-setup] Client auth state saved');
	} catch (error) {
		await browser.close();
		throw new Error(`[global-setup] Failed to create client auth state: ${error}`);
	}

	await browser.close();
}

export default globalSetup;
