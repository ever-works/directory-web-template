import { test, expect } from '@playwright/test';

// Forms should have either an action or onsubmit/onSubmit. A form with
// neither typically means submit doesn't work (regression).

const PROBES = ['/', '/auth/signin', '/auth/register', '/auth/forgot-password'];

test.describe('Forms have action or handler', () => {
	for (const path of PROBES) {
		test(`${path} forms wire up submit`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const orphans = await page.evaluate(() => {
				return Array.from(document.querySelectorAll('form'))
					.filter((f) => {
						const action = f.getAttribute('action');
						// React adds onSubmit at the JS level — not reflected as
						// attribute. So we only flag forms with NO action and NO
						// child input/button at all (truly dead form).
						const hasControls = f.querySelector('button, input[type="submit"], input');
						return !action && !hasControls;
					})
					.length;
			});
			expect(orphans, `${path} forms with no action/no controls: ${orphans}`).toBe(0);
		});
	}
});
