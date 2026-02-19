import { test as base, type Page, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../helpers/test-data';

const ADMIN_STATE_PATH = path.resolve(__dirname, '..', ADMIN_STATE_FILE);
const CLIENT_STATE_PATH = path.resolve(__dirname, '..', CLIENT_STATE_FILE);

function requireAuthState(filePath: string): string {
	if (!fs.existsSync(filePath)) {
		throw new Error(
			`Auth state file not found: ${filePath}. ` +
				'Global setup may have failed — check that SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are correct.'
		);
	}
	return filePath;
}

type AuthFixtures = {
	adminContext: BrowserContext;
	adminPage: Page;
	clientContext: BrowserContext;
	clientPage: Page;
};

export const test = base.extend<AuthFixtures>({
	// eslint-disable-next-line react-hooks/rules-of-hooks
	adminContext: async ({ browser }, use) => {
		const context = await browser.newContext({ storageState: requireAuthState(ADMIN_STATE_PATH) });
		await use(context);
		await context.close();
	},
	// eslint-disable-next-line react-hooks/rules-of-hooks
	adminPage: async ({ adminContext }, use) => {
		const page = await adminContext.newPage();
		await use(page);
		await page.close();
	},
	// eslint-disable-next-line react-hooks/rules-of-hooks
	clientContext: async ({ browser }, use) => {
		const context = await browser.newContext({ storageState: requireAuthState(CLIENT_STATE_PATH) });
		await use(context);
		await context.close();
	},
	// eslint-disable-next-line react-hooks/rules-of-hooks
	clientPage: async ({ clientContext }, use) => {
		const page = await clientContext.newPage();
		await use(page);
		await page.close();
	},
});

export { expect } from '@playwright/test';
