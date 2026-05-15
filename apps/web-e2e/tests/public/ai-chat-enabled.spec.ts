import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AiChatPage } from '../../page-objects/public/ai-chat.page';
import { aiChatOverrideAvailable, enableAiChatOverride } from '../../helpers/ai-chat';

/**
 * Enabled-state coverage for the AI chat (Spec 023, T-013c / T-013e
 * / T-013f).
 *
 * Requires the e2e launcher to set:
 *   - `E2E_ALLOW_TEST_OVERRIDES=true`
 *   - `AI_CHAT_API_KEY=<any>` (the mock route ignores it)
 *   - `AI_CHAT_BASE_URL=http://localhost:3000/api/__test__/openai-mock`
 *
 * When those are missing the suite skips cleanly — same convention
 * as the auth-fixture-backed tests that skip if SEED_* envs are
 * absent.
 */

test.beforeEach(({}) => {
	test.skip(
		!aiChatOverrideAvailable(),
		'Skipping enabled-state AI chat specs: set E2E_ALLOW_TEST_OVERRIDES=true and configure the mock provider env to run.'
	);
});

test.describe('Public: AI Chat — anonymous enabled flow (T-013c)', () => {
	test('launcher renders and opens the chat panel', async ({ page, context }) => {
		await enableAiChatOverride(context);
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);

		await expect(chat.launcher).toBeVisible();
		await chat.openChat();
		await expect(chat.panelDialog).toBeVisible();
	});

	test('sending a message streams a reply', async ({ page, context }) => {
		await enableAiChatOverride(context);
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);
		await chat.openChat();

		await chat.typeAndSend('hello mock');
		// Assistant bubble shows up. The mock echoes the user message back,
		// so we check that the assistant turn appears at all.
		await chat.waitForAssistantReply();
		await expect(chat.messageList.locator('li')).toHaveCount(2, { timeout: 20_000 });
	});

	test('assistant markdown renders inline (no raw asterisks)', async ({ page, context }) => {
		await enableAiChatOverride(context);
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);
		await chat.openChat();

		await chat.typeAndSend('please respond with markdown');
		await chat.waitForAssistantReply();
		// The mock returns "**bold**" + "`code`" + a list. The renderer
		// should turn `**bold**` into <strong>bold</strong>.
		const lastTurn = chat.messageList.locator('li').last();
		await expect(lastTurn.locator('strong')).toContainText('bold', { timeout: 20_000 });
		await expect(lastTurn).not.toContainText('**bold**');
	});
});

test.describe('Public: AI Chat — i18n (T-013e)', () => {
	test('launcher renders with a French aria-label on /fr', async ({ page, context }) => {
		await enableAiChatOverride(context);
		await page.goto('/fr', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);

		await expect(chat.launcher).toBeVisible();
		const label = await chat.getLauncherLabel();
		expect(label, 'launcher aria-label should be localized for /fr').toBeTruthy();
		expect(label, 'expected a French translation of the launcher label').not.toMatch(/^Open AI chat$/i);
	});
});

test.describe('Public: AI Chat — a11y (T-013f)', () => {
	test('Escape closes the panel and returns focus to the launcher', async ({ page, context }) => {
		await enableAiChatOverride(context);
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);
		await chat.openChat();

		await chat.panelDialog.press('Escape');
		await expect(chat.panelDialog).toBeHidden();
		await expect(chat.launcher).toBeFocused();
	});

	test('open panel has no serious axe-core violations', async ({ page, context }) => {
		await enableAiChatOverride(context);
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const chat = new AiChatPage(page);
		await chat.openChat();

		const results = await new AxeBuilder({ page })
			.include('[role="dialog"]')
			.withTags(['wcag2a', 'wcag2aa'])
			.disableRules(['color-contrast'])
			.analyze();

		const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
		expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
	});
});
