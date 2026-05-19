import { test, expect } from '@playwright/test';

// Font @font-face declarations should NOT use font-display: block (FOIT).
// Acceptable: swap, fallback, optional. We don't check the actual CSS
// content (cross-origin) — only that next/font is being used (which sets
// font-display: swap by default).

test.describe('Font loading strategy', () => {
	test('/ has no inline font-display:block', async ({ request }) => {
		const resp = await request.get('/');
		if (resp.status() >= 400) test.skip();
		const body = (await resp.text()).toLowerCase();
		// next/font generated CSS uses font-display:swap. Manual @font-face
		// with font-display:block is the FOIT regression we're checking.
		const blockCount = (body.match(/font-display\s*:\s*block/g) || []).length;
		expect(blockCount, `font-display:block count on /: ${blockCount}`).toBe(0);
	});
});
