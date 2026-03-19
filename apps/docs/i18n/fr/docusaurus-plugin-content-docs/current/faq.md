---
id: faq
title: Foire aux questions
sidebar_label: FAQ
sidebar_position: 3
---

# Foire aux questions

## Général

### Quelle est la différence entre la plateforme et le modèle ?

Le **Modèle** est un site web Next.js autonome, prêt pour la production, que vous pouvez cloner, personnaliser et déployer. La **Plateforme** est l'infrastructure backend (APIs, agents IA, système de plugins) qui peut alimenter un ou plusieurs sites d'annuaires à grande échelle.

### Puis-je utiliser le modèle sans la plateforme ?

Oui. Le modèle fonctionne de manière indépendante en tant qu'application Next.js autonome avec ses propres routes API, authentification et base de données.

### Qu'est-ce que Pinler.com ?

[Pinler.com](https://pinler.com) est un service SaaS d'annuaires construit sur la plateforme et le modèle Ever Works. Il démontre un déploiement en production de la pile complète Ever Works.

## Modèle

### Quelles technologies le modèle utilise-t-il ?

Next.js 15, React 19, TypeScript, Tailwind CSS, HeroUI React, Prisma ORM, PostgreSQL et Supabase.

### Quels fournisseurs d'authentification sont pris en charge ?

Google, GitHub, Facebook, Twitter et Microsoft via NextAuth.js v5, ainsi que Supabase Auth.

### Quels fournisseurs de paiement sont pris en charge ?

Stripe, LemonSqueezy et Polar avec gestion des abonnements.

### Comment déployer le modèle ?

Consultez le [Guide de déploiement](/template/deployment) pour les instructions de déploiement sur Vercel, Docker ou les fournisseurs cloud.

## Plateforme

### Dans quel langage l'API de la plateforme est-elle écrite ?

TypeScript, utilisant le framework NestJS.

### La plateforme prend-elle en charge les fonctionnalités IA ?

Oui. La plateforme inclut des agents IA basés sur LangChain avec prise en charge de plusieurs fournisseurs de LLM (OpenAI, Anthropic, Google, et plus encore).

## Support

### Où puis-je obtenir de l'aide ?

Consultez la [page Support](/docs/support) pour les canaux communautaires, les options de support professionnel et les guides de dépannage.
