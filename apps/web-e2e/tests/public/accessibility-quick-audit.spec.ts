import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Lightweight axe-core audit on a small sample of high-traffic pages.
// We don't fail on every kind of violation — color contrast and decorative
// alt-text rules are particularly noisy on a customizable theme — but we
// DO fail on critical / serious WCAG violations.

const AUDIT_PAGES = ['/', '/auth/signin', '/auth/register'];

test.describe('Accessibility (axe-core) quick audit', () => {
	for (const path of AUDIT_PAGES) {
		test(`${path} has no critical or serious axe violations`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa'])
				// Skip rules that are noisy on customizable theme tokens.
				.disableRules(['color-contrast', 'image-alt'])
				.analyze();

			const blockers = results.violations.filter((v) =>
				v.impact === 'critical' || v.impact === 'serious'
			);
			if (blockers.length > 0) {
				console.log(`${path} axe violations:`, JSON.stringify(blockers.map((b) => ({ id: b.id, impact: b.impact, nodes: b.nodes.length })), null, 2));
			}
			expect(blockers, `${path} has critical/serious axe violations`).toEqual([]);
		});
	}
});
