---
id: glossary
title: Glossaire des termes
sidebar_label: Glossaire
---

# Glossaire des termes

Termes et concepts clés utilisés dans la documentation du Directoire Web Template.

## Concepts fondamentaux

### Répertoire (Directory)

Une collection de listes (éléments) organisées autour d'un thème ou d'une niche spécifique. Un répertoire est l'entité de niveau supérieur. Exemples : un "Répertoire d'outils SaaS," un "Répertoire de ressources pour développeurs," ou un "Répertoire d'entreprises locales."

### Élément (Item)

Une entrée ou une liste unique dans un répertoire. Un élément représente une entité cataloguée (un outil, une entreprise, une ressource ou un service). Les éléments ont des champs structurés (nom, description, URL, logo), appartiennent à des catégories et peuvent être étiquetés.

### Catégorie (Category)

Une classification hiérarchique utilisée pour organiser les éléments. Les catégories forment une structure arborescente (relations parent/enfant) et constituent le mécanisme principal de navigation et de filtrage.

### Étiquette (Tag)

Une étiquette plate et non hiérarchique attachée aux éléments pour une classification transversale. Les étiquettes sont utilisées pour le filtrage secondaire et la découverte. Un élément peut avoir plusieurs étiquettes telles que "open-source," "freemium," ou "API-disponible."

### Collection

Un regroupement organisé d'éléments, indépendant des catégories ou des étiquettes. Les collections sont définies par l'utilisateur ou organisées éditorialement, comme "Le top 10" ou "Nouveau ce mois-ci."

### Taxonomie

Le système de classification global d'un répertoire, comprenant les catégories, les étiquettes et toutes autres structures d'organisation.

### Slug

Un identifiant lisible par l'humain et compatible avec les URL, dérivé du nom d'une entité. Les slugs sont utilisés dans les URL à la place des identifiants numériques. Par exemple, "Visual Studio Code" devient `visual-studio-code`.

## Modèles d'architecture

### Référentiel (Repository)

Une classe de couche d'accès aux données qui encapsule les requêtes et mutations de base de données pour une entité spécifique. Les référentiels font abstraction de Drizzle ORM et fournissent une interface propre pour les services. Situés dans `lib/repositories/`.

### Service

Une classe de couche logique métier qui orchestre les opérations à travers les référentiels, les API externes et autres services. Les services contiennent la logique applicative principale et sont appelés par les gestionnaires de routes API. Situés dans `lib/services/`.

### Webhook

Un rappel HTTP déclenché par un événement. La Template utilise des webhooks pour les notifications des fournisseurs de paiement (Stripe, LemonSqueezy, Polar) et les mises à jour d'état de déploiement. Les points de terminaison webhook valident les requêtes entrantes à l'aide de signatures ou de secrets partagés.

## Gestion de contenu

### CMS basé sur Git

L'approche de gestion de contenu utilisée par la Template. Les données du répertoire (éléments, catégories, métadonnées) sont stockées sous forme de fichiers structurés (YAML, Markdown) dans un dépôt Git. La Template clone ce dépôt au moment de la construction et lit le contenu depuis le système de fichiers local. Les modifications sont effectuées via des commits et des pull requests.

### PR communautaire

Une pull request soumise par un membre de la communauté pour ajouter ou mettre à jour des éléments dans le dépôt CMS Git d'un répertoire. Les PR communautaires passent par un processus de révision avant d'être fusionnées.

## Base de données

### Drizzle ORM

L'ORM léger et TypeScript-first utilisé par la Template. Drizzle fournit un constructeur de requêtes SQL avec une sécurité de type complète. Les définitions de schéma sont écrites en code TypeScript, et les migrations sont générées sous forme de fichiers SQL bruts via Drizzle Kit.

### Migration

Un changement de schéma de base de données versionné. Les migrations sont générées avec `pnpm db:generate` et appliquées avec `pnpm db:migrate`. Les fichiers de migration sont stockés dans `lib/db/migrations/`.

## Authentification

### NextAuth.js

La bibliothèque d'authentification (v5) utilisée par la Template. Elle fournit un support OAuth pour plusieurs fournisseurs (Google, GitHub, Facebook, Twitter, Microsoft) avec gestion des sessions et tokens JWT.

### Supabase Auth

Un backend d'authentification alternatif pris en charge par la Template. Supabase Auth fournit l'authentification par email/mot de passe, les liens magiques et OAuth social via le service géré de Supabase.

## Paiements

### Abonnement (Subscription)

Un arrangement de paiement récurrent géré via l'un des fournisseurs de paiement pris en charge (Stripe, LemonSqueezy ou Polar). La Template gère la création, la gestion et le traitement des webhooks d'abonnement.

## Déploiement

### Vercel

La plateforme de déploiement principale pour la Template. Vercel fournit un déploiement sans configuration pour les applications Next.js, incluant des déploiements de prévisualisation automatiques, des fonctions edge et la distribution CDN.

### Docker

Une méthode de déploiement alternative. La Template peut être conteneurisée et déployée dans n'importe quel environnement d'hébergement compatible Docker.
