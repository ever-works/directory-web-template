---
id: tasks-023-ai-chat
title: 'Tasks 023 — AI Chat for Directory Visitors'
sidebar_label: '023 AI Chat — Tasks'
---

# Tasks — `023-ai-chat`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)
> **Jira:** [EW-132](https://evertech.atlassian.net/browse/EW-132)

Conventions:

- `[P]` after a task ID means it can be done in parallel with other
  `[P]` tasks (no shared dependencies).
- `[seq]` means the task must be done after the previous numbered task.
- Each task ends with a **Verification** line: how to know it is done.

## Task list

### T-001 [P] — Scaffold `plugin-ai-chat` package — **done**

- Files: `packages/plugin-ai-chat/{package.json,tsconfig.json,src/index.ts,README.md}`
- Steps:
    1. [x] Create the package skeleton at `packages/plugin-ai-chat/`.
    2. [x] Add deps: `ai@^6.0.154`, `@ai-sdk/react@^3.0.156`,
           `@ai-sdk/openai-compatible@^2.0.41`, `zod@^4.0.5`,
           `@ever-works/plugin-sdk` (workspace). Peer dep:
           `react>=19.0.0`. (Pinned the exact minor versions the
           platform ships, not arbitrary `^6` — keeps cross-repo
           parity.)
    3. [x] Wired into the workspace via the existing
           `pnpm-workspace.yaml` glob `packages/*` (no edit required).
    4. [x] TS config extends `@ever-works/tsconfig/base.json` with
           `jsx: react-jsx`. ESLint is config-free at the package
           level today (matches `plugin-sdk` / `plugin-demo` — there
           is no `packages/eslint-config` peer at this layer).
    5. [x] `package.json#exports` declared for `.` and `./config`;
           more entry points (`./components`, `./tools`) land alongside
           T-003 / T-005.
- Verification: [x] `pnpm --filter @ever-works/plugin-ai-chat
typecheck` clean; `apps/web` still typechecks; lockfile delta
  is +145 lines (the new AI SDK packages and their transitive
  deps).
- **Sub-task discovered during T-001:** add three new SLOT_IDS
  (`chat.launcher.overlay`, `home.hero.takeover`,
  `layout.sidebar.tab`) to `packages/plugin-sdk/src/slots.ts`
  before T-006 lands. Recorded as [Q-023d](../../questions.md)
  with the default ("add three new slot IDs"). Out of scope for
  T-001 itself.

### T-002 [seq] — Author `AiChatConfig` Zod schema — **done**

- Files: `packages/plugin-ai-chat/src/config.ts`
- Steps:
    1. [x] Authored `AiChatConfigSchema` (Zod, `.strict()`) and
           `AiChatConfig` (z.infer) matching the `works.yml` block in
           spec §9. Exposes the canonical constant sets
           (`CHAT_POSITIONS`, `ANONYMOUS_SCENARIOS`,
           `AUTHENTICATED_EXTRA_SCENARIOS`, `AUTHENTICATED_SCENARIOS`,
           `SHIPPED_LOCALES`) for downstream code (tools, prompts).
    2. [x] Defaults: `enabled=false`, `position='floating'`,
           `provider='openrouter'`, `model='openai/gpt-4o-mini'`,
           `defaultLocale='en'`, `persist=false`, anonymous = full
           anonymous set, authenticated = anonymous + extra. The
           line `DEFAULT_AI_CHAT_CONFIG = AiChatConfigSchema.parse({})`
           at module top doubles as a load-time smoke test that fails
           fast on schema regressions.
    3. [x] Exposed `parseAiChatConfig(unknown)` returning
           `{ ok, config | error }` for the future layout-mount seam
           in `apps/web/app/[locale]/layout.tsx` (T-006) to consume.
- **Pivot from original plan.** Step 3 of the original plan
  ("Extend `AppConfig` in `apps/web/lib/config-manager.ts` with
  typed `aiChat?: AiChatConfig`") is **not done** — and is
  withdrawn as a violation of Constitution Article I (core must
  not import from plugin packages). The only core seam that needs
  to read `aiChat` is T-006's layout mount, which calls
  `parseAiChatConfig(appConfig.aiChat)` and gets full typing from
  there. `AppConfig.[key: string]: any` continues to absorb the
  raw block unchanged. The plan §3 row for `config-manager.ts` is
  amended in the same commit.
- Verification: [x] `pnpm --filter @ever-works/plugin-ai-chat
typecheck` clean; the parse-at-module-load asserts the
  defaults round-trip. A formal unit test in
  `__tests__/config.test.ts` is deferred to **T-002b** below —
  the repo has no Jest/Vitest setup today (per CLAUDE.md §4).

### T-002b [P] — Set up a unit test runner for `packages/plugin-ai-chat`

- Files: `packages/plugin-ai-chat/{vitest.config.ts,package.json,
__tests__/config.test.ts}` (and likely a workspace-level
  `vitest.workspace.ts`)
- Context: this task did not exist in the original plan. T-002
  surfaced that the repo has no JS test runner (CLAUDE.md §4:
  _"Treat `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm build` as
  the main 'test suite' (there is currently no Jest/Vitest
  setup)."_). For plugin-ai-chat we want real unit tests of the
  Zod schema (accept / reject / default-merge), the tools'
  `requiresAuth` semantics, and the agent's scenario filter —
  none of which `tsc --noEmit` can verify on its own.
- Steps:
    1. Add `vitest` as a dev dependency on `plugin-ai-chat` (only
       — leaves `apps/web` untouched until a separate decision is
       made about the wider repo).
    2. Add a `test` script (`vitest run`) and a `test:watch`
       script.
    3. Author `__tests__/config.test.ts` covering: defaults
       round-trip, scenario-list rejection (empty array, unknown
       scenario name), `parseAiChatConfig` success/error paths.
- Verification: `pnpm --filter @ever-works/plugin-ai-chat test`
  passes locally and in CI. Tracked separately so it does not
  block T-003 / T-004 / T-005 work; those can proceed against
  the typecheck bar until T-002b lands.
- Recorded as [Q-023e](../../questions.md) so the test-framework
  decision (vitest? jest? plugin-only or repo-wide?) gets
  maintainer review.

### T-003 [seq] — Implement directory-aware tools — **done**

- Files: `packages/plugin-ai-chat/src/tools/{index.ts,
context.ts, tool.ts, types.ts, searchItems.ts, getItemDetails.ts,
listCategories.ts, listTags.ts, mySubmissions.ts,
myFavourites.ts, myProfile.ts, navigate.ts}`,
  `apps/web/lib/repositories/favorite.repository.ts`
- Steps: 1. [x] Each tool exports a `ChatTool<TInput, TOutput>` with
  `{ name, description, inputSchema (Zod), requiresAuth,
scenarios, execute }`. The wrapper carries `requiresAuth` and
  `scenarios` metadata that the agent (T-004) uses to filter
  which tools the model sees per conversation. 2. **Pivot from original plan (Article I).** Tools do **not**
  import from `apps/web` — that's the same plugin→app
  coupling Article I forbids in reverse. Instead, every tool
  receives an `AiChatToolContext` (defined in
  `tools/context.ts`) and calls methods on it. The chat route
  (`/api/chat`, T-007) constructs the real `AiChatToolContext`
  by wiring: - `searchItems` / `getItem` → existing
  `lib/services/category-git.service.ts` +
  `lib/content.ts` (Git-CMS items). - `listCategories` → `category.repository.ts`. - `listTags` → `tag.repository.ts`. - `getMySubmissions` → `ClientItemRepository.findByUser()`. - `getMyFavourites` → new `favorite.repository.ts`
  (added in this task — `listUserFavorites`,
  `countUserFavorites`, tenant-scoped reads against the
  existing `favorites` table). - `getMyProfile` → existing user / client-dashboard repos. 3. [x] Authenticated tools (`mySubmissions`, `myFavourites`,
  `myProfile`) check `ctx.session` and return an
  `AuthRequiredResult` discriminated-union shape when
  anonymous, so the model can surface a sign-in CTA. The
  agent's tool-set filter (`createTools`) also drops
  `requiresAuth=true` tools entirely from the anonymous tool
  set — belt-and-braces. 4. [x] `navigate` returns `{ path, locale }` so the client
  can `router.push()` after the stream completes. Supports
  11 known targets (home, submit, pricing, sign-in/up,
  favorites, dashboard, item, category, tag, search). 5. [x] `createTools(ctx, { scenario, allow? })` aggregator
  filters `ALL_CHAT_TOOLS` by session, scenario, and the
  optional `aiChat.{anonymous|authenticated}.scenarios`
  allow-list, then maps survivors to Vercel-AI-SDK
  `Tool` shape via the SDK's `tool()` helper.
- Verification: [x] `pnpm --filter @ever-works/plugin-ai-chat
typecheck` clean; [x] `apps/web tsc --noEmit` clean (no
  regressions from the new repository). Unit tests deferred to
  T-002b (no test framework today; tracked under Q-023e).

### T-004 [seq] — Implement `runAgent` + system-prompt scaffolding — **done**

- Files: `packages/plugin-ai-chat/src/agent.ts`,
  `packages/plugin-ai-chat/src/prompts/index.ts`
- Steps: 1. [x] `prompts/index.ts` ships: - `AiChatPromptTemplates` interface (`anonymous`,
  `authenticated`, optional per-scenario openers). - Bundled English fallback templates
  (`DEFAULT_ANONYMOUS_TEMPLATE`,
  `DEFAULT_AUTHENTICATED_TEMPLATE`) so the plugin works
  in isolation; apps override via translated strings. - `buildSystemPrompt({ templates, directoryName, locale,
scenario, session, currentPageUrl, toolNames })`
  interpolating `{directoryName}`, `{locale}`,
  `{context}`, `{toolList}` and appending the matching
  scenario opener. 2. [x] **Pivot from original plan.** Step 1 of the original
  plan said "build the system prompt from `next-intl` keys".
  The plugin **cannot import `next-intl`** — that lives in
  `apps/web` and would invert the layering (Article I). The
  route (T-007) resolves the message strings via `next-intl`
  and passes them in as `templates`. Bundled English
  templates remain the fallback. Per Q-023c default, the
  localised strings live under `AI_CHAT_*` in
  `apps/web/messages/<locale>.json`. 3. [x] `agent.ts` ships: - `runAgent({ uiMessages, model, ctx, scenario, allow?,
templates?, directoryName, currentPageUrl?, maxSteps?,
abortSignal? })` returning
  `{ stream, systemPrompt, modelMessageCount, toolNames }`. - Internally: `createTools` filters by session + scenario - allow-list, `buildSystemPrompt` assembles the prompt,
  `clampUiMessages` enforces the §8 limits (50 messages,
  4000 chars/message), `convertToModelMessages` converts
  to model form, then `streamText` with
  `stopWhen: stepCountIs(maxSteps ?? 5)`. 4. [x] Prompt-injection mitigation: `sanitiseForPrompt`
  strips `<system>`, `</system>`, `<user>`, `</user>`,
  `<assistant>`, `</assistant>` markers (case-insensitive)
  from `directoryName` and `currentPageUrl` before
  interpolation. Per spec §11 risk register. 5. [x] Returns the `StreamTextResult` to the caller without
  forcing a response shape. The route (T-007) calls
  `.toUIMessageStreamResponse()` itself so it can wire
  `onFinish` for the optional persistence path.
- Verification: [x] `pnpm --filter @ever-works/plugin-ai-chat
typecheck` clean; [x] `apps/web tsc --noEmit` clean.
  Unit tests for the prompt builder + agent filter deferred
  to T-002b (no test framework yet — Q-023e).
- **Package surface added in this task:**
  `package.json#exports` now exposes `./prompts` and `./agent`
  so the route can `import { runAgent }
from '@ever-works/plugin-ai-chat/agent'` directly.

### T-005 [P] — Author chat UI components — **done (MVP set)**

- Files: `apps/web/components/ai/{ChatLauncher.tsx,
ChatPanel.tsx, ChatProvider.tsx, ChatMessages.tsx,
ChatMessage.tsx, ChatInput.tsx, ChatWelcome.tsx, types.ts,
index.ts}`, `apps/web/messages/en.json`,
  `apps/web/package.json` (deps)
- **Pivot from original plan (Article I).** Components live in
  `apps/web/components/ai/` rather than inside the plugin. The
  plugin would need to import `@heroui/react`, `next-intl`, and
  `next/dynamic` — all app-level concerns. Putting UI inside
  `packages/plugin-ai-chat/` would couple the plugin to the
  host app's UI library, which is exactly what Article I
  forbids. The platform makes the same choice
  (`apps/web/src/components/ai/*`). Plugin retains the
  TypeScript-only surface: config, tools, agent, prompts.
- Steps:
    1. [x] Components consume `useChat()` from `@ai-sdk/react` via
           a single `AiChatProvider` (`ChatProvider.tsx`) that wraps
           `DefaultChatTransport` pointed at `/api/chat`. One source
           of state — no parallel `useState` for messages.
    2. [x] `<ChatPanel>` built on HeroUI's `<Modal>` (same
           primitive `components/settings-modal.tsx` and
           `components/tags-modal.tsx` use). HeroUI provides the focus
           trap, Esc-to-close, `role="dialog"`, `aria-modal="true"`,
           and `aria-labelledby` for free — no hand-rolled
           focus-trap.
    3. [x] Streaming list = `<ol aria-live="polite" aria-busy>`.
           Keyboard map: Enter sends, Shift+Enter newline; Stop
           button replaces Send while streaming and calls
           `chat.stop()`.
    4. [x] Uses existing primitives (HeroUI `Button`, `Textarea`,
           `Chip`, `Modal*`) and Tailwind tokens — no new design
           tokens.
    5. [x] RTL: launcher anchors to `bottom-left` via the
           `rtl:left-6 rtl:right-auto` Tailwind utilities.
- Bundle strategy (AC-7): `ChatLauncher` is a small client
  button (~few KB). The panel + everything dynamic
  (`@ai-sdk/react`, `ai`, `ChatMessages`/`ChatMessage`/`ChatInput`/
  `ChatWelcome`, the HeroUI Modal subtree) is loaded via
  `next/dynamic({ ssr: false })` — and only after the visitor
  opens the chat the first time.
- Deps added to `apps/web/package.json`: `ai@^6.0.154`,
  `@ai-sdk/react@^3.0.156`, `@ai-sdk/openai-compatible@^2.0.41`,
  `@ever-works/plugin-ai-chat` (workspace).
- i18n: `messages/en.json` gains an `ai_chat` namespace with
  31 keys (launcher labels, panel title, placeholder, send/stop,
  empty-state copy, scenario chips, error states). Other
  locales fill in via T-009.
- **MVP scope:** the seven components needed for the default
  `floating` position. `ChatToolbar` (provider selector / new
  chat / history), `ChatMarkdown` (markdown renderer),
  `ChatToolResult` (rich tool-output viewer), `ChatHeroTakeover`
  (hero-takeover layout), and `ChatSidebar` (sidebar layout)
  are deferred — `floating` is the default position and the only
  one the e2e and operator docs require for v1. Each is
  separately scoped under its own follow-up (see
  Notes section at the bottom of this file).
- Verification: [x] `pnpm tsc --noEmit` clean; [x] `pnpm lint`
  clean for the new files (0 errors, 0 warnings under
  `components/ai/`). Visual / axe-core pass tracked under T-013
  with the page object.

### T-006 [seq] — Wire `<ChatLauncher>` into the layout — **done**

- Files: `apps/web/components/ai/AiChatMount.tsx` (new server
  component), `apps/web/app/[locale]/layout.tsx` (one-line mount)
- Steps:
    1. [x] `AiChatMount` is a server component that:
        - reads `configManager.getConfig()` synchronously,
        - parses `aiChat` through `parseAiChatConfig`,
        - returns `null` when `parsed.ok === false` OR
          `parsed.config.enabled === false`,
        - resolves the session via `auth()` to set
          `isAuthenticated`,
        - renders `<ChatLauncher>` for the floating position
          (other positions fall back to floating for now — T-005d
          owns the hero-takeover / sidebar surface).
    2. [x] `<ChatLauncher>` is loaded via `next/dynamic` inside
           `AiChatMount`, so:
        - when `aiChat.enabled=false`, **no chat-related JS, CSS,
          or DOM ships on the public route** (AC-1 / AC-7).
        - when enabled, only the launcher chunk loads on
          initial render; the heavy panel + `@ai-sdk/react`
          bundle is fetched lazily on first chat-open (already
          gated by `next/dynamic` inside `ChatLauncher`).
    3. [x] Mount point added to `app/[locale]/layout.tsx`
           immediately after `<SettingsModal />` so the launcher
           overlays the page without affecting the document flow.
- Verification: [x] `pnpm tsc --noEmit` clean; [x] `pnpm lint`
  clean for the touched files; the floating launcher appears in
  the bottom-right (or bottom-left in RTL) on every locale
  layout when `aiChat.enabled=true` and disappears entirely
  when false. Bundle-size assertion (Article V budget,
  AC-7's ≤5 KB launcher delta) tracked under T-013.
- Steps:
    1. Read `config.aiChat` server-side.
    2. If `aiChat.enabled === true`, dynamically import
       `<ChatLauncher>` from `plugin-ai-chat/components`. Otherwise
       render nothing (no import, no bundle).
    3. Pass the resolved locale + directoryName as props.
- Verification: when `aiChat.enabled=false`, no `ai-chat`-related
  chunk appears in the route's first-load JS (asserted by a
  Playwright check that inspects `window.__NEXT_DATA__` or the
  network log).

### T-007 [P] — Implement `POST /api/chat` — **done**

- Files: `apps/web/app/api/chat/route.ts` (new),
  `apps/web/lib/services/chat-context.service.ts` (new),
  `apps/web/.env.example` (modified)
- Steps: 1. [x] Resolves session via existing `auth()` helper from
  `lib/auth/index.ts`. 2. [x] Validates the request body with Zod
  (`messages`, `conversationId?`, `scenario?`,
  `currentPageUrl?`, `locale?`). 400 on parse failure,
  400 on malformed JSON. 3. [x] Loads `aiChat` from `configManager.getConfig()`,
  runs it through `parseAiChatConfig`, returns 404 when
  disabled (or when the YAML block fails validation). 4. [x] Persona gating: rejects with 403 when the active
  persona (anonymous / authenticated) is disabled, or
  when the requested scenario isn't in
  `aiChat.{anonymous|authenticated}.scenarios`. Rejects
  with 401 if an authenticated-only scenario
  (my-submissions / my-favourites / my-profile) is
  requested without a session. 5. [x] Calls the **existing** `ratelimit(...)` from
  `lib/utils/rate-limit.ts` with `chat:user:${userId}`
  for authenticated and `chat:ip:${ip}` for anonymous,
  limits from `AI_CHAT_RATE_LIMIT_*` env (defaults 60 /
  20 per 60s). 429 with `Retry-After` header on excess. 6. [x] Resolves the provider via `createOpenAICompatible({
name, baseURL: AI_CHAT_BASE_URL ??
'https://openrouter.ai/api/v1', apiKey: AI_CHAT_API_KEY })`.
  Returns 503 (`provider-not-configured`) when the API key
  is missing. 7. [x] Builds a real `AiChatToolContext` via the new
  `lib/services/chat-context.service.ts` — wires
  `searchItems` / `getItem` to the existing Git-CMS
  readers (`getCachedItems`, `getCachedItem`), derives
  `listCategories` / `listTags` from the same cache (no
  net-new GH token requirement), and routes
  `getMySubmissions` to `ClientItemRepository`,
  `getMyFavourites` to the new `favorite.repository.ts`,
  `getMyProfile` to a small composition of repos +
  session. 8. [x] Dispatches to `runAgent` from the plugin and
  returns `stream.toUIMessageStreamResponse()`.
  `abortSignal` is forwarded from the request so the
  model call is cancelled when the client disconnects.
- Verification: [x] `pnpm tsc --noEmit` clean for both
  packages; route compiles cleanly under Next 16 with
  `runtime = 'nodejs'`. Playwright API spec (404, 401,
  429, 200 paths) tracked under T-013 — pending the e2e
  fixture work in that task.
- **Deferred to T-008:** the `onFinish` persistence hook
  on the streaming response (writes to
  `chat_conversations` / `chat_messages` when
  `aiChat.persist=true && session !== null`).
- **Env vars documented:** `.env.example` now describes
  `AI_CHAT_API_KEY`, `AI_CHAT_BASE_URL`, `AI_CHAT_PROVIDER`,
  `AI_CHAT_MODEL`, `AI_CHAT_RATE_LIMIT_ANON`,
  `AI_CHAT_RATE_LIMIT_AUTH`.

### T-008 [P] — Drizzle schema + repository for conversation history — **done**

- Files: `apps/web/lib/db/schema.ts`,
  `apps/web/lib/repositories/chat.repository.ts`,
  `apps/web/lib/db/migrations/0035_skinny_komodo.sql`,
  `apps/web/app/api/chat/route.ts`
- Steps:
    1. [x] Added `chat_conversations` and `chat_messages` `pgTable`
           definitions at the bottom of `lib/db/schema.ts`, mirroring
           the existing `favorites` / `featured_items` shape (text PK
           with `crypto.randomUUID()` default, cascade FKs to
           `users` / `tenant`, btree indexes on hot columns).
    2. [x] `pnpm db:generate` produced
           `migrations/0035_skinny_komodo.sql` — both tables + 3
           indexes + 3 FK constraints. No backfill needed; the tables
           are empty on day one and stay so unless
           `aiChat.persist=true`. (Repo is Postgres-only per
           `drizzle.config.ts`; SQLite is mentioned in CLAUDE.md only
           for local-dev convenience.)
    3. [x] Implemented
           `apps/web/lib/repositories/chat.repository.ts` (follows the
           existing `*.repository.ts` naming) with:
        - `createConversation({ userId, locale, scenario?, title? })`
        - `appendMessages(conversationId, messages[])` — batched
          insert + `updated_at` bump in one round-trip
        - `listConversations(userId, { limit? })` — most-recent
          first
        - `getConversation(userId, conversationId)` — returns
          `{ conversation, messages[] }` or `null` (treats
          "not found" and "not yours" identically to prevent ID
          probing)
        - `requireOwnership(userId, conversationId)` — predicate
          used by the route's persistence pre-flight
          All reads tenant-scoped where possible, with a graceful
          userId-only fallback for single-tenant deployments.
    4. [x] Wired `onFinish` into the API route's
           `toUIMessageStreamResponse({ onFinish })` callback,
           guarded by `chatConfig.persist === true && chatSession`.
           Pre-flight resolves the conversation (resumes when
           `parsed.conversationId` is supplied and owned, otherwise
           creates a new one). Persists the new user message + every
           assistant/tool message produced during the run. Errors are
           logged and swallowed so a DB hiccup never breaks the
           user-facing stream.
- Verification: [x] `pnpm db:generate` succeeded (Postgres
  dialect); [x] generated SQL inspected and matches plan §5;
  [x] `pnpm tsc --noEmit` clean for `apps/web`. Playwright API
  spec asserting a conversation is persisted and read back is
  part of T-013.

### T-009 [P] — i18n strings (six locales) — **done**

- Files: `apps/web/messages/{en,fr,es,de,ar,zh}.json`
- Steps:
    1. [x] Added the `ai_chat` namespace (29 keys) to **all six**
           locale files. English was authored in T-005; this task
           fills in FR, ES, DE, AR, ZH.
    2. [x] French translations cover the Jira AC's explicit
           requirement. The opener "Posez votre question" + the
           scenario chips were chosen to match the tone of existing
           `auth` / `header` strings in `fr.json`.
    3. [x] Arabic translations use the same `ai_chat` namespace
           and inherit RTL automatically via the existing locale
           layout direction (no extra wiring needed). The launcher's
           bottom-anchored class already includes
           `rtl:left-6 rtl:right-auto`.
- **Caveat:** translations are AI-authored (not professionally
  reviewed). FR / ES / DE / AR / ZH are all colloquially
  reasonable for tech-product UI copy and JSON-valid, but a
  human native speaker should sanity-check the panel title +
  scenario chips before final ship. Tracked separately under
  "translation review" — non-blocking for v1.
- Naming note: keys live under the `ai_chat` namespace (per the
  repo's existing `auth` / `header` snake-cased convention), not
  the `AI_CHAT_*` flat-key shape the plan §6 mentioned. The
  components consume them via `useTranslations('ai_chat')`.
- Verification: [x] `node -e "JSON.parse(...)"` round-trip
  succeeds for all six files; [x] each file exposes 29
  `ai_chat.*` keys (matches `en.json`); [x] `pnpm tsc --noEmit`
  clean. End-to-end locale switching tracked under T-013.

### T-010 [P] — Typed analytics events — **done**

- Files: `apps/web/lib/analytics/types.ts`,
  `apps/web/components/ai/ChatLauncher.tsx`,
  `apps/web/components/ai/ChatProvider.tsx`,
  `apps/web/components/ai/ChatInput.tsx`
- Steps: 1. [x] Added five enum members under a new "AI Chat (Spec 023)"
  section in `enum AnalyticsEvent`:
  `AI_CHAT_OPENED`, `AI_CHAT_CLOSED`, `AI_CHAT_MESSAGE_SENT`,
  `AI_CHAT_TOOL_CALLED`, `AI_CHAT_SCENARIO_BLOCKED`. 2. [x] Emissions via the existing `useAnalytics()` hook: - `ChatLauncher` — `AI_CHAT_OPENED` / `AI_CHAT_CLOSED` keyed
  by `scenario`. - `ChatInput` — `AI_CHAT_MESSAGE_SENT` with `{ scenario,
length }` payload. - `ChatProvider` — `AI_CHAT_TOOL_CALLED` via `useChat`'s
  `onToolCall` callback, with `{ scenario, tool }` payload. 3. **Deferred:** `AI_CHAT_SCENARIO_BLOCKED` server-side
  emission. The route logs the rejection to `console.warn`
  today; a typed client-side emission needs an
  `onError`/`onResponse` hook on `useChat` that inspects the
  response status. Tracked as a follow-up (see Notes below).
- Verification: [x] `pnpm tsc --noEmit` clean. Per-event spec
  assertions tracked under T-013 / T-013-followups.

### T-011 [P] — Env-var wiring + check-env — **done**

- Files: `apps/web/.env.example` (done in T-007),
  `apps/web/scripts/check-env.js`
- Steps:
    1. [x] `.env.example` already documents `AI_CHAT_API_KEY`,
           `AI_CHAT_BASE_URL`, `AI_CHAT_PROVIDER`, `AI_CHAT_MODEL`,
           `AI_CHAT_RATE_LIMIT_ANON`, `AI_CHAT_RATE_LIMIT_AUTH` (added
           alongside T-007).
    2. [x] `check-env.js` extended:
        - Added an `ai-chat` category to `CATEGORY_PATTERNS` (groups
          `AI_CHAT_*` vars in the categorised output).
        - Added a `checkAiChatConsistency()` helper that warns when
          any `AI_CHAT_*` override is set but `AI_CHAT_API_KEY` is
          empty — catches "operator set the model env but forgot the
          key" misconfigs at boot time.
    3. **Deferred:** parsing `.content/.works/works.yml` from the
       script to make `AI_CHAT_API_KEY` a hard requirement when
       `aiChat.enabled=true`. The runtime route already returns 503
       with a clear `provider-not-configured` error in this case,
       so the cost/value of doing the YAML parse at build time is
       low. Tracked as a follow-up.
- Verification: [x] `node scripts/check-env.js --silent --quick`
  exits cleanly when no AI vars are set; emits the consistency
  warning when only the model env is set; runtime 503 from
  `/api/chat` covers the "enabled but no key" path.

### T-012 [P] — Page object + auth fixture updates — **done (page object only)**

- Files: `apps/web-e2e/page-objects/public/ai-chat.page.ts`
- Steps:
    1. [x] `AiChatPage` extends `BasePage` with locators for
           `launcher`, `panelDialog`, `inputTextarea`, `sendButton`,
           `stopButton`, `closeButton`, `messageList`,
           `assistantMessages`, `welcomeChips`. Helpers:
           `isLauncherVisible()`, `getLauncherLabel()`, `openChat()`,
           `closeChat()`, `typeAndSend()`, `typeAndSubmitWithEnter()`,
           `waitForAssistantReply()`. Button locators use a multi-
           locale regex so they survive `next-intl` switching across
           EN/FR/ES/DE/AR/ZH.
    2. **Deferred:** seeding a known submission via
       `auth.fixture.ts`. Without an enabled-state test (which
       needs config-override infra), the deterministic seed has no
       consumer yet. Tracked under T-013-followups.
- Verification: [x] `pnpm tsc --noEmit` clean for
  `apps/web-e2e`.

### T-013 [seq] — Playwright e2e coverage — **done (disabled-state only)**

- Files: `apps/web-e2e/tests/public/ai-chat.spec.ts` (new),
  `apps/web-e2e/tests/api/ai-chat.spec.ts` (new)
- Steps shipped:
    1. [x] **Public — disabled state.** Three specs assert the
           launcher does NOT appear when `aiChat.enabled` is unset in
           `works.yml` (the seed `awesome-time-tracking-data` repo's
           default). Covers `/`, `/discover/1`, `/fr` — making sure the
           gate behaves on every public surface and every locale path.
    2. [x] **API — disabled state.** Four specs cover
           `POST /api/chat`:
        - 404 with `{ error: 'not-found' }` when the YAML doesn't
          enable chat.
        - 400 on malformed JSON / missing `messages`.
        - The route never 5xx's even on garbage input — proves
          validation runs before any other path.
- Steps deferred (tracked as **T-013-followups** under Notes): 3. Anonymous enabled-state flow (launcher visible, send,
  streamed reply mentioning a seeded item). 4. Authenticated enabled-state flow (`mySubmissions` returns
  the seeded item). 5. i18n: launcher `aria-label` in French. 6. a11y: `Esc` closes + axe-core on the open panel. 7. API: 429 rate limit, 401 auth-only scenario anonymous, 200
  streamed body.
- **Why deferred:** all enabled-state specs require either
  flipping `aiChat.enabled` per-test (a `works.yml` override
  hook or a test-mode header) **or** mocking the OpenAI-compatible
  upstream via `page.route(...)`. Neither exists in the current
  test infra. Adding either is its own scoped task — bigger than
  the rest of T-013 combined — and the disabled-state assertions
  ship valuable coverage (AC-1, AC-7) on their own.
- Verification: [x] `apps/web-e2e tsc --noEmit` clean. Playwright
  run in CI is part of the existing suite.

### T-014 [P] — Operator docs page — **done**

- Files: `docs/features/ai-chat.md` (new),
  `docs/index.md` (one-line bullet added)
- Steps:
    1. [x] Authored `docs/features/ai-chat.md` covering: what it
           does, architecture-by-layer table, three-step opt-in
           instructions (works.yml + env + migrate), full config
           reference, tools table, rate limits + cost controls,
           privacy / prompt-injection mitigations, i18n surface,
           bundle impact, analytics events, smoke-test recipe, and a
           troubleshooting table (`503` / `429` / `403` / `401`
           causes).
    2. [x] Added a one-line bullet under "Key Features" in
           `docs/index.md` linking to the new page (≤ 200 chars).
- Verification: [x] Markdown frontmatter present (`id`, `title`,
  `sidebar_label`, `sidebar_position`); [x] internal links to
  spec / related-spec pages resolve relative to `docs/`.

### T-015 [seq] — Spec index + log + open questions

- Files: `docs/spec/README.md`, `docs/log.md`,
  `docs/questions.md`
- Steps:
    1. Add the spec-023 row to `docs/spec/README.md`.
    2. Append a dated line to `docs/log.md` referencing the spec
       folder and the PR number.
    3. Add three rows to `docs/questions.md` for the open
       questions in plan §13 with their chosen defaults.
- Verification: `docs/spec/README.md` index renders, the
  questions row links resolve, `docs/log.md` line shows up at
  the top of the latest date heading.

### T-016 [seq] — Ship

- Files: this `tasks.md`
- Steps:
    1. Tick every task above.
    2. Confirm Constitution Check (plan §11) still holds.
    3. Open the implementation PR(s) linking spec / plan / tasks
       and EW-132.
    4. Address review feedback (Codex / CodeRabbit / Copilot per
       the workspace PR-review loop).
    5. Merge through `develop → stage → main` per the workspace
       release flow.
- Verification: CI green; PR description links spec, plan,
  tasks, and EW-132; Jira ticket transitioned to
  _In Progress / Done_ as appropriate.

## Acceptance Criteria → Task Map

| AC    | Tasks                      |
| ----- | -------------------------- |
| AC-1  | T-002, T-006, T-013        |
| AC-2  | T-002, T-014               |
| AC-3  | T-007, T-013               |
| AC-4  | T-003, T-004, T-007, T-013 |
| AC-5  | T-004, T-009, T-013        |
| AC-6  | T-008                      |
| AC-7  | T-006, T-007               |
| AC-8  | T-005, T-013               |
| AC-9  | T-013                      |
| AC-10 | T-006, T-013               |

## Notes

- Mark tasks completed in this file as you go (`- [x]`).
- If a task balloons in scope, split it; do not silently expand it.
- T-001 → T-004 are the critical-path package work; T-005 → T-012
  can be parallelised once the package skeleton lands.
- New tasks discovered during implementation must be appended here,
  not squirrelled away in scratch files.

## T-005 follow-ups (deferred to keep the MVP shippable)

The components below were on the original T-005 list but are not on
the critical path for the `floating` default position. Each lands as
its own task before / after T-013 depending on user value:

- **T-005a — `<ChatMarkdown>`** + `react-markdown` + `rehype-sanitize`.
  **Shipped.** Assistant text is now rendered through
  `apps/web/components/ai/ChatMarkdown.tsx` (GFM + sanitised HTML);
  user bubbles stay plain. `remark-gfm` was already in the web app;
  `react-markdown` and `rehype-sanitize` were added.
- **T-005b — `<ChatToolResult>`** rich viewer. Replaces the
  `<details><pre>JSON</pre></details>` fallback in `ChatMessage.tsx`
  with a per-tool renderer (item cards for `searchItems`, category
  pill list for `listCategories`, etc.).
- **T-005c — `<ChatToolbar>`** (provider/model selector + new chat
    - history) — only needed when we expose user-facing chat
      history; gated on T-008 being shipped.
- **T-005d — `<ChatHeroTakeover>`** and `<ChatSidebar>`. Required
  before T-006 supports the `hero-takeover` and `sidebar`
  positions. Both are off the default path; AC-1 still passes with
  `floating` only.

## T-010 follow-up

- **T-010a — `AI_CHAT_SCENARIO_BLOCKED` client emission.** The
  route already logs `console.warn` on scenario rejection; the
  client-side typed event needs an `onError` / `onResponse` hook
  on `useChat` that inspects the response status. Tracked
  separately so it doesn't block the rest of T-010.

## T-011 follow-up

- **T-011a — Strict `AI_CHAT_API_KEY` validation when enabled.**
  Today `check-env.js` warns on inconsistent overrides; the
  stricter check requires parsing
  `.content/.works/works.yml` from the script (new `js-yaml`
  dep + the file may not exist at build time on Vercel).
  Cost/value is low because `/api/chat` returns a clear 503
  at runtime — but the build-time gate could land in a future
  iteration.

## T-013 follow-ups (enabled-state e2e + provider mocking)

The disabled-state specs in T-013 ship valuable AC-1 + AC-7
coverage, but the enabled-state specs need either a config
override or upstream mocking. Each follow-up is independently
scoped:

- **T-013a — config-override hook for e2e.** **Shipped.**
  `apps/web/lib/services/ai-chat-test-overrides.ts` reads an
  `ai-chat-test-override` cookie, gated by
  `E2E_ALLOW_TEST_OVERRIDES=true` AND `NODE_ENV !== production`.
  Both `AiChatMount` (server component) and `/api/chat/route.ts`
  apply the override before checking `enabled`. Token defaults to
  `enabled` and can be customised via `E2E_TEST_OVERRIDE_TOKEN`.
- **T-013b — upstream provider mock.** **Shipped.** Because the
  OpenAI-compatible call is made from the Next.js server, browser
  `page.route(...)` cannot intercept it. Instead, the gated route
  `apps/web/app/api/__test__/openai-mock/chat/completions/route.ts`
  returns a canned SSE stream and is only active when the override
  env vars are set. Tests configure
  `AI_CHAT_BASE_URL=http://localhost:3000/api/__test__/openai-mock`.
- **T-013c — Anonymous flow spec.** **Shipped** in
  `apps/web-e2e/tests/public/ai-chat-enabled.spec.ts` (launcher
  open, streamed reply, markdown rendered without raw asterisks).
- **T-013d — Authenticated flow spec.** **Shipped** in
  `apps/web-e2e/tests/client/ai-chat-enabled.spec.ts` using the
  `clientPage` fixture; sends a message and asserts the streamed
  assistant turn renders. Full `mySubmissions` round-trip with a
  fixture-seeded `client_items` row is still deferred until the
  T-012 seed helper lands.
- **T-013e — i18n spec.** **Shipped** in
  `apps/web-e2e/tests/public/ai-chat-enabled.spec.ts`: asserts the
  launcher `aria-label` on `/fr` is non-empty and is not the
  English default.
- **T-013f — a11y spec.** **Shipped** in the same file: `Esc`
  closes the dialog and focus returns to the launcher, and
  `@axe-core/playwright` is asserted clean of critical / serious
  violations on the open panel (`color-contrast` disabled because
  it is theme-tunable and out of scope for AC-8).
- **T-013g — API contract spec.** **Shipped** in
  `apps/web-e2e/tests/api/ai-chat-enabled.spec.ts`: 200 with a
  non-JSON streaming `Content-Type`, 401 when an authenticated-only
  scenario is requested anonymously, and 429 once the anon
  rate-limit window is exhausted.

All seven specs `test.skip` when the override env vars are not
provisioned, so they pass cleanly under the current CI job and are
expected to be flipped on by a parallel CI job (or local run)
that exports:

```bash
export E2E_ALLOW_TEST_OVERRIDES=true
export AI_CHAT_API_KEY=anything
export AI_CHAT_BASE_URL=http://localhost:3000/api/__test__/openai-mock
```
