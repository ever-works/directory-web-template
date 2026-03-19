---
id: platform
title: Aperçu de la plateforme
sidebar_label: Plateforme
sidebar_position: 1
---

# Plateforme Ever Works

La **Plateforme Ever Works** est l'infrastructure backend qui alimente les sites web d'annuaires. Elle fournit des APIs REST, un pipeline de génération IA, la gestion de base de données et des outils de déploiement — organisés sous forme de monorepo Turborepo + pnpm workspaces.

## Composants clés

- **API NestJS** — API REST pour la gestion des annuaires, l'authentification, les conversations IA et le déploiement
- **Tableau de bord web Next.js** — Interface d'administration pour la gestion de la plateforme
- **Outils CLI** — Utilitaires en ligne de commande pour le développement et le déploiement
- **Agents IA** — Agents basés sur LangChain avec 7 fournisseurs de LLM (OpenAI, Google, Anthropic, Groq, OpenRouter, Ollama, Custom)
- **Packages partagés** — Base de données, monitoring (Sentry + PostHog), tâches en arrière-plan (Trigger.dev)

## En savoir plus

Rendez-vous sur la [Documentation de la plateforme](/platform) pour tous les détails sur l'architecture, les APIs, les agents IA et le système de plugins.
