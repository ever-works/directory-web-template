---
id: plan-023-ai-chat
title: 'Plan 023 — AI Chat for Directory Visitors'
sidebar_label: '023 AI Chat — Plan'
---

# Implementation Plan — `023-ai-chat`

> **Spec:** [`spec.md`](./spec.md)
> **Jira:** [EW-132](https://evertech.atlassian.net/browse/EW-132)

## 1. High-Level Approach

We ship the chat as a **self-contained plugin package**
(`packages/plugin-ai-chat/`) that re-uses the Vercel AI SDK exactly the
way the Ever Works platform does, but stays inside the template — there
is no runtime dependency on the platform API. The package exports React
components (launcher, panel, hero-takeover, sidebar slot), a Zod config
schema, a tool set bound to the directory's own data sources (Git CMS +
Drizzle), and a server-side dispatcher that the template's
`apps/web/app/api/chat/route.ts` calls into. The route is a thin shim
that resolves the session, validates the request, applies rate limits,
and hands off to the plugin's `runAgent()`.

The chat is **opt-in via `works.yml`**, so a freshly-cloned template
that has never seen the AI keys boots without it. When opted in, the
template injects a single mount point into `apps/web/app/[locale]/layout.tsx`
(the launcher, server-rendered, ~5 KB gzip) and the rest of the bundle
loads via `next/dynamic` on first open. This is the same pattern the
existing settings modal uses, so we are not inventing a new lazy-load
seam.

We deliberately mirror the platform's component names
(`ChatProvider`, `ChatInterface`, `ChatMessages`, `ChatMessage`,
`ChatInput`, `ChatToolbar`, `ChatWelcome`, `ChatMarkdown`,
`ChatToolResult`) so an eventual shared package between the platform
and the template is a refactor, not a rewrite. The tools differ —
ours are directory-aware, the platform's are work-management-aware —
but the surface around them is identical.

**Why this approach over the alternatives:**

- _Platform-backed (point at `evertech` API)._ Rejected: it ties every
  generated directory to a live platform deployment, which the
  template-first architecture explicitly avoids.
- _Direct `streamText` in `apps/web` with no package._ Rejected: the
  constitution (Article I) requires net-new functionality to ship as a
  plugin so it can be enabled, disabled, swapped, and configured.
- _iframe-embed of a hosted widget (Crisp, Intercom, etc.)._ Rejected:
  no directory-aware tools, no personalised authenticated experience,
  and an opaque privacy / GDPR story.

## 2. Architecture Diagram

```mermaid
flowchart LR
  visitor[Directory visitor] -->|opens chat| layout[apps/web/app/[locale]/layout.tsx]
  layout -->|dynamic import on open| panel[plugin-ai-chat: ChatPanel]
  panel -->|POST /api/chat<br/>SSE stream| route[apps/web/app/api/chat/route.ts]
  route -->|resolve session| auth[(Auth.js session)]
  route -->|rate limit| limiter[(in-memory / Redis)]
  route -->|runAgent| agent[plugin-ai-chat: runAgent]
  agent -->|streamText| sdk[Vercel AI SDK]
  sdk -->|HTTPS| provider[(OpenRouter / OpenAI-compatible)]
  agent -->|tool calls| tools[plugin-ai-chat: tools]
  tools -->|read items| cms[(Git CMS .content/)]
  tools -->|read user data| db[(Drizzle: items.submitted_by, favorites)]
  route -->|optional persist| db2[(chat_conversations, chat_messages)]
```

## 3. Affected Packages & Files

| Package / Path                                           | Change        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/plugin-ai-chat/` (new)                         | new package   | Components, tools, config schema, system prompts, agent runner                                                                                                                                                                                                                                                                                                                                                                                 |
| `packages/plugin-ai-chat/package.json`                   | new           | `ai@^6`, `@ai-sdk/react@^3`, `@ai-sdk/openai-compatible@^2`, `zod`                                                                                                                                                                                                                                                                                                                                                                             |
| `packages/plugin-ai-chat/src/components/*.tsx`           | new           | `ChatLauncher`, `ChatPanel`, `ChatHeroTakeover`, `ChatSidebar`, plus shared parts                                                                                                                                                                                                                                                                                                                                                              |
| `packages/plugin-ai-chat/src/tools/*.ts`                 | new           | `searchItems`, `getItemDetails`, `listCategories`, `listTags`, `mySubmissions`, `myFavourites`, `myProfile`, `navigate`. Each authenticated tool **wraps** an existing repo: `mySubmissions` → `ClientItemRepository.findByUser()` (rows in `items` with `submitted_by=userId, status='pending'`); `myFavourites` → new `favorite.repository.ts` reading the existing `favorites` table; `myProfile` → existing user / client-dashboard repos. |
| `packages/plugin-ai-chat/src/agent.ts`                   | new           | `runAgent({ messages, scenario, session, locale, currentPageUrl })` → stream                                                                                                                                                                                                                                                                                                                                                                   |
| `packages/plugin-ai-chat/src/config.ts`                  | new           | Zod schema for `AiChatConfig`; defaults; merging helper                                                                                                                                                                                                                                                                                                                                                                                        |
| `packages/plugin-ai-chat/src/prompts/<locale>.ts`        | new           | System-prompt scaffolding (locale-aware); strings sourced via `next-intl`                                                                                                                                                                                                                                                                                                                                                                      |
| `apps/web/app/api/chat/route.ts`                         | new           | Thin POST handler: session, rate-limit, validate, dispatch to plugin                                                                                                                                                                                                                                                                                                                                                                           |
| `apps/web/app/[locale]/layout.tsx`                       | modify        | Mount `<ChatLauncher>` when `aiChat.enabled=true`; gated by config                                                                                                                                                                                                                                                                                                                                                                             |
| `apps/web/app/[locale]/chat/page.tsx`                    | new (gated)   | Full-page chat surface — rendered only when `position` is `hero-takeover\|sidebar`                                                                                                                                                                                                                                                                                                                                                             |
| `apps/web/lib/config-manager.ts`                         | **no change** | Withdrawn. Originally proposed extending `AppConfig` with `aiChat?: AiChatConfig`, but importing the plugin's type into core violates Article I (core must not import from plugin packages). The chat config block is absorbed by `AppConfig.[key: string]: any`; the future layout-mount seam (T-006) calls `parseAiChatConfig(appConfig.aiChat)` from `@ever-works/plugin-ai-chat/config` and gets fully-typed config from there.            |
| `apps/web/lib/db/schema.ts`                              | modify        | `chat_conversations`, `chat_messages` tables (opt-in)                                                                                                                                                                                                                                                                                                                                                                                          |
| `apps/web/lib/repositories/chat.repository.ts`           | new           | Read / write conversation history; gated by `aiChat.persist`. Follows existing `*.repository.ts` naming.                                                                                                                                                                                                                                                                                                                                       |
| `apps/web/lib/repositories/favorite.repository.ts`       | new (small)   | Wraps reads against the existing `favorites` table (`userId`, `itemSlug`) for the `myFavourites` tool — no equivalent repo today.                                                                                                                                                                                                                                                                                                              |
| `apps/web/lib/utils/rate-limit.ts`                       | **reuse**     | Existing `ratelimit({ key, limit, windowMs })` helper. `/api/chat` calls it with per-IP / per-user keys; no new service file needed.                                                                                                                                                                                                                                                                                                           |
| `apps/web/messages/<locale>.json`                        | modify (×6)   | Add `AI_CHAT_*` keys (EN/FR/ES/DE/AR/ZH); RTL verified for AR                                                                                                                                                                                                                                                                                                                                                                                  |
| `apps/web/.env.example`                                  | modify        | Document `AI_CHAT_PROVIDER`, `AI_CHAT_API_KEY`, `AI_CHAT_BASE_URL`, `AI_CHAT_MODEL`, `AI_CHAT_RATE_LIMIT_*`, `AI_CHAT_DAILY_BUDGET_USD`                                                                                                                                                                                                                                                                                                        |
| `apps/web/scripts/check-env.js`                          | modify        | Mark AI vars as required iff `aiChat.enabled=true`; no-op otherwise                                                                                                                                                                                                                                                                                                                                                                            |
| `apps/web/lib/analytics/types.ts`                        | modify        | Extend the existing `enum AnalyticsEvent` with `AI_CHAT_OPENED = 'ai_chat_opened'`, `AI_CHAT_MESSAGE_SENT`, `AI_CHAT_TOOL_CALLED`, `AI_CHAT_SCENARIO_BLOCKED`, `AI_CHAT_CLOSED`. (Note: file is `types.ts`, not `events.ts`; the project uses an enum, not lowercase string events.)                                                                                                                                                           |
| `apps/web-e2e/tests/public/ai-chat.spec.ts` (new)        | new e2e       | Anon flow, disabled flow, i18n, a11y                                                                                                                                                                                                                                                                                                                                                                                                           |
| `apps/web-e2e/tests/api/ai-chat.spec.ts` (new)           | new e2e       | Rate limit, scenario gating, 404 when disabled                                                                                                                                                                                                                                                                                                                                                                                                 |
| `apps/web-e2e/page-objects/public/ai-chat.page.ts` (new) | new           | Locators: launcher, dialog, input, messages                                                                                                                                                                                                                                                                                                                                                                                                    |
| `apps/web-e2e/fixtures/auth.fixture.ts`                  | modify        | Re-use for authenticated chat tests; seed a known submission                                                                                                                                                                                                                                                                                                                                                                                   |
| `docs/features/ai-chat.md` (new)                         | new doc       | Operator-facing usage, config reference, env vars                                                                                                                                                                                                                                                                                                                                                                                              |
| `docs/spec/README.md`                                    | modify        | New row for spec 023                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `docs/log.md`                                            | modify        | Dated entry referencing PR                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `docs/questions.md`                                      | modify        | Record open questions (default model, mutations, prompt location)                                                                                                                                                                                                                                                                                                                                                                              |

## 4. Public API / Plugin Manifest

```ts
// packages/plugin-ai-chat/src/index.ts
import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
import { AiChatConfigSchema, type AiChatConfig } from './config';

export const plugin = defineDirectoryPlugin({
	name: 'plugin-ai-chat',
	version: '0.1.0',
	templateRange: '>=0.1 <1.0',
	capabilities: ['ai-chat', 'public-surface', 'authenticated-surface'],
	config: AiChatConfigSchema,
	slots: {
		'layout.global.overlay': () => import('./components/ChatLauncher'),
		'hero.takeover': () => import('./components/ChatHeroTakeover'),
		'layout.sidebar.tab': () => import('./components/ChatSidebar')
	}
});

export { runAgent } from './agent';
export type { AiChatConfig };
```

Until Spec 002's plugin SDK lands, `defineDirectoryPlugin` is a
type-only helper that exports a typed object — the runtime mount is
done by `apps/web/app/[locale]/layout.tsx` reading the same manifest.

## 5. Data Model Changes

New (opt-in) Drizzle tables, created only when `aiChat.persist=true`:

```ts
// apps/web/lib/db/schema.ts
export const chatConversations = pgTable(
	'chat_conversations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title'),
		locale: text('locale').notNull(),
		scenario: text('scenario'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => ({
		userUpdatedIdx: index('idx_chat_conv_user_updated').on(t.userId, t.updatedAt)
	})
);

export const chatMessages = pgTable(
	'chat_messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => chatConversations.id, { onDelete: 'cascade' }),
		role: text('role').notNull(), // 'user' | 'assistant' | 'tool'
		parts: jsonb('parts').notNull(),
		toolCalls: jsonb('tool_calls'),
		toolResults: jsonb('tool_results'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => ({
		convCreatedIdx: index('idx_chat_msg_conv_created').on(t.conversationId, t.createdAt)
	})
);
```

SQLite variants use `text` for `jsonb` columns. Migration generated
via `pnpm db:generate`; applied via `pnpm db:migrate`. No backfill —
new tables are empty on day one. Tables are created on every install
but are simply unused when `aiChat.persist=false` (cheap, low risk,
keeps `db:migrate` deterministic).

## 6. UX & A11y Plan

- **Components and slot locations.**
    - `<ChatLauncher>` mounts in `layout.global.overlay` (rendered once
      per public locale layout).
    - `<ChatHeroTakeover>` is opt-in via slot in
      `app/[locale]/(listing)/listing.tsx` and replaces the default hero.
    - `<ChatSidebar>` mounts as a tab in `LayoutClassic`'s sidebar.
- **Keyboard map.** Launcher: `Enter`/`Space` opens. Panel:
  `Esc` closes and returns focus to launcher; `Tab` cycles
  _input → send → messages → close_; `Shift+Enter` newline;
  `Enter` sends. Hero-takeover: focus starts in the single-line input.
- **Localisation.** New keys (one line each) under `AI_CHAT_*` in
  `apps/web/messages/<locale>.json`:
    - `AI_CHAT_LAUNCHER_LABEL`, `AI_CHAT_TITLE`, `AI_CHAT_PLACEHOLDER`,
      `AI_CHAT_SEND`, `AI_CHAT_CLEAR`, `AI_CHAT_CLOSE`,
      `AI_CHAT_SIGN_IN_CTA`, `AI_CHAT_SCENARIO_BLOCKED`,
      `AI_CHAT_RATE_LIMITED`, `AI_CHAT_ERROR`, `AI_CHAT_EMPTY_STATE`,
      `AI_CHAT_TYPING`, `AI_CHAT_HERO_PROMPT`.
    - Per-scenario opener: `AI_CHAT_SCENARIO_<NAME>` (e.g.
      `AI_CHAT_SCENARIO_SUBMIT`).
    - System-prompt scaffolding: `AI_CHAT_SYSTEM_PROMPT`,
      `AI_CHAT_SYSTEM_PROMPT_AUTHENTICATED` (interpolated with
      `directoryName`, `locale`, `currentPageUrl`).
- **A11y.** Launcher = `<button aria-label>`. The panel is built on
  **HeroUI's `<Modal>` / `<Drawer>` primitives**, which already ship
  with a built-in focus trap, `Esc`-to-close, `role="dialog"` /
  `aria-modal="true"`, and `aria-labelledby` wiring — the template
  uses these throughout (e.g. `components/settings-modal.tsx`,
  `components/tags-modal.tsx`), so we reuse the same primitive
  instead of authoring a focus-trap hook. Streaming bubbles use
  `<div aria-live="polite">`. WCAG 2.2 AA contrast verified on light
    - dark themes; axe-core spec asserts.

## 7. Performance Plan

- **LCP.** Launcher is server-rendered as a `<button>` with no JS;
  contributes nothing to LCP on the listing page. ≤ 2.5 s target
  preserved.
- **INP.** Streaming responses use `aria-live="polite"` with batched
  state updates (`useTransition`); typing input uses `useDeferredValue`
  to keep the keystroke under 200 ms. ≤ 200 ms target preserved.
- **CLS.** Launcher uses a fixed `width/height`; panel mounts above the
  fold via a portal, so it does not displace document content. ≤ 0.1
  target preserved.
- **Bundle.** First-load JS for `/` increases by ≤ 5 KB gzip when the
  chat is enabled (launcher only). The panel bundle
  (`ai`, `@ai-sdk/react`, markdown renderer, plugin components) is
  ~80 KB gzip and loads via `next/dynamic` on first open.
- **Caching.** Tool calls hit React-Query-cached `/api/items` /
  `/api/categories` (already cached). The streaming endpoint itself
  is uncached by design.
- **Database.** Tools use existing repositories
  (`lib/repositories/item.repository.ts`,
  `lib/repositories/client-item.repository.ts`,
  `lib/repositories/category.repository.ts`,
  `lib/repositories/tag.repository.ts`) plus a small new
  `lib/repositories/favorite.repository.ts` that wraps reads against
  the existing `favorites` table (`userId`, `itemSlug`). No net-new
  N+1 queries.

## 8. Security Plan

- **AuthN.** `/api/chat` resolves the Auth.js session via
  `auth()`; the session is passed to the agent and bound to every
  authenticated-only tool call.
- **AuthZ.** Scenario gating happens twice: once at the API layer
  (reject calls whose `scenario` is not in
  `aiChat.{anonymous|authenticated}.scenarios`), once at the tool
  layer (each authenticated-only tool re-checks the session).
- **Input validation.** Request body validated with Zod
  (`messages`, `conversationId`, `scenario`, `currentPageUrl`).
  Messages are length-capped (`max 50 messages`, `max 4 000 chars
per message`) to prevent context-stuffing.
- **Output sanitisation.** Markdown renderer (e.g. `react-markdown`
  with `rehype-sanitize`) strips inline scripts; tool results are
  serialised through a JSON schema, never spliced raw into the
  prompt.
- **Rate limiting.** **Reuses the existing
  `apps/web/lib/utils/rate-limit.ts` helper** (`ratelimit({ key,
limit, windowMs })` — in-memory Map-backed). `/api/chat` calls it
  twice per request: a per-IP key for anonymous callers
  (default: 20 req / 60 s) and a per-user key for authenticated
  callers (default: 60 req / 60 s). Limits configurable via
  `AI_CHAT_RATE_LIMIT_ANON` / `AI_CHAT_RATE_LIMIT_AUTH`. A future
  Redis backend (for multi-instance deployments) would be a swap
  inside that helper, not a new file — out of scope for v1.
  Budget envelope: `AI_CHAT_DAILY_BUDGET_USD` disables the chat
  when exceeded.
- **Abuse.** Inputs are scanned for prompt-injection markers
  (`</?system>`, `</?assistant>`, etc.) and stripped before being
  embedded into the system prompt.
- **Secrets.** `AI_CHAT_API_KEY` is server-only; never exposed to
  the client. `.env.example` documents it; `check-env.js` enforces
  it iff `aiChat.enabled=true`.

## 9. Test Plan

- **Unit tests** (`packages/plugin-ai-chat/__tests__/`):
    - `config.test.ts` — Zod schema accepts/rejects expected configs;
      defaults applied.
    - `tools.test.ts` — each tool validates input, returns the
      expected shape, and refuses to run when its `requiresAuth` flag
      is set and no session is present.
    - `agent.test.ts` — `runAgent` injects the scenario-gating
      middleware and the rate-limiter.
- **Playwright e2e** (`apps/web-e2e/tests/public/ai-chat.spec.ts`):
  the four flows in AC-9.
- **Playwright API** (`apps/web-e2e/tests/api/ai-chat.spec.ts`):
  rate limit, scenario gating, 404 when disabled.
- **Manual verification recipe** (added to `docs/features/ai-chat.md`):
    1. `cp .env.example .env.local`, fill in `AI_CHAT_*`.
    2. Edit `.content/.works/works.yml` to add the `aiChat` block.
    3. `pnpm dev`, open `http://localhost:3000`, click the launcher,
       ask _"what is here?"_ → expect a streamed reply.
    4. Sign in as the seeded `tester@ever.works`, ask
       _"what did I submit?"_ → expect a link to the seeded item.
- **Quality bar.** `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm build`
  must pass for the affected packages.

## 10. Rollout & Migration Plan

- **Default off.** `aiChat.enabled=false` in the template's seed
  `works.yml`. Existing deployments are unaffected on upgrade.
- **Opt-in steps for an operator.**
    1. Add the `aiChat` block to `.content/.works/works.yml`.
    2. Set `AI_CHAT_*` env vars on Vercel (or wherever).
    3. Redeploy. The launcher appears on the next request.
- **Backwards compatibility.** Net-additive — no existing behaviour
  changes when `aiChat.enabled` is absent or `false`.
- **Feature flag.** None beyond `aiChat.enabled`. The Ever Works
  platform's "feature flag ceremony" exception (Workspace AGENTS.md)
  applies — we are not launched and do not need extra ramp gates.
- **Telemetry.** Typed analytics events (Spec 016) ride the existing
  multi-provider plumbing — operators that have analytics enabled
  see chat usage automatically.

## 11. Constitution Check

- [x] **I — Plugin-First** — feature ships as `packages/plugin-ai-chat/`
      with a manifest, config schema, and slot-based mount; core has two
      short seams that short-circuit when disabled.
- [x] **II — TypeScript Everywhere** — every new file is `.ts` / `.tsx`.
- [x] **III — Spec Before Code** — this spec + plan + tasks land
      before any code in the same PR; implementation lands in follow-up PRs.
- [x] **IV — Documentation First-Class** —
      `docs/features/ai-chat.md` added, indexed under `docs/index.md`,
      `docs/spec/README.md` updated, `docs/log.md` appended.
- [x] **V — Performance Budget** — see §7; launcher ≤ 5 KB gzip,
      panel loaded dynamically; LCP / INP / CLS targets unchanged.
- [x] **VI — Latest Stable Frameworks** — `ai@^6`,
      `@ai-sdk/react@^3` track latest; mirrors the platform's pinning.
- [x] **VII — Reuse Before Build** — Vercel AI SDK +
      `@ai-sdk/openai-compatible` are the popular libraries; we author
      no custom streaming layer.
- [x] **VIII — No Removal Without Migration** — additive change;
      no specs, files, or tests removed.
- [x] **IX — Test Coverage Bar** — Playwright e2e + API specs are in
      the AC list and tasks.
- [x] **X — Modular Packages** — code lives in a single focused
      package (`plugin-ai-chat`) with a declared public surface
      (`package.json#exports`).

## 12. Complexity Tracking

No violations.

## 13. Open Questions

Recorded in [`docs/questions.md`](../../questions.md):

- Q: Default model? **A (default):** `openai/gpt-4o-mini` via OpenRouter.
- Q: Should v1 allow chat-driven mutations (submit, follow)?
  **A (default):** No — read-only and `navigate` only.
- Q: Where do scenario openers / system-prompt strings live?
  **A (default):** `apps/web/messages/<locale>.json` under
  `AI_CHAT_*` so the existing translation pipeline picks them up.

## 14. References

- Spec: [`./spec.md`](./spec.md).
- Constitution: Articles I, II, III, IV, V, VI, VII, IX, X.
- Related plans: Spec 002 (Plugin Architecture),
  Spec 003 (Auth Providers), Spec 005 (Internationalisation),
  Spec 016 (Typed Analytics Events), Spec 018 (Performance Budget).
- Vercel AI SDK: <https://ai-sdk.dev/docs>.
