---
id: spec-023-ai-chat
title: 'Spec 023 — AI Chat for Directory Visitors'
sidebar_label: '023 AI Chat'
---

# Feature spec — `023-ai-chat`

> **Status:** Proposed (2026-05-13).
>
> **Jira:** [EW-132 — Integrate a Chatbot to Assist Users in the
> generated Directories / Websites](https://evertech.atlassian.net/browse/EW-132).
>
> **Inspired by:** the existing AI chat in the Ever Works platform
> (`apps/web/src/components/ai/*` and `apps/web/src/app/api/chat/route.ts`
> over there). This spec mirrors that pattern but keeps the directory
> template **self-contained** — the chat backend lives inside the
> template, not behind a platform API.

## 1. Summary

Every generated directory ships with an opt-in AI chat that helps
visitors browse, search, submit, and get support — and gives logged-in
members a deeper, account-aware assistant that can answer "what did I
submit last week?", surface their favourites, and guide them through
upgrading or completing their profile. The chat reads its configuration
from the directory's `works.yml`, so operators turn it on, pick a
position (floating widget, hero takeover, or sidebar layout), and choose
which scenarios anonymous vs. authenticated visitors can use — all
without touching code.

The implementation uses the **Vercel AI SDK** (`ai@^6`,
`@ai-sdk/react@^3`) for the same reasons the platform picked it:
streaming-first UX, a swappable provider layer, and a small bundle that
loads only when the chat opens. A directory operator points the chat at
any OpenAI-compatible endpoint (OpenRouter by default) and is done.

## 2. Motivation

- **Reduces support load.** Operators of directory verticals (job
  boards, business directories, product catalogues) consistently get
  the same five questions: "how do I submit?", "how do I sign in?",
  "where is the pricing?", "can you help me find X?", "how do I edit my
  submission?". A chatbot answers them 24/7 in the visitor's language
  without an operator on call.
- **Increases conversion.** Anonymous visitors who would otherwise
  bounce can submit, sign up, or search directly through the chat
  surface — the chat is also a CTA that drives users into the
  submission and auth flows.
- **Personalises the experience for members.** Logged-in users get a
  meaningfully different chat: it can recall their submissions, list
  their favourites, and remind them of incomplete profile fields.
  Without a logged-in surface, the chat is a glorified FAQ.
- **Brings the template to parity with the platform.** Ever Works has
  shipped an AI chat in the platform admin since early 2026; directory
  operators have asked for the same on the public-facing template. EW-132
  is the umbrella request from product.
- **Multilingual out of the box.** Spec 005 already supplies six
  locales (EN/FR/ES/DE/AR/ZH). The chat's system prompt, scenarios, and
  UI strings must translate via the existing `next-intl` pipeline —
  French is required by the Jira ticket; the rest come for free.

Primary users:

- **Anonymous visitors** of a directory — the largest persona by far.
- **Authenticated members** — submitters, voters, favouriters.
- **Directory operators** — configure the chat through `works.yml`.
- **Fork maintainers** — want to swap the provider or extend the tool
  set without rewriting the UI.

## 3. Goals

- G-1: Ship an **AI chat plugin** under `packages/plugin-ai-chat/` that
  exposes a self-contained chat experience (UI + server route + tools)
  any directory can opt into.
- G-2: Make the chat **fully configurable from `works.yml`** —
  enabled/disabled, default position (floating widget, hero takeover,
  built-in sidebar), allowed scenarios for anonymous vs. authenticated
  visitors, and locale defaults.
- G-3: Provide a **self-contained backend** at
  `apps/web/app/api/chat/route.ts` that streams completions via the
  Vercel AI SDK from any OpenAI-compatible endpoint — no dependency on
  the Ever Works platform API.
- G-4: Provide **directory-aware tools** (search items, list
  categories/tags, surface "my submissions" / "my favourites" /
  "my profile completeness", navigate to a route, open the submission
  form pre-filled) so the chat can act on the visitor's behalf instead
  of returning text-only answers.
- G-5: Differentiate **anonymous vs. authenticated capabilities** —
  anonymous users get browse/search/submit/pricing/login help;
  authenticated users get the anonymous set plus personalised tools
  (submissions, favourites, profile).
- G-6: Ship in **six locales** (EN/FR/ES/DE/AR/ZH) via `next-intl`,
  with RTL support for Arabic. French coverage is a Jira AC.
- G-7: Keep the chat **off the critical render path** — the chat
  bundle loads via `next/dynamic` only when the user opens it (or, for
  the hero-takeover layout, only after the visitor types the first
  character). Public-route first-load JS budget (Article V) is not
  affected when the chat is disabled.
- G-8: Persist conversations **opt-in only** behind
  `aiChat.persist=true` (default: off). Anonymous sessions remain
  ephemeral in `localStorage`; authenticated sessions can be stored in
  Drizzle so members can resume them.

## 4. Non-Goals

- **Building a chat-driven admin tool.** This spec is about
  _directory visitors_. The platform already has its own admin chat
  with deeper tools (deploy, generate items, manage works); we do not
  re-ship those.
- **Inventing a new AI provider plugin SDK.** Spec 002 (Plugin
  Architecture) will eventually define provider plugins; in the
  meantime we use the OpenAI-compatible interface exposed by the
  Vercel AI SDK and treat OpenRouter as the default gateway.
  Migration to a future `AIProvider` plugin interface is documented
  but not delivered here.
- **Voice / speech-to-text.** Text-only in v1.
- **Replacing the operator support inbox.** The chat can deflect
  common tickets but does not write to Helpdesk / Linear / Slack.
- **Function-calling against external SaaS.** The tool set is bound
  to the directory's own data (Git CMS + Drizzle); no third-party API
  calls in v1.
- **A different provider abstraction per chat.** v1 has one chat
  provider configured per directory; per-conversation provider
  switching (as in the platform) is deferred.

## 5. User Stories

```text
As an anonymous visitor on a directory, I want to ask the chat where
to find products of type X, so that it shows me a filtered list
without me learning the filter UI.

As an anonymous visitor, I want to ask "how do I submit a product?"
and have the chat open the submission form on the right page, so that
I don't have to hunt for the link.

As an authenticated member, I want to ask "what did I submit last
month?" and see a list, so that I can review or update them without
clicking through the dashboard.

As an authenticated member, I want the chat to remember what we talked
about last time I visited, so that I do not repeat context.

As a directory operator, I want to enable the chat and pick "floating
bottom-right" by flipping two flags in works.yml, so that I can ship
it without writing code.

As a directory operator, I want to disable the "submit a product"
scenario for anonymous users (e.g. on an invite-only directory), so
that the chat only offers actions that make sense for my site.

As a fork maintainer, I want to point the chat at a different
OpenAI-compatible endpoint (or model) via env, so that I can use my
own provider account without forking the UI.
```

## 6. Acceptance Criteria

- [ ] AC-1: When `aiChat.enabled=true` in `works.yml`, a chat surface
      is mounted on every public page according to `aiChat.position`
      (`floating` | `hero-takeover` | `sidebar`). When
      `aiChat.enabled=false` (default), no chat-related JS, CSS, or DOM is
      emitted on any public route.
- [ ] AC-2: The chat is **fully configurable from `works.yml`** —
      `enabled`, `position`, `provider`, `model`, `defaultLocale`,
      `anonymous.{enabled, scenarios[]}`,
      `authenticated.{enabled, scenarios[]}`, `persist`. Reading the
      config goes through a typed `AiChatConfig` interface alongside
      the existing `AppConfig` in `apps/web/lib/config-manager.ts`.
- [ ] AC-3: `POST /api/chat` streams a chat completion via
      `streamText` from the Vercel AI SDK, returns a
      `toUIMessageStreamResponse()`, and requires a CSRF-safe POST. It
      resolves the active user from the existing Auth.js session and
      enforces per-IP rate limiting for anonymous callers (defaults:
      20 requests / 60 s) and per-user rate limiting for authenticated
      callers (defaults: 60 requests / 60 s). Limits are configurable via
      env.
- [ ] AC-4: Anonymous visitors can invoke only the **anonymous
      scenarios** allowed in `works.yml` (default set: `browse`, `search`,
      `submit`, `pricing`, `login-help`, `support`). Calls that target an
      authenticated-only tool return a structured error and a CTA to sign
      in. Authenticated visitors can invoke the anonymous set plus
      `my-submissions`, `my-favourites`, `my-profile`, and `navigate`.
- [ ] AC-5: The chat ships with **six locales** matching Spec 005
      (EN/FR/ES/DE/AR/ZH). The system prompt and canned scenario openers
      are translated; the message bubbles use the visitor's active locale
      by default. Arabic renders RTL.
- [ ] AC-6: When `aiChat.persist=true` and the visitor is
      authenticated, conversations are stored in two new Drizzle tables
      (`chat_conversations`, `chat_messages`) scoped to `user_id`. When
      `persist=false` or the visitor is anonymous, no DB writes occur and
      history lives only in `localStorage` under a versioned key.
- [ ] AC-7: The chat bundle is loaded via `next/dynamic` only after
      the chat is opened (floating mode) or the visitor types the first
      character into the hero (hero-takeover). Public-route first-load JS
      for `/` does not increase by more than **+5 KB gzip** when the chat
      is enabled (the launcher button + lazy-loader). Article V budget
      (250 KB gzip first-load) is preserved.
- [x] AC-8: The chat passes basic accessibility checks: the launcher
      button has an `aria-label`, the open chat is a focus trap, `Esc`
      closes it, `Tab` cycles through the message list and input, screen
      readers announce streaming responses via `aria-live="polite"`, and
      the panel meets WCAG 2.2 AA contrast on light and dark themes.
      _(T-013f asserts `Esc`→focus return and runs `@axe-core/playwright`
      against the open dialog with `wcag2a` + `wcag2aa` tags; the
      `color-contrast` rule is disabled because operators can re-theme.)_
- [x] AC-9: Playwright e2e coverage:
    - **anonymous flow:** the chat launcher appears when enabled,
      opens, accepts a question, and streams a reply that mentions an
      item from the seeded CMS (asserted via role, not exact copy);
    - **disabled flow:** the chat does not appear and `/api/chat`
      returns 404 when `aiChat.enabled=false`;
    - **authenticated flow:** a signed-in user can invoke
      `my-submissions` and the response contains a link to the
      seeded item they submitted in fixtures;
    - **i18n:** the launcher label is translated when the locale
      cookie is set to `fr`.
- [ ] AC-10: The chat surface is also reachable from a future
      `/chat` route (locale-prefixed) for full-page sessions, but **only
      when** `aiChat.position` is `hero-takeover` or `sidebar` — if
      `floating`, `/chat` returns 404 so we do not advertise a route that
      the operator did not enable.

## 7. Out-of-Scope Considerations

- **Per-conversation provider switching** (as the platform does) is
  deferred until a fork maintainer actually needs to expose multiple
  providers to end users. It can be added later by extending
  `AiChatConfig` with a `providers[]` array.
- **Conversation export / "email me this transcript"** is a follow-up.
- **Admin UI for editing scenarios / system prompt.** v1 reads from
  `works.yml`; the admin app gets an editor in a later spec.
- **RAG against the Git CMS.** v1 uses tool calls (`searchItems`,
  `getItemDetails`) rather than a vector index. Adding a vector
  store + embedding pipeline lands as its own spec when one of the
  early adopters needs it.
- **Chat-driven payments / checkout.** Spec 004 owns the payment
  flow; the chat can deep-link to it but does not call providers.
- **A Leaflet / OpenStreetMap third map provider.** Out of scope; see
  Spec 011 and Spec 017.

## 8. UX Notes

- **Floating layout (default).** A circular launcher button anchored
  to `bottom-right` (RTL: `bottom-left`) with the directory primary
  colour, opens an overlay panel ~420 px wide on desktop and full
  screen on mobile. Mirrors the visual language of Intercom /
  Crisp / HubSpot so visitors immediately recognise it.
- **Hero-takeover layout.** The standard hero block on the home page
  is replaced by a single-line input that says, in the visitor's
  locale, _"Ask me anything about this directory…"_. Once the
  visitor types a character, the layout splits into chat-left /
  results-canvas-right (≥ 1024 px) or chat-top / canvas-below
  (< 1024 px). On every other route the floating launcher is used so
  the chat stays reachable.
- **Sidebar layout.** On directories that already have a sidebar
  (`LayoutClassic`), the chat slots in as a tab in the existing
  sidebar shell. Picking this on a directory with no sidebar layout
  falls back to floating with a one-line warning in the operator
  build log.
- **Anonymous vs. authenticated welcome.** The empty-state welcome
  message shows different chips for each persona — anonymous chips
  are `browse · search · submit · pricing · sign in`, authenticated
  chips are `my submissions · my favourites · my profile · search`.
- **Localisation.** New message keys live under
  `AI_CHAT_*` in `apps/web/messages/<locale>.json`. RTL locales (ar)
  mirror the launcher position and the panel layout.
- **Accessibility.** The launcher is a `<button>` with
  `aria-label="Open chat"`; the panel is `role="dialog"` with
  `aria-modal="true"` and a focus trap; streaming bubbles use
  `aria-live="polite"`; keyboard shortcuts: `Esc` closes, `Tab`
  cycles, `Enter` sends, `Shift+Enter` newline. The chat passes
  axe-core checks on light and dark themes.
- **Performance.** The launcher button is server-rendered with no
  client JS; the chat panel and its dependencies (`ai`,
  `@ai-sdk/react`, markdown renderer) load via `next/dynamic` only on
  first open.

## 9. Data & API Surface

- **New API route.** `POST /api/chat` (server route, Node runtime).
  Request body: `{ messages: UIMessage[], conversationId?: string,
scenario?: string, currentPageUrl?: string }`. Response:
  `toUIMessageStreamResponse()` (SSE). Returns 404 when
  `aiChat.enabled=false`; returns 401 when the requested scenario
  requires authentication and no session is present.
- **New optional Drizzle tables** (created only when
  `aiChat.persist=true` in `works.yml`): - `chat_conversations(id, user_id, title, locale, scenario,
created_at, updated_at)` — FK to `users.id`,
  `INDEX (user_id, updated_at DESC)`. - `chat_messages(id, conversation_id, role, parts, tool_calls,
tool_results, created_at)` — FK to `chat_conversations.id`,
  `parts` and tool fields stored as `jsonb` (Postgres) / `text`
  (SQLite).
- **New env vars.** `AI_CHAT_PROVIDER`, `AI_CHAT_API_KEY`,
  `AI_CHAT_BASE_URL`, `AI_CHAT_MODEL`, `AI_CHAT_RATE_LIMIT_ANON`,
  `AI_CHAT_RATE_LIMIT_AUTH`. Validated by `scripts/check-env.js`;
  documented in `.env.example`.
- **New analytics events** (typed per Spec 016): `ai_chat_opened`,
  `ai_chat_message_sent`, `ai_chat_tool_called`,
  `ai_chat_scenario_blocked`, `ai_chat_closed`.
- **New `works.yml` block:**

    ```yaml
    aiChat:
        enabled: true
        position: floating # floating | hero-takeover | sidebar
        provider: openrouter # any @ai-sdk/openai-compatible target
        model: openai/gpt-4o-mini # operator-chosen default
        defaultLocale: en
        persist: false
        anonymous:
            enabled: true
            scenarios: [browse, search, submit, pricing, login-help, support]
        authenticated:
            enabled: true
            scenarios: [browse, search, submit, pricing, my-submissions, my-favourites, my-profile, navigate, support]
    ```

    Backed by an `AiChatConfig` TypeScript interface alongside
    `AppConfig` in `apps/web/lib/config-manager.ts` and a Zod schema
    in `packages/plugin-ai-chat/src/config.ts`.

## 10. Plugin / Adapter Impact

- The feature ships as a **package** under
  `packages/plugin-ai-chat/`, exporting:
    - the React components (`AiChatLauncher`, `AiChatPanel`,
      `AiChatHeroTakeover`, `AiChatSidebar`),
    - the tool definitions (`searchItems`, `getItemDetails`,
      `listCategories`, `listTags`, `mySubmissions`, `myFavourites`,
      `myProfile`, `navigate`),
    - the system prompt + scenario openers (per-locale),
    - the Zod config schema,
    - and an optional `defineDirectoryPlugin({...})` manifest stub for
      Spec 002 to consume once the plugin SDK lands.
- Core code does not import `packages/plugin-ai-chat/` directly except
  through a single seam in `apps/web/app/[locale]/layout.tsx` (the
  mount point) and `apps/web/app/api/chat/route.ts` (the API
  dispatcher). When `aiChat.enabled=false`, both seams short-circuit
  before importing the package — the bundle stays out of the public
  graph.
- The new tools are co-located with the plugin so a fork maintainer
  can fork the package, edit them, and `pnpm link` the result without
  touching `apps/web`.

## 11. Risks & Open Questions

- **Risk: provider cost.** Streaming completions can rack up bills
  if abused. Mitigations: rate-limiting per IP / user (AC-3),
  bounded `max_tokens`, a per-day envelope env var
  (`AI_CHAT_DAILY_BUDGET_USD`) that disables the chat when exceeded.
- **Risk: prompt injection from item content.** Tools that return
  CMS-authored text (item descriptions, comments) could include
  hostile prompts. Mitigation: the system prompt explicitly tells
  the model to treat tool results as data, and we strip code fences /
  role markers from tool outputs before passing them back.
- **Risk: bundle bloat.** `@ai-sdk/react` plus a markdown renderer is
  ~80 KB gzip. Mitigation: `next/dynamic`-load on open (AC-7);
  measured in the AC.
- **Risk: divergence from the platform's chat.** Mitigation: mirror
  the platform's component names (`ChatProvider`, `ChatInterface`,
  `ChatMessages`, …) so a future merge or shared package is
  cheap.
- **Open question: default model.** Should we default to
  `openai/gpt-4o-mini` (cheap, fast) or `anthropic/claude-3-5-haiku`
  (better quality on long context)? Default chosen:
  `openai/gpt-4o-mini` via OpenRouter. Recorded in
  [`docs/questions.md`](../../questions.md).
- **Open question: should the chat be allowed to perform mutations
  (submit items, follow users) on the visitor's behalf?** Default
  chosen: **no mutations in v1**. The chat can navigate to the
  submission form pre-filled, but it cannot submit. Re-evaluate once
  the read-only tools have been used in anger.
- **Open question: where do the scenario openers and the system
  prompt live for translation?** Default chosen: in
  `apps/web/messages/<locale>.json` under `AI_CHAT_*`, so the
  existing translation pipeline (Spec 014) picks them up.
  Alternative: keep them as `.ts` constants inside the plugin
  package — rejected because it bypasses the translation pipeline.

## 12. Acceptance Test Plan

A new spec file `apps/web-e2e/tests/public/ai-chat.spec.ts` covers:

- the launcher appears when the feature is enabled, accepts a
  question from an anonymous visitor, and streams a non-empty reply;
- the launcher is absent when the feature is disabled and
  `/api/chat` returns 404;
- a signed-in fixture user (`auth.fixture.ts`) can ask
  _"what did I submit?"_ and the reply contains a link to the
  seeded item they own;
- the `Esc` key closes the panel and returns focus to the launcher
  (a11y);
- the launcher label is the French translation when the locale
  cookie is `fr` (asserted by `aria-label`, not by visible text).

A page object `apps/web-e2e/page-objects/public/ai-chat.page.ts`
wraps the new selectors (launcher button, panel dialog, input,
message list). An API spec under
`apps/web-e2e/tests/api/ai-chat.spec.ts` covers the rate-limiter,
scenario gating, and the 404-when-disabled contract.

## 13. References

- Jira: [EW-132](https://evertech.atlassian.net/browse/EW-132).
- Platform mirror: `apps/web/src/components/ai/*` and
  `apps/web/src/app/api/chat/route.ts` in `ever-works/platform`.
- Spec 002 — [Plugin Architecture](../002-plugin-architecture/spec.md).
- Spec 003 — [Auth Providers](../003-auth-providers/spec.md) — session
  resolution and authenticated-only tools.
- Spec 005 — [Internationalisation](../005-internationalisation/spec.md)
  — `next-intl`, locale list, RTL support.
- Spec 010 — [E2E Test Coverage](../010-e2e-test-coverage/spec.md).
- Spec 014 — [Docs Translation](../014-docs-translation/spec.md).
- Spec 016 — [Typed Analytics Events](../016-typed-analytics-events/spec.md).
- Spec 018 — [Performance Budget](../018-performance-budget/spec.md).
- Vercel AI SDK docs: <https://ai-sdk.dev/docs>.
- Constitution Articles I, II, III, IV, V, VI, VII, IX.
