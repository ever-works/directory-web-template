import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
	testDir: './tests',
	outputDir: './test-results',

	fullyParallel: true,
	workers: isCI ? 2 : 1,

	retries: isCI ? 2 : 0,

	reporter: isCI
		? [['html', { open: 'never', outputFolder: './playwright-report' }], ['github'], ['list']]
		: [['html', { open: 'on-failure', outputFolder: './playwright-report' }], ['list']],

	timeout: 60_000,
	expect: { timeout: 30_000 },

	globalSetup: path.resolve(__dirname, './global-setup.ts'),
	globalTeardown: path.resolve(__dirname, './global-teardown.ts'),

	use: {
		baseURL,
		trace: isCI ? 'on-first-retry' : 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: isCI ? 'on-first-retry' : 'off',
		navigationTimeout: 60_000,
		actionTimeout: 30_000,
		locale: 'en-US',
		timezoneId: 'America/New_York',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
	],

	webServer: {
		command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
		url: baseURL,
		reuseExistingServer: !isCI,
		timeout: isCI ? 300_000 : 120_000,
		stdout: 'pipe',
		stderr: 'pipe',
	},
});
