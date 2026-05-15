import { test, expect } from '@playwright/test';
import { AiChatPage } from '../../page-objects/public/ai-chat.page';

/**
 * Public-surface coverage for the AI chat (Spec 023).
 *
 * **Scope of v1 e2e coverage.** The chat is opt-in via the `aiChat`
 * block in `works.yml`. The seed `awesome-time-tracking-data` repo
 * does NOT enable it, so the default state of the test environment
 * is *disabled*. These specs assert the disabled-state behaviour and
 * the launcher's accessibility surface — they explicitly do NOT
 * exercise the chat with a real upstream provider call.
 *
 * Enabled-flow coverage (anonymous flow, authenticated flow,
 * provider-mocked streaming reply, i18n launcher label in French,
 * a11y focus-trap with Esc, axe-core on the open panel) is tracked
 * as **T-013-followups** in `docs/spec/023-ai-chat/tasks.md` and
 * lands once the test infra supports:
 *   - flipping `aiChat.enabled` per-test (works.yml override or a
 *     test-mode header),
 *   - mocking the OpenAI-compatible upstream
 *     (`page.route('**\/api/chat/completions')` with a canned SSE
 *     stream).
 */
test.describe('Public: AI Chat — disabled state (default)', () => {
	test('launcher is absent on the home page when aiChat is not enabled', async ({ page }) => {
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
