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

	/** Click the favorite toggle button and wait for its aria-label to
	 *  flip. React's onClick handler attaches at hydrate time — clicking
	 *  too early on a cold-start server silently no-ops, leaving the
	 *  label unchanged. Retry until the toggle actually fires (or give
	 *  up after a generous timeout). */
	async clickFavorite() {
		const before = await this.favoriteButton.getAttribute('aria-label');
		const deadline = Date.now() + 15_000;
		while (Date.now() < deadline) {
			await this.favoriteButton.click({ trial: false }).catch(() => undefined);
			// Wait briefly for the optimistic UI update / API roundtrip.
			await this.page.waitForTimeout(500);
			const after = await this.favoriteButton.getAttribute('aria-label');
			if (after !== before) return;
		}
		// Last best-effort: if state never changed, throw the next assertion
		// instead of returning a silent success. The caller asserts on the
		// flipped label and will surface a clear failure.
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
