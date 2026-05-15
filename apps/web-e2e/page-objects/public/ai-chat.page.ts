import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the AI chat surface (Spec 023). All locators use
 * stable selectors (data-testid / role + aria-label) so they survive
 * copy / Tailwind tweaks.
 *
 * The launcher mounts only when `aiChat.enabled` is `true` in
 * `works.yml`. Tests for the disabled state should assert the
 * launcher is **not** visible; tests for the enabled state assume an
 * operator-controlled fixture has flipped the flag.
 */
export class AiChatPage extends BasePage {
	readonly launcher: Locator;
	readonly panelDialog: Locator;
	readonly inputTextarea: Locator;
	readonly sendButton: Locator;
	readonly stopButton: Locator;
	readonly closeButton: Locator;
	readonly messageList: Locator;
	readonly assistantMessages: Locator;
	readonly welcomeChips: Locator;

	constructor(page: Page) {
		super(page);
		this.launcher = page.locator('[data-testid="ai-chat-launcher"]');
		this.panelDialog = page.getByRole('dialog');
		this.inputTextarea = this.panelDialog.getByRole('textbox');
		this.sendButton = this.panelDialog.getByRole('button', { name: /send|envoyer|enviar|senden|إرسال|发送/i });
		this.stopButton = this.panelDialog.getByRole('button', { name: /stop|arrêter|detener|stoppen|إيقاف|停止/i });
		this.closeButton = this.panelDialog.getByRole('button', { name: /close|fermer|cerrar|schließen|إغلاق|关闭/i });
		this.messageList = this.panelDialog.locator('ol[aria-live="polite"]');
		this.assistantMessages = this.messageList.locator('li').filter({ hasNot: page.locator('text=^$') });
		this.welcomeChips = this.panelDialog.getByRole('listitem');
	}

	/**
	 * True if the floating launcher is currently rendered. Use to
	 * assert the disabled-flow's "no DOM emitted" behaviour.
	 */
	async isLauncherVisible(): Promise<boolean> {
		return this.launcher.isVisible();
	}

	/**
	 * Returns the launcher's `aria-label` — useful for i18n
	 * assertions (FR/AR/ZH labels). The launcher is a `<button>`
	 * with an `aria-label` translated via `next-intl`.
	 */
	async getLauncherLabel(): Promise<string | null> {
		return this.launcher.getAttribute('aria-label');
	}

	async openChat() {
		await this.launcher.click();
		await this.panelDialog.waitFor({ state: 'visible' });
	}

	async closeChat() {
		await this.panelDialog.press('Escape');
		await this.panelDialog.waitFor({ state: 'hidden' });
	}

	async typeAndSend(text: string) {
		await this.inputTextarea.fill(text);
		await this.sendButton.click();
	}

	async typeAndSubmitWithEnter(text: string) {
		await this.inputTextarea.fill(text);
		await this.inputTextarea.press('Enter');
	}

	/**
	 * Wait for at least one assistant message to render. Caller
	 * should have mocked the upstream provider or set `AI_CHAT_API_KEY`
	 * before invoking this.
	 */
	async waitForAssistantReply(timeout = 30_000) {
		await this.messageList.locator('li').first().waitFor({ timeout });
	}
}
