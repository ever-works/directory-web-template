import { test, expect } from '@playwright/test';

// Inputs should have an associated label OR aria-label OR placeholder.

const PROBES = ['/auth/signin', '/auth/register', '/auth/forgot-password'];

test.describe('Form inputs have accessible names', () => {
	for (const path of PROBES) {
		test(`${path} inputs have label/aria-label/placeholder`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const unnamed = await page.evaluate(() => {
				const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
					.filter((i) => !['hidden', 'submit', 'button'].includes(i.type));
				const bad: string[] = [];
				for (const i of inputs) {
					const id = i.getAttribute('id');
					const labeledBy = id ? document.querySelector(`label[for="${id}"]`) : null;
					const aria = i.getAttribute('aria-label');
					const placeholder = i.getAttribute('placeholder');
					const wrapped = i.closest('label');
					if (!labeledBy && !aria && !placeholder && !wrapped) {
						bad.push(i.name || i.type);
					}
				}
				return bad;
			});
			expect(unnamed, `${path} unnamed inputs: ${unnamed.join(', ')}`).toEqual([]);
		});
	}
});
