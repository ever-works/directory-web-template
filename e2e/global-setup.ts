import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_DATA, ADMIN_STATE_FILE, CLIENT_STATE_FILE, AUTH_STATE_DIR } from './helpers/test-data';

async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

	const authStatesDir = path.resolve(__dirname, AUTH_STATE_DIR);
	if (!fs.existsSync(authStatesDir)) {
		fs.mkdirSync(authStatesDir, { recursive: true });
	}

	const adminStatePath = path.resolve(__dirname, ADMIN_STATE_FILE);
	const clientStatePath = path.resolve(__dirname, CLIENT_STATE_FILE);

	const browser = await chromium.launch();

	// Generate admin auth state
	try {
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();

		await adminPage.goto(`${baseURL}/auth/signin`);
		await adminPage.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await adminPage.locator('#password').fill(TEST_DATA.ADMIN_PASSWORD);
		await adminPage.locator('button[type="submit"]').click();
		await adminPage.waitForURL(/\/(admin|client\/dashboard)/, { timeout: 20_000 });

		await adminContext.storageState({ path: adminStatePath });
		await adminPage.close();
		await adminContext.close();
		console.log('[global-setup] Admin auth state saved');
	} catch (error) {
		console.warn('[global-setup] Failed to create admin auth state:', error);
	}

	// Generate client auth state
	try {
		const clientContext = await browser.newContext();
		const clientPage = await clientContext.newPage();

		const clientEmail = TEST_DATA.generateClientEmail();
		await clientPage.goto(`${baseURL}/auth/register`);
		await clientPage.locator('#name').fill('E2E Test Client');
		await clientPage.locator('#email').fill(clientEmail);
		await clientPage.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await clientPage.locator('button[type="submit"]').click();
		await clientPage.waitForURL(/\/client\/dashboard/, { timeout: 20_000 });

		await clientContext.storageState({ path: clientStatePath });
		await clientPage.close();
		await clientContext.close();
		console.log('[global-setup] Client auth state saved');
	} catch (error) {
		console.warn('[global-setup] Failed to create client auth state:', error);
	}

	await browser.close();
}

export default globalSetup;
