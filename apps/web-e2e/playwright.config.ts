import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

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
		command: isCI ? 'pnpm --filter @ever-works/web build && pnpm --filter @ever-works/web start' : 'pnpm --filter @ever-works/web dev',
		cwd: path.resolve(__dirname, '../..'),
		url: baseURL,
		reuseExistingServer: !isCI,
		// In CI the command is a full production BUILD followed by `start`, so this
		// budget has to cover the build, not just server boot. 300_000 did not:
		// on the 2026-08-21 stage run (32510493419) shard 3 logged
		// "Compiled successfully in 2.0min" and then "Ready in 396ms" at 18:07:53.397,
		// and Playwright aborted with "Timed out waiting 300000ms" at 18:07:53.958 —
		// 0.5s later. Shard 2 compiled in 4.3min and never reached ready at all.
		// Every E2E run on stage/main has failed this way since at least 2026-07-30,
		// with ZERO specs executed, so the suite has been silently gating nothing.
		// 15min gives ~2x headroom over the slowest observed build.
		timeout: isCI ? 900_000 : 120_000,
		stdout: 'pipe',
		stderr: 'pipe',
	},
});
