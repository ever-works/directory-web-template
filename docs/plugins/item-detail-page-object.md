---
id: item-detail-page-object
title: E2E Item-Detail Page Object (apps/web-e2e/page-objects/public/item-detail.page.ts)
sidebar_label: E2E Item-Detail Page Object
sidebar_position: 389
---

# E2E Item-Detail Page Object — `apps/web-e2e/page-objects/public/item-detail.page.ts`

Per-source-file reference for the Playwright e2e suite's
**item-detail page** driver paired with
[`apps/web-e2e/page-objects/public/item-detail.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/item-detail.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `language-switcher.page.ts`,
`map.page.ts`, `newsletter.page.ts`,
`profile-dropdown.page.ts`, `public-pages.page.ts`,
`scroll-to-top.page.ts`, `search-bar.page.ts`,
`share-button.page.ts`, `sort-menu.page.ts`,
`star-rating.page.ts`, `theme-toggle.page.ts`,
`view-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`language-switcher-page-object.md`](language-switcher-page-object.md)
documents the **suite's locale-switching driver boundary**
under `apps/web-e2e/page-objects/public/`, this page documents
the **suite's per-item detail-page driver boundary** — the
smallest possible page object that lets a spec drive the
public item-detail page (`/items/[slug]`) end-to-end (navigate
either to a known slug or to the **first item linked from
`/`** for slug-agnostic flows, click the canonical
`aria-label="Upvote"` / `aria-label="Remove upvote"` toggle
button to upvote or un-upvote the item, read the live vote
count via the `[aria-live="polite"]` accessibility region,
toggle the favorite via the `aria-label*="favorites"`
substring-matched button, locate the comments section by its
case-insensitive `^comments` text-filter, fill the
`#comment` textarea and click the `name=/post comment/i`
button to post a comment as an authenticated user, hover any
existing comment to surface the per-comment
`aria-label="Edit comment"` / `aria-label="Delete comment"`
buttons, and resolve the **delete-comment confirmation
dialog** via the `[role="dialog"]` filter on the
`/delete comment/i` body text).

The file is the **only** driver in the suite for the
item-detail page today. Like
[`signin-page-object.md`](signin-page-object.md), the class
**does extend `BasePage`** — see "Why the class extends
`BasePage`" below for the load-bearing reason — so it
inherits `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only adds
the per-page locators and helpers that drive the vote /
favorite / comments surfaces.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`item-detail` driver is consumed today by
[`apps/web-e2e/tests/public/item-detail.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/item-detail.spec.ts)
and indirectly by
[`apps/web-e2e/tests/public/votes-and-comments.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/votes-and-comments.spec.ts),
which together cover the public read paths (heading visible,
body content visible) and the authenticated interaction
paths (vote toggle, favorite toggle, comment post / edit /
delete). The driver's `navigateToFirstItem()` helper is the
**slug-agnostic discovery primitive** that lets every
consuming spec degrade gracefully on environments where the
canonical seed slug has not been provisioned, by following
the **first** `a[href*="/items/"]` anchor on the discover
home (`/`) and waiting for the URL to match `/\/items\//`.

## At-a-glance summary

| Element | Type | Purpose |
| --- | --- | --- |
| `import type { Page, Locator } from '@playwright/test'` | type-only import | Mirrors the type-only import discipline of every other public-tree page object so the runtime bundle pays nothing for the Playwright type surface. |
| `import { BasePage } from '../base.page'` | value import | Reaches up one directory level to the **suite-wide page-object inheritance root** documented in [`base-page-object.md`](base-page-object.md), pulling in `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`. |
| `export class ItemDetailPage extends BasePage` | single named export | The driver's only export. The `extends BasePage` clause is load-bearing — see "Why the class extends `BasePage`". |
| `readonly heading: Locator` | bound `Locator` | The page's H1 by ARIA role, pre-bound in the constructor via `page.getByRole('heading', { level: 1 })`. The `level: 1` constraint pins the assertion to the **single page-level H1** and is robust to any sub-section H2 / H3 the host theme adds. |
| `readonly voteButton: Locator` | bound `Locator` | The vote toggle, pre-bound to the **OR-of-two-aria-labels** selector `button[aria-label="Upvote"], button[aria-label="Remove upvote"]`. The OR is load-bearing because the production source flips the `aria-label` between the two states — see "Why the vote button uses an OR-of-two-aria-labels selector". |
| `readonly voteCount: Locator` | bound `Locator` | The live vote count, pre-bound to `page.locator('[aria-live="polite"]').first()`. The `[aria-live="polite"]` selector is the **screen-reader contract** the production source surfaces; the `.first()` survives any future second polite-region the page adds (toast notifications, screen-reader-only count regions). |
| `readonly favoriteButton: Locator` | bound `Locator` | The favorite toggle, pre-bound to the **substring** selector `button[aria-label*="favorites"]` with `.first()`. The substring match is load-bearing because the production source flips the label between `"Add to favorites"` / `"Remove from favorites"` — see "Why the favorite button uses an `aria-label*="favorites"` substring selector". |
| `readonly commentsSection: Locator` | bound `Locator` | The comments section container, pre-bound to a `section, div` element whose textContent matches `/^comments/i` and constrained to `.first()`. The OR-of-tags hardens against the production source switching the wrapping tag from `<section>` to `<div>` (or vice-versa), and the regex matches both `"Comments"` and `"Comments (12)"` headings. |
| `readonly commentTextarea: Locator` | bound `Locator` | The textarea you type a new comment into, pre-bound to `page.locator('#comment')`. The `id`-based selector pins the textarea to the production source's HTML-form-`for=`/`id=` accessibility wiring; spec authors should never re-bind by `placeholder` or `name`. |
| `readonly postCommentButton: Locator` | bound `Locator` | The "Post comment" submit button, pre-bound by accessible name via `page.getByRole('button', { name: /post comment/i })`. The case-insensitive regex tolerates the production source's casing drift (`"Post Comment"`, `"Post comment"`, `"POST COMMENT"`). |
| `readonly signInToCommentButton: Locator` | bound `Locator` | The "Sign in to comment" CTA shown to unauthenticated readers, pre-bound by accessible name via `page.getByRole('button', { name: /sign in to comment/i })`. The presence of this button is the load-bearing **anonymous-state** assertion every consuming spec uses to gate authenticated comment flows behind an auth fixture. |
| `constructor(page: Page)` | constructor | Calls `super(page)` so `BasePage`'s `header` / `footer` / `navLinks` are available, then pre-binds every per-page Locator in a single pass. No async work is performed — the constructor is synchronous by Playwright convention. |
| `navigateToItem(slug: string)` | async helper | Navigates by **known slug** via `goto('/items/${slug}')`. The route shape is the load-bearing public-URL contract Spec 010 pins. |
| `navigateToFirstItem()` | async helper | Slug-agnostic discovery primitive. Goes to `/`, waits for the first `a[href*="/items/"]` anchor up to **30 seconds**, clicks it, and waits for the URL to match `/\/items\//` with `waitUntil: 'domcontentloaded'`. The 30 s timeout is the load-bearing seed-data tolerance — the suite must succeed on environments whose Git CMS sync has not yet completed at boot. |
| `clickVote()` | async helper | Single-action upvote / un-upvote primitive that simply clicks the OR-of-two-aria-labels `voteButton`. |
| `getVoteCount()` | async accessor | Reads the polite-aria-live region's `textContent()` and falls back to `'0'` via `?? '0'`. The string return type is deliberate — see "Why `getVoteCount()` returns `Promise<string>`". |
| `isVoted()` | async accessor | Reads the `aria-label` attribute on the OR-of-two-aria-labels `voteButton` and returns the strict-equality comparison `label === 'Remove upvote'`. The strict-equality check is load-bearing — see "Why `isVoted()` checks the exact `'Remove upvote'` label". |
| `clickFavorite()` | async helper | Single-action favorite-toggle primitive that simply clicks the `aria-label*="favorites"` substring-matched `favoriteButton`. |
| `postComment(text: string)` | async helper | Composite "fill the textarea then click submit" primitive. Spec authors must not split this — the host app's submit handler reads from the controlled state, so a `commentTextarea.fill()` without a `postCommentButton.click()` will not surface the comment in the DOM. |
| `getComment(text: string)` | sync `Locator` getter | Returns the **first** `p, span` element whose textContent contains `text` (string-substring match, case-sensitive). Spec authors compose `getComment(text).locator('..')` to walk up to the per-comment row container before hovering / clicking the per-row buttons. |
| `editComment(commentText: string)` | async helper | Hovers the per-comment row to surface the **edit** button, then clicks it. The hover step is load-bearing because the production source hides the per-comment buttons behind a `:hover` CSS state until a pointer or a Playwright `hover()` call materialises them. |
| `deleteComment(commentText: string)` | async helper | Hovers the per-comment row to surface the **delete** button, then clicks it. The hover step is load-bearing for the same reason as `editComment`. |
| `get deleteCommentDialog()` | sync `Locator` getter | Returns the `[role="dialog"]` element whose textContent matches `/delete comment/i`. Used by consuming specs to scope the confirm / cancel button assertions to the right modal in case multiple `[role="dialog"]` instances are open. |

## Full file annotated

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
```

The two imports together encode the driver's posture: a
`type`-only Playwright import (so the runtime bundle pays
nothing for `Page` / `Locator`) and a value import of the
suite-wide `BasePage` from a relative `../base.page`
path — the relative path is load-bearing because every other
public-tree page object uses the same `'../base.page'` form
and a re-route via a TS path alias would break grep-ability
across the suite.

```ts
/**
 * Page object for the item detail page (/items/[slug]).
 * Covers heading, vote button, favorite button, comments section.
 */
export class ItemDetailPage extends BasePage {
```

The single named class export with an `extends BasePage`
clause. The class name `ItemDetailPage` is the public name
every consuming spec imports; the `extends BasePage` clause
gives it `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` for free —
see "Why the class extends `BasePage`" below for the
load-bearing reason.

```ts
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
```

The eight `readonly Locator` fields — one per actionable
surface on the page. `readonly` is load-bearing on every
field because Playwright Locators are stateless query
descriptors and re-assigning a Locator after construction
would silently desynchronise the driver's call sites from
its constructor body.

```ts
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
```

The constructor calls `super(page)` first (mandatory because
`BasePage` stores `page` and pre-binds `header` / `footer` /
`navLinks`), then pre-binds every per-page Locator in a
single synchronous pass. No async work is performed — the
constructor is synchronous by Playwright convention, and
spec authors must not introduce a `static async create()`
factory because every other page object in the suite is
constructed inline (`const page = new ItemDetailPage(page)`).

```ts
	async navigateToItem(slug: string) {
		await this.goto(`/items/${slug}`);
	}
```

Slug-driven navigation primitive. Delegates to the inherited
`BasePage.goto(path)` so the `baseURL` from
[`playwright-config.md`](playwright-config.md) is honored.
Spec authors call this when the spec already knows the slug
(for instance, after seeding an item via the API in a
`before` hook).

```ts
	async navigateToFirstItem() {
		await this.goto('/');
		const firstItemLink = this.page.locator('a[href*="/items/"]').first();
		await firstItemLink.waitFor({ state: 'visible', timeout: 30_000 });
		await firstItemLink.click();
		await this.page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded' });
	}
```

Slug-agnostic discovery primitive. Three load-bearing
choices encoded here:

1. **`goto('/')`** — the discover home, not `/discover/1`,
   so the helper survives a future home-route reshuffle that
   moves the listing to `/`.
2. **`a[href*="/items/"]`** — substring match on the link
   shape that survives query-string drift, locale-prefix
   drift (e.g. `/fr/items/foo`), and trailing-slash drift.
3. **`timeout: 30_000`** — the **30 s seed-data tolerance**
   that lets the helper succeed on environments where the
   Git CMS sync at boot has not yet completed by the time
   the spec runs. Anything shorter is brittle on cold
   starts; anything longer is a Playwright-level timeout
   masquerading as a seed-data tolerance.

```ts
	async clickVote() {
		await this.voteButton.click();
	}
```

The bare upvote / un-upvote primitive. Spec authors compose
this with `isVoted()` to assert the toggle round-trips:
`expect(await page.isVoted()).toBe(false); await page.clickVote(); expect(await page.isVoted()).toBe(true);`.

```ts
	async getVoteCount(): Promise<string> {
		return (await this.voteCount.textContent()) ?? '0';
	}
```

The string-typed accessor. Returns `'0'` when the
`textContent()` is `null` (the polite region exists but is
empty) so the consuming spec never has to narrow `string |
null`. Returning `string` and not `number` is deliberate —
see "Why `getVoteCount()` returns `Promise<string>`".

```ts
	async isVoted(): Promise<boolean> {
		const label = await this.voteButton.getAttribute('aria-label');
		return label === 'Remove upvote';
	}
```

The boolean accessor that pins the OR-of-two-aria-labels
state. Strict equality on `'Remove upvote'` collapses both
the missing-attribute case and the `'Upvote'` case into a
definitive `false` return. See "Why `isVoted()` checks the
exact `'Remove upvote'` label" below.

```ts
	async clickFavorite() {
		await this.favoriteButton.click();
	}
```

The bare favorite-toggle primitive. There is no `isFavorited()`
counterpart today by design — the production source's
substring-matched `aria-label` (`"Add to favorites"` /
`"Remove from favorites"`) carries the same state as the
button's filled / unfilled icon, and the consuming spec asserts
on the **substring** match instead.

```ts
	async postComment(text: string) {
		await this.commentTextarea.fill(text);
		await this.postCommentButton.click();
	}
```

The composite "fill the textarea then click submit"
primitive. Spec authors must not split this — the host app's
submit handler reads from controlled React state, so a
`commentTextarea.fill()` without a `postCommentButton.click()`
will not surface the comment in the DOM, and a future
regression that wires the submit through a non-button
trigger (Enter key, form-onsubmit) would silently break the
spec without this primitive carrying the contract.

```ts
	getComment(text: string): Locator {
		return this.page.locator('p, span').filter({ hasText: text }).first();
	}
```

The per-comment Locator factory. Returns the **first** `p`
or `span` whose textContent contains `text` (string-substring
match, case-sensitive). Spec authors compose
`getComment(text).locator('..')` to walk up to the row
container before hovering / clicking per-row buttons.

```ts
	async editComment(commentText: string) {
		const commentEl = this.getComment(commentText).locator('..');
		await commentEl.hover();
		await commentEl.locator('button[aria-label="Edit comment"]').click();
	}
```

Composite "hover the comment row then click the edit
button". The hover step is load-bearing — the production
source hides the per-comment buttons behind a `:hover` CSS
state until a pointer or a Playwright `hover()` call
materialises them, and dropping the hover step would make
the click flake on a CI run.

```ts
	async deleteComment(commentText: string) {
		const commentEl = this.getComment(commentText).locator('..');
		await commentEl.hover();
		await commentEl.locator('button[aria-label="Delete comment"]').click();
	}
```

Same shape as `editComment` but for the delete button. Spec
authors then compose this with the `deleteCommentDialog`
getter to scope the confirmation-modal assertion.

```ts
	get deleteCommentDialog() {
		return this.page.locator('[role="dialog"]').filter({ hasText: /delete comment/i });
	}
```

A `get`-accessor (not a `readonly Locator` field) so the
Locator is re-evaluated on every read and the consuming
spec's interleaved click / wait sequence does not pin to a
stale Locator instance. The `/delete comment/i` filter
scopes the assertion to the right `[role="dialog"]` in case
multiple modals are open.

## Why the class extends `BasePage`

Three load-bearing reasons:

1. **The item-detail page is a full page route, not a global
   widget.** Unlike
   [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
   [`share-button-page-object.md`](share-button-page-object.md),
   [`sort-menu-page-object.md`](sort-menu-page-object.md),
   [`star-rating-page-object.md`](star-rating-page-object.md),
   [`view-toggle-page-object.md`](view-toggle-page-object.md),
   [`theme-toggle-page-object.md`](theme-toggle-page-object.md),
   and
   [`language-switcher-page-object.md`](language-switcher-page-object.md),
   the item-detail page is a **navigable URL** (`/items/[slug]`)
   that the spec lands on via `goto()`. The `BasePage.goto()`
   inherited primitive is the canonical way every consuming
   spec navigates here, so extending `BasePage` is the
   conventional posture for a page-route driver in this
   suite.
2. **The page surfaces the global `header` / `footer` /
   `navLinks` chrome.** The item-detail page is rendered
   inside the public layout shell, so consuming specs reach
   for `header.theme.toggle()`, `header.language.select(...)`,
   `footer.cookies.accept()` etc. via the inherited
   `BasePage.header` / `BasePage.footer` / `BasePage.navLinks`
   composite getters — see
   [`base-page-object.md`](base-page-object.md) for the
   inherited surface. Extending `BasePage` here is the only
   way to expose those without re-binding them in every
   page-route driver.
3. **`waitForPageReady()` is the canonical post-navigation
   stabilisation primitive.** A consuming spec calls
   `await page.waitForPageReady()` after `navigateToItem(slug)`
   to let any host-app-level loading skeleton settle before
   asserting on the heading / vote count / comments — that
   primitive lives on `BasePage` and is the conventional
   post-`goto` stabiliser across the suite.

## Why the vote button uses an OR-of-two-aria-labels selector

Three load-bearing reasons:

1. **The production source flips the `aria-label` between
   `"Upvote"` and `"Remove upvote"` based on the user's vote
   state.** A single `aria-label="Upvote"` selector would
   miss the post-vote DOM; a single `aria-label="Remove upvote"`
   selector would miss the pre-vote DOM. The OR makes the
   driver state-agnostic.
2. **The two literals are deliberately exact-match (no
   substring `*=` glob).** A `aria-label*="vote"` substring
   match would also catch a future `aria-label="Toggle vote"`
   refactor — but it would also catch any future per-comment
   `aria-label="Vote on comment"` button, which is a
   different control. The pair-of-exact-matches preserves the
   strict-mode collision signal that protects against that
   regression.
3. **`isVoted()` reads `getAttribute('aria-label')` on this
   exact same `voteButton` Locator.** That accessor's
   strict-equality check on `'Remove upvote'` is the
   load-bearing state pin (see below) — and that check only
   works if the Locator can resolve to either label without
   re-binding, which the OR-of-two-aria-labels enables.

## Why the favorite button uses an `aria-label*="favorites"` substring selector

Three load-bearing reasons:

1. **The production source flips the `aria-label` between
   `"Add to favorites"` and `"Remove from favorites"`.**
   Both contain `"favorites"`, so the substring `*="favorites"`
   match resolves to either state without an OR-of-two
   selector.
2. **The substring is deliberately on `"favorites"` (plural)
   not `"favorite"` (singular).** The host app's accessibility
   wording is canonically pluralised; pinning to the plural
   form survives a future `aria-label="Save favorite"`
   refactor that would only match a `*="favorite"` substring
   if it stripped the trailing `"s"`.
3. **`.first()` is appended for strict-mode-correctness.**
   A future second `aria-label*="favorites"` button (a
   "Manage favorites" admin control, a "View favorites" link
   in the user menu) would otherwise trigger a strict-mode
   collision; `.first()` pins the Locator to the per-item
   button without masking the regression — every consuming
   spec asserts on the per-item button via `clickFavorite()`,
   which is the only consumer of this Locator.

## Why `getVoteCount()` returns `Promise<string>`

Three load-bearing reasons:

1. **The polite-aria-live region's `textContent` is the
   screen-reader contract** — the host app's
   accessibility surface emits a `string` (potentially with
   thousands separators like `"1,234"`), not a JavaScript
   `number`. Returning `string` mirrors that contract.
2. **The `?? '0'` nullish-coalesce pins the public return
   type.** A `Promise<string | null>` would push the narrowing
   burden onto every consuming spec; the `'0'` fallback
   collapses both the missing-region and the empty-region
   cases into a definitive `'0'` string.
3. **Number parsing is the consuming spec's concern.** A
   spec that wants to assert on the numeric round-trip can
   call `Number(await page.getVoteCount())` itself; pre-parsing
   in the driver would silently lose precision on locales
   that emit `"1.234"` (German thousands separator) and
   would couple the driver to a specific host-app i18n
   setting.

## Why `isVoted()` checks the exact `'Remove upvote'` label

Three load-bearing reasons:

1. **The OR-of-two-aria-labels selector resolves to either
   `"Upvote"` or `"Remove upvote"`.** Strict equality on
   `'Remove upvote'` collapses both the missing-attribute
   case and the `'Upvote'` case into a definitive `false`
   return without a bespoke null-narrowing branch.
2. **A substring `label?.includes('Remove')` would match
   a future `aria-label="Remove favorite"` regression.**
   Strict equality survives that drift; a substring match
   would silently flip the assertion's polarity.
3. **The strict-equality check is symmetric with the
   `voteButton` selector.** Both pin to the same exact
   string literal, so a future production-source rename
   (e.g. `"Remove upvote"` → `"Undo upvote"`) breaks the
   `voteButton` Locator's strict-mode resolution **and** the
   `isVoted()` accessor's strict-equality check on the same
   PR — a fail-loud pattern that surfaces the rename in one
   place instead of letting one of the two drift silently.

## Failure matrix

| Mistake | Why it breaks |
| --- | --- |
| Drop the `import type` modifier on the Playwright import. | Pulls Playwright's runtime into the bundle; breaks the suite-wide type-only import discipline mirrored in every other page-object file. |
| Drop the `extends BasePage` clause. | The driver loses `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`; every consuming spec breaks. |
| Drop `readonly` on any Locator field. | Locator re-assignment after construction silently desynchronises driver call sites; assertions become stateful and tests flake. |
| Re-bind `voteButton` to a single `aria-label="Upvote"` selector. | Misses the post-vote DOM; `clickVote()` succeeds pre-vote but `isVoted()` returns `false` after the flip because the Locator does not resolve. |
| Re-bind `voteButton` to a substring `aria-label*="vote"` selector. | Catches future per-comment "Vote on comment" buttons; strict-mode collision risk. |
| Drop the `.first()` on `voteCount`. | Strict-mode collision when a future toast notification or screen-reader-only count region adds a second `[aria-live="polite"]`. |
| Re-bind `favoriteButton` to a single `aria-label="Add to favorites"` selector. | Misses the post-favorite DOM. |
| Re-bind `favoriteButton` to `aria-label*="favorite"` (singular). | Survives a future `"Save favorite"` rename that strips the trailing `"s"` but masks a real label-rename regression. |
| Drop `.first()` on `favoriteButton`. | Strict-mode collision against a future "Manage favorites" admin control or "View favorites" link. |
| Re-bind `commentsSection` to a single tag (`section` or `div`). | Breaks if the production source ever switches the wrapping tag — both shapes are valid; the OR is the canonical resilience. |
| Re-bind `commentsSection` `hasText` to a non-anchored regex (`/comments/i`). | Catches "Show all comments" / "No comments yet" mid-page text and resolves to the wrong container. |
| Re-bind `commentTextarea` by `placeholder` or `name`. | Breaks the production source's HTML-form `id`-based accessibility wiring; brittle to placeholder/i18n drift. |
| Re-bind `postCommentButton` by exact-match string instead of `/post comment/i`. | Brittle to casing drift (`"Post Comment"` vs `"Post comment"`). |
| Drop the `signInToCommentButton` field. | The unauthenticated-state assertion every consuming spec gates the auth-fixture branch on disappears. |
| Drop the `super(page)` call in the constructor. | `BasePage.header` / `BasePage.footer` / `BasePage.navLinks` are unbound; every consuming spec that touches the global chrome breaks. |
| Pre-parse `getVoteCount()` to a `number`. | Loses precision on locales that emit thousands separators; couples the driver to a specific i18n setting. |
| Re-bind `isVoted()` to a substring `label?.includes('Remove')` check. | Catches future `"Remove favorite"` / `"Remove from cart"` regressions; flips the assertion's polarity silently. |
| Drop the `hover()` step in `editComment` / `deleteComment`. | The per-comment buttons are hidden behind a `:hover` CSS state; the click flakes on CI. |
| Convert `deleteCommentDialog` from a `get`-accessor to a `readonly Locator` field. | Pins to a stale Locator instance across interleaved click / wait sequences; the consuming spec's modal-presence assertion regresses. |
| Re-bind `deleteCommentDialog` to a non-`role="dialog"` selector. | Drops the screen-reader contract; brittle to host-app modal-implementation refactors. |
| Re-bind any `aria-label`-based selector to a `data-testid`-based selector. | Couples the e2e suite to a non-accessibility-surface attribute the production source is free to remove without warning. |
| Move the file outside `apps/web-e2e/page-objects/public/`. | Breaks the relative `'../base.page'` import; consuming specs lose the import path convention; the [`e2e-tsconfig.md`](e2e-tsconfig.md) `include: ["./**/*.ts"]` glob still picks it up but the suite's directory-by-role discoverability regresses. |
| Rename the file to `item-detail.page.tsx`. | The Playwright config has no JSX wiring; `BasePage.goto()` does not need a TSX surface. |
| Commit the file with CRLF line endings. | The suite's `.editorconfig` pins LF; tooling diffs become noisy. |

## Per-line walkthrough

| Line | Purpose |
| --- | --- |
| `import type { Page, Locator } from '@playwright/test';` | Pulls in the Playwright `Page` / `Locator` types for the constructor signature and field types. The `import type` modifier guarantees the runtime bundle pays nothing for Playwright. |
| `import { BasePage } from '../base.page';` | Reaches up one directory level to the suite-wide page-object inheritance root. The relative path is load-bearing — the suite-wide convention is `../base.page` from every public/auth/client/admin sub-tree. |
| `export class ItemDetailPage extends BasePage {` | Single named class export with the `extends BasePage` clause. The class name `ItemDetailPage` is the public name every consuming spec imports. |
| `readonly heading: Locator;` | The page H1 by ARIA role. |
| `readonly voteButton: Locator;` | The OR-of-two-aria-labels vote toggle. |
| `readonly voteCount: Locator;` | The polite-aria-live vote count region. |
| `readonly favoriteButton: Locator;` | The substring-matched favorite toggle. |
| `readonly commentsSection: Locator;` | The OR-of-tags `^comments`-anchored container. |
| `readonly commentTextarea: Locator;` | The `#comment` textarea. |
| `readonly postCommentButton: Locator;` | The case-insensitive "Post comment" submit. |
| `readonly signInToCommentButton: Locator;` | The case-insensitive "Sign in to comment" CTA. |
| `constructor(page: Page) { super(page); … }` | The synchronous constructor that pre-binds every Locator and chains to `BasePage`. |
| `async navigateToItem(slug: string)` | Slug-driven navigation primitive. |
| `async navigateToFirstItem()` | Slug-agnostic discovery primitive with the 30 s seed-data tolerance. |
| `async clickVote()` | Bare upvote / un-upvote primitive. |
| `async getVoteCount(): Promise<string>` | Polite-aria-live region read with the `?? '0'` fallback. |
| `async isVoted(): Promise<boolean>` | Strict-equality state pin on `'Remove upvote'`. |
| `async clickFavorite()` | Bare favorite-toggle primitive. |
| `async postComment(text: string)` | Composite fill-then-click primitive. |
| `getComment(text: string): Locator` | Per-comment Locator factory (substring text match). |
| `async editComment(commentText: string)` | Hover-then-click edit primitive. |
| `async deleteComment(commentText: string)` | Hover-then-click delete primitive. |
| `get deleteCommentDialog()` | Re-evaluating Locator getter for the confirm modal. |

## Read / write surface

| Surface | Reads | Writes |
| --- | --- | --- |
| `apps/web-e2e/tests/public/item-detail.spec.ts` | `heading`, `body` (via inherited `goto()`) | none |
| `apps/web-e2e/tests/public/votes-and-comments.spec.ts` | `voteButton`, `voteCount`, `signInToCommentButton`, `commentTextarea`, `postCommentButton` | `clickVote()`, `clickFavorite()`, `postComment(text)`, `editComment(text)`, `deleteComment(text)` |
| Production source `apps/web/components/item-detail/*` | DOM contract (heading H1, OR-of-two `aria-label` on the vote button, `[aria-live="polite"]` polite region, `aria-label*="favorites"` substring on the favorite, `#comment` textarea, "Post comment" / "Sign in to comment" button text) | n/a |
| [`base-page-object.md`](base-page-object.md) | Inherited `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` | n/a |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | `include: ["./**/*.ts"]` glob picks up this file | n/a |
| [`playwright-config.md`](playwright-config.md) | `baseURL` resolves the `/items/${slug}` URL | n/a |
| [`fixtures-index.md`](fixtures-index.md) | Future authenticated variant would surface a fixture here | n/a |

## Read / write surface failure modes

| Failure | Why it surfaces here |
| --- | --- |
| Vote-button `aria-label` rename. | The OR-of-two-aria-labels selector and the strict-equality `isVoted()` accessor both resolve to the literal `"Upvote"` / `"Remove upvote"`. A rename breaks both call sites simultaneously, surfacing a fail-loud pattern. |
| Polite-region selector change (e.g. `aria-live="polite"` → `aria-live="off"` or removal). | The `voteCount` Locator drops the screen-reader contract; a regression breaks both `getVoteCount()` and any consuming-spec assertion that reads the polite region. |
| Favorite-button label rename that drops the `"favorites"` substring. | The substring selector resolves to nothing; `clickFavorite()` flakes. |
| Comments-section heading rename. | The `^comments`-anchored regex drops; consuming spec re-binds via the `getComment(text)` factory but the high-level "comments-section visible" assertion regresses. |
| `#comment` textarea `id` change. | The driver's textarea Locator drops; specs must re-bind via the host app's new `id`. |
| Modal `[role="dialog"]` removal. | The `deleteCommentDialog` getter drops the screen-reader contract; consuming specs re-scope but lose the assertion. |
| Middleware-prefix change (e.g. `/items/[slug]` → `/[locale]/items/[slug]`). | The `navigateToItem(slug)` helper's `goto('/items/${slug}')` path drops; specs must call the locale-prefixed variant via `gotoLocalized` from `BasePage`. |
| `baseURL` change in [`playwright-config.md`](playwright-config.md). | The `goto()` calls resolve to the wrong host; surfaces as a 404 on every consuming spec. |

## `item-detail.page.ts`-change checklist

Any change to `apps/web-e2e/page-objects/public/item-detail.page.ts` must:

1. Audit every spec under `apps/web-e2e/tests/public/item-detail.spec.ts` and `apps/web-e2e/tests/public/votes-and-comments.spec.ts` for spec authors that touch the per-page surface.
2. Cross-check [`base-page-object.md`](base-page-object.md) — if the new shape inherits a different surface, document why.
3. Cross-check the production source under `apps/web/components/item-detail/*` — the H1 role, the OR-of-two-`aria-label` on the vote button, the `[aria-live="polite"]` polite region, the `aria-label*="favorites"` substring on the favorite button, the `#comment` textarea `id`, the "Post comment" / "Sign in to comment" button text, and the `[role="dialog"]` confirm-modal must stay aligned.
4. Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) — the `include: ["./**/*.ts"]` glob picks up this file by convention.
5. Cross-check [`playwright-config.md`](playwright-config.md) — the `baseURL` posture is what `goto('/items/${slug}')` resolves against.
6. Cross-check [`fixtures-index.md`](fixtures-index.md) — a future authenticated variant of `postComment` / `editComment` / `deleteComment` would surface a fixture here.
7. Run dual `pnpm tsc --noEmit` (e2e package + workspace root) to catch the type surface.
8. Run a smoke-subset Playwright run targeting the item-detail spec subset: `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Item Detail"`.
9. Add a [`docs/log.md`](../log.md) entry under today's date heading.
10. Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage) if the change introduces a new shared concept that affects test authoring across the suite.
11. Submit the change for a reviewer pass with the cross-checks listed in the PR description.
