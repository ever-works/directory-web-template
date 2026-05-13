---
id: ai-chat
title: AI Chat for Directory Visitors
sidebar_label: AI Chat
sidebar_position: 33
---

# AI Chat for Directory Visitors

An opt-in conversational assistant that helps visitors browse the
directory, search, submit, and get support — and gives signed-in
members an account-aware assistant that can answer "what did I submit
last week?", surface their favourites, and guide them through
completing their profile.

> **Status:** Shipped behind the `aiChat.enabled` flag.
> **Spec:** [`docs/spec/023-ai-chat/`](../spec/023-ai-chat/spec.md)
> **Jira:** [EW-132](https://evertech.atlassian.net/browse/EW-132)

## What it does

When enabled, a floating chat launcher appears on every public page
of your directory. Visitors can:

- **Browse and search** items conversationally ("show me popular
  open-source tools tagged with billing").
- **Get help** with submission, sign-in, and pricing flows — without
  a human in the loop.
- **Navigate** — the chat can take them to a specific item,
  category, tag, or the submission form.
- **(Signed-in only)** ask about their own submissions, favourites,
  and profile.

The chat is built on the [Vercel AI SDK](https://ai-sdk.dev/) and
streams completions from any OpenAI-compatible provider. OpenRouter
is the default, but you can point it at OpenAI, Anthropic-via-OpenRouter,
Groq, Together, or any other OpenAI-shaped endpoint.

## Architecture (one-liner per layer)

| Layer | Path | What it does |
| --- | --- | --- |
| Plugin (config + schema) | `packages/plugin-ai-chat/src/config.ts` | Zod schema for the `aiChat` block in `works.yml` |
| Plugin (tools) | `packages/plugin-ai-chat/src/tools/` | 8 directory-aware tool definitions |
| Plugin (agent) | `packages/plugin-ai-chat/src/agent.ts` | `runAgent()` — `streamText` + tool-set filter |
| Plugin (prompts) | `packages/plugin-ai-chat/src/prompts/index.ts` | System-prompt builder + sanitiser |
| App (route) | `apps/web/app/api/chat/route.ts` | Session, rate-limit, provider, dispatch |
| App (DI seam) | `apps/web/lib/services/chat-context.service.ts` | Wires `AiChatToolContext` to repos + Git-CMS |
| App (persistence) | `apps/web/lib/repositories/chat.repository.ts` | Opt-in conversation history (Drizzle) |
| App (UI) | `apps/web/components/ai/` | 7 React components for the floating layout |
| App (mount) | `apps/web/components/ai/AiChatMount.tsx` | Server-gates by `aiChat.enabled` |

## Enabling it

### 1. Add the `aiChat` block to your `works.yml`

```yaml
aiChat:
    enabled: true
    position: floating            # floating | hero-takeover | sidebar
    provider: openrouter
    model: openai/gpt-4o-mini
    defaultLocale: en
    persist: false                # set true to store member conversations
    anonymous:
        enabled: true
        scenarios: [browse, search, submit, pricing, login-help, support]
    authenticated:
        enabled: true
        scenarios: [browse, search, submit, pricing, my-submissions,
                    my-favourites, my-profile, navigate, support]
```

Every field has a default; the minimal opt-in is `aiChat.enabled: true`.
The schema lives at
[`packages/plugin-ai-chat/src/config.ts`](https://github.com/ever-works/directory-web-template/blob/develop/packages/plugin-ai-chat/src/config.ts).

### 2. Set the API key

The chat needs a server-side OpenAI-compatible API key. Add to
`apps/web/.env.local`:

```bash
# Required when aiChat.enabled is true
AI_CHAT_API_KEY=sk-or-v1-…

# Optional overrides — defaults shown
# AI_CHAT_BASE_URL=https://openrouter.ai/api/v1
# AI_CHAT_PROVIDER=openrouter
# AI_CHAT_MODEL=openai/gpt-4o-mini
# AI_CHAT_RATE_LIMIT_ANON=20        # requests per 60s, anonymous
# AI_CHAT_RATE_LIMIT_AUTH=60        # requests per 60s, authenticated
```

The key is server-only — it is never sent to the browser. If the key
is missing while `aiChat.enabled: true`, `/api/chat` returns `503`
with `{ "error": "provider-not-configured" }` so you'll see a clear
runtime error rather than a silent failure.

### 3. (Optional) enable persistence

Set `aiChat.persist: true` to store **signed-in** visitors'
conversations in the `chat_conversations` / `chat_messages` Drizzle
tables. Anonymous chats are never persisted regardless. Run
`pnpm db:migrate` once after upgrading — the tables ship in migration
`0035_skinny_komodo.sql`.

### 4. Restart and verify

```bash
pnpm dev
```

Open the directory in a browser — a circular chat button appears in
the bottom-right (bottom-left in RTL locales). Click it, type a
question, and you should see a streaming reply.

## Configuration reference

### `aiChat.enabled` (boolean, default `false`)
Master switch. When `false`, **no chat JS, CSS, or DOM ships** on
public routes — the launcher import is gated server-side.

### `aiChat.position` (`'floating'` | `'hero-takeover'` | `'sidebar'`)
Where the chat surface lives. Only `floating` is fully implemented
in v1; the other two fall back to `floating` until their dedicated
layouts ship (tracked under T-005d in the spec).

### `aiChat.provider`, `aiChat.model`
String labels passed to `@ai-sdk/openai-compatible.createOpenAICompatible`.
Override per-deployment via `AI_CHAT_PROVIDER` / `AI_CHAT_MODEL` env
vars.

### `aiChat.defaultLocale` (BCP-47 string, default `'en'`)
The locale the chat uses when the visitor's locale isn't passed
explicitly. Should match one of the locales in your `next-intl`
config.

### `aiChat.persist` (boolean, default `false`)
When `true` AND the visitor is signed in, conversations are stored
in Drizzle so they can be resumed across sessions. Anonymous
conversations never persist.

### `aiChat.anonymous` / `aiChat.authenticated`

Each has an `enabled` (boolean) and a `scenarios` (string array).
Scenarios filter which tools the model can call and which welcome
chips render.

Anonymous scenarios (all default):
- `browse`, `search`, `submit`, `pricing`, `login-help`, `support`

Additional scenarios unlocked when authenticated:
- `my-submissions`, `my-favourites`, `my-profile`, `navigate`

A visitor can never invoke a scenario outside the persona's allow
list — the route enforces it with a 403 and the agent filters tools
to match.

## Tools

The plugin ships eight tools the model can call. Each is bound to a
real Ever Works data source via the `AiChatToolContext` interface:

| Tool | Anonymous? | Wires to |
| --- | --- | --- |
| `searchItems` | ✅ | `getCachedItems()` + in-memory scoring |
| `getItemDetails` | ✅ | `getCachedItem()` |
| `listCategories` | ✅ | Derived from `getCachedItems()` |
| `listTags` | ✅ | Derived from `getCachedItems()` |
| `navigate` | ✅ | Returns `{ path, locale }` for client-side `router.push()` |
| `mySubmissions` | 🔒 | `ClientItemRepository.findByUserPaginated()` |
| `myFavourites` | 🔒 | `favorite.repository.ts → listUserFavorites()` |
| `myProfile` | 🔒 | Session + `getStatsByUser()` + `countUserFavorites()` |

Authenticated tools return an `authentication-required` error shape
when called without a session — the model is instructed to surface a
sign-in CTA in that case.

## Rate limits

In-memory token bucket via the existing
`apps/web/lib/utils/rate-limit.ts`. Window is 60s.

| Persona | Default | Env override |
| --- | --- | --- |
| Anonymous | 20 req / 60s, keyed by IP | `AI_CHAT_RATE_LIMIT_ANON` |
| Authenticated | 60 req / 60s, keyed by user id | `AI_CHAT_RATE_LIMIT_AUTH` |

Excess requests return `429` with a `Retry-After` header.

For multi-instance deployments, the in-memory bucket is replaced by
swapping `lib/utils/rate-limit.ts` for a Redis-backed implementation
— out of scope for v1 but a one-file change.

## Costs and abuse

- **Per-request bound:** `runAgent` runs at most 5 model steps
  (`stepCountIs(5)`) per request, so a single chat turn can do up to
  ~5 round-trips with tool calls. Configurable via
  `RunAgentParams.maxSteps`.
- **Per-request message limits:** the route clamps history to
  50 messages × 4 000 chars/message before invoking the model.
- **Per-IP / per-user rate limiting** — see above.
- **No mutations:** v1 is read-only + `navigate`. The chat cannot
  submit, edit, follow, favourite, or pay on the visitor's behalf
  (Q-023b default). Re-evaluate once the read-only tools are
  battle-tested.

A future spec can add `AI_CHAT_DAILY_BUDGET_USD` to disable the chat
when a daily spend ceiling is exceeded.

## Privacy and prompt injection

- **System prompt sanitisation** —
  `packages/plugin-ai-chat/src/prompts/index.ts → sanitiseForPrompt()`
  strips role markers (`<system>`, `</system>`, `<user>`, `</user>`,
  `<assistant>`, `</assistant>`) from `directoryName` and
  `currentPageUrl` before interpolation.
- **Tool results treated as untrusted data** — the system prompt
  tells the model so explicitly.
- **No third-party data leakage** — tool outputs are JSON-shaped via
  the plugin's tool schemas, never raw row dumps.
- **API key never reaches the client** — `AI_CHAT_API_KEY` is read
  only server-side in `app/api/chat/route.ts`.

## Localisation

Strings live under `ai_chat.*` in `apps/web/messages/<locale>.json`.
All six locales (en / fr / es / de / ar / zh) ship 29 keys each:

- Launcher labels (`LAUNCHER_LABEL`, `LAUNCHER_CLOSE_LABEL`).
- Panel chrome (`TITLE`, `PLACEHOLDER`, `SEND`, `STOP`, `CLOSE`,
  `CLEAR`, `NEW_CHAT`).
- Empty state + scenario chips
  (`EMPTY_STATE_TITLE`, `EMPTY_STATE_BODY`, `WELCOME_CHIP_*`).
- Status (`TYPING`, `ERROR`, `RATE_LIMITED`, `SCENARIO_BLOCKED`,
  `SIGN_IN_CTA`).
- Message decoration (`ASSISTANT_LABEL`, `YOU_LABEL`,
  `TOOL_RESULT_LABEL`, `TOOL_RESULT_FROM`).

Arabic is RTL — the launcher anchors to bottom-left automatically
via the existing `rtl:left-6 rtl:right-auto` Tailwind utilities.

## Bundle impact

- **When disabled:** zero chat-related JS, CSS, or DOM on public
  routes. `AiChatMount` short-circuits server-side and never imports
  the launcher.
- **When enabled:** the launcher button is small (~few KB). The
  heavy panel (`ai`, `@ai-sdk/react`, message components, HeroUI
  Modal subtree) is lazy-loaded via `next/dynamic` only when the
  visitor opens the chat for the first time.

This preserves the Article V performance budget (Spec 018) — the
public listing bundle does not regress when chat is enabled.

## Analytics

Five PostHog events are tracked via the typed `AnalyticsEvent` enum
(Spec 016):

| Event | When |
| --- | --- |
| `ai_chat_opened` | Visitor opens the panel |
| `ai_chat_closed` | Visitor closes the panel |
| `ai_chat_message_sent` | Visitor submits a message (carries `scenario` + `length`) |
| `ai_chat_tool_called` | Model invokes a tool (carries `scenario` + `tool` name) |
| `ai_chat_scenario_blocked` | Server-side rejection (logged server-side; client emission via error-handler is a follow-up) |

## Smoke test recipe

1. Add to `.content/.works/works.yml`:
   ```yaml
   aiChat:
       enabled: true
   ```
2. Set `AI_CHAT_API_KEY` in `apps/web/.env.local`.
3. `pnpm dev`, open `http://localhost:3000`.
4. Click the chat launcher in the bottom-right.
5. Ask `"What can I find here?"` — expect a streamed reply.
6. (Signed in) ask `"What did I submit?"` — expect a list (with links)
   if you have prior submissions.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Launcher missing | `aiChat.enabled` is not `true` in works.yml |
| `503 provider-not-configured` | `AI_CHAT_API_KEY` is unset |
| `429 rate-limited` | Adjust `AI_CHAT_RATE_LIMIT_*` envs |
| `403 scenario-not-allowed` | Scenario not in works.yml's persona allow-list |
| `401 authentication-required` | An authenticated scenario was requested anonymously |
| Tool returns empty | The Git-CMS may not be cloned; check `.content/` |

## Related

- Plugin architecture: [Spec 002](../spec/002-plugin-architecture/spec.md)
- Auth providers: [Spec 003](../spec/003-auth-providers/spec.md)
- Internationalisation: [Spec 005](../spec/005-internationalisation/spec.md)
- Typed analytics events: [Spec 016](../spec/016-typed-analytics-events/spec.md)
- Performance budget: [Spec 018](../spec/018-performance-budget/spec.md)
