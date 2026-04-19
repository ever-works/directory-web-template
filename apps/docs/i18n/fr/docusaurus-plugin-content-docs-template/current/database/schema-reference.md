---
id: schema-reference
title: Référence du schéma
sidebar_label: Référence du schéma
sidebar_position: 1
---

# Référence du schéma

Toutes les tables de base de données sont définies dans `lib/db/schema.ts`. Ce document catalogue chaque table, ses colonnes clés, ses relations et son objectif.

## Utilisateurs et authentification

### utilisateurs

Table des utilisateurs principaux, utilisée par NextAuth.js pour l'authentification.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID, généré automatiquement|
|`email`|texte|Unique|
|`image`|texte|URL de l’image de profil|
|`emailVerified`|horodatage|Date de vérification de l'e-mail|
|`passwordHash`|texte|Hachage Bcrypt pour l'authentification des informations d'identification|
|`createdAt`|horodatage|Réglage automatique|
|`updatedAt`|horodatage|Réglage automatique|
|`deletedAt`|horodatage|Suppression logicielle|

**Index** : `users_created_at_idx`

### comptes

Liens entre les comptes OAuth et les informations d'identification, suivant le schéma de l'adaptateur NextAuth.js.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`userId`|texte (FK)|Références `users.id` (suppression en cascade)|
|`type`|texte|Type de compte (oauth, identifiants, etc.)|
|`provider`|texte|Nom du fournisseur (google, github, informations d'identification)|
|`providerAccountId`|texte|ID de compte spécifique au fournisseur|
|`email`|texte|E-mail du compte|
|`passwordHash`|texte|Pour l'authentification des informations d'identification du client|
|`refresh_token`|texte|Jeton d'actualisation OAuth|
|`access_token`|texte|Jeton d'accès OAuth|
|`expires_at`|entier|Expiration du jeton|

**Clé primaire** : Composite sur (`provider`, `providerAccountId`)
**Index** : `accounts_email_idx`, `accounts_provider_idx`

### séances

Sessions utilisateur actives.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`sessionToken`|texte (PK)|Identifiant de session|
|`userId`|texte (FK)|Références `users.id`|
|`expires`|horodatage|Expiration de la session|

### jetons de vérification

Jetons de vérification des e-mails.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`identifier`|texte|Identifiant de l'utilisateur|
|`email`|texte|Adresse e-mail|
|`token`|texte|Jeton de vérification|
|`expires`|horodatage|Expiration du jeton|

**Clé primaire** : Composite sur (`identifier`, `token`)

### authentificateurs

Stockage des informations d'identification WebAuthn/FIDO2.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`credentialID`|texte|Identifiant unique des informations d'identification|
|`userId`|texte (FK)|Références `users.id`|
|`providerAccountId`|texte|Référence du compte fournisseur|
|`credentialPublicKey`|texte|Clé publique pour vérification|
|`counter`|entier|Compteur d'authentification|

### mot de passeRéinitialiserTokens

Jetons de réinitialisation de mot de passe pour le flux de mot de passe oublié.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`email`|texte|E-mail cible|
|`token`|texte|Jeton de réinitialisation unique|
|`expires`|horodatage|Expiration du jeton|

### Journaux d'activité

Suit les activités des utilisateurs et des clients à des fins d’audit.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|série (PK)|Incrémentation automatique|
|`userId`|texte (FK)|Références `users.id` (nullable)|
|`clientId`|texte (FK)|Références `clientProfiles.id` (nullable)|
|`action`|texte|Type d'activité (SIGN_UP, SIGN_IN, etc.)|
|`timestamp`|horodatage|Quand l’activité s’est produite|
|`ipAddress`|varchar(45)|Adresse IP du client|

**Index** : `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Rôles et autorisations

### rôles

Définitions de rôles pour RBAC.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|Identificateur de rôle (par exemple, « administrateur », « client »)|
|`name`|texte|Nom de rôle unique|
|`description`|texte|Description lisible par l'homme|
|`isAdmin`|booléen|S'il s'agit d'un rôle d'administrateur|
|`status`|texte|"actif" ou "inactif"|
|`created_by`|texte|Qui a créé le rôle|

### autorisations

Définitions d'autorisations granulaires.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`key`|texte|Clé d'autorisation unique (par exemple, "items:create")|
|`description`|texte|Description lisible par l'homme|

### rôleAutorisations

Table de jointure plusieurs-à-plusieurs reliant les rôles aux autorisations.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`roleId`|texte (FK)|Références `roles.id` (cascade)|
|`permissionId`|texte (FK)|Références `permissions.id` (cascade)|

**Clé primaire** : Composite sur (`roleId`, `permissionId`)

### rôles d'utilisateur

Table de jointure plusieurs-à-plusieurs reliant les utilisateurs aux rôles.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`userId`|texte (FK)|Références `users.id` (cascade)|
|`roleId`|texte (FK)|Références `roles.id` (cascade)|

**Clé primaire** : Composite sur (`userId`, `roleId`)

## Profils clients

### Profils clients

Informations de profil étendues pour les utilisateurs clients enregistrés.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`userId`|texte (FK)|Références `users.id` (unique, cascade)|
|`email`|texte|E-mail du client|
|`name`|texte|Nom complet|
|`displayName`|texte|Nom d'affichage|
|`username`|texte|Nom d'utilisateur unique|
|`bio`|texte|Biographie de l'utilisateur|
|`jobTitle`|texte|Titre professionnel|
|`company`|texte|Nom de l'entreprise|
|`industry`|texte|Secteur industriel|
|`phone`|texte|Numéro de téléphone|
|`website`|texte|Site personnel|
|`location`|texte|Chaîne d'emplacement|
|`avatar`|texte|URL de l'avatar|
|`accountType`|texte|"particulier", "entreprise" ou "entreprise"|
|`status`|texte|"actif", "inactif", "suspendu", "interdit", "essai"|
|`plan`|texte|"gratuit", "standard" ou "premium"|
|`timezone`|texte|Fuseau horaire (par défaut "UTC")|
|`language`|texte|Langue préférée (par défaut "en")|
|`country`|texte|Code pays|
|`currency`|texte|Devise préférée (par défaut : "USD")|
|`defaultLatitude`|doubler|Latitude de l'emplacement par défaut|
|`defaultLongitude`|doubler|Longitude de l'emplacement par défaut|
|`twoFactorEnabled`|booléen|Statut 2FA|
|`totalSubmissions`|entier|Nombre de soumissions|
|`warningCount`|entier|Nombre d'avertissements de modération|
|`suspendedAt`|horodatage|En cas de suspension|
|`bannedAt`|horodatage|Lorsqu'il est interdit|

**Index** : index multiples sur `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Contenu et engagement

### commentaires

Commentaires des utilisateurs sur les éléments.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`content`|texte|Texte du commentaire|
|`userId`|texte (FK)|Références `clientProfiles.id`|
|`itemId`|texte|Limace d'objet|
|`rating`|entier|Note (0-5)|
|`editedAt`|horodatage|Heure de la dernière modification|
|`deletedAt`|horodatage|Suppression logicielle|

### voix

Vote positif/négatif sur les éléments.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`userId`|texte (FK)|Références `clientProfiles.id`|
|`itemId`|texte|Limace d'objet|
|`voteType`|texte|"vote positif" ou "vote négatif"|

**Index unique** : (`userId`, `itemId`) -- un vote par utilisateur et par élément

### favoris

Favoris de l'utilisateur (signets).

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`userId`|texte (FK)|Références `users.id`|
|`itemSlug`|texte|Limace d'objet|
|`itemName`|texte|Nom de l'élément dénormalisé|
|`itemIconUrl`|texte|Icône d'élément dénormalisé|
|`itemCategory`|texte|Catégorie dénormalisée|

**Indice unique** : (`userId`, `itemSlug`)

### itemViews

Suit les vues quotidiennes uniques des éléments à des fins d'analyse.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`itemId`|texte|Limace d'objet|
|`viewerId`|texte|ID de spectateur anonyme basé sur les cookies|
|`viewedDateUtc`|texte|Date au format AAAA-MM-JJ|
|`viewedAt`|horodatage|Heure de visualisation exacte|

**Index unique** : (`itemId`, `viewerId`, `viewedDateUtc`) -- une vue par spectateur et par jour

## Abonnements et paiements

### abonnements

Enregistrements d'abonnement des utilisateurs prenant en charge plusieurs fournisseurs de paiement.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`userId`|texte (FK)|Références `users.id`|
|`planId`|texte|Identifiant du forfait (gratuit, standard, premium)|
|`status`|texte|actif, annulé, expiré, en attente, en pause|
|`paymentProvider`|texte|rayé, citronsqueezy, polaire, solidgate|
|`subscriptionId`|texte|ID d'abonnement du fournisseur|
|`customerId`|texte|Numéro client du fournisseur|
|`autoRenewal`|booléen|Renouvellement automatique activé|
|`cancelAtPeriodEnd`|booléen|Annuler en fin de période|
|`amount`|entier|Montant de l'abonnement (centimes)|
|`currency`|texte|Code devise|
|`interval`|texte|Intervalle de facturation (mois, année)|

**Index** : `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (unique)

### abonnementHistorique

Piste d'audit pour les modifications d'abonnement.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`subscriptionId`|texte (FK)|Références `subscriptions.id`|
|`action`|texte|Modifier l'action|
|`previousStatus`|texte|Statut avant changement|
|`newStatus`|texte|Statut après changement|

### Fournisseurs de paiement

Registre des prestataires de paiement disponibles.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`name`|texte|Nom du fournisseur (unique)|
|`isActive`|booléen|Si le fournisseur est activé|

### comptes de paiement

Relie les utilisateurs à leurs comptes de fournisseur de paiement.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`userId`|texte (FK)|Références `users.id`|
|`providerId`|texte (FK)|Références `paymentProviders.id`|
|`customerId`|texte|Numéro client du fournisseur|

**Indices uniques** : (`userId`, `providerId`), (`customerId`, `providerId`)

## Administrateur et modération

### avis

Notifications d'administrateur dans l'application.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`userId`|texte (FK)|Références `users.id`|
|`type`|texte|item_submission, comment_reported, etc.|
|`title`|texte|Titre de la notification|
|`message`|texte|Corps de notification|
|`isRead`|booléen|Lire l'état|

### rapports

Système de rapport de contenu pour les éléments et les commentaires.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`contentType`|texte|"élément" ou "commentaire"|
|`contentId`|texte|ID de contenu signalé|
|`reason`|texte|spam, harcèlement, inapproprié, autre|
|`status`|texte|en attente, examiné, résolu, rejeté|
|`resolution`|texte|content_removed, user_warned, etc.|
|`reportedBy`|texte (FK)|Références `clientProfiles.id`|
|`reviewedBy`|texte (FK)|Références `users.id`|

### modérationHistorique

Historique complet des actions de modération.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`userId`|texte (FK)|Références `clientProfiles.id`|
|`action`|texte|avertir, suspendre, interdire, réactiver, annuler l'interdiction, content_removed|
|`reportId`|texte (FK)|Références `reports.id`|
|`performedBy`|texte (FK)|Références `users.id`|
|`details`|jsonb|Contexte supplémentaire|

### itemAuditLogs

Suit les modifications apportées aux éléments dans le panneau d’administration.

|Colonne|Tapez|Remarques|
|--------|------|-------|
|`id`|texte (PK)|UUID|
|`itemId`|texte|Slug d'élément (pas FK ; les éléments sont dans Git)|
|`itemName`|texte|Nom de l'élément dénormalisé|
|`action`|texte|créé, mis à jour, status_changed, révisé, supprimé, restauré|
|`changes`|jsonb|Détails des modifications au niveau du champ|
|`performedBy`|texte (FK)|Références `users.id`|

## Autres tableaux

### sponsorAds

Annonces d'articles sponsorisés avec cycle de vie de paiement complet.

Colonnes clés : `userId`, `itemSlug`, `status` (paiement_en attente, en attente, rejeté, actif, expiré, annulé), `interval` (hebdomadaire, mensuel), `amount`, `paymentProvider`, `subscriptionId`.

### entreprises / articlesEntreprises

Dossiers d'entreprise et associations article-entreprise pour les listes d'annuaire.

### enquêtes / enquêteRéponses

Générateur d'enquêtes avec définitions de questions basées sur JSON et stockage des réponses.

### vingtCrmConfig / IntegrationMappings

Tableaux d'intégration CRM pour la fonctionnalité de synchronisation Twenty CRM. La table de configuration applique un modèle singleton (une seule ligne autorisée).

### newsletterAbonnements

Suivi des abonnements à la newsletter par e-mail avec horodatages d'abonnement/désabonnement.

### Statut de la graine

Statut d'amorçage de la base de données de suivi de table Singleton (amorçage, terminé, échec) pour empêcher les opérations d'amorçage simultanées.

## Exportations de types

Le fichier de schéma exporte les types TypeScript pour chaque table en utilisant l'inférence de Drizzle :

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

Ces types sont utilisés dans toute l’application pour les opérations de base de données sécurisées.
