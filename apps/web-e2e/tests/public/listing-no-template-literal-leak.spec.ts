import { test, expect } from '@playwright/test';

/**
 * Unrendered template-literal markers (`${var}`, `{{var}}`, `<%= var %>`,
 * `{var}`, `%{var}`) in production HTML usually mean a translation key,
 * i18n placeholder, or component prop wasn't substituted server-side.
 * They're user-visible junk and a strong signal of a broken pipeline.
 *
 * We probe text content (not HTML source), so legitimate uses inside
 * <script> blocks (template strings in JS) are excluded.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

// The patterns intentionally match the FULL `${...}` form, not bare `$`.
const UNRENDERED_TEMPLATE_PATTERNS = [
	/\$\{[a-zA-Z_][a-zA-Z0-9_.\s]*\}/, // ${name}
	/\{\{\s*[a-zA-Z_][a-zA-Z0-9_.\s]*\s*\}\}/, // {{ name }}
	/<%=\s*[a-zA-Z_][a-zA-Z0-9_.\s]*\s*%>/, // <%= name %>
	/%\{[a-zA-Z_][a-zA-Z0-9_.\s]*\}/, // %{name} (Ruby i18n)
];

test.describe('Public HTML: no un-rendered template literals in visible text', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} body text has no unrendered template markers`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			// Only inspect visible body text — not scripts/JSON-LD/etc.
			const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
			for (const pattern of UNRENDERED_TEMPLATE_PATTERNS) {
				expect(bodyText, `unrendered ${pattern} on ${path}`).not.toMatch(pattern);
			}
		});
	}
});
