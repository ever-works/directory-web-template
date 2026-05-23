import { test, expect } from '@playwright/test';

/**
 * Rendered HTML on public pages must not contain credential-shaped strings.
 * If any of these appear, it means a secret was accidentally serialized
 * into client-side data (most commonly via a misconfigured RSC payload or
 * a SSR-leaked env var).
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing'];

const CREDENTIAL_PATTERNS = [
	{ name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
	{ name: 'AWS ARN', re: /arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:/ },
	{ name: 'Stripe live secret key', re: /sk_live_[0-9A-Za-z]{16,}/ },
	{ name: 'Stripe live publishable key', re: /pk_live_[0-9A-Za-z]{16,}/ },
	{ name: 'GitHub PAT classic', re: /ghp_[0-9A-Za-z]{36}/ },
	{ name: 'GitHub fine-grained PAT', re: /github_pat_[0-9A-Za-z_]{50,}/ },
	{ name: 'OpenAI API key', re: /sk-[A-Za-z0-9]{40,}/ },
	{ name: 'Slack token', re: /xox[abprs]-[0-9A-Za-z-]{10,}/ },
	{ name: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/ },
	{ name: 'private key PEM', re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
];

test.describe('Public HTML: no credential-shaped string leaks', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} contains no credential-shaped strings`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const html = await page.content();
			for (const { name, re } of CREDENTIAL_PATTERNS) {
				expect(html, `${name} leak on ${path}`).not.toMatch(re);
			}
		});
	}
});
