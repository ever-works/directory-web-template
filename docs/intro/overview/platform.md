---
id: platform
title: Platform Overview
sidebar_label: Platform
sidebar_position: 1
---

# Ever Works Platform

The **Ever Works Platform** is the backend infrastructure that powers directory websites. It provides REST APIs, an AI generation pipeline, database management, and deployment tooling — organized as a Turborepo + pnpm workspaces monorepo.

## Key Components

- **NestJS API** — REST API for directory management, authentication, AI conversations, and deployment
- **Next.js Web Dashboard** — Admin interface for platform management
- **CLI Tools** — Command-line utilities for development and deployment
- **AI Agents** — LangChain-based agents with 7 LLM providers (OpenAI, Google, Anthropic, Groq, OpenRouter, Ollama, Custom)
- **Shared Packages** — Database, monitoring (Sentry + PostHog), background jobs (Trigger.dev)

## Learn More

Head to the [Platform Documentation](/platform) for full details on architecture, APIs, AI agents, and the plugin system.
