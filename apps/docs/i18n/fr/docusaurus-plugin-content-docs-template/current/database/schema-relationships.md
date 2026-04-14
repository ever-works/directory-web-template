---
id: schema-relationships
title: Relations de schéma
sidebar_label: Relations de schéma
sidebar_position: 15
---

# Relations de schéma

Cette page documente toutes les relations entre les tables, les clés étrangères et les tables de jonction dans le schéma de base de données modèle. Le schéma est défini dans `lib/db/schema.ts` à l'aide de Drizzle ORM avec PostgreSQL.

## Présentation de la relation entre entités

La base de données est centrée autour de trois entités principales : **users** (admin), **client_profiles** (utilisateurs finaux) et **items** (stockés dans Git, référencés par slug). La plupart des tableaux d'engagement et de commerce se rapportent à ces trois éléments.

## Tableaux d'authentification de base

### utilisateurs

La table d'identité de niveau supérieur pour tous les comptes authentifiés.

**Référencé par :**
- `accounts.userId` (suppression en cascade)
- `sessions.userId` (suppression en cascade)
- `authenticators.userId` (suppression en cascade)
- `activityLogs.userId` (suppression en cascade)
- `client_profiles.userId` (suppression en cascade)
- `subscriptions.userId` (suppression en cascade)
- `payment_accounts.userId` (suppression en cascade)
- `notifications.user_id` (suppression en cascade)
- `favorites.userId` (suppression en cascade)
- `user_roles.user_id` (suppression en cascade)
- `reports.reviewed_by` (définir null)
- `sponsor_ads.user_id` (suppression en cascade)
- `moderation_history.performed_by` (définir null)

### comptes

Comptes OAuth et d'identification liés aux utilisateurs.

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Clé primaire composite sur `(provider, providerAccountId)`.

### séances

Sessions de connexion actives.

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

### authentificateurs

Informations d'identification WebAuthn/clé d'accès.

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Clé primaire composite sur `(userId, credentialID)`.

## Système de profil client

### profils_clients

Profils d'utilisateurs finaux avec données de plan, de statut et de localisation.

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Un index unique sur `userId` garantit un profil par utilisateur.

**Référencé par :**
- `comments.userId` (suppression en cascade)
- `votes.userid` (suppression en cascade)
- `reports.reported_by` (suppression en cascade)
- `moderation_history.user_id` (suppression en cascade)
- `activityLogs.clientId` (suppression en cascade)

## Contrôle d'accès basé sur les rôles

Le système RBAC utilise trois tables selon un modèle plusieurs-à-plusieurs.

### rôles

Rôles nommés avec indicateur administrateur.

### autorisations

Clés d'autorisation individuelles (par exemple, `items:create`).

### role_permissions (table de jonction)

Lie les rôles aux autorisations.

|Colonne|Cible|Lors de la suppression|
|--------|--------|-----------|
|`role_id`|`roles.id`|CASCADE|
|`permission_id`|`permissions.id`|CASCADE|

Clé primaire composite sur `(role_id, permission_id)`.

### user_roles (table de jonction)

Attribue des rôles aux utilisateurs.

|Colonne|Cible|Lors de la suppression|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCADE|
|`role_id`|`roles.id`|CASCADE|

Clé primaire composite sur `(user_id, role_id)`.

### Diagramme d'entité RBAC

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

Un utilisateur peut avoir plusieurs rôles, chaque rôle peut avoir plusieurs autorisations et plusieurs utilisateurs peuvent partager le même rôle.

## Tableaux de fiançailles

### commentaires

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|CASCADE|

La colonne `itemId` stocke le slug de l'élément (pas une clé étrangère, puisque les éléments vivent dans Git).

### voix

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|CASCADE|

L'index unique sur `(userid, item_id)` garantit un vote par utilisateur et par élément. La colonne `item_id` stocke le slug de l'élément.

### favoris

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Un index unique sur `(userId, item_slug)` garantit un favori par utilisateur et par article. La colonne `item_slug` stocke le slug de l'élément.

### item_views

Pas de clés étrangères. Utilise un index unique sur `(item_id, viewer_id, viewed_date_utc)` pour la déduplication quotidienne.

## Tableaux de modération de contenu

### rapports

|Colonne|Cible|Lors de la suppression|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|CASCADE|
|`reviewed_by`|`users.id`|FIXER NULL|

Index sur `content_type`, `content_id`, `status`, `reported_by` et un composite `(content_type, content_id)`.

### moderation_history

|Colonne|Cible|Lors de la suppression|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|CASCADE|
|`performed_by`|`users.id`|FIXER NULL|
|`report_id`|`reports.id`|FIXER NULL|

## Tableaux de paiement et d'abonnement

### abonnements

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Index unique sur `(payment_provider, subscription_id)`.

### abonnementHistorique

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|CASCADE|

### Fournisseurs de paiement

Pas de clés étrangères. Stocke les fournisseurs de paiement disponibles.

### comptes de paiement

|Colonne|Cible|Lors de la suppression|
|--------|--------|-----------|
|`userId`|`users.id`|CASCADE|
|`providerId`|`paymentProviders.id`|CASCADE|

Index uniques sur `(userId, providerId)` et `(customerId, providerId)`.

## Annonces de sponsor

### sponsor_ads

|Colonne|Cible|Lors de la suppression|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCADE|
|`reviewed_by`|`users.id`|FIXER NULL|

## Système de notifications

### avis

|Relation|Cible|Lors de la suppression|
|-------------|--------|-----------|
|`user_id`|`users.id`|CASCADE|

Index sur `user_id`, `type`, `is_read` et `created_at`.

## Journalisation des activités

### Journaux d'activité

|Colonne|Cible|Lors de la suppression|
|--------|--------|-----------|
|`userId`|`users.id`|CASCADE|
|`clientId`|`client_profiles.id`|CASCADE|

Les deux colonnes sont nullables ; chaque entrée de journal concerne soit un utilisateur administrateur, soit un utilisateur client.

## Autres tableaux

### newsletterAbonnements

Pas de clés étrangères. La colonne `email` possède un index unique.

### mot de passeRéinitialiserTokens

Pas de clés étrangères. Clé primaire composite sur `(identifier, token)`.

### jetons de vérification

Pas de clés étrangères. Clé primaire composite sur `(identifier, token)`.

### articles_en vedette

Pas de clés étrangères. Utilise `item_slug` pour référencer des éléments basés sur Git et `featured_by` comme champ de texte brut (pas une clé étrangère).

### enquêtes

Pas de clés étrangères. La colonne `slug` possède un index unique.

### vingt_crm_config

Pas de clés étrangères. Modèle singleton appliqué par un index d’expression unique.

### intégration_mappings

Pas de clés étrangères. Index unique sur `(ever_id, object_type)`.

### entreprises

Pas de clés étrangères.

### statut_graine

Table Singleton avec un index unique sur `id`.

## Résumé de la suppression en cascade

Lorsqu'un **utilisateur** est supprimé, les éléments suivants sont supprimés en cascade :

- Comptes, sessions, authentificateurs
- Profils clients (et de manière transitive : commentaires, votes, rapports de ce client, historique de modération)
- Abonnements
- Comptes de paiement
- Notifications
- Favoris
- Attributions des rôles d'utilisateur
- Journaux d'activité
- Annonces de sponsor

Lorsqu'un **profil client** est supprimé :

- Commentaires de cet utilisateur
- Votes de cet utilisateur
- Rapports déposés par cet utilisateur
- Historique de modération pour cet utilisateur
- Journaux d'activité pour ce client

Lorsqu'un **rôle** est supprimé :

- Toutes les attributions de rôles et d'autorisations pour ce rôle
- Toutes les attributions de rôles d'utilisateur pour ce rôle

## Références d'articles

Les éléments sont stockés dans le CMS basé sur Git, pas dans la base de données. Plusieurs tableaux référencent les éléments par slug :

- `comments.itemId` -- limace d'objet
- `votes.item_id` -- limace d'objet
- `favorites.item_slug` -- limace d'objet
- `item_views.item_id` -- limace d'objet
- `featured_items.item_slug` -- limace d'objet
- `sponsor_ads.item_slug` -- limace d'objet

Ce sont des colonnes de texte brut sans contraintes de clé étrangère.

## Documentation connexe

- [Référence du schéma](/template/database/schema-reference) -- Documentation sur le schéma au niveau des colonnes
- [Modèles de bruine](/template/database/drizzle-patterns) -- Modèles d'utilisation de l'ORM
- [Guide des migrations](/template/database/migrations-guide) -- Migrations de bases de données
