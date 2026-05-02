---
id: signin-page-object
title: E2E Sign-in Page Object (apps/web-e2e/page-objects/auth/signin.page.ts)
sidebar_label: E2E Sign-in Page Object
sidebar_position: 370
---

# E2E Sign-in Page Object — `apps/web-e2e/page-objects/auth/signin.page.ts`

Per-source-file reference for the Playwright e2e suite's
sole `auth/`-tree page object paired with
[`apps/web-e2e/page-objects/auth/signin.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/auth/signin.page.ts).
Sits at the root of the `auth/` page-object subtree the same
way [`base-page-object.md`](base-page-object.md) sits at the
root of the page-objects tree as a whole, the same way
[`fixtures-index.md`](fixtures-index.md) sits at the root of
the fixtures tree, and the same way
[`e2e-test-data.md`](e2e-test-data.md) sits at the root of the
helpers tree.

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`auth-fixture.md`](auth-fixture.md) documents the **suite's
authenticated-fixture boundary** that turns the persisted
storage states minted at pre-flight into per-test isolated
contexts, this page documents the **suite's sign-in surface
boundary** — the smallest possible page object that lets a
spec drive `/auth/signin` end-to-end (fill the email, fill the
password, submit, optionally wait for the post-sign-in
redirect, observe the success / error alerts).

The file is the **only** page object under
`apps/web-e2e/page-objects/auth/` today (every other auth-flow
page object — sign-up, forgot password, reset password, verify
email — is still authored inline inside its spec). The
single-export shape is a deliberate choice: it gives the suite
a narrow, focused surface that is **just** the sign-in form,
not a kitchen-sink "every auth flow" page object that would
accumulate methods every spec drift would touch.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The auth-flow
spec set under `apps/web-e2e/tests/auth/` covers:

- The unauthenticated `auth/signin` redirect-on-success flow.
- The unauthenticated `auth/signin` invalid-credentials error
  flow.
- The unauthenticated `auth/signin` "forgot password" deep-link
  to `/auth/forgot-password`.
- The unauthenticated `auth/signup` flow (different page
  object, inline today).
- The unauthenticated `auth/forgot-password` flow (different
  page object, inline today).
- The post-sign-in redirect to `/`, `/profile`, or whatever
  `callbackUrl` the spec set.

Every one of those flows that uses the `/auth/signin` form
goes through this page object. A spec that drives the form
inline (via `page.fill('#email', ...)`) is a **drift** that
this page object is the canonical replacement for; new specs
that touch sign-in must reach for this page object instead.

## At a glance

| Element                              | Type            | What it is                                                                                                                                                                                                                                                       | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`      | typed import    | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                            | The auth tree shares the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a sign-in driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Concrete-class import of the inheritance root. The relative path `../base.page` (no extension) is resolved by `e2e-tsconfig.json`'s `moduleResolution: 'bundler'` posture (see [`e2e-tsconfig.md`](e2e-tsconfig.md)).                                              | This is the **only** runtime import in the file. Every other identifier (`Page`, `Locator`) is a type. The base class is what gives `SignInPage` its `goto`, `gotoLocalized`, `waitForPageReady`, and `getTitle` methods — `SignInPage` adds five `Locator`-bearing fields and three sign-in-specific methods on top of the inherited surface.                                                                              |
| `export class SignInPage extends BasePage` | named export    | Single class declaration. The `extends BasePage` clause is what locks the constructor signature to `(page: Page)` (see [`base-page-object.md`](base-page-object.md)).                                                                                              | A class that did not extend `BasePage` would force every spec to wire its own header / footer / nav-link locators every time. The inheritance gives `SignInPage` a free `header` / `footer` / `navLinks` triplet so a spec can assert "the site shell is rendered, the email input is the focused control" in one breath.                                                                                                  |
| `readonly emailInput: Locator`       | field           | Pre-bound email-input Locator scoped to the auth form (`form` that contains a `#email` input). Resolved at construction so a spec uses `signinPage.emailInput` instead of re-resolving the locator on every assertion.                                              | Pre-binding gives every consumer a stable handle that survives the page object lifetime. Resolving inside `signIn()` only would force assertions like `expect(signinPage.emailInput).toBeFocused()` to re-author the locator inline.                                                                                                                                                                                       |
| `readonly passwordInput: Locator`    | field           | Pre-bound password-input Locator (`#password` inside the auth form). Same form-scoped resolution as `emailInput`.                                                                                                                                                  | Same shape as `emailInput` — the pair travel together. Pre-binding here keeps the `signIn()` method body free of locator construction, which the per-line walkthrough below documents.                                                                                                                                                                                                                                     |
| `readonly submitButton: Locator`     | field           | `page.getByRole('button', { name: /sign in/i })` — the role-based, regex-name lookup that survives translation churn (an `i18n` rename of the button label from "Sign In" → "Login" → "Sign in" still matches the case-insensitive `sign in` regex).               | The submit button is the only field **not** scoped to the auth form, because the role+name strict-mode locator already pins to the single visible "Sign in" button on the page. Scoping it to the auth form would couple the spec to the form structure (a refactor that moves the button outside the `<form>` would break every spec); the role+name pinning is invariant to that refactor.                              |
| `readonly forgotPasswordLink: Locator` | field         | Pre-bound "Forgot password?" link (`a[href*="forgot-password"]` inside the auth form). The `href*=` (substring) attribute selector is invariant to the locale-prefix posture documented in [`base-page-object.md`](base-page-object.md#why-gotolocalized-special-cases-en) — `/auth/forgot-password` (English) and `/fr/auth/forgot-password` (French) both contain the substring. | Locale-invariant pinning. A `[href="/auth/forgot-password"]` exact match would fail every non-English locale's render. The substring match keeps the page object usable across the suite's six locales (EN / FR / ES / DE / AR / ZH).                                                                                                                                                                                      |
| `readonly errorAlert: Locator`       | field           | `page.locator('.bg-red-50').first()` — the auth form's error banner. `.first()` pins the locator to the first match (mirroring the [`base-page-object.md`](base-page-object.md#why-pagelocatorheaderfirst-and-not-a-plain-header) `header` / `footer` posture).      | Sign-in errors render in a `.bg-red-50` banner today (see [`apps/web/components/auth/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/components/auth) sign-in form components). The locator survives Tailwind class-list reordering as long as `.bg-red-50` stays in the class list.                                                                                                          |
| `readonly successAlert: Locator`     | field           | `page.locator('.bg-green-50').first()` — the auth form's success banner. Symmetric posture to `errorAlert`.                                                                                                                                                        | Sign-in success renders in a `.bg-green-50` banner today (e.g. on a redirect-success notice or when the form is reused for "Check your email"). Same pinning discipline as `errorAlert`.                                                                                                                                                                                                                                  |
| `constructor(page: Page)`            | constructor     | Stores the `page` (via `super(page)`) and pre-binds the seven Locators above.                                                                                                                                                                                       | Single constructor signature, matches the base class's. Every spec instantiates `new SignInPage(page)` (or pulls one from a fixture).                                                                                                                                                                                                                                                                                       |
| `async navigate()`                   | method          | `await this.goto('/auth/signin')` — wraps the inherited `goto` with the canonical sign-in route. Returns `Promise<void>`.                                                                                                                                          | Single canonical sign-in route — a future move to `/login` lands here, not in every spec. The `domcontentloaded` posture is inherited from [`base-page-object.md`](base-page-object.md#why-goto-uses-waituntil-domcontentloaded), so sign-in specs do not pay for `<Suspense>`-bound auth components to settle before assertions.                                                                                           |
| `async signIn(email, password)`      | method          | Fills `emailInput`, fills `passwordInput`, then presses **Enter** on the password input to submit (instead of clicking `submitButton`). Returns `Promise<void>`.                                                                                                    | Three reasons the **Enter-key** submission posture is the load-bearing choice; see "Why Enter-key submission" below. Every spec that drives a sign-in form goes through this method, so the choice is felt on every auth spec run.                                                                                                                                                                                          |
| `async signInAndWaitForRedirect(email, password, expectedUrl)` | method | Calls `signIn()` and then awaits `page.waitForURL(expectedUrl, { timeout: 60_000 })`. Returns `Promise<void>`.                                                                                                                                                      | The post-sign-in redirect is what every "happy path" sign-in spec asserts. The 60s timeout is generous because the post-sign-in flow can span (a) the NextAuth `signIn()` round trip, (b) a JWT cookie set, (c) a server-side redirect to the original `callbackUrl`, (d) a server component re-render. A shorter timeout flakes on cold-start CI runs.                                                                    |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class SignInPage extends BasePage {
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly submitButton: Locator;
	readonly forgotPasswordLink: Locator;
	readonly errorAlert: Locator;
	readonly successAlert: Locator;

	constructor(page: Page) {
		super(page);
		const authForm = page.locator('form').filter({ has: page.locator('#email') });
		this.emailInput = authForm.locator('#email');
		this.passwordInput = authForm.locator('#password');
		this.submitButton = page.getByRole('button', { name: /sign in/i });
		this.forgotPasswordLink = authForm.locator('a[href*="forgot-password"]');
		this.errorAlert = page.locator('.bg-red-50').first();
		this.successAlert = page.locator('.bg-green-50').first();
	}

	async navigate() {
		await this.goto('/auth/signin');
	}

	async signIn(email: string, password: string) {
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.passwordInput.press('Enter');
	}

	async signInAndWaitForRedirect(email: string, password: string, expectedUrl: string | RegExp) {
		await this.signIn(email, password);
		await this.page.waitForURL(expectedUrl, { timeout: 60_000 });
	}
}
```

## Why scope every form Locator to `authForm`

The constructor does:

```ts
const authForm = page.locator('form').filter({ has: page.locator('#email') });
this.emailInput = authForm.locator('#email');
this.passwordInput = authForm.locator('#password');
this.forgotPasswordLink = authForm.locator('a[href*="forgot-password"]');
```

The `authForm` chain pins the locator to the **specific
`<form>` that contains the `#email` input** before reaching
into it for the email / password / forgot-password
descendants. Three failure modes the form-scoping posture
prevents:

1. **Newsletter / search drawer collision.** A future
   `/auth/signin` page that ships a newsletter sign-up form in
   the footer (a recurring pattern across this template's
   marketing surfaces) would inject a second `#email` into the
   page. An unscoped `page.locator('#email')` would resolve to
   two elements; Playwright's strict-mode locator resolution
   would throw at first use. The form-scoping pins the
   locator to the auth form even with the footer form in
   place.
2. **Auth-shell drift.** The site shell's header at one point
   in the past included a "newsletter signup" inline; future
   contributors might add a newsletter modal triggered from
   the header. The form-scoping is invariant to header shell
   churn.
3. **Sign-up vs sign-in form parity.** The `/auth/signup`
   page reuses `#email` and `#password` IDs. A future spec
   that opens both forms in the same flow (modal sign-in over
   a sign-up landing, for example) would otherwise hit a
   strict-mode collision. The form-scoping keeps `SignInPage`
   safely targeting the sign-in form.

Note that `submitButton`, `errorAlert`, and `successAlert`
are **not** form-scoped — they use role / class lookups that
already pin to the visible button / banner without needing
the form scope. The choice is per-locator: form-scope where
the descendant selector is broad (`#email`, `a[href*=…]`),
unscoped where the selector is already narrow (a role + name
match, a `.first()`-pinned banner).

## Why role+regex name for `submitButton`

`page.getByRole('button', { name: /sign in/i })` is the
load-bearing locator for the only verb the spec drives.
Three rejected alternatives:

1. **Form-scoped role lookup
   (`authForm.getByRole('button', { name: /sign in/i })`).**
   Pin the button inside the auth form. Rejected because the
   button moving outside the `<form>` (a future "submit
   floats below the form" refactor) would break every spec;
   the unscoped role+name lookup is invariant to that
   refactor.
2. **CSS attribute selector (`authForm.locator('button[type="submit"]')`).**
   Pin by `type="submit"`. Rejected because every form has a
   submit button — a future "social login" buttons row inside
   the same form would resolve to multiple matches under
   strict-mode.
3. **Text selector
   (`page.locator('button:has-text("Sign In")')`).** Direct
   text match. Rejected because the suite runs against six
   locales; an `:has-text("Sign In")` selector fails the
   moment the page is rendered in French. Role+name with a
   case-insensitive regex `i` flag matches the
   normalised-by-Playwright accessible name, which Playwright
   resolves through the `aria-label` / button-text fallback
   chain — the localised label still resolves through
   `getByRole('button')` even when the accessible name in
   French is `Connexion`, **as long as** the regex captures
   it. The current regex captures the English form; specs
   that drive non-English locales must override the locator
   inline.

## Why Enter-key submission

`signIn()` finishes with
`await this.passwordInput.press('Enter')` instead of
`await this.submitButton.click()`. Three reasons:

1. **Mirrors real users.** A sign-in form is the canonical
   "type-and-press-Enter" surface; clicking the button is
   the alternative path. Driving the Enter-key flow exercises
   the **default** form-submission path that 80%+ of users
   take, which surfaces a class of bugs (a missing
   `type="submit"`, a `preventDefault()` race) that a click
   on the button would mask.
2. **Avoids button-state flakes.** A `submitButton` locator
   that resolves under strict-mode requires the button to be
   visible, enabled, and stable. A "hide the button while the
   form is submitting" UX (which the auth surface ships in
   some variants) would break a click-driven flow but not an
   Enter-key flow. The Enter-key posture is invariant to
   that UX.
3. **Same UX as `signInAndWaitForRedirect`.** The wrapper
   `signInAndWaitForRedirect` calls `signIn()` and immediately
   awaits the URL change. Enter-key submission keeps the
   semantics consistent: there is no "click the button"
   intermediate that could split the awaited promise chain.

A spec that explicitly needs to test the click-driven flow
must call `signinPage.submitButton.click()` directly and
assert against the same URL change — which documents the
deviation loudly at the call site.

## Why `.bg-red-50.first()` and `.bg-green-50.first()`

The error and success alerts pin to the **first** `.bg-red-50`
or `.bg-green-50` element on the page. The choice is the
same shape as the base class's `header.first()` and
`footer.first()` posture. Three failure modes
the `.first()` pinning prevents:

1. **Strict-mode violations on stacked banners.** A page that
   renders a top-level "session expired" banner above the
   auth form's own error banner would otherwise resolve to two
   matches.
2. **Future-proofing for "all errors" assertions.** A spec
   that asserts on the auth form's specific error message
   uses `errorAlert.first()`, not the auth-form-scoped
   element, because the form's error banner is the visible
   surface for both client-side validation errors and
   server-side error responses. A spec that needs to assert
   on **all** error banners can call
   `page.locator('.bg-red-50')` directly.
3. **Dark-mode / theme drift.** The Tailwind utility class
   `bg-red-50` is the lightest red shade in the design system;
   a future dark-mode variant adds `dark:bg-red-950` (or
   similar) to the same element. The `.bg-red-50` selector
   matches the **light-theme class** present in **both**
   themes' class list, so the locator is invariant to
   theme switching.

A future redesign that drops `.bg-red-50` / `.bg-green-50` for
a different design-system token (e.g., `data-status="error"`)
must update **both** locators in the same change.

## Why `signInAndWaitForRedirect` exists alongside `signIn`

Two related methods, two different responsibilities:

- `signIn(email, password)` is the **kernel**: fill the
  inputs, press Enter. It does **not** wait for navigation.
  A spec that asserts on **failure** (an invalid-credentials
  error banner) calls `signIn()` and then asserts on
  `errorAlert`.
- `signInAndWaitForRedirect(email, password, expectedUrl)` is
  the **happy-path wrapper**: call `signIn()`, then wait for
  the URL to match `expectedUrl`. A spec that asserts on
  **success** uses this method.

Splitting the two keeps the "I don't know if this will
succeed or fail" decision at the spec level, not the page
object level. A page object that always-waited-for-redirect
would force every failure-path spec to time out before
checking the error banner.

The 60s timeout is generous on purpose — the post-sign-in
redirect chain on cold-start CI runs (no warm DB connection,
no warm NextAuth secret cache, no warm
`callbackUrl`-resolution) can take 30+ seconds. Tightening the
timeout below 30s flakes on cold-start runs; raising above
60s lets a genuinely-broken redirect hang the suite.

## Failure matrix

| Mistake                                                                     | What surfaces                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Where it surfaces                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                                   | Bundle cost propagates to every spec; circular-import risk against the runner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Spec runs that hit a circular boot order; trace bloat.                                                          |
| Drop the `extends BasePage` clause                                          | Loses `goto`, `gotoLocalized`, `waitForPageReady`, `getTitle`; loses `header` / `footer` / `navLinks`; every consumer of those re-imports the base class manually.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Auth-spec authoring drift; per-spec re-implementation of the site-shell triplet.                                |
| Drop `readonly` from any field                                              | Subclasses (or test code) can re-assign the field mid-test; cross-test state leaks if the page object is cached.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Mutation-related flakes that are nearly impossible to attribute back here.                                      |
| Drop the form-scoping on `emailInput` / `passwordInput`                     | A second `#email` (footer newsletter form, sign-up modal) collides under strict-mode at first use.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | First spec that runs against a page with a newsletter form / sign-up modal.                                     |
| Switch `submitButton` to a CSS attribute selector                           | Multiple submit buttons (social login row, "Use a magic link") collide under strict-mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | First spec that runs against a sign-in page with multiple submit buttons.                                       |
| Switch `submitButton` to a text-only locator                                | Localised pages (`fr`, `de`, `ar`, `zh`) fail to resolve the button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Locale-coverage smoke specs.                                                                                    |
| Switch `forgotPasswordLink` from `href*=` to `href=`                        | Localised forgot-password URLs (`/fr/auth/forgot-password`) fail to match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Locale-coverage forgot-password specs.                                                                          |
| Drop `.first()` from `errorAlert` / `successAlert`                          | Stacked alerts (a session-expired banner above the form's own banner) collide under strict-mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | First spec that runs against a page with a global banner above the auth banner.                                 |
| Switch `signIn()` from Enter-key to a button click                          | Loses real-user form-submission semantics; flakes when the button is hidden during submit; semantics drift from `signInAndWaitForRedirect`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Sign-in flake on slow CI runs; auth-spec authoring drift.                                                       |
| Tighten `signInAndWaitForRedirect`'s timeout below 30s                      | Cold-start CI runs flake on the post-sign-in redirect chain (NextAuth handshake + cookie set + redirect + server render).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | CI on cold-start GH runners.                                                                                    |
| Raise `signInAndWaitForRedirect`'s timeout above 60s                        | Genuinely-broken redirects hang the suite for the full timeout instead of failing fast.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Suite-level run time.                                                                                           |
| Add a new field that captures global state                                  | Cross-test leakage; one spec's mutation visible to the next spec's setup; flakes that only surface under serial runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Spec-level flake on serial runs.                                                                                |
| Move the file out of `apps/web-e2e/page-objects/auth/`                      | Every importing spec breaks with `Cannot find module`; TS gate fails immediately.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | TS gate; first runner boot.                                                                                     |
| Rename `SignInPage` to a different name                                     | Every importer needs a matching rename; a stray `import { SignInPage }` breaks at TS gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | TS gate.                                                                                                        |
| Switch the file extension to `.tsx`                                         | The `include: ["./**/*.ts"]` glob in [`e2e-tsconfig.md`](e2e-tsconfig.md) does not match; the file falls out of the type-checker's scope; every importing spec breaks with `Cannot find module`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | TS gate.                                                                                                        |
| Drop the trailing newline                                                   | Prettier diff on POSIX CI runners; lint failure on the e2e workspace.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | CI lint step.                                                                                                   |
| Ship the file with CRLF line endings                                        | Same as above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Same as above.                                                                                                  |

## Per-line walkthrough

| Line | Content                                                                         | Purpose                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `import type { Page, Locator } from '@playwright/test';`                        | Type-only Playwright import — no runtime cost, no circular-import risk (mirrors [`base-page-object.md`](base-page-object.md)).           |
| 2    | `import { BasePage } from '../base.page';`                                      | Concrete-class runtime import. The only runtime import in the file.                                                                      |
| 3    | (blank)                                                                         | Standard ESM shape — single blank line between imports and module body.                                                                  |
| 4    | `export class SignInPage extends BasePage {`                                    | Single named export — extends `BasePage` so `(page: Page)` constructor signature is locked.                                              |
| 5    | `	readonly emailInput: Locator;`                                                 | Pre-bound email Locator field.                                                                                                           |
| 6    | `	readonly passwordInput: Locator;`                                              | Pre-bound password Locator field.                                                                                                        |
| 7    | `	readonly submitButton: Locator;`                                               | Pre-bound submit button (role+regex-name).                                                                                               |
| 8    | `	readonly forgotPasswordLink: Locator;`                                         | Pre-bound forgot-password link (`href*=`).                                                                                               |
| 9    | `	readonly errorAlert: Locator;`                                                 | Pre-bound error banner (`.bg-red-50.first()`).                                                                                           |
| 10   | `	readonly successAlert: Locator;`                                               | Pre-bound success banner (`.bg-green-50.first()`).                                                                                       |
| 11   | (blank)                                                                         | Field-vs-constructor separator.                                                                                                          |
| 12   | `	constructor(page: Page) {`                                                     | Single constructor signature, matches base class.                                                                                        |
| 13   | `		super(page);`                                                                  | Stores the page handle and pre-binds the inherited `header` / `footer` / `navLinks`.                                                     |
| 14   | `		const authForm = page.locator('form').filter({ has: page.locator('#email') });` | Local Locator chain that pins to the auth form (the `<form>` that contains a `#email` input).                                            |
| 15   | `		this.emailInput = authForm.locator('#email');`                                 | Form-scoped email input.                                                                                                                 |
| 16   | `		this.passwordInput = authForm.locator('#password');`                           | Form-scoped password input.                                                                                                              |
| 17   | `		this.submitButton = page.getByRole('button', { name: /sign in/i });`           | Unscoped role+regex-name lookup — invariant to refactors that move the button outside the form.                                          |
| 18   | `		this.forgotPasswordLink = authForm.locator('a[href*="forgot-password"]');`     | Form-scoped, locale-invariant forgot-password link.                                                                                      |
| 19   | `		this.errorAlert = page.locator('.bg-red-50').first();`                         | First red banner on the page.                                                                                                            |
| 20   | `		this.successAlert = page.locator('.bg-green-50').first();`                     | First green banner on the page.                                                                                                          |
| 21   | `	}`                                                                              | Constructor close.                                                                                                                       |
| 22   | (blank)                                                                          | Constructor-vs-method separator.                                                                                                         |
| 23   | `	async navigate() {`                                                             | Sign-in route navigation primitive.                                                                                                       |
| 24   | `		await this.goto('/auth/signin');`                                              | Inherited `goto` with the canonical route.                                                                                               |
| 25   | `	}`                                                                              | Method close.                                                                                                                            |
| 26   | (blank)                                                                          | Method separator.                                                                                                                        |
| 27   | `	async signIn(email: string, password: string) {`                                | Form-fill kernel — does not await navigation.                                                                                            |
| 28   | `		await this.emailInput.fill(email);`                                            | Fill email.                                                                                                                              |
| 29   | `		await this.passwordInput.fill(password);`                                      | Fill password.                                                                                                                           |
| 30   | `		await this.passwordInput.press('Enter');`                                      | Press Enter to submit — exercises the default form-submission path.                                                                      |
| 31   | `	}`                                                                              | Method close.                                                                                                                            |
| 32   | (blank)                                                                          | Method separator.                                                                                                                        |
| 33   | `	async signInAndWaitForRedirect(email: string, password: string, expectedUrl: string | RegExp) {` | Happy-path wrapper signature.                                                                                                            |
| 34   | `		await this.signIn(email, password);`                                           | Delegate to the kernel.                                                                                                                  |
| 35   | `		await this.page.waitForURL(expectedUrl, { timeout: 60_000 });`                  | Wait for the post-sign-in redirect. 60s timeout is generous on purpose.                                                                 |
| 36   | `	}`                                                                              | Method close.                                                                                                                            |
| 37   | `}`                                                                              | Class close — single trailing newline maintained per Prettier `endOfLine: lf` posture.                                                   |

## Read / write surface summary

| Caller / consumer                                                  | Reads                                                                                                                                                                                          | Writes                                                                                                                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web-e2e/tests/auth/**` specs                                 | Imports `SignInPage`, instantiates it on a `page` fixture, calls `navigate()`, `signIn()`, `signInAndWaitForRedirect()`, asserts on `emailInput`, `passwordInput`, `errorAlert`, `successAlert`. | Drives the form via the methods; does **not** mutate any field.                                                                                                                              |
| `BasePage` (parent class)                                          | The `super(page)` call stores `this.page` and pre-binds `header` / `footer` / `navLinks`.                                                                                                       | Subclass field initialisations follow `super(page)`.                                                                                                                                          |
| `auth.fixture.ts` (`adminPage`, `clientPage`)                      | Does **not** instantiate `SignInPage` directly today. The fixture mints persisted storage states at pre-flight (see [`global-setup.md`](global-setup.md)) so tests skip the sign-in form.       | Storage state writes happen at pre-flight; the fixture does not re-drive sign-in per test.                                                                                                  |
| `apps/web/components/auth/**` (production source)                  | Receives `#email` / `#password` IDs, the role-mapped "Sign in" button label, the `bg-red-50` / `bg-green-50` banner classes, and the forgot-password link `href` from the production sign-in form components. | The production source defines those identifiers; `SignInPage` is downstream of any rename.                                                                                                  |
| `e2e-tsconfig.json`                                                | The `include: ["./**/*.ts"]` glob picks up this file for the type-checker.                                                                                                                     | None.                                                                                                                                                                                        |
| `playwright.config.ts`                                             | Project-level `baseURL` resolves the relative paths `signin.page.ts` calls (`/auth/signin`).                                                                                                   | None.                                                                                                                                                                                        |

## Read / write surface failure modes

| Layer                                       | Failure mode                                                                                                                                                                                                                                            | What surfaces                                                                                                                                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production `apps/web/components/auth/**`    | Renames `#email` → `#user-email` without updating this file.                                                                                                                                                                                            | Strict-mode locator failure on first sign-in spec; `Locator '#email' resolved to 0 elements`.                                                                                                                                                                  |
| Production `apps/web/components/auth/**`    | Renames the "Sign in" accessible name → "Login" without updating this file.                                                                                                                                                                             | Role+name regex `/sign in/i` no longer matches; `submitButton` resolves to 0 elements; sign-in spec hangs on the click.                                                                                                                                        |
| Production `apps/web/components/auth/**`    | Drops `bg-red-50` / `bg-green-50` for a `data-status="error"` / `data-status="success"` token without updating this file.                                                                                                                              | `errorAlert.first()` / `successAlert.first()` resolve to 0 elements; assertions hang on visibility waits.                                                                                                                                                       |
| Production middleware                       | Renames the sign-in route from `/auth/signin` → `/login` without updating this file.                                                                                                                                                                    | `navigate()` lands on a 404; spec fails on the next assertion.                                                                                                                                                                                                  |
| `next-intl` middleware                      | Switches `localePrefix: 'as-needed'` → `localePrefix: 'always'` — every English path now needs a `/en` prefix.                                                                                                                                          | `navigate()` calls `goto('/auth/signin')` and is redirected to `/en/auth/signin`; the redirect adds latency and pollutes the trace. The fix is to switch to `gotoLocalized('/auth/signin', 'en')` here, which encodes the locale-prefix posture in one place. |
| `e2e-tsconfig.json`                         | The `include` glob narrows away from `page-objects/**`.                                                                                                                                                                                                 | TS gate failure on every importing spec; `Cannot find module '../page-objects/auth/signin.page'`.                                                                                                                                                              |
| `playwright.config.ts`                      | `baseURL` is removed.                                                                                                                                                                                                                                   | `goto('/auth/signin')` is interpreted as a file URL by Playwright; navigation fails immediately.                                                                                                                                                               |

## `signin.page.ts`-change checklist

When you change the contents of `signin.page.ts`, walk this
checklist before merging:

- **Spec audit.** Every spec under
  `apps/web-e2e/tests/auth/` that imports `SignInPage` or
  drives the sign-in form inline. A signature change to
  `signIn()` or `signInAndWaitForRedirect()` requires a pass
  over each spec.
- **[`base-page-object.md`](base-page-object.md) cross-check.**
  The `extends BasePage` clause inherits four methods
  (`goto`, `gotoLocalized`, `waitForPageReady`, `getTitle`) and
  three Locator fields (`header`, `footer`, `navLinks`). A
  rename of any of those upstream signatures lands here too.
- **Production source cross-check.** The Locator strings
  (`#email`, `#password`, `a[href*="forgot-password"]`,
  `bg-red-50`, `bg-green-50`, the role-name regex `/sign in/i`,
  the route `/auth/signin`) must match the production sign-in
  form under
  [`apps/web/components/auth/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/components/auth)
  and the production route under
  [`apps/web/app/[locale]/auth/signin/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/[locale]/auth/signin).
  A rename in the production source requires a paired update
  here.
- **[`auth-fixture.md`](auth-fixture.md) cross-check.** The
  authenticated fixtures bypass the sign-in form by pre-loading
  storage states; specs that reach for `adminPage` /
  `clientPage` do not touch this page object. A new fixture
  that drives the form (e.g., a future `freshSignInPage`
  fixture for "test the live sign-in flow") cross-references
  this file.
- **[`e2e-tsconfig.md`](e2e-tsconfig.md) cross-check.** The
  `include: ["./**/*.ts"]` glob picks up
  `page-objects/auth/signin.page.ts`; if the glob narrows or
  the file moves, the type-checker stops walking it.
- **[`e2e-package-manifest.md`](e2e-package-manifest.md) cross-check.**
  The `devDependencies.@playwright/test` underwrites the
  `Page`, `Locator`, and `Promise<...>` types this file uses;
  a Playwright major bump may change the type signatures
  (most commonly the `getByRole` overload set).
- **[`playwright-config.md`](playwright-config.md) cross-check.**
  The `baseURL` configured there is what `page.goto('/auth/signin')`
  resolves relative to. A `baseURL` shape change ripples
  through `navigate()`.
- **[`global-setup.md`](global-setup.md) cross-check.** The
  pre-flight global setup also drives the `/auth/signin` form
  to mint storage states. A change to the form's identifiers
  here must update the global setup's selectors too — both
  paths share the same DOM contract.
- **TS gate.** Run `pnpm tsc --noEmit` from the e2e
  workspace and from the workspace root.
- **Smoke run.** Run the auth-spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep auth`)
  to confirm the new shape works end-to-end.
- **[`docs/log.md`](../log.md) entry.** Append a `apps/web-e2e`
  entry summarising the change (one line, present tense, links
  to this file and any cross-checked references).
- **[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage) cross-link.**
  If the change introduces a new shared concept that affects
  test authoring (a new locator strategy, a new submit
  primitive, a new wait-for shape), that concept lands in the
  spec first as a tasks/plan entry.
- **Reviewer pass.** Walk the failure matrix above against the
  diff to confirm no row's mistake has been introduced.
