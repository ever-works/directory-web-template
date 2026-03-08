---
id: index
title: Plateforme Ever Works
sidebar_label: Plateforme
sidebar_position: 0
slug: /
---

# Plateforme Ever Works

La Plateforme Ever Works est l'infrastructure backend qui alimente les sites web d'annuaires générés par IA. Elle fournit des APIs REST, un pipeline de génération IA, la gestion de base de données et des outils de déploiement — le tout organisé sous forme de monorepo **Turborepo + pnpm workspaces**.

## Composants

| Composant | Technologie | Description |
|-----------|-----------|-------------|
| **API** | NestJS 11 | API REST avec auth JWT, gestion des annuaires, conversations IA, déploiement |
| **Tableau de bord web** | Next.js 16 | Interface d'administration pour gérer les annuaires et le contenu |
| **CLI** | Commander.js + esbuild | Outil en ligne de commande autonome pour les opérations d'annuaires |
| **CLI interne** | nest-commander | Outillage interne pour les tâches de maintenance |
| **@packages/agent** | LangChain, TypeORM | Agents IA, génération de données, base de données, opérations git, déploiement |
| **@packages/monitoring** | Sentry, PostHog | Suivi des erreurs et analytique produit |
| **@packages/tasks** | Trigger.dev | Traitement des tâches en arrière-plan |

## Documentation

- [Aperçu de la plateforme](/platform/overview) — Fonctionnement de la plateforme et sa stack technologique
- [Premiers pas](/platform/getting-started) — Prérequis, installation et configuration de développement
- [Architecture](/platform/architecture) — Structure du monorepo, modules et flux de données
- [Référence API](/platform/api) — Points d'accès de l'API REST et utilisation
- [IA et génération](/platform/ai-agents) — Fournisseurs IA, pipeline de génération et routage de modèles
- [Base de données](/platform/database) — Bases de données prises en charge, entités et configuration
- [Système de plugins](/platform/plugin-system) — État actuel et extensibilité prévue

## Voir aussi

- [Modèle de site Ever Works](/template) — Le modèle frontend de site d'annuaire
- [Documentation générale](/docs) — Aperçu et FAQ
