import { test as base, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../helpers/test-data';

const ADMIN_STATE_PATH = path.resolve(__dirname, '..', ADMIN_STATE_FILE);
const CLIENT_STATE_PATH = path.resolve(__dirname, '..', CLIENT_STATE_FILE);

type AuthFixtures = {
	adminContext: BrowserContext;
	adminPage: Page;
	clientContext: BrowserContext;
	clientPage: Page;
};

export const test = base.extend<AuthFixtures>({
	adminContext: async ({ browser }, use) => {
		const context = await browser.newContext({ storageState: ADMIN_STATE_PATH });
		await use(context);
		await context.close();
	},
	adminPage: async ({ adminContext }, use) => {
		const page = await adminContext.newPage();
		await use(page);
		await page.close();
	},
	clientContext: async ({ browser }, use) => {
		const context = await browser.newContext({ storageState: CLIENT_STATE_PATH });
		await use(context);
		await context.close();
	},
	clientPage: async ({ clientContext }, use) => {
		const page = await clientContext.newPage();
		await use(page);
		await page.close();
	},
});

export { expect } from '@playwright/test';
