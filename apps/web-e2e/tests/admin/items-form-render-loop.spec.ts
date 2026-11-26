import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { AdminItemsPage } from '../../page-objects/admin/items.page';
import { AdminItemFormPage } from '../../page-objects/admin/item-form.page';

/**
 * The admin item form (Create and Edit on /admin/items) must settle on every step (T-2815).
 *
 * Each step reports its validity from an effect that lists the `onValidationChange` prop as a
 * dependency. The form passed a new inline callback on every render and stored a new validation
 * object and a new completed-steps Set on every report, so a report re-rendered the form, the step
 * got a new callback, and the effect ran again, without end. `next dev` logs "Maximum update depth
 * exceeded" (and its error overlay opens a second aria-modal dialog); a production build logs
 * nothing and keeps the CPU busy for as long as the form is open.
 *
 * The spec walks every step of both forms and, with the form left alone on each step, checks that
 * nothing logged that warning and that React committed only a few times. The warning is dev-only;
 * the commit count also catches the loop in a production build (CI runs one). A stand-in React
 * DevTools hook, installed before the app loads, counts the commits.
 *
 * Nothing is saved: both forms close with Cancel.
 */

const LOOP_WARNING = 'Maximum update depth exceeded';
// The window the form is left alone on each step. The claim is that nothing happens during it,
// so it is a fixed wait. The loop commits hundreds of times in it; a settled form, almost never.
const IDLE_WINDOW_MS = 1_500;
const MAX_IDLE_COMMITS = 20;

type DevToolsHook = { onCommitFiberRoot?: (...args: unknown[]) => unknown; [key: string]: unknown };

/** Count React commits through the DevTools global hook, which React calls in dev and production builds. */
async function installCommitCounter(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevToolsHook; __e2eReactCommits: number };
		w.__e2eReactCommits = 0;
		const count = () => {
			w.__e2eReactCommits += 1;
		};
		const existing = w.__REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (existing) {
			const original = existing.onCommitFiberRoot;
			existing.onCommitFiberRoot = function (this: unknown, ...args: unknown[]) {
				count();
				return original?.apply(this, args);
			};
			return;
		}
		let nextRendererId = 1;
		w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
			renderers: new Map(),
			supportsFiber: true,
			inject: () => nextRendererId++,
			onScheduleFiberRoot: () => {},
			onCommitFiberRoot: count,
			onCommitFiberUnmount: () => {}
		};
	});
}

async function commitCount(page: Page): Promise<number> {
	return page.evaluate(() => (window as unknown as { __e2eReactCommits: number }).__e2eReactCommits);
}

/**
 * The page and the form have rendered by now, so the counter must have moved. Without this, a hook
 * React never called would count zero and every idle check would pass, hiding a loop in a production build.
 */
async function expectCommitCounterRuns(page: Page) {
	expect(await commitCount(page), 'React never called the stand-in DevTools hook').toBeGreaterThan(0);
}

/** Collect every "Maximum update depth exceeded" the page logs or throws. */
function watchForLoopWarnings(page: Page): string[] {
	const warnings: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error' && message.text().includes(LOOP_WARNING)) {
			warnings.push(message.text().slice(0, 300));
		}
	});
	page.on('pageerror', (error) => {
		if (error.message.includes(LOOP_WARNING)) {
			warnings.push(error.message.slice(0, 300));
		}
	});
	return warnings;
}

/** Leave the form alone on the current step and check it does not keep re-rendering. */
async function expectStepSettles(page: Page, loopWarnings: string[], where: string) {
	const before = await commitCount(page);
	await page.waitForTimeout(IDLE_WINDOW_MS);
	const commits = (await commitCount(page)) - before;
	test.info().annotations.push({
		type: 'react-commits',
		description: `${where}: ${commits} in ${IDLE_WINDOW_MS} ms`
	});
	expect(loopWarnings, `"${LOOP_WARNING}" was logged by the time ${where} was shown`).toEqual([]);
	expect(
		commits,
		`React committed ${commits} times in ${IDLE_WINDOW_MS} ms with ${where} left alone`
	).toBeLessThanOrEqual(MAX_IDLE_COMMITS);
}

test.describe('Admin: item form render loop', () => {
	test('the create form settles on every step', async ({ adminPage }) => {
		await installCommitCounter(adminPage);
		const loopWarnings = watchForLoopWarnings(adminPage);
		const itemsPage = new AdminItemsPage(adminPage);
		const formPage = new AdminItemFormPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();
		expect(adminPage.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);

		await itemsPage.addItemButton.click();
		await expect(formPage.nameInput).toBeVisible();
		await expectCommitCounterRuns(adminPage);
		await expectStepSettles(adminPage, loopWarnings, 'the create form, step 1 (basic info)');

		await formPage.idInput.fill(`e2e-render-loop-${Date.now()}`);
		await formPage.nameInput.fill('E2E render loop item');
		await formPage.descriptionInput.fill('An item the render-loop spec types and never saves.');
		await expectStepSettles(adminPage, loopWarnings, 'the create form, step 1 (filled in)');
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		await expect(formPage.sourceUrlInput).toBeVisible();
		await expectStepSettles(adminPage, loopWarnings, 'the create form, step 2 (media and links)');
		await formPage.sourceUrlInput.fill('https://example.com/e2e-render-loop');
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		await expect(formPage.categoryInput).toBeVisible();
		await expectStepSettles(adminPage, loopWarnings, 'the create form, step 3 (classification)');
		await formPage.addCategory('Web Development');
		await formPage.addTag('e2e-render-loop');
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		await expect(formPage.categoryInput).toBeHidden();
		if (!(await formPage.createButton.isVisible())) {
			// The Location step shows only when the location feature is on; it is optional.
			await expectStepSettles(adminPage, loopWarnings, 'the create form, location step');
			await expect(formPage.nextButton).toBeEnabled();
			await formPage.goToNextStep();
		}

		await expect(formPage.createButton).toBeVisible();
		await expectStepSettles(adminPage, loopWarnings, 'the create form, review step');

		await formPage.cancel();
		await formPage.waitForClosed();
	});

	test('the edit form settles on every step', async ({ adminPage }) => {
		await installCommitCounter(adminPage);
		const loopWarnings = watchForLoopWarnings(adminPage);
		const itemsPage = new AdminItemsPage(adminPage);
		const formPage = new AdminItemFormPage(adminPage);

		// Take the item from the list response rather than from whatever row renders first.
		const list = adminPage.waitForResponse(
			(response) =>
				new URL(response.url()).pathname === '/api/admin/items' && response.request().method() === 'GET'
		);
		await itemsPage.navigate();
		await itemsPage.waitForPageReady();
		expect(adminPage.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);
		const body = (await (await list).json().catch(() => ({}))) as { items?: Array<{ name?: string }> };
		const itemName = body.items?.find((item) => item.name)?.name;
		test.skip(!itemName, 'No item available to open the edit form');

		await itemsPage.openActionsMenu(itemName!);
		await itemsPage.clickAction('Edit');
		await expect(formPage.nameInput).toHaveValue(itemName!);
		await expectCommitCounterRuns(adminPage);
		await expectStepSettles(adminPage, loopWarnings, 'the edit form, step 1 (basic info)');
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		await expect(formPage.sourceUrlInput).toBeVisible();
		await expectStepSettles(adminPage, loopWarnings, 'the edit form, step 2 (media and links)');
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		await expect(formPage.categoryInput).toBeVisible();
		await expectStepSettles(adminPage, loopWarnings, 'the edit form, step 3 (classification)');
		// The step needs a category and a tag to go on, and the item taken from the list may lack one,
		// so add one of each. Nothing is saved.
		await formPage.addCategory('Web Development');
		await formPage.addTag('e2e-render-loop');
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		await expect(formPage.categoryInput).toBeHidden();
		if (!(await formPage.updateButton.isVisible())) {
			// The Location step shows only when the location feature is on; it is optional.
			await expectStepSettles(adminPage, loopWarnings, 'the edit form, location step');
			await expect(formPage.nextButton).toBeEnabled();
			await formPage.goToNextStep();
		}

		await expect(formPage.updateButton).toBeVisible();
		await expectStepSettles(adminPage, loopWarnings, 'the edit form, review step');

		await formPage.cancel();
		await formPage.waitForClosed();
	});
});
