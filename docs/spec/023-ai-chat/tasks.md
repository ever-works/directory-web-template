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

### T-002 [seq] — Author `AiChatConfig` Zod schema + `AppConfig` extension

- Files: `packages/plugin-ai-chat/src/config.ts`,
  `apps/web/lib/config-manager.ts`
- Steps:
  1. Author `AiChatConfigSchema` (Zod) and `AiChatConfig` (type)
     matching the `works.yml` block in the spec §9.
  2. Export defaults (`enabled: false`, `position: 'floating'`,
     anonymous scenarios = full default set, authenticated scenarios
     = anonymous + personal tools, `persist: false`).
  3. Extend `AppConfig` in `apps/web/lib/config-manager.ts` with
     optional `aiChat?: AiChatConfig`. Wire the merge into the
     existing `mergeConfigObjects` path.
- Verification: `pnpm tsc --noEmit` clean; a unit test in
  `packages/plugin-ai-chat/__tests__/config.test.ts` covers schema
  acceptance, rejection, and default-merging.

### T-003 [seq] — Implement directory-aware tools

- Files: `packages/plugin-ai-chat/src/tools/{index.ts,searchItems.ts,
  getItemDetails.ts,listCategories.ts,listTags.ts,mySubmissions.ts,
  myFavourites.ts,myProfile.ts,navigate.ts}`,
  `apps/web/lib/repositories/favorite.repository.ts`
- Steps:
  1. Each tool exports `{ description, inputSchema (Zod),
     requiresAuth, execute }`.
  2. Read tools wrap existing repositories — no direct SQL:
     - `searchItems` / `getItemDetails` → `item.repository.ts`
     - `listCategories` → `category.repository.ts`
     - `listTags` → `tag.repository.ts`
  3. Authenticated tools accept a `session` parameter and refuse to
     run when `session === null`:
     - `mySubmissions` → `ClientItemRepository.findByUser(userId)`
       (rows in `items` table with `submitted_by=userId,
       status='pending'`).
     - `myFavourites` → new
       `lib/repositories/favorite.repository.ts` reading the
       existing `favorites` table (`userId`, `itemSlug`,
       `tenantId`).
     - `myProfile` → existing user / `client-dashboard` repos.
  4. `navigate` returns a structured `{ path, locale }` so the
     client can `router.push()` after the stream completes.
- Verification: unit tests in
  `packages/plugin-ai-chat/__tests__/tools.test.ts` cover the
  happy path and the auth-refusal path for each tool; the new
  `favorite.repository.ts` has its own test covering tenant
  isolation.

### T-004 [seq] — Implement `runAgent` + system-prompt scaffolding

- Files: `packages/plugin-ai-chat/src/agent.ts`,
  `packages/plugin-ai-chat/src/prompts/index.ts`
- Steps:
  1. Build the system prompt from `next-intl` keys
     (`AI_CHAT_SYSTEM_PROMPT`, `AI_CHAT_SYSTEM_PROMPT_AUTHENTICATED`,
     interpolating `directoryName`, `locale`, `currentPageUrl`).
  2. Author `runAgent({ messages, scenario, session, locale,
     currentPageUrl })` that:
     - filters the tool set by `requiresAuth` + scenario,
     - calls `streamText({...})` from `ai`,
     - returns `{ toUIMessageStreamResponse }`.
  3. Strip prompt-injection markers from user input before
     interpolation (per spec §11).
- Verification: `packages/plugin-ai-chat/__tests__/agent.test.ts`
  asserts (with a mock provider) that the prompt includes the
  resolved locale + page URL, that filtered tools include only
  scenario-allowed entries, and that an anonymous session cannot
  invoke `mySubmissions`.

### T-005 [P] — Author chat UI components

- Files: `packages/plugin-ai-chat/src/components/{ChatLauncher.tsx,
  ChatPanel.tsx,ChatProvider.tsx,ChatMessages.tsx,ChatMessage.tsx,
  ChatInput.tsx,ChatToolbar.tsx,ChatWelcome.tsx,ChatMarkdown.tsx,
  ChatToolResult.tsx,ChatHeroTakeover.tsx,ChatSidebar.tsx}`
- Steps:
  1. Mirror the platform's component names; consume `useChat()` from
     `@ai-sdk/react` with `DefaultChatTransport` pointing at
     `/api/chat`.
  2. Build `<ChatPanel>` on **HeroUI's `<Modal>` / `<Drawer>`**
     (same primitive used by `components/settings-modal.tsx`,
     `components/tags-modal.tsx`). HeroUI already provides the
     focus trap, `Esc`-to-close, `role="dialog"` /
     `aria-modal="true"`, and `aria-labelledby` wiring — do **not**
     hand-roll a focus-trap hook.
  3. Streaming bubble = `<div aria-live="polite">`. Implement the
     keyboard map from spec §8 / plan §6 on top of HeroUI's
     bindings (Enter/Send, Shift+Enter newline).
  4. Use existing UI primitives (HeroUI / shadcn) where applicable;
     do not author new design tokens.
  5. Ensure RTL works for Arabic (panel anchored to bottom-left).
- Verification: visual diff against the wireframe sketches; axe-core
  pass under both `dark` and `light` themes (asserted in the e2e
  task T-013).

### T-006 [seq] — Wire `<ChatLauncher>` into the layout

- Files: `apps/web/app/[locale]/layout.tsx`
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

### T-007 [P] — Implement `POST /api/chat`

- Files: `apps/web/app/api/chat/route.ts` (only — **no new
  rate-limit file**)
- Steps:
  1. Resolve session via existing `auth()` helper from
     `lib/auth/index.ts`.
  2. Validate the request body with Zod (`messages`,
     `conversationId?`, `scenario?`, `currentPageUrl?`).
  3. Look up `aiChat.enabled`; return 404 when false.
  4. Apply rate-limit by calling the **existing** helper
     `apps/web/lib/utils/rate-limit.ts → ratelimit(...)`. Use
     `ip:${ip}` for anonymous and `user:${session.userId}` for
     authenticated callers, with the limits/window from
     `AI_CHAT_RATE_LIMIT_*`. Return 429 with `Retry-After` when
     exceeded.
  5. Resolve the active provider via `createOpenAICompatible({
     name: 'ever-works-template',
     baseURL: env.AI_CHAT_BASE_URL,
     apiKey: env.AI_CHAT_API_KEY,
  })`.
  6. Dispatch to `runAgent` from `plugin-ai-chat` and stream the
     response via `toUIMessageStreamResponse()`.
- Verification: Playwright API spec in
  `apps/web-e2e/tests/api/ai-chat.spec.ts` asserts the 404, 401,
  429, and 200 paths.

### T-008 [P] — Drizzle schema + repository for conversation history

- Files: `apps/web/lib/db/schema.ts`,
  `apps/web/lib/repositories/chat.repository.ts`,
  `apps/web/lib/db/migrations/*`
- Steps:
  1. Add `chat_conversations` and `chat_messages` tables (plan §5).
  2. Generate migration via `pnpm db:generate`; smoke-test
     `pnpm db:migrate` against SQLite and Postgres.
  3. Implement `lib/repositories/chat.repository.ts` (follows the
     existing `*.repository.ts` naming) with `createConversation`,
     `appendMessages`, `listConversations`, `getConversation` —
     all user-scoped.
  4. Wire `onFinish` in the API route to call the repository when
     `aiChat.persist === true && session !== null`.
- Verification: `pnpm db:migrate` succeeds on a fresh SQLite db;
  a Playwright API spec persists a conversation and reads it back.

### T-009 [P] — i18n strings (six locales)

- Files: `apps/web/messages/{en,fr,es,de,ar,zh}.json`
- Steps:
  1. Add the `AI_CHAT_*` keys from plan §6 to all six locale files.
  2. French strings reviewed against the Jira AC (FR required).
  3. AR string set verified RTL with the existing
     `tests/public/i18n.spec.ts` page object.
- Verification: `pnpm --filter @ever-works/web exec next-intl check`
  (or the existing message-completeness script) reports no
  missing keys across locales.

### T-010 [P] — Typed analytics events

- Files: `apps/web/lib/analytics/types.ts`
- Steps:
  1. Extend the existing `enum AnalyticsEvent` (in
     `lib/analytics/types.ts`, **not** an `events.ts` file —
     that name is wrong; the repo uses an enum) with these
     members:
     - `AI_CHAT_OPENED = 'ai_chat_opened'`
     - `AI_CHAT_MESSAGE_SENT = 'ai_chat_message_sent'`
     - `AI_CHAT_TOOL_CALLED = 'ai_chat_tool_called'`
     - `AI_CHAT_SCENARIO_BLOCKED = 'ai_chat_scenario_blocked'`
     - `AI_CHAT_CLOSED = 'ai_chat_closed'`
  2. If Spec 016 has shipped Zod payload schemas for each enum
     member, add matching schemas alongside; otherwise emit
     untyped payloads (matches the rest of the file today).
  3. Emit via `analytics.track(AnalyticsEvent.AI_CHAT_OPENED, {...})`
     from `ChatLauncher` (open/close), the chat transport
     (`message_sent`), the agent's `onToolCall` hook
     (`tool_called`), and the API route on scenario rejection
     (`scenario_blocked`).
- Verification: a Playwright spec captures `__NEXT_ANALYTICS__`
  fixture events and asserts each event fires once per user
  action.

### T-011 [P] — Env-var wiring + check-env

- Files: `apps/web/.env.example`,
  `apps/web/scripts/check-env.js`
- Steps:
  1. Document `AI_CHAT_PROVIDER`, `AI_CHAT_API_KEY`,
     `AI_CHAT_BASE_URL`, `AI_CHAT_MODEL`,
     `AI_CHAT_RATE_LIMIT_ANON`, `AI_CHAT_RATE_LIMIT_AUTH`,
     `AI_CHAT_DAILY_BUDGET_USD` in `.env.example`.
  2. Update `check-env.js` to mark the AI vars as required iff
     the merged config has `aiChat.enabled === true`; no-op
     otherwise.
- Verification: `pnpm check-env` fails with a clear message when
  `aiChat.enabled=true` but the keys are missing; passes when
  they are present or when `aiChat.enabled=false`.

### T-012 [P] — Page object + auth fixture updates

- Files: `apps/web-e2e/page-objects/public/ai-chat.page.ts`,
  `apps/web-e2e/fixtures/auth.fixture.ts`
- Steps:
  1. Author `AiChatPage` with locators: `launcherButton`,
     `panelDialog`, `inputTextarea`, `sendButton`, `messageList`,
     `lastAssistantMessage`, `closeButton`.
  2. Extend `auth.fixture.ts` to seed a known submission for the
     fixture user so `mySubmissions` returns a deterministic
     result.
- Verification: page object compiles; fixture seeds and tears
  down cleanly.

### T-013 [seq] — Playwright e2e coverage

- Files: `apps/web-e2e/tests/public/ai-chat.spec.ts`,
  `apps/web-e2e/tests/api/ai-chat.spec.ts`
- Steps:
  1. Anonymous: launcher visible, opens, accepts a question,
     streams a reply that mentions an item from the seeded CMS
     (assert by role + data-testid, not exact copy).
  2. Disabled: when `aiChat.enabled=false`, no launcher in DOM
     and `/api/chat` returns 404.
  3. Authenticated: signed-in fixture user asks
     *"what did I submit?"* — reply contains a link to the
     seeded item.
  4. i18n: with `NEXT_LOCALE=fr`, launcher `aria-label` is the
     French translation.
  5. a11y: `Esc` closes the dialog and returns focus to the
     launcher; axe-core passes on the open panel under both
     themes.
  6. API: rate-limit, scenario gating, 404-when-disabled,
     401-when-anon-uses-auth-only-scenario.
- Verification: `pnpm --filter @ever-works/web-e2e exec playwright
  test tests/public/ai-chat.spec.ts tests/api/ai-chat.spec.ts`
  passes locally and in CI.

### T-014 [P] — Operator docs page

- Files: `docs/features/ai-chat.md`, `docs/index.md`
- Steps:
  1. Author `docs/features/ai-chat.md`: what it does, how to
     enable it, full config reference (`works.yml`), env vars,
     scenarios catalogue, rate-limit defaults, performance notes,
     manual verification recipe.
  2. Add a one-line bullet under "Features" in `docs/index.md`
     linking to the new page (≤ 200 chars).
- Verification: docs lint clean; bullet is a single line; no
  broken internal links.

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
  *In Progress / Done* as appropriate.

## Acceptance Criteria → Task Map

| AC    | Tasks                                |
| ----- | ------------------------------------ |
| AC-1  | T-002, T-006, T-013                  |
| AC-2  | T-002, T-014                         |
| AC-3  | T-007, T-013                         |
| AC-4  | T-003, T-004, T-007, T-013           |
| AC-5  | T-004, T-009, T-013                  |
| AC-6  | T-008                                |
| AC-7  | T-006, T-007                         |
| AC-8  | T-005, T-013                         |
| AC-9  | T-013                                |
| AC-10 | T-006, T-013                         |

## Notes

- Mark tasks completed in this file as you go (`- [x]`).
- If a task balloons in scope, split it; do not silently expand it.
- T-001 → T-004 are the critical-path package work; T-005 → T-012
  can be parallelised once the package skeleton lands.
- New tasks discovered during implementation must be appended here,
  not squirrelled away in scratch files.
