---
id: index
title: Modèle de site Ever Works
sidebar_label: Aperçu
sidebar_position: 0
slug: /
---

# Modèle de site Ever Works

Le Modèle de site Ever Works est une solution de site web d'annuaire moderne et full-stack construite avec Next.js 15. Il est conçu pour vous aider à créer des sites d'annuaires professionnels pour des outils, services, produits ou tout autre type de plateforme de référencement.

## Fonctionnalités clés

- **Stack technologique moderne** : Next.js 15, React 19, TypeScript, Tailwind CSS, HeroUI React
- **Authentification flexible** : NextAuth.js v5, Supabase Auth, fournisseurs OAuth (Google, GitHub, Facebook, Twitter, Microsoft)
- **Intégration de paiement** : Stripe, LemonSqueezy, Polar, gestion des abonnements
- **Internationalisation** : 6 langues prises en charge (EN, FR, ES, ZH, DE, AR) avec support RTL
- **CMS basé sur Git** : Synchronisation du contenu depuis des dépôts Git avec structure basée sur YAML
- **Système de thèmes** : 4 thèmes intégrés avec génération dynamique de couleurs
- **Analytique et monitoring** : PostHog, Sentry, suivi des performances

## Démarrage rapide

```bash
# Cloner le dépôt
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
# Modifiez .env.local avec votre configuration

# Démarrer le serveur de développement
npm run dev
```

Visitez [http://localhost:3000](http://localhost:3000) pour voir votre site !

## Prochaines étapes

- [Guide d'installation](/template/getting-started/installation) — Instructions complètes de configuration
- [Guide de démarrage rapide](/template/getting-started/quick-start) — Soyez opérationnel en moins de 10 minutes
- [Aperçu de l'architecture](/template/architecture/overview) — Comprendre la conception du système

## Cas d'utilisation

Ce modèle est parfait pour :

- **Annuaires d'outils** (comme ProductHunt pour les outils)
- **Places de marché de services**
- **Catalogues de ressources**
- **Annuaires professionnels**
- **Vitrines de produits**
- **Plateformes communautaires**

## Besoin d'aide ?

- Consultez notre [documentation](/docs) pour des informations générales
- Rejoignez notre [communauté Discord](https://discord.gg/ever) pour du support
- Visitez le [site de démonstration](https://demo.ever.works) pour le voir en action
- Contactez le [support](/docs/support) pour une assistance technique
