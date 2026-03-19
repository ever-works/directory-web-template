import type { Page, Locator } from '@playwright/test';

export class AdminNotifications {
	readonly page: Page;
	readonly bellButton: Locator;
	readonly dropdown: Locator;
	readonly refreshButton: Locator;
	readonly closeButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.bellButton = page.locator('button[aria-label*="Notifications"]').first();
		this.dropdown = page.locator('#admin-notifications-dropdown');
		this.refreshButton = page.locator('button[aria-label="Refresh notifications"]');
		this.closeButton = page.locator('button[aria-label="Close notifications panel"]');
	}

	/** Open the notifications dropdown by clicking the bell. */
	async open() {
		await this.bellButton.click();
	}

	/** Close the notifications dropdown. */
	async close() {
		await this.closeButton.click();
	}

	/** Get the mark all read button. */
	get markAllReadButton() {
		return this.dropdown.getByRole('button', { name: /mark all/i });
	}

	/** Get the unread badge count element. */
	get unreadBadge() {
		return this.bellButton.locator('.animate-pulse');
	}

	/** Get all notification items. */
	get notificationItems() {
		return this.dropdown.locator('[role="button"]');
	}

	/** Get the "View All Notifications" link. */
	get viewAllButton() {
		return this.dropdown.getByRole('button', { name: /view all/i });
	}

	/** Get the empty state text. */
	get emptyState() {
		return this.dropdown.getByText(/no notifications/i);
	}
}
