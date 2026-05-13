# `@ever-works/plugin-ai-chat`

AI chat plugin for the Ever Works Directory Web Template.
Read the spec, plan, and tasks under [`docs/spec/023-ai-chat/`](../../docs/spec/023-ai-chat/spec.md).

## What this is

An opt-in chat surface that helps directory visitors browse, search,
submit, and get support — and gives logged-in members an
account-aware assistant (their submissions, favourites, profile).

Built on the [Vercel AI SDK](https://ai-sdk.dev/docs)
(`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`) so it works with
any OpenAI-compatible provider (OpenRouter by default).

## Status

**T-001 — scaffold only.** This package currently exports nothing
useful at runtime. The remaining tasks (config schema, tools,
agent runner, components) ship in follow-up commits per
[`docs/spec/023-ai-chat/tasks.md`](../../docs/spec/023-ai-chat/tasks.md).

## How an operator turns it on (preview — not wired yet)

Add an `aiChat` block to your directory's `works.yml`:

```yaml
aiChat:
    enabled: true
    position: floating          # floating | hero-takeover | sidebar
    provider: openrouter
    model: openai/gpt-4o-mini
    defaultLocale: en
    persist: false
    anonymous:
        enabled: true
        scenarios: [browse, search, submit, pricing, login-help, support]
    authenticated:
        enabled: true
        scenarios: [browse, search, submit, pricing, my-submissions,
                    my-favourites, my-profile, navigate, support]
```

Then set `AI_CHAT_API_KEY` (and optionally `AI_CHAT_BASE_URL` /
`AI_CHAT_MODEL`) in your environment.

## Layout

```
src/
  index.ts          # Public entry (currently a scaffold stub)
  config.ts         # AiChatConfig Zod schema           (T-002)
  agent.ts          # runAgent() — streamText + tools   (T-004)
  tools/            # searchItems, mySubmissions, etc.  (T-003)
  components/       # ChatLauncher, ChatPanel, …        (T-005)
  prompts/          # System-prompt scaffolding         (T-004)
```

## Constitution & spec

This plugin is governed by the
[Directory Web Template Constitution](../../.specify/memory/constitution.md);
its design rationale lives in
[`docs/spec/023-ai-chat/`](../../docs/spec/023-ai-chat/spec.md).
