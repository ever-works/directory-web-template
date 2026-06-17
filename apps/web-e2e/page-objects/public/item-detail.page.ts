import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the item detail page (/items/[slug]).
 * Covers heading, vote button, favorite button, comments section.
 */
export class ItemDetailPage extends BasePage {
	readonly heading: Locator;

	// Vote
	readonly voteButton: Locator;
	readonly voteCount: Locator;

	// Favorite
	readonly favoriteButton: Locator;

	// Comments
	readonly commentsSection: Locator;
	readonly commentTextarea: Locator;
	readonly postCommentButton: Locator;
	readonly signInToCommentButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading', { level: 1 });

		// Vote button uses aria-label "Upvote" or "Remove upvote"
		this.voteButton = page.locator('button[aria-label="Upvote"], button[aria-label="Remove upvote"]');
		this.voteCount = page.locator('[aria-live="polite"]').first();

		// Favorite button uses dynamic aria-label
		this.favoriteButton = page.locator('button[aria-label*="favorites"]').first();

		// Comments
		this.commentsSection = page.locator('section, div').filter({ hasText: /^comments/i }).first();
		this.commentTextarea = page.locator('#comment');
		this.postCommentButton = page.getByRole('button', { name: /post comment/i });
		this.signInToCommentButton = page.getByRole('button', { name: /sign in to comment/i });
	}

	/** Navigate to an item detail page by slug. */
	async navigateToItem(slug: string) {
		await this.goto(`/items/${slug}`);
	}

	/** Navigate to the first item from the discover page. */
	async navigateToFirstItem() {
		await this.goto('/');
		const firstItemLink = this.page.locator('a[href*="/items/"]').first();
		await firstItemLink.waitFor({ state: 'visible', timeout: 30_000 });
		await firstItemLink.click();
		await this.page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded' });
	}

	/** Click the upvote button. */
	async clickVote() {
		await this.voteButton.click();
	}

	/** Get the current vote count text. */
	async getVoteCount(): Promise<string> {
		return (await this.voteCount.textContent()) ?? '0';
	}

	/** Check if the vote button is in "voted" state. */
	async isVoted(): Promise<boolean> {
		const label = await this.voteButton.getAttribute('aria-label');
		return label === 'Remove upvote';
	}

	/** Click the favorite toggle button and wait for its aria-label to flip.
	 *  Two CI-specific hazards are handled here:
	 *   1. The button's onClick reads the current user from `useCurrentUser`;
	 *      if the `/api/current-user` fetch hasn't resolved yet, an early click
	 *      opens the login modal *instead* of toggling. A click that opened the
	 *      modal did not toggle, so we don't count it — we retry until the
	 *      session is ready and the click actually flips the label.
	 *   2. If a login modal did open, its full-screen `z-50` backdrop sits over
	 *      the button and eats subsequent clicks; dismiss it (Escape) first. */
	async clickFavorite() {
		const loginDialog = this.page.locator('[role="dialog"][aria-modal="true"]');
		const before = await this.favoriteButton.getAttribute('aria-label');
		const deadline = Date.now() + 20_000;
		while (Date.now() < deadline) {
			// Clear a login modal opened by an earlier (pre-hydration) click so
			// its backdrop stops blocking the favorite button.
			if (await loginDialog.isVisible().catch(() => false)) {
				await this.page.keyboard.press('Escape').catch(() => undefined);
				await loginDialog.waitFor({ state: 'hidden', timeout: 2_000 }).catch(() => undefined);
			}
			await this.favoriteButton.click({ timeout: 2_000 }).catch(() => undefined);
			// Wait briefly for the optimistic UI update / API roundtrip.
			await this.page.waitForTimeout(500);
			// A click that opened the login modal did NOT toggle — retry.
			if (await loginDialog.isVisible().catch(() => false)) continue;
			const after = await this.favoriteButton.getAttribute('aria-label');
			if (after !== before) return;
		}
		// If the label never flipped, the caller's assertion on the flipped
		// label surfaces a clear failure rather than a silent success.
	}

	/** Post a comment with the given text. */
	async postComment(text: string) {
		// The comment form's "Post" button only renders once the textarea
		// has been FOCUSED (the React form gates everything below the
		// textarea on a `focused` state set by onFocus). Playwright's
		// `fill()` claims to focus the element but on some HeroUI-wrapped
		// textareas the focus event doesn't propagate to the React
		// handler reliably on a cold-start run, so the post button stays
		// invisible and the click times out at 30s. Click to force focus
		// before filling, then wait for the post button to actually render.
		await this.commentTextarea.click({ timeout: 10_000 }).catch(() => undefined);
		await this.commentTextarea.fill(text);
		await this.postCommentButton.waitFor({ state: 'visible', timeout: 10_000 });
		await this.postCommentButton.click();
	}

	/** Get a comment element by its text content. */
	getComment(text: string): Locator {
		return this.page.locator('p, span').filter({ hasText: text }).first();
	}

	/** Hover over a comment to reveal edit/delete buttons, then click edit. */
	async editComment(commentText: string) {
		const commentEl = this.getComment(commentText).locator('..');
		await commentEl.hover();
		await commentEl.locator('button[aria-label="Edit comment"]').click();
	}

	/** Hover over a comment to reveal delete button, then click delete. */
	async deleteComment(commentText: string) {
		const commentEl = this.getComment(commentText).locator('..');
		await commentEl.hover();
		await commentEl.locator('button[aria-label="Delete comment"]').click();
	}

	/** Get the delete comment confirmation dialog. */
	get deleteCommentDialog() {
		return this.page.locator('[role="dialog"]').filter({ hasText: /delete comment/i });
	}
}
