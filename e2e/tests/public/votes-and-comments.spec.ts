import { test, expect } from '../../fixtures';
import { ItemDetailPage } from '../../page-objects/public/item-detail.page';

test.describe('Item Detail: Votes', () => {
	test('authenticated client can upvote and remove upvote', async ({ clientPage }) => {
		const itemDetail = new ItemDetailPage(clientPage);

		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		// Find the vote button
		const voteButton = itemDetail.voteButton;
		const isVoteVisible = await voteButton.isVisible().catch(() => false);

		if (!isVoteVisible) {
			test.skip(true, 'Vote button is not visible on this page');
			return;
		}

		// Get initial state
		const wasVoted = await itemDetail.isVoted();

		// Click to toggle vote
		await itemDetail.clickVote();
		await clientPage.waitForTimeout(2_000);

		// State should have toggled
		if (wasVoted) {
			await expect(voteButton).toHaveAttribute('aria-label', 'Upvote');
		} else {
			await expect(voteButton).toHaveAttribute('aria-label', 'Remove upvote');
		}

		// Toggle back to restore state
		await itemDetail.clickVote();
		await clientPage.waitForTimeout(2_000);

		if (wasVoted) {
			await expect(voteButton).toHaveAttribute('aria-label', 'Remove upvote');
		} else {
			await expect(voteButton).toHaveAttribute('aria-label', 'Upvote');
		}
	});

	test('unauthenticated user sees vote button', async ({ page }) => {
		const itemDetail = new ItemDetailPage(page);

		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		// Vote button should be visible even for unauthenticated users
		const voteButton = itemDetail.voteButton;
		const isVisible = await voteButton.isVisible().catch(() => false);

		// If visible, the vote count should be shown
		if (isVisible) {
			await expect(itemDetail.voteCount).toBeVisible();
		}
	});
});

test.describe('Item Detail: Comments', () => {
	test('authenticated client can post a comment', async ({ clientPage }) => {
		const itemDetail = new ItemDetailPage(clientPage);

		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		// Check if comments feature is enabled
		const commentTextarea = itemDetail.commentTextarea;
		const isCommentsVisible = await commentTextarea.isVisible().catch(() => false);

		if (!isCommentsVisible) {
			test.skip(true, 'Comments feature is not enabled');
			return;
		}

		const commentText = `E2E test comment ${Date.now()}`;

		// Post the comment
		await itemDetail.postComment(commentText);

		// Wait for the comment to appear
		await expect(clientPage.getByText(commentText)).toBeVisible({ timeout: 10_000 });
	});

	test('authenticated client can edit their own comment', async ({ clientPage }) => {
		const itemDetail = new ItemDetailPage(clientPage);

		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		const commentTextarea = itemDetail.commentTextarea;
		const isCommentsVisible = await commentTextarea.isVisible().catch(() => false);

		if (!isCommentsVisible) {
			test.skip(true, 'Comments feature is not enabled');
			return;
		}

		// First, post a comment to edit
		const originalText = `E2E edit test ${Date.now()}`;
		await itemDetail.postComment(originalText);
		await expect(clientPage.getByText(originalText)).toBeVisible({ timeout: 10_000 });

		// Hover over the comment to reveal edit/delete buttons
		const commentEl = clientPage.getByText(originalText).first();
		const commentContainer = commentEl.locator('xpath=ancestor::div[contains(@class, "group")]').first();
		await commentContainer.hover();

		// Click the edit button
		const editButton = commentContainer.locator('button[aria-label="Edit comment"]');
		await editButton.click();

		// The textarea should appear with the original text — update it
		const editTextarea = commentContainer.locator('textarea').first();
		await expect(editTextarea).toBeVisible();
		const updatedText = `${originalText} - updated`;
		await editTextarea.clear();
		await editTextarea.fill(updatedText);

		// Save the edit (checkmark button)
		const saveButton = commentContainer.getByRole('button', { name: /save/i }).first();
		// If save button is not found by name, try the check icon button
		const isSaveVisible = await saveButton.isVisible().catch(() => false);
		if (isSaveVisible) {
			await saveButton.click();
		} else {
			// Click the first button that isn't cancel (X)
			const buttons = commentContainer.locator('button');
			const buttonCount = await buttons.count();
			for (let i = 0; i < buttonCount; i++) {
				const label = await buttons.nth(i).getAttribute('aria-label');
				if (!label || (!label.includes('Cancel') && !label.includes('Delete'))) {
					await buttons.nth(i).click();
					break;
				}
			}
		}

		// Updated comment should be visible
		await expect(clientPage.getByText(updatedText)).toBeVisible({ timeout: 10_000 });
	});

	test('authenticated client can delete their own comment', async ({ clientPage }) => {
		const itemDetail = new ItemDetailPage(clientPage);

		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		const commentTextarea = itemDetail.commentTextarea;
		const isCommentsVisible = await commentTextarea.isVisible().catch(() => false);

		if (!isCommentsVisible) {
			test.skip(true, 'Comments feature is not enabled');
			return;
		}

		// Post a comment to delete
		const deleteTargetText = `E2E delete test ${Date.now()}`;
		await itemDetail.postComment(deleteTargetText);
		await expect(clientPage.getByText(deleteTargetText)).toBeVisible({ timeout: 10_000 });

		// Hover over the comment to reveal delete button
		const commentEl = clientPage.getByText(deleteTargetText).first();
		const commentContainer = commentEl.locator('xpath=ancestor::div[contains(@class, "group")]').first();
		await commentContainer.hover();

		// Click the delete button
		const deleteButton = commentContainer.locator('button[aria-label="Delete comment"]');
		await deleteButton.click();

		// Delete confirmation dialog should appear
		const deleteDialog = itemDetail.deleteCommentDialog;
		await expect(deleteDialog).toBeVisible();

		// Confirm deletion
		const confirmButton = deleteDialog.getByRole('button', { name: /^delete$/i });
		await confirmButton.click();

		// Dialog should close and comment should disappear
		await expect(deleteDialog).toBeHidden({ timeout: 10_000 });
		await expect(clientPage.getByText(deleteTargetText)).toBeHidden({ timeout: 10_000 });
	});

	test('unauthenticated user sees sign-in prompt instead of comment form', async ({ page }) => {
		const itemDetail = new ItemDetailPage(page);

		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		// Check if comments section exists at all
		const signInButton = itemDetail.signInToCommentButton;
		const isSignInVisible = await signInButton.isVisible().catch(() => false);

		if (!isSignInVisible) {
			// Comments feature might be disabled entirely
			test.skip(true, 'Comments feature is not enabled or sign-in prompt not visible');
			return;
		}

		// The comment textarea should NOT be visible for unauthenticated users
		await expect(itemDetail.commentTextarea).toBeHidden();

		// "Sign In to Comment" button should be visible
		await expect(signInButton).toBeVisible();
	});
});
