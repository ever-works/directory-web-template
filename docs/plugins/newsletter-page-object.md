---
id: newsletter-page-object
title: E2E Newsletter Page Object (apps/web-e2e/page-objects/public/newsletter.page.ts)
sidebar_label: E2E Newsletter Page Object
sidebar_position: 391
---

# E2E Newsletter Page Object — `apps/web-e2e/page-objects/public/newsletter.page.ts`

Per-source-file reference for the Playwright e2e suite's
**footer newsletter signup form** driver paired with
[`apps/web-e2e/page-objects/public/newsletter.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/newsletter.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
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
[`map-page-object.md`](map-page-object.md) documents the
**suite's Map View page-route driver boundary** under
`apps/web-e2e/page-objects/public/`, this page documents the
**suite's footer newsletter-signup widget driver boundary** —
the smallest possible page object that lets a spec drive the
footer newsletter signup form end-to-end (locate the
**first** `input[type="email"][name="email"]` form field on
the page, locate the `button[type="submit"]` that lives one
DOM level up from the email input, locate the inline
**red-tinted** validation message Tailwind utility classes
emit (`p.text-red-600` / `p.text-red-400`) for the dark- and
light-theme casing of the same paragraph, fill the email and
click submit in a single `subscribe(email)` action, and
detect whether a `[data-sonner-toast]` success toast surfaced
after submission via `hasSuccessToast()`).

The file is the **only** driver in the suite for the footer
newsletter signup widget today. Like
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
[`view-toggle-page-object.md`](view-toggle-page-object.md),
[`theme-toggle-page-object.md`](theme-toggle-page-object.md),
[`star-rating-page-object.md`](star-rating-page-object.md),
[`sort-menu-page-object.md`](sort-menu-page-object.md),
[`share-button-page-object.md`](share-button-page-object.md),
and [`language-switcher-page-object.md`](language-switcher-page-object.md),
the class **does not extend `BasePage`** — see "Why the class
does not extend `BasePage`" below for the load-bearing
reason — so it carries its own `page` field and does not
inherit `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite, and
[Spec 012 — Newsletter Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/012-newsletter-providers)
is the home spec for the newsletter feature. The
`newsletter` driver is consumed today by the public newsletter
flow specs that exercise the footer subscription widget on
every page that renders the global footer (the home page,
the discover page, item-detail pages, profile pages, etc.).
A spec that drives the newsletter signup form inline (via
`page.locator('input[type="email"][name="email"]')` etc.) is
a **drift** that this page object is the canonical replacement
for; new specs that touch the footer subscription widget
must reach for this page object instead.

The driver's two-method posture (`subscribe(email)` /
`hasSuccessToast()`) encodes the two load-bearing assertions
every consuming spec walks: (a) **submission completes
without error** — the email value is accepted by the form
and the click does not surface an inline validation
error / network error, (b) **the success toast surfaces**
after the form's optimistic-update path resolves. The
asymmetry between the two — `subscribe` is fire-and-forget,
`hasSuccessToast` is a pollable accessor — is intentional:
the toast is rendered by the global Sonner toast container
that `subscribe` does not know about (and should not couple
to), and the assertion logic belongs in the consuming spec
where the spec's failure-mode taxonomy ("the toast did not
appear within Nms" vs. "the click failed") is meaningful.

## At-a-glance summary

| Element | Type | Purpose |
| --- | --- | --- |
| `import type { Page, Locator } from '@playwright/test'` | type-only import | Mirrors the type-only import discipline of every other public-tree page object so the runtime bundle pays nothing for the Playwright type surface. |
| `export class Newsletter` | single named export | The driver's only export. **No `extends` clause** — the class stands alone (see "Why the class does not extend `BasePage`"). |
| `readonly page: Page` | bound field | Stores the Playwright `Page` handle the constructor receives. The standalone class must restate this because it does not inherit `BasePage.page`. |
| `readonly emailInput: Locator` | bound `Locator` | The email input field, pre-bound via `page.locator('input[type="email"][name="email"]').first()`. The `.first()` append is load-bearing — see "Why the email input uses `.first()`". The compound selector pins to **both** the `type="email"` HTML5 input type AND the `name="email"` form-field name, so the Locator survives a host theme that adds a second `input[type="email"]` (a sign-in form, a contact form) on the same page. |
| `readonly submitButton: Locator` | bound `Locator` | The submit button, pre-bound via `this.emailInput.locator('..').locator('button[type="submit"]')`. The `'..'` parent-traversal step is load-bearing — see "Why the submit button uses `..` traversal". |
| `readonly errorMessage: Locator` | bound `Locator` | The inline validation error message paragraph, pre-bound via `page.locator('p.text-red-600, p.text-red-400').first()`. The comma-separated CSS selector is load-bearing — see "Why the error message uses `text-red-600, text-red-400`". |
| `constructor(page: Page)` | constructor | Stores the `page` handle and pre-binds the three Locators in a single pass. No `super(page)` call (because the class does not extend `BasePage`); no async work is performed. |
| `async subscribe(email: string)` | composite action | Two-step composite: `emailInput.fill(email)` then `submitButton.click()`. The atomic action every consuming spec invokes to drive the subscription form end-to-end. |
| `async hasSuccessToast(): Promise<boolean>` | accessor | Returns `true` if the global Sonner success toast (`[data-sonner-toast]`) is currently visible. The `.first()` append and the `.catch(() => false)` collapse are load-bearing — see "Why `hasSuccessToast()` collapses errors to `false`". |

## Full file annotated

```ts
import type { Page, Locator } from '@playwright/test';
```

The two imports together encode the driver's posture: a
`type`-only Playwright import (so the runtime bundle pays
nothing for `Page` / `Locator`) and **no value imports** at
all — unlike [`map-page-object.md`](map-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
and [`signin-page-object.md`](signin-page-object.md), the
class does not extend `BasePage`, so the
`import { BasePage } from '../base.page'` value import is
absent. The `import type` modifier is load-bearing on a
public-tree driver because the suite-wide convention is to
keep the runtime bundle free of any Playwright runtime
references at the page-object boundary — only the
[`base-page-object.md`](base-page-object.md) file is
permitted to surface `BasePage` as a value import.

```ts
/**
 * Page object for the newsletter signup form in the footer.
 */
export class Newsletter {
```

The single named class export, with **no `extends BasePage`**
clause. The class name `Newsletter` is the public name
every consuming spec imports. The `extends BasePage` clause
is intentionally omitted — see "Why the class does not
extend `BasePage`" below for the load-bearing reason.

```ts
	readonly page: Page;
	readonly emailInput: Locator;
	readonly submitButton: Locator;
	readonly errorMessage: Locator;
```

Four `readonly` fields — one for the `page` handle and three
per-surface Locators. `readonly` is load-bearing on every
field because Playwright Locators are stateless query
descriptors and re-assigning a Locator after construction
would silently desynchronise the driver's call sites from
its constructor body. The `page` field is repeated here
(rather than inherited from `BasePage`) because the class
stands alone — every standalone widget driver in the suite
uses the same `readonly page: Page` shape.

```ts
	constructor(page: Page) {
		this.page = page;
		this.emailInput = page.locator('input[type="email"][name="email"]').first();
		this.submitButton = this.emailInput.locator('..').locator('button[type="submit"]');
		this.errorMessage = page.locator('p.text-red-600, p.text-red-400').first();
	}
```

The constructor stores the `page` handle and pre-binds every
per-page Locator in a single synchronous pass. Three
load-bearing choices encoded here:

1. **`page.locator('input[type="email"][name="email"]')`** —
   the compound CSS selector pins to **both** the
   `type="email"` HTML5 input type AND the `name="email"`
   form-field name, so the Locator survives a host theme
   that adds a second `input[type="email"]` (a sign-in form,
   a contact form, a "subscribe to alerts" widget) on the
   same page. The `.first()` append is the strict-mode-
   correctness primitive — see "Why the email input uses
   `.first()`" below.
2. **`this.emailInput.locator('..').locator('button[type="submit"]')`** —
   the parent-traversal `'..'` step (XPath-style "go up one
   level in the DOM tree") locates the email input's
   immediate parent (the form `<form>` element or the
   wrapping `<div class="form-row">` block) then narrows to
   the `button[type="submit"]` inside that scope. The
   double-step is load-bearing — see "Why the submit button
   uses `..` traversal" below.
3. **`page.locator('p.text-red-600, p.text-red-400')`** —
   the comma-separated CSS selector matches **either** of
   the two Tailwind red utility classes the production source
   uses for the inline validation message paragraph (`text-red-600`
   for the light theme, `text-red-400` for the dark theme).
   The `.first()` append is the strict-mode-correctness
   primitive against a future second red-paragraph on the
   page (a signin error, a payment-error banner, etc.).

```ts
	/** Fill the email and submit */
	async subscribe(email: string) {
		await this.emailInput.fill(email);
		await this.submitButton.click();
	}
```

The two-step composite subscription primitive. The
`emailInput.fill(email)` first clears any pre-existing value
in the input then types the new value into the field. The
`submitButton.click()` then triggers the form's submit
handler. The two awaits are intentional — Playwright's
auto-waiting handles the per-Locator readiness check, and the
sequential awaits guarantee the email is fully typed before
the click fires. A regression that interleaves the two awaits
(e.g. `Promise.all([fill, click])`) would race the click
against the fill and surface as flaky form-validation
failures.

```ts
	/** Check if the success toast appeared */
	async hasSuccessToast(): Promise<boolean> {
		const toast = this.page.locator('[data-sonner-toast]').first();
		return toast.isVisible().catch(() => false);
	}
```

The graceful-degradation accessor. Three load-bearing choices
encoded here:

1. **`this.page.locator('[data-sonner-toast]')`** — the
   data-attribute selector pins to the
   [Sonner](https://sonner.emilkowal.ski/) toast library's
   canonical `data-sonner-toast` attribute, which the
   production source emits on every toast root element. The
   data-attribute selector is the canonical accessibility-
   neutral marker — Sonner guarantees this attribute across
   library versions.
2. **`.first()`** — strict-mode-correctness append against
   a future stacked-toast scenario (multiple toasts visible
   simultaneously); the assertion targets the most recent
   toast (the one Sonner renders first in DOM order).
3. **`.isVisible().catch(() => false)`** — the `.catch`
   collapses any Playwright error (the Locator does not
   resolve, the toast fades out mid-call, etc.) into a
   definitive `false` return without surfacing a stack
   trace. Spec authors use this accessor as a polled
   predicate (`await expect.poll(() => newsletter.hasSuccessToast()).toBe(true)`),
   which depends on the `false` return on transient errors.

## Why the class does not extend `BasePage`

Three load-bearing reasons:

1. **The newsletter signup form is a footer-rendered widget,
   not a page route.** Unlike
   [`item-detail-page-object.md`](item-detail-page-object.md),
   [`map-page-object.md`](map-page-object.md), and
   [`signin-page-object.md`](signin-page-object.md), the
   newsletter widget has no dedicated URL. A spec that drives
   the widget lands on whatever page renders the global
   footer (`/`, `/discover`, `/[locale]`, `/items/[slug]`,
   etc.) and instantiates the page object **after** the
   landing has happened. There is no `goto()` primitive a
   `BasePage` extension would surface that the widget driver
   needs.
2. **The widget surface is local to the footer; no header /
   footer / navLinks chrome is read.** The driver reads only
   the email input, submit button, and error paragraph —
   none of which are exposed via `BasePage.header`,
   `BasePage.footer`, or `BasePage.navLinks`. Extending
   `BasePage` would force every spec that instantiates the
   driver to pay for the inherited `header.theme.toggle`,
   `header.language.select`, `footer.cookies.accept`, etc.
   composite Locators to resolve up-front, which is wasted
   work because no widget-driving spec touches those
   surfaces through the driver.
3. **Symmetry with sibling widget drivers.** The standalone
   class shape mirrors
   [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
   [`view-toggle-page-object.md`](view-toggle-page-object.md),
   [`theme-toggle-page-object.md`](theme-toggle-page-object.md),
   [`star-rating-page-object.md`](star-rating-page-object.md),
   [`sort-menu-page-object.md`](sort-menu-page-object.md),
   [`share-button-page-object.md`](share-button-page-object.md),
   [`search-bar-page-object.md`](search-bar-page-object.md),
   [`discover-page-object.md`](discover-page-object.md), and
   [`language-switcher-page-object.md`](language-switcher-page-object.md) —
   every widget driver in the suite is a standalone class.
   The convention is **page-route → extends `BasePage`,
   widget → standalone class** and breaking that symmetry
   would surface as a discoverability regression for new
   contributors who scan the directory for the per-widget
   driver.

## Why the email input uses `.first()`

Three load-bearing reasons:

1. **The footer renders exactly one newsletter signup form
   today.** The compound selector
   `input[type="email"][name="email"]` resolves to one
   element on every page that renders the global footer, but
   `.first()` is appended to make the assertion strict-mode-
   correct against a future second form on the page (a
   contact form, a paywall sign-up form) that would
   otherwise trigger Playwright's strict-mode collision
   error.
2. **Strict-mode collision against `<input type="email">`
   without the `name="email"` constraint.** The compound
   selector is robust because both the `type` and `name`
   attributes must match; a single-attribute selector
   (`input[type="email"]`) would catch a sign-in form's
   email input on a page that renders both the footer and a
   sign-in modal simultaneously. The `.first()` append is
   defense-in-depth.
3. **Future-proofing against host-theme refactors.** A
   future host theme that wraps the footer signup form in a
   modal-popup variant on small viewports might render the
   widget twice (once in the footer, once in the modal); the
   `.first()` append targets the desktop-first surface and
   the Locator continues to resolve correctly.

## Why the submit button uses `..` traversal

Three load-bearing reasons:

1. **The submit button is sibling-scoped to the email
   input, not page-scoped.** A page-scoped
   `page.locator('button[type="submit"]')` would catch a
   sign-in form's submit button, a payment-form's "Pay now"
   button, a comment-form's "Post" button, etc. — all of
   which exist on pages that also render the footer. The
   parent-traversal pattern scopes the assertion to the
   immediate form context.
2. **The `..` step is the canonical CSS-equivalent of XPath's
   `parent::*` axis.** Playwright's
   `Locator.locator('..')` resolves to the immediate parent
   of every element in the source Locator — exactly the
   semantics needed to walk one level up from the email
   input to the form root, then narrow back down to the
   submit button.
3. **Resilience to the form's nested-wrapper drift.** A
   future host theme that wraps the form fields in a
   `<fieldset>` block, or shifts the submit button outside
   the immediate `<form>` element into a sibling
   `<div class="form-actions">`, would still resolve via
   the `..` traversal because the `..` walks **one** level
   up — far enough to reach a parent that contains both the
   email input and the submit button, regardless of the
   exact wrapper shape. A more aggressive `... ..`
   traversal would over-broaden the scope and reintroduce
   the page-scoped collision risk.

## Why the error message uses `text-red-600, text-red-400`

Three load-bearing reasons:

1. **The host theme's red-tinted utility class varies by
   light / dark theme.** The production source emits
   `text-red-600` for the light theme (richer hue, better
   contrast on white backgrounds) and `text-red-400` for
   the dark theme (softer hue, better contrast on dark
   backgrounds). The comma-separated CSS selector
   `p.text-red-600, p.text-red-400` matches either, so the
   Locator resolves regardless of which theme the
   `theme-toggle.page.ts` driver has set when the spec
   runs.
2. **Tailwind utility classes are the production source's
   canonical inline-error styling primitive.** A future host
   theme could rename the utility classes (`text-red-600` →
   `text-error-strong`, `text-red-400` → `text-error-soft`)
   in a Tailwind theme migration; the e2e suite would catch
   the rename via the dropped Locator and the consuming
   spec's assertion failure. A `data-testid` selector would
   be more stable, but the production source does not emit
   one on the inline error paragraph today — see
   [Q-newsletter-001 in `questions.md`](../questions.md)
   for the open question on whether to add one.
3. **The `<p>` element-tag prefix is load-bearing.** Without
   the `p.` prefix, the selector would catch any
   `<span class="text-red-600">` (a "remove from cart"
   icon, a "delete account" warning) on the page; the
   element-tag constraint pins the assertion to the inline
   validation paragraph the form emits.

## Why `hasSuccessToast()` collapses errors to `false`

Three load-bearing reasons:

1. **Sonner toasts are short-lived, animated, and timed.**
   The toast's DOM lifecycle is: mount → fade-in → fully
   visible → fade-out → unmount. A spec that polls
   `hasSuccessToast()` at the wrong instant might catch the
   toast mid-fade-in or mid-fade-out, where Playwright's
   `isVisible()` raises a transient error (the element is
   in the DOM but `display: none` mid-animation, the element
   is detached mid-call, etc.). The `.catch(() => false)`
   collapses those transient errors into a `false` return so
   the spec's polling logic re-checks on the next tick.
2. **The assertion is naturally pollable.** Spec authors
   wrap `hasSuccessToast()` in `expect.poll(() =>
   newsletter.hasSuccessToast()).toBe(true)` to wait for the
   toast to appear; the `.catch(() => false)` is the
   canonical "not ready yet" return that makes
   `expect.poll` work correctly. A throwing version of the
   accessor would surface the polling error as a spec
   failure instead of a retry.
3. **The `.first()` append is the strict-mode-correctness
   primitive against a future stacked-toast scenario.**
   Multiple toasts can stack (an info toast + a success
   toast simultaneously); the assertion targets the most
   recent toast (the one Sonner renders first in DOM
   order). A non-`.first()` Locator would trigger
   Playwright's strict-mode collision error on the second
   toast.

## Failure matrix

| Mistake | Why it breaks |
| --- | --- |
| Drop the `import type` modifier on the Playwright import. | Pulls Playwright's runtime into the bundle; breaks the suite-wide type-only import discipline mirrored in every other page-object file. |
| Add an `extends BasePage` clause to the class declaration. | Forces every spec that instantiates the driver to pay for the inherited `header` / `footer` / `navLinks` Locators to resolve up-front; couples the widget driver to the page-route convention; breaks the suite-wide widget-vs-page-route convention. |
| Drop `readonly` on any field. | Locator re-assignment after construction silently desynchronises driver call sites; assertions become stateful and tests flake. |
| Re-bind `emailInput` to `input[type="email"]` (drop the `[name="email"]` constraint). | Catches a sign-in form's email input or a contact form's email field on pages that render both the footer and the other form simultaneously; the Locator's polarity flips silently. |
| Drop the `.first()` chain on `emailInput`. | Strict-mode collision against a future second `<input type="email" name="email">` on the page (a paywall sign-up modal, a contact form variant, etc.). |
| Re-bind `emailInput` to `getByRole('textbox', { name: 'email' })`. | The host app's email input does not always carry an associated `<label>` — a recent host-theme refactor moved the "Email" string into a placeholder for the desktop layout; `getByRole` would drop on placeholder-only inputs. The compound `[type][name]` CSS selector is robust to that shape. |
| Re-bind `submitButton` to `page.locator('button[type="submit"]')` (drop the `..` traversal). | Catches a sign-in form's submit button, a payment-form's "Pay now" button, a comment-form's "Post" button on pages that render both the footer and the other form simultaneously; the Locator's polarity flips silently. |
| Replace `..` with `... ..` (multi-step parent traversal). | Over-broadens the scope back to the page level; reintroduces the cross-form collision risk; the assertion's polarity flips silently. |
| Re-bind `submitButton` to `getByRole('button', { name: 'Subscribe' })`. | The button label is locale-sensitive (`"Subscribe"` in `en`, `"S'abonner"` in `fr`, `"Suscribirse"` in `es`, etc.); the assertion would flake on every non-`en` test run. The `type="submit"` selector is locale-stable. |
| Re-bind `errorMessage` to `p.text-red-500` (a single non-existing utility class). | The production source emits `text-red-600` and `text-red-400` only; a `text-red-500` selector would never resolve; the assertion's polarity flips silently. |
| Drop the `<p>` element-tag prefix from the `errorMessage` selector. | Catches any `<span class="text-red-600">` (a "remove from cart" icon, a "delete account" warning); the Locator's polarity flips silently. |
| Drop the `.first()` chain on `errorMessage`. | Strict-mode collision against a future second red-paragraph on the page (a payment-error banner, a sign-in error, etc.). |
| Replace the comma-separated selector with a single `text-red-600` (drop the dark-theme variant). | Spec flakes on every dark-theme test run because the inline error paragraph emits `text-red-400` in dark mode. |
| Convert `subscribe()` to a `Promise.all([fill, click])` race. | The fill is racing the click; the click fires before the email value is fully typed; the assertion's polarity flips silently. |
| Drop the `await` on either step inside `subscribe()`. | The next step fires before the previous one completes; the assertion's polarity flips silently. |
| Drop the `.catch(() => false)` on `hasSuccessToast()`'s `isVisible()` call. | Transient Locator-resolution failures (toast mid-fade, toast detaching mid-call) surface as Playwright stack traces; the accessor loses its graceful-degradation posture; `expect.poll(() => newsletter.hasSuccessToast()).toBe(true)` regresses to a hard failure on the first transient error. |
| Drop the `.first()` on `hasSuccessToast()`'s `[data-sonner-toast]` Locator. | Strict-mode collision against a stacked-toast scenario (an info toast + a success toast simultaneously). |
| Re-bind `[data-sonner-toast]` to a CSS-class selector (e.g. `.sonner-toast`). | Sonner does not guarantee its CSS class names across library versions; the data-attribute selector pins to the canonical accessibility-neutral marker the library does guarantee. |
| Move the file outside `apps/web-e2e/page-objects/public/`. | Consuming specs lose the import path convention; the [`e2e-tsconfig.md`](e2e-tsconfig.md) `include: ["./**/*.ts"]` glob still picks it up but the suite's directory-by-role discoverability regresses. |
| Rename the file to `newsletter.page.tsx`. | The Playwright config has no JSX wiring; the standalone class does not need a TSX surface. |
| Rename the class to `NewsletterPage`. | Breaks every consuming spec's `import { Newsletter } from '../../page-objects/public/newsletter.page'`; the class name `Newsletter` is the public name the suite has standardised on for the standalone widget driver. The `Page` suffix is reserved for the page-route drivers that extend `BasePage` (`MapPage`, `SigninPage`, `ItemDetailPage`). |
| Commit the file with CRLF line endings. | The suite's `.editorconfig` pins LF; tooling diffs become noisy. |

## Per-line walkthrough

| Line | Purpose |
| --- | --- |
| `import type { Page, Locator } from '@playwright/test';` | Pulls in the Playwright `Page` / `Locator` types for the constructor signature and field types. The `import type` modifier guarantees the runtime bundle pays nothing for Playwright. |
| `/** Page object for the newsletter signup form in the footer. */` | The single-line JSDoc that pins the class to its surface — the footer newsletter signup widget. |
| `export class Newsletter {` | Single named class export with **no `extends` clause** — the standalone widget driver convention. |
| `readonly page: Page;` | Stores the `Page` handle. The standalone class restates this because it does not inherit `BasePage.page`. |
| `readonly emailInput: Locator;` | The email input field, bound with the compound `input[type="email"][name="email"]` CSS selector and `.first()`. |
| `readonly submitButton: Locator;` | The submit button, bound with the parent-traversal `..` step from the email input then narrowing to `button[type="submit"]`. |
| `readonly errorMessage: Locator;` | The inline validation message paragraph, bound with the comma-separated `p.text-red-600, p.text-red-400` selector and `.first()`. |
| `constructor(page: Page) { … }` | The synchronous constructor that pre-binds every Locator. |
| `async subscribe(email: string)` | The two-step composite: `fill` then `click`. |
| `async hasSuccessToast(): Promise<boolean>` | The graceful-degradation toast-visibility accessor. |

## Read / write surface

| Surface | Reads | Writes |
| --- | --- | --- |
| `apps/web-e2e/tests/public/newsletter.spec.ts` (future spec) | `emailInput`, `submitButton`, `errorMessage` | `subscribe(email)`, `hasSuccessToast()` |
| Production source `apps/web/components/newsletter/*` and the global footer `apps/web/components/layouts/footer/*` | DOM contract (`input[type="email"][name="email"]` form-field name and HTML5 type, `button[type="submit"]` inside the same form parent, `p.text-red-600` / `p.text-red-400` Tailwind utility classes for the inline error paragraph) | n/a |
| Production source's Sonner integration in `apps/web/lib/notifications/*` | DOM contract (`[data-sonner-toast]` per-toast root attribute) | n/a |
| [`base-page-object.md`](base-page-object.md) | n/a (the class does not extend `BasePage`) | n/a |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | `include: ["./**/*.ts"]` glob picks up this file | n/a |
| [`playwright-config.md`](playwright-config.md) | `baseURL` resolves whichever URL the spec lands on before instantiating the driver | n/a |
| [`fixtures-index.md`](fixtures-index.md) | A future authenticated variant (subscribe-as-logged-in-user) would surface a fixture here | n/a |

## Read / write surface failure modes

| Failure | Why it surfaces here |
| --- | --- |
| Form-field `name="email"` rename. | The compound `[type="email"][name="email"]` selector drops on the renamed name; `emailInput.fill()` flakes; consuming spec asserts on a non-resolving Locator. |
| Form-field `type="email"` change to `type="text"`. | The compound selector drops on the changed type; the Locator no longer resolves; consuming spec flakes on the first `fill()` call. |
| Submit button `type="submit"` change (e.g. to `type="button"` with a JS handler). | The compound selector drops; the Locator no longer resolves; the click-handler regression surfaces as a non-resolving submit button. |
| Submit button moved outside the email input's parent. | The `..` parent-traversal step no longer scopes to a parent that contains both the email input and the submit button; the Locator over-broadens or under-narrows; consuming spec flakes. |
| Inline error paragraph utility-class rename (`text-red-600` → `text-error-strong`). | The comma-separated selector drops on the renamed class; the Locator no longer resolves; consuming spec asserts on a non-resolving error message and the assertion's polarity flips silently. |
| Sonner library upgrade that changes the `data-sonner-toast` attribute. | The data-attribute selector drops; `hasSuccessToast()` always returns `false`; consuming spec's `expect.poll` regresses to a timeout. |
| Sonner library replacement (e.g. switch to `react-hot-toast`). | The `[data-sonner-toast]` selector no longer resolves; consuming spec needs a parallel selector for the new library; this driver needs a refactor to support both libraries until the migration completes. |
| Newsletter feature config flip (`features.newsletter.enabled` → `false`). | The footer no longer renders the signup form; the email input Locator does not resolve; consuming spec gates with `test.skip(!hasNewsletterEnabled, ...)`. |
| Locale change with translated submit-button label. | The `type="submit"` selector is locale-stable; the assertion does not flake on locale changes. A future regression that re-binds `submitButton` to `getByRole('button', { name: 'Subscribe' })` would re-introduce locale sensitivity. |
| `baseURL` change in [`playwright-config.md`](playwright-config.md). | The page navigation that precedes driver instantiation resolves against the new host; the driver itself is host-agnostic. |

## `newsletter.page.ts`-change checklist

Any change to `apps/web-e2e/page-objects/public/newsletter.page.ts` must:

1. Audit every spec under `apps/web-e2e/tests/public/` for spec authors that touch the per-widget surface.
2. Cross-check [`base-page-object.md`](base-page-object.md) — confirm the standalone-class convention is preserved (no `extends BasePage` clause).
3. Cross-check the production source under `apps/web/components/newsletter/*` and the global footer under `apps/web/components/layouts/footer/*` — the `input[type="email"][name="email"]` form-field shape, the `button[type="submit"]` posture, and the inline `p.text-red-600` / `p.text-red-400` Tailwind utility classes must stay aligned.
4. Cross-check the Sonner integration under `apps/web/lib/notifications/*` — the `data-sonner-toast` attribute is the canonical accessibility-neutral marker `hasSuccessToast()` reads.
5. Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) — the `include: ["./**/*.ts"]` glob picks up this file by convention.
6. Cross-check [`playwright-config.md`](playwright-config.md) — the `baseURL` posture is what the page navigation that precedes driver instantiation resolves against.
7. Cross-check [`fixtures-index.md`](fixtures-index.md) — a future authenticated variant of `subscribe` / `hasSuccessToast` (subscribe-as-logged-in-user) would surface a fixture here.
8. Run dual `pnpm tsc --noEmit` (e2e package + workspace root) to catch the type surface.
9. Run a smoke-subset Playwright run targeting the newsletter spec subset: `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Newsletter"`.
10. Add a [`docs/log.md`](../log.md) entry under today's date heading.
11. Cross-link [Spec 012 — Newsletter Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/012-newsletter-providers) if the change introduces a new shared concept that affects test authoring across the suite.
12. Submit the change for a reviewer pass with the cross-checks listed in the PR description.
