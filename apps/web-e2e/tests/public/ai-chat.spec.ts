import { test, expect } from '@playwright/test';
import { AiChatPage } from '../../page-objects/public/ai-chat.page';

/**
 * Public-surface coverage for the AI chat (Spec 023).
 *
 * **Scope of v1 e2e coverage.** The chat is **on by default** in the
 * plugin schema, but `AiChatMount` silently no-ops when
 * `AI_CHAT_API_KEY` is missing. The default e2e environment does not
 * provision the key, so these specs assert that the launcher is
 * absent under that "no key" baseline. Enabled-flow coverage with a
 * mocked upstream lives in `ai-chat-enabled.spec.ts` and runs only
 * when the override env vars are set.
 */
test.describe('Public: AI Chat — no API key (default e2e env)', () => {
	test('launcher is absent on the home page when AI_CHAT_API_KEY is missing', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);
		await expect(chat.launcher).toHaveCount(0);
	});

	test('launcher is absent on the discover page', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);
		await expect(chat.launcher).toHaveCount(0);
	});

	test('launcher is absent on a localized route (fr)', async ({ page }) => {
		await page.goto('/fr', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);
		await expect(chat.launcher).toHaveCount(0);
	});
});
