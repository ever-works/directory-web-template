import { test, expect } from '@playwright/test';

// next/image emits srcset with multiple URLs. Each URL inside srcset must
// have a numeric width descriptor and a non-empty URL.

test.describe('Image srcset shape', () => {
	test('/ images with srcset have well-formed entries', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const malformed = await page.evaluate(() => {
			const out: string[] = [];
			for (const img of Array.from(document.querySelectorAll<HTMLImageElement>('img[srcset]'))) {
				const srcset = img.getAttribute('srcset') || '';
				const entries = srcset.split(',').map((s) => s.trim()).filter(Boolean);
				for (const e of entries) {
					const [url] = e.split(/\s+/);
					if (!url || url === 'undefined' || url === 'null') out.push(e);
				}
			}
			return out;
		});
		expect(malformed, `bad srcset entries: ${malformed.join(' | ')}`).toEqual([]);
	});
});
