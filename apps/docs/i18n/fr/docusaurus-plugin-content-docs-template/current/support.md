---
id: support
title: Support et aide
sidebar_label: Support
---

# Support et aide

Bienvenue dans le centre d'assistance du Modèle de site Ever Works.

## Obtenir de l'aide

### Support communautaire

- **[GitHub Issues](https://github.com/ever-works/directory-web-template/issues)** — Signaler des bugs, demander des fonctionnalités ou poser des questions techniques
- **[Communauté Discord](https://discord.gg/ever)** — Rejoignez notre serveur Discord actif pour un support en temps réel
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/directory-web-template)** — Posez des questions techniques avec le tag `directory-web-template`

### Support professionnel

- **[Support par e-mail](mailto:ever@ever.co)** — Support direct pour les demandes professionnelles
- **[Problèmes de sécurité](mailto:security@ever.co)** — Signaler des vulnérabilités de sécurité en privé
- **[Support entreprise](https://ever.co/contacts)** — Support dédié pour les clients entreprise

## Ressources de documentation

- **[Guide d'installation](/getting-started/installation)** — Instructions de configuration complètes
- **[Guide de démarrage rapide](/getting-started/quick-start)** — Démarrez rapidement
- **[Aperçu de l'architecture](/architecture/overview)** — Comprendre la conception du système
- **[Guide de déploiement](/deployment/deployment-introduction)** — Déployer en production

Pour la documentation de la Plateforme Ever Works, visitez [docs.ever.works](https://docs.ever.works).

## Démo et exemples

- **[Site de démo](https://demo.ever.works)** — Voir le modèle en action
- **[Dépôt GitHub](https://github.com/ever-works/directory-web-template)** — Code source et exemples

## Dépannage

### Problèmes courants

#### Problèmes d'installation

- **Version Node.js** : Assurez-vous d'utiliser Node.js 20+
- **Gestionnaire de paquets** : Utilisez pnpm (strictement requis). Exécutez `corepack enable` pour l'activer.
- **Dépendances** : Exécutez `pnpm install` à la racine du dépôt
- **Conflits de port** : Le serveur de développement utilise par défaut le port 3000. Utilisez le flag `--port` pour en spécifier un autre.

#### Problèmes de construction

- **Erreurs TypeScript** : Exécutez `pnpm tsc --noEmit` pour vérifier les erreurs de type
- **Dépendances manquantes** : Assurez-vous que tous les paquets sont correctement installés avec `pnpm install`
- **Variables d'environnement** : Vérifiez que votre fichier `.env.local` est configuré (copiez depuis `.env.example`)

#### Problèmes de runtime

- **Authentification** : Vérifiez vos identifiants de fournisseur OAuth dans `.env.local`
- **Base de données** : Assurez-vous que votre chaîne de connexion PostgreSQL est correcte
- **Migrations** : Exécutez `pnpm db:migrate` pour appliquer les migrations de base de données en attente
