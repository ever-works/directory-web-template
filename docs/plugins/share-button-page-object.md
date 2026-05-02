---
id: share-button-page-object
title: E2E Share-Button Page Object (apps/web-e2e/page-objects/public/share-button.page.ts)
sidebar_label: E2E Share-Button Page Object
sidebar_position: 385
---

# E2E Share-Button Page Object — `apps/web-e2e/page-objects/public/share-button.page.ts`

Per-source-file reference for the Playwright e2e suite's
**share-button dropdown** driver paired with
[`apps/web-e2e/page-objects/public/share-button.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/share-button.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
`public-pages.page.ts`, `scroll-to-top.page.ts`,
`search-bar.page.ts`, `sort-menu.page.ts`,
`star-rating.page.ts`, `theme-toggle.page.ts`,
`view-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
documents the **suite's scroll-position driver boundary**
under `apps/web-e2e/page-objects/public/`, this page documents
the **suite's social-share driver boundary** — the smallest
possible page object that lets a spec drive the item-detail
page's social-share dropdown end-to-end (open the dropdown by
clicking the trigger button, click any of the four menu items
— **Copy Link** / **Twitter (X)** / **Facebook** /
**LinkedIn** — to fire the per-platform share intent, and
read each menu item's Locator for visibility / a11y
assertions).

The file is the **only** driver in the suite for the
item-detail share-button dropdown today. Like
[`view-toggle-page-object.md`](view-toggle-page-object.md),
[`theme-toggle-page-object.md`](theme-toggle-page-object.md),
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
and unlike [`signin-page-object.md`](signin-page-object.md),
the class **does not extend `BasePage`** — see "Why the class
does not extend `BasePage`" below for the load-bearing reason —
so it carries its own `page` field and does not inherit
`header` / `footer` / `navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`share-button` driver is consumed today by
[`apps/web-e2e/tests/public/share-button.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/share-button.spec.ts),
which covers the item-detail share-button flows:

- The trigger button is **visible on the item detail page**
  reachable from the canonical listing route (`/discover/1`,
  documented in [`discover-page-object.md`](discover-page-object.md))
  by clicking the first `a[href*="/items/"]` link.
- Clicking the trigger **opens a dropdown** with at least
  two `[role="menuitem"]` entries — the **Copy Link** entry
  is always present in the host app today, and the
  per-platform entries (**Twitter / X**, **Facebook**,
  **LinkedIn**) round out the menu when the host app's
  social-share posture is enabled.
- Both tests **soft-skip** with `test.skip(true, …)` when the
  trigger is not visible, so the spec degrades gracefully on
  environments / CMS-content combinations where the
  item-detail page does not surface a share button.

A spec that drives the share button inline (via
`page.locator('button').filter({ hasText: /share/i })`) is a
**drift** that this page object is the canonical replacement
for; new specs that touch the share-button dropdown must
reach for this page object instead.

## At a glance

| Element                                     | Type           | What it is                                                                                                                                                                                                                                                                                          | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`             | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                                            | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a share-button driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime.                                                                                          |
| `export class ShareButton`                  | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field, five Locators (one trigger plus four menu-item Locators), a constructor that pre-binds them all, and two action methods (`open()` / `copyLink()`).      | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the share-button dropdown surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any item-detail-shaped page (the public `/items/[slug]` route, a future preview page, an in-frame share widget) without paying for the inherited Locators to resolve up-front.                                                                                                          |
| `readonly page: Page`                       | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                                                       | Every Locator in the class resolves through this `Page` handle. A `BasePage` subclass would inherit this field; the standalone class restates it. The field is `readonly` so a spec cannot accidentally re-point the driver mid-test.                                                                                                                                                                                                                                                                                              |
| `readonly trigger: Locator`                 | field          | `page.locator('button').filter({ hasText: /share/i }).first()` — the canonical share-button trigger Locator: every `<button>` whose visible text matches the case-insensitive `/share/i` regex, pinned to the first match for strict-mode safety.                                                  | The host app's item-detail page renders a single share button whose visible text contains the word "Share" (`"Share"`, `"Share this"`, `"Share item"`, etc.). The `filter({ hasText: /share/i })` posture survives every label evolution; the `i` flag on the regex tolerates casing drift; `.first()` survives a future second share button (e.g. a sticky share widget mounted alongside the in-page button). The selector reaches for visible text rather than `aria-label` because the host app's button does not carry one today. |
| `readonly copyLinkItem: Locator`            | field          | `page.locator('[role="menuitem"]').filter({ hasText: /copy link/i }).first()` — the canonical "Copy Link" menu-item Locator within the dropdown.                                                                                                                                                    | The "Copy Link" item is the **always-present** menu entry in the host app today (the per-platform entries are conditional on which social tokens are configured). A regression that drops the substring "Copy Link" from the menu-item label would surface as a strict-mode `Locator not found` against `copyLink()`. The `[role="menuitem"]` ARIA role is the screen-reader-driven primitive every menu library (HeroUI / Radix / Headless UI / shadcn-ui) writes onto the dropdown's option rows.                              |
| `readonly twitterItem: Locator`             | field          | `page.locator('[role="menuitem"]').filter({ hasText: /twitter\|x \(/i }).first()` — the canonical Twitter / X menu-item Locator with a **dual-substring regex** that survives the platform's rebrand from "Twitter" to "X".                                                                          | The `/twitter\|x \(/i` alternation is load-bearing: the host app may render `"Twitter"` (legacy), `"X"` (post-rebrand), or `"X (formerly Twitter)"` (transitional), and the `x \(` substring (with the literal parenthesis) is the disambiguating fragment that prevents the bare letter `x` from matching every menu item that happens to contain a lowercase `x`. The `.first()` pin keeps the locator strict-mode-safe.                                                                                                          |
| `readonly facebookItem: Locator`            | field          | `page.locator('[role="menuitem"]').filter({ hasText: /facebook/i }).first()` — the canonical Facebook menu-item Locator.                                                                                                                                                                            | Mirror of `copyLinkItem` for the **Facebook** share entry. The same `[role="menuitem"]` posture and `i`-flag posture apply. The host app's button label is `"Facebook"` today; the `i` flag tolerates `"Share to Facebook"` / `"facebook"` / `"FACEBOOK"` drift.                                                                                                                                                                                                                                                                |
| `readonly linkedinItem: Locator`            | field          | `page.locator('[role="menuitem"]').filter({ hasText: /linkedin/i }).first()` — the canonical LinkedIn menu-item Locator.                                                                                                                                                                            | Mirror of `copyLinkItem` for the **LinkedIn** share entry. Note the all-lowercase brand spelling — `"LinkedIn"` is the canonical written form but the `i` flag tolerates `"Linkedin"` / `"linkedin"` / `"Share to LinkedIn"` drift.                                                                                                                                                                                                                                                                                              |
| `constructor(page: Page)`                   | constructor   | Stores the `page` and pre-binds the five Locators in a single pass.                                                                                                                                                                                                                                | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new ShareButton(page)` (no fixture wiring today). The pre-bound posture keeps spec code terse — `shareButton.trigger.isVisible()` is the canonical visibility check.                                                                                                                                                                                                                                  |
| `async open()`                              | method         | `await this.trigger.click()` — single click on the share button trigger.                                                                                                                                                                                                                            | The "open the dropdown" primitive. Symmetric posture with the absent-by-design `selectTwitter()` / `selectFacebook()` / `selectLinkedIn()` methods (see "Why only `open()` and `copyLink()`" below) so a future per-platform action method slots in without bespoke locator construction.                                                                                                                                                                                                                                          |
| `async copyLink()`                          | method         | `await this.open(); await this.copyLinkItem.click();` — composite "open the dropdown then click Copy Link" primitive.                                                                                                                                                                              | The only per-platform action method in the class today. The composite shape is intentional: the dropdown closes after every menu-item click, so a spec that wants to test a different per-platform entry must call `open()` before clicking the entry, but the most-common case (verifying the Copy Link primitive works end-to-end) collapses into a single method call.                                                                                                                                                          |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the share button dropdown on item detail pages.
 */
export class ShareButton {
	readonly page: Page;
	readonly trigger: Locator;
	readonly copyLinkItem: Locator;
	readonly twitterItem: Locator;
	readonly facebookItem: Locator;
	readonly linkedinItem: Locator;

	constructor(page: Page) {
		this.page = page;
		this.trigger = page.locator('button').filter({ hasText: /share/i }).first();
		this.copyLinkItem = page.locator('[role="menuitem"]').filter({ hasText: /copy link/i }).first();
		this.twitterItem = page.locator('[role="menuitem"]').filter({ hasText: /twitter|x \(/i }).first();
		this.facebookItem = page.locator('[role="menuitem"]').filter({ hasText: /facebook/i }).first();
		this.linkedinItem = page.locator('[role="menuitem"]').filter({ hasText: /linkedin/i }).first();
	}

	async open() {
		await this.trigger.click();
	}

	async copyLink() {
		await this.open();
		await this.copyLinkItem.click();
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree share-button
driver stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against the item-detail
  surface.** The share-button dropdown is a single
  item-detail-mounted control — it is not a "page" in the
  URL sense. Inheriting from `BasePage` would force every
  spec that instantiates the driver to pay for the
  `header` / `footer` / `navLinks` Locator resolution even
  when the spec only needs the trigger and the four menu
  items. The standalone class lets a spec compose the
  driver into a larger page object's flow (e.g. an
  `ItemDetailPage` flow that drives the share button as
  one of several item-detail widgets) without inheriting
  page-shell concerns.
- **Reusability on non-item-detail surfaces.** A future
  share button mounted on a profile page (e.g. a
  "share my profile" action), on a collection page
  (e.g. a "share this collection" action), or on a
  per-tag landing page would also be a `ShareButton`
  consumer. Tying the driver to `BasePage`'s global
  `header` Locator would prevent that reuse without
  either a base-class change or a bespoke per-surface
  driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  `theme-toggle.page.ts`, `language-switcher.page.ts`,
  `view-toggle.page.ts`, `scroll-to-top.page.ts`,
  `search-bar.page.ts`, `sort-menu.page.ts`,
  `star-rating.page.ts` — all of which mirror this same
  posture). Keeping the inheritance discipline consistent
  across the public-tree widget drivers makes the tree
  scannable for a new contributor.

## Why `filter({ hasText: /share/i })` and not an `aria-label`

Three reasons the trigger Locator pins to the visible
text via a regex filter instead of `button[aria-label*="share"]`:

- **Production source carries no `aria-label` today.** The
  host app's share button is a plain `<button>` with the
  word "Share" as the visible text; there is no
  `aria-label` to pin against. Adding one purely for the
  e2e suite would be a production-source concession the
  repo prefers to avoid (see
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture).
- **Visible-text invariance.** The button's visible text
  may render as `"Share"`, `"Share this"`, `"Share item"`,
  or any future variant — all of which contain the
  substring `share`. The regex filter pins to the
  invariant. The `i` flag tolerates case drift
  (`"Share"` vs `"share"` vs `"SHARE"`).
- **Strict-mode survives a second share button.** A future
  second share button on the page (e.g. a sticky share
  widget mounted alongside the in-page button, a portal-
  rendered drawer mirror, or an admin-only "share with
  team" action) would still match the regex filter, so
  the `.first()` pin keeps the locator strict-mode-safe.

## Why `[role="menuitem"]` and not a `data-testid`

Three reasons the menu-item Locators pin to the ARIA role
with a `hasText` filter instead of adding
`data-testid="share-menu-item-twitter"`:

- **No production-source change required.** The
  `[role="menuitem"]` role is already there for
  accessibility — adding a `data-testid` would be a
  production-source concession to the e2e suite. Every
  menu library the host app might adopt (HeroUI, Radix,
  Headless UI, shadcn-ui) writes the role as part of the
  ARIA contract, so the selector is invariant to the
  underlying primitive choice.
- **Screen-reader-driven discoverability.** The role is
  the surface a screen reader navigates with; pinning the
  driver to it means the e2e suite drives the UI the
  same way an assistive-technology user does. A
  `data-testid` would be invisible to an a11y audit and
  would drift away from the way users actually interact
  with the dropdown.
- **Strict-mode survives a future second menu.** A future
  second `[role="menuitem"]` group on the same page
  (e.g. a profile-dropdown also rendered on the
  item-detail page header, a navigation submenu, or a
  context menu on a comment) would still match the role
  selector, so the `.first()` pin on each item Locator
  keeps the locator strict-mode-safe and the per-item
  text filter narrows to the right entry.

## Why the Twitter regex uses `/twitter|x \(/i`

Three reasons the Twitter menu-item Locator's `hasText`
filter is `/twitter|x \(/i` instead of `/twitter/i` or
`/x/i`:

- **Survives the X rebrand.** The platform formerly known
  as Twitter rebranded to "X" in mid-2023. The host app
  may render the menu entry as `"Twitter"` (legacy
  string), `"X"` (post-rebrand), or `"X (formerly
  Twitter)"` (transitional copy). The alternation
  `/twitter|x \(/i` matches every variant, so the driver
  is invariant to which copy the host app currently
  ships.
- **`x \(` disambiguates from incidental matches.** A
  bare `/x/i` regex would match every menu item that
  happens to contain a lowercase `x` — `"Export"`,
  `"Excel"`, `"Mailbox"`. The `x \(` fragment (with the
  literal opening parenthesis) is the disambiguating
  detail: only the rebranded Twitter entry renders as
  `"X (formerly Twitter)"` or `"X (Twitter)"` with the
  parenthesis immediately after `X`.
- **The trailing space + `(` survives copy variants.**
  The space-then-paren shape `x \(` matches `"X ("`,
  `"x ("`, `"X (foo)"`, etc. but not `"X-Ray"` or
  `"Mr. X"` — the discipline ensures the regex stays
  strict-mode-safe even if a future copy-team revision
  reshuffles the wording.

## Why `.first()` on every Locator

Three failure modes dropping `.first()` would introduce:

- **Strict-mode collision against a future second share
  trigger.** The host app today renders one share button
  on the item-detail surface; a future sticky share
  widget, mobile-drawer share mirror, or admin-only
  "share with team" trigger would mount a second matching
  `<button>` whose text contains `share`. Dropping
  `.first()` on `trigger` would surface a strict-mode
  violation on every share-button spec on every page that
  ships such a widget.
- **Strict-mode collision against a future second
  dropdown.** A future nested dropdown (e.g. a
  profile-dropdown rendered alongside the share dropdown)
  could render its own `[role="menuitem"]` entries,
  including a second "Copy Link" or "Share to LinkedIn"
  entry. Dropping `.first()` on any of the four item
  Locators would surface a strict-mode violation in that
  case.
- **Strict-mode collision against a portal-rendered
  duplicate.** A future portal-rendered share dropdown
  (e.g. a mobile drawer that mirrors the desktop share
  dropdown) would mount a second instance of the same
  DOM. `.first()` pins to the visible primary instance.

## Why the `i` flag on every regex

Three reasons every `hasText` regex carries the
case-insensitive `i` flag:

- **Locale-style casing drift.** The host app currently
  ships English-language labels in `Title Case`, but a
  future translation pass via `next-intl` could produce
  labels in different casing conventions per language
  (German uses noun capitalisation, French uses sentence
  case). The `i` flag survives every casing variant.
- **Production-source casing drift.** A future redesign
  pass could change `"Share"` to `"share"` (Tailwind's
  lowercase utility-text aesthetic) or `"SHARE"`
  (uppercase emphasis). The `i` flag survives the change.
- **Future-proofing against per-component overrides.** A
  per-tenant override that customises the share-button
  copy (e.g. enterprise tenants who wire a brand-voice
  copy override) could ship arbitrary casing. The `i`
  flag survives every override.

## Why only `open()` and `copyLink()` action methods

Three reasons the file declares the four item Locators
but only two action methods (`open()` and `copyLink()`):

- **`copyLink()` is the only deterministic action.** The
  Copy Link entry writes the page URL to the clipboard
  via `navigator.clipboard.writeText(...)`, an action
  whose effect can be verified deterministically in any
  test environment. The per-platform entries
  (`twitterItem` / `facebookItem` / `linkedinItem`) open
  external `window.open(...)` URLs to the platform's
  share intent — verifying that flow requires a network
  fetch against `twitter.com` / `facebook.com` /
  `linkedin.com` (which the e2e suite does not do today)
  or a DOM observer for the popup window (which is
  brittle across browser engines). Until the suite grows
  a deterministic harness for popup verification, the
  per-platform entries stay as Locator-only fields.
- **Symmetric posture preserves a future addition.** The
  two action methods are identical-shape one-liners (with
  the `copyLink()` method composing `open()` + the
  copy-link click); a future `selectTwitter()` /
  `selectFacebook()` / `selectLinkedIn()` set would slot
  into the same shape the day a popup-verification
  harness lands. Until then, the missing methods are a
  deliberate signal that the per-platform actions are not
  yet end-to-end-tested.
- **Direct-Locator access discipline.** The four
  `readonly` item fields are intentionally exposed so a
  spec that needs to interact with them (visibility
  check, `getAttribute('href')` audit, accessibility
  audit) can do so without reaching through a method.
  The file's read / write surface is explicit about the
  five Locators being read-and-write surfaces; the two
  action methods are shorthand for the most-common click
  patterns.

## Failure matrix

| Mistake on `share-button.page.ts`                                  | Layer that surfaces it                                                                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                          | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                      |
| Add an `extends BasePage` clause                                   | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell.   |
| Drop `readonly` from `page` or any of the five Locator fields      | Cross-test state-leak risk against shared driver instances.                                                           |
| Switch `trigger` to an `aria-label`-based selector                 | Forces a production-source change to add an `aria-label` purely for the e2e suite; violates production-source-first.  |
| Drop the `i` flag from any regex filter                            | Case-strict matching against the visible text; flakes on any casing drift.                                            |
| Drop `.first()` on any Locator                                     | Strict-mode collision against a future second trigger / dropdown / portal mirror.                                     |
| Switch the Twitter regex to bare `/x/i`                            | Matches every menu item that contains a lowercase `x` (`"Export"`, `"Excel"`); strict-mode chaos.                     |
| Switch the Twitter regex to bare `/twitter/i`                      | Stops matching post-rebrand `"X"` entries; the canonical Twitter / X share entry surfaces as `Locator not found`.     |
| Drop the `[role="menuitem"]` ARIA-role anchor on item Locators     | Selector matches every text-bearing element; strict-mode collisions against incidental DOM with the same text.        |
| Replace `[role="menuitem"]` with a `data-testid`                   | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture.   |
| Add a `selectTwitter()` / `selectFacebook()` / `selectLinkedIn()` method that unconditionally clicks | Spec failures on every CI run that does not configure popup verification for the external share intent. |
| Drop the `copyLink()` composite shape                              | Every spec that wants to verify the Copy Link primitive must wire `open()` + click manually — drifts from canonical.  |
| Drop any of the four item fields                                   | Future per-platform spec must construct the Locator inline — drifts away from the canonical shape.                    |
| Drop the `open()` method while keeping `copyLink()`                | `copyLink()` would still work but specs that test the dropdown opening without clicking an entry would drift inline.  |
| Move the file out of `apps/web-e2e/page-objects/public/`           | `Cannot find module` on every importing spec.                                                                         |
| Rename `ShareButton`                                               | Every importer needs a matching rename.                                                                               |
| Switch the file extension to `.tsx`                                | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                          |
| Drop the trailing newline                                          | Prettier diff.                                                                                                        |
| Ship the file with CRLF line endings                               | Same as above.                                                                                                        |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 3–5     | `/** Page object for the share button dropdown on item detail pages. */`                                          | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                       |
| 6       | `export class ShareButton {`                                                                                      | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                                   |
| 7       | `readonly page: Page;`                                                                                            | Stores the Playwright `Page` handle the constructor receives.                                                                                                                      |
| 8–12    | `readonly trigger / copyLinkItem / twitterItem / facebookItem / linkedinItem: Locator;`                           | Pre-bound five Locators — the trigger button plus the four menu-item entries.                                                                                                      |
| 14–21   | `constructor(page: Page) { this.page = page; this.trigger = …; this.copyLinkItem = …; this.twitterItem = …; this.facebookItem = …; this.linkedinItem = …; }` | Stores the `page` and pre-binds the five Locators in a single pass. Each `hasText` regex carries the `i` flag and each Locator carries the `.first()` pin.                          |
| 23–25   | `async open() { await this.trigger.click(); }`                                                                    | The "open the dropdown" primitive — single click on the trigger button.                                                                                                            |
| 27–30   | `async copyLink() { await this.open(); await this.copyLinkItem.click(); }`                                        | The composite "open the dropdown then click Copy Link" primitive — the only end-to-end action method in the class today.                                                           |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                                          | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/share-button.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/share-button.spec.ts) | The trigger-visibility check (`shareButton.trigger.isVisible()`); the menu-item count check (`page.locator('[role="menuitem"]').count()`) | Calls `open()` to drive the dropdown open; relies on Playwright's `expect(...).toBeVisible()` against the trigger.                                                                                                                                                                       |
| Future smoke / a11y specs                                                                                                              | The four item Locators for per-platform `getAttribute('href')` audits, `aria-label` audits, role-count audits  | Calls `copyLink()` for clipboard-write verification once the suite grows a clipboard-read harness; future `selectTwitter()` / `selectFacebook()` / `selectLinkedIn()` once popup-verification lands.                                                                                    |
| Item-detail-page production-source component (the production source for the DOM contract)                                              | The `<button>` trigger's visible text; the four `[role="menuitem"]` entries' visible text; the dropdown open / close transitions | Writes the `<button>` element and the four `[role="menuitem"]` rows when the user clicks the trigger; writes the clipboard via `navigator.clipboard.writeText(...)` when the user clicks Copy Link; writes a `window.open(...)` popup when the user clicks any per-platform entry.       |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                                          | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/discover/1` path the consuming spec navigates to via `baseURL` before clicking through to an item-detail page. | —                                                                                                                                                                                                                                                                                       |
| [`discover-page-object.md`](discover-page-object.md)                                                                                   | The `/discover/[N]` listing-route contract the consuming spec follows before reaching the share button.        | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the trigger from `<button>"Share"</button>` to `<button>"Send"</button>` (drops the `share` substring) | `shareButton.trigger.isVisible()` returns `false`; both consuming tests soft-skip with `test.skip(true, …)` — silent regression because the trigger gate is non-strict.                            |
| Production-source switch from `<button>` elements to a `<a>` link                                      | The `page.locator('button').filter({ hasText: /share/i })` resolution fails to find the trigger; the consuming spec soft-skips silently.                                                          |
| Production-source switch from `[role="menuitem"]` to `<a>` link rows                                   | The four item Locators fail to find any matches; `copyLink()` fails with a Playwright timeout on the menu-item click.                                                                              |
| Production-source rename of the Copy Link entry from `"Copy Link"` to `"Copy URL"`                     | `copyLink()` fails with a Playwright timeout on the menu-item click; specs that do not call `copyLink()` are unaffected.                                                                           |
| Production-source rename of the Twitter entry to `"X-Tweet"` (no `x \(` substring)                     | The `twitterItem` Locator returns no match; future per-platform spec fails when it tries to interact with the entry.                                                                              |
| Production-source rename of the Facebook entry from `"Facebook"` to `"Meta"`                           | The `facebookItem` Locator returns no match; future per-platform spec fails when it tries to interact with the entry.                                                                              |
| Item-detail route change (`/items/[slug]` → `/listings/[slug]`)                                        | The consuming spec's `page.waitForURL(/\/items\//)` times out; the share button is not reached and the spec fails on URL-wait.                                                                     |
| Middleware change that prefixes the listing route (`localePrefix: 'always'`)                           | The consuming spec's `page.goto('/discover/1')` lands on a redirect chain the share button is not part of; `firstItem.toBeVisible()` times out.                                                   |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/discover/1` resolves to a different host; the share button is not present and the spec soft-skips.                                                                                  |
| Removing `[role="menuitem"]` from the dropdown library (e.g. switching from HeroUI to a custom div-soup) | The four item Locators all fail; `copyLink()` and any future per-platform action method fail with timeouts.                                                                                        |

## Change checklist

Any change to `share-button.page.ts` must:

- Audit every spec under
  `apps/web-e2e/tests/public/share-button.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md)
  for the `BasePage` posture — if the new shape inherits
  from `BasePage`, document the why.
- Cross-check the production source for the item-detail
  share-button component for the trigger's visible text,
  the four menu-item entries' visible text, the
  `[role="menuitem"]` ARIA contract on every dropdown
  row, and the host app's clipboard-write / `window.open`
  posture for the Copy Link / per-platform actions.
- Cross-check [`discover-page-object.md`](discover-page-object.md)
  for the `/discover/[N]` listing-route contract the
  consuming spec follows before reaching the
  item-detail share button.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md)
  for the `baseURL` posture the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) —
  today the driver is instantiated inline by the consuming
  spec, but a future fixture-bound share button would
  surface here.
- Cross-check the per-platform popup-verification harness
  if a future `selectTwitter()` / `selectFacebook()` /
  `selectLinkedIn()` method is added.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the
  share-button spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Share Button"`).
- Add a [`docs/log.md`](../log.md) entry describing the
  change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that
  affects test authoring.
- Reviewer pass.
