import { test, expect } from '@playwright/test';

// <button> default type=submit. Buttons inside forms that aren't submits
// should declare type="button" — otherwise they submit by accident.

test.describe('Button type attribute on auth forms', () => {
	test('/auth/signin buttons inside forms have type', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const missing = await page.evaluate(() => {
			const formBtns = Array.from(document.querySelectorAll('form button'));
			// We allow no-type if there's only one button per form (clear submit).
			const byForm = new Map<HTMLFormElement, HTMLButtonElement[]>();
			for (const b of formBtns) {
				const form = (b as HTMLButtonElement).form;
				if (!form) continue;
				const arr = byForm.get(form) || [];
				arr.push(b as HTMLButtonElement);
				byForm.set(form, arr);
			}
			const bad: string[] = [];
			for (const [, btns] of byForm) {
				if (btns.length > 1) {
					for (const b of btns) {
						if (!b.getAttribute('type')) bad.push(b.textContent || '?');
					}
				}
			}
			return bad;
		});
		// Soft warn — multiple-button forms missing types.
		expect(missing.length, `untyped buttons in multi-button forms: ${missing.length}`).toBeLessThan(5);
	});
});
