---
id: faq
title: Foire aux questions
sidebar_label: FAQ
---

# Foire aux questions

## Général

### Qu'est-ce que le Modèle de site Ever Works ?

Le Modèle de site Ever Works est une solution de site d'annuaire full-stack prête pour la production, construite avec Next.js, React, TypeScript et Tailwind CSS. Vous pouvez le cloner, le personnaliser et le déployer pour créer des sites d'annuaires professionnels.

### Puis-je utiliser le modèle sans la Plateforme Ever Works ?

Oui. Le modèle fonctionne indépendamment comme une application Next.js autonome avec ses propres routes API, authentification, base de données et traitement des paiements. La Plateforme est un produit séparé qui peut optionnellement alimenter la génération de contenu via l'IA. Consultez [docs.ever.works](https://docs.ever.works) pour la documentation de la Plateforme.

## Stack technologique

### Quelles technologies le modèle utilise-t-il ?

- **Framework :** Next.js, React 19
- **Langage :** TypeScript 5
- **Styles :** Tailwind CSS, HeroUI React, Radix UI
- **ORM :** Drizzle ORM avec PostgreSQL
- **Auth :** NextAuth.js v5, Supabase Auth
- **Paiements :** Stripe, LemonSqueezy, Polar

### Quels fournisseurs d'authentification sont pris en charge ?

Google, GitHub, Facebook, Twitter et Microsoft via NextAuth.js v5, plus Supabase Auth comme backend d'authentification alternatif.

### Quels fournisseurs de paiement sont pris en charge ?

Stripe, LemonSqueezy et Polar, tous avec prise en charge de la gestion des abonnements.

## Déploiement

### Comment déployer le modèle ?

La cible de déploiement recommandée est **Vercel** pour un hébergement Next.js sans configuration. Docker est également pris en charge comme alternative. Consultez le [Guide de déploiement](/deployment/deployment-introduction) pour les instructions détaillées.

### Quelle base de données utiliser ?

PostgreSQL est la base de données principale, généralement fournie via **Supabase** (géré) ou une instance PostgreSQL directe. Pour le développement local, SQLite fonctionne également via `DATABASE_URL=file:./dev.db`.

## Contenu

### Comment fonctionne le CMS basé sur Git ?

Le modèle lit le contenu d'annuaire (éléments, catégories, métadonnées) depuis des fichiers structurés (YAML, Markdown) stockés dans un dépôt Git. Au moment de la construction, le contenu est cloné dans le répertoire `.content/` et rendu par Next.js. Vous pouvez gérer le contenu en éditant les fichiers directement.

### Puis-je ajouter des éléments manuellement ?

Oui. Vous pouvez créer et éditer des fichiers YAML et Markdown dans le dépôt de données CMS sans avoir besoin de la Plateforme. Les contributions de la communauté peuvent également être soumises sous forme de pull requests.

## Support

### Où puis-je obtenir de l'aide ?

Consultez la [page Support](/support) pour les canaux communautaires, les options de support professionnel et les guides de dépannage.
