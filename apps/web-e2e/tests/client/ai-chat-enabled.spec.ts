import { test, expect } from '../../fixtures';
import { AiChatPage } from '../../page-objects/public/ai-chat.page';
import { aiChatOverrideAvailable, enableAiChatOverride } from '../../helpers/ai-chat';

/**
 * Authenticated enabled-state coverage for the AI chat (Spec 023,
 * T-013d). Uses the `clientPage` fixture so the session cookie is
 * already attached.
 *
 * Skips when the override env vars (see helpers/ai-chat.ts) are not
 * provisioned.
 */

test.beforeEach(({}) => {
	test.skip(
		!aiChatOverrideAvailable(),
		'Skipping authenticated AI chat specs: set E2E_ALLOW_TEST_OVERRIDES=true to run.'
	);
});

test.describe('Client: AI Chat — authenticated enabled flow (T-013d)', () => {
	test('signed-in visitor sees the launcher and can chat', async ({ clientPage, clientContext }) => {
		await enableAiChatOverride(clientContext);
		await clientPage.goto('/', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(clientPage);

		await expect(chat.launcher).toBeVisible();
		await chat.openChat();
		await chat.typeAndSend('hello as signed-in user');
		await chat.waitForAssistantReply();
		await expect(chat.messageList.locator('li')).toHaveCount(2, { timeout: 20_000 });
	});
});
