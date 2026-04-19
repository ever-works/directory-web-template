---
id: queries
title: Référence des requêtes de base de données
sidebar_label: Requêtes
sidebar_position: 2
---

# Référence des requêtes de base de données

Le répertoire `lib/db/queries/` contient plus de 23 modules de requête organisés par domaine. Chaque module encapsule les requêtes Drizzle ORM pour une zone de fonctionnalités spécifique, suivant le principe de responsabilité unique.

## Présentation du module

Tous les modules de requête sont exportés en barillet depuis `lib/db/queries/index.ts` pour une importation pratique :

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Modules de requête

### activité.queries.ts

Journalisation et récupération des activités pour le système de piste d'audit.

**Fonctions clés :**
- Consigner les activités des utilisateurs (connexion, inscription, modifications du compte)
- Interroger l'historique des activités par utilisateur ou par plage de dates

### auth.queries.ts

Opérations de base de données liées à l’authentification.

**Fonctions clés :**
- Rechercher un utilisateur par e-mail pour l'authentification des informations d'identification
- Créer et vérifier des jetons de réinitialisation de mot de passe
- Gérer les jetons de vérification

### client.queries.ts

Le plus grand module de requête (37 Ko), gérant toutes les opérations côté client.

**Fonctions clés :**
- Opérations CRUD de profil client
- Soumissions et gestion des articles clients
- Agrégation de données du tableau de bord client
- Rechercher et filtrer les données clients
- Requêtes de liste paginée

### comment.queries.ts

Commentez les opérations du système.

**Fonctions clés :**
- Créer, mettre à jour et supprimer des commentaires
- Récupérer les commentaires par élément avec pagination
- Requêtes de modération des commentaires (administrateur)
- Agrégation de notation

### entreprise.queries.ts

Requêtes de gestion d'entreprise.

**Fonctions clés :**
- Opérations CRUD de l’entreprise
- Recherche et filtrage d'entreprises
- Gestion des associations article-entreprise
- Statistiques et analyses de l'entreprise

### tableau de bord.queries.ts

Agrégation de données de tableau de bord pour les tableaux de bord administrateur et client.

**Fonctions clés :**
- Statistiques du tableau de bord d'administration (nombre total d'utilisateurs, d'articles, de revenus)
- Statistiques du tableau de bord client (soumissions, vues, engagement)
- Données de séries chronologiques pour les graphiques
- Résumés d'activités

### engagement.queries.ts

Mesures d'engagement agrégées pour les vues, les votes, les favoris et les commentaires.

**Fonctions clés :**
- Obtenez des scores d'engagement pour les articles
- Nombre total de vues
- Calculer les mesures de popularité
- Classements d'engagement

### intégration-mapping.queries.ts

Opérations de cartographie de l'intégration CRM.

**Fonctions clés :**
- Créer et mettre à jour les mappages d'intégration
- Recherchez les identifiants CRM à partir des identifiants Ever et vice versa
- Suivre les horodatages de synchronisation et les hachages de version
- Opérations de mappage en bloc

### article.queries.ts

Requêtes d'éléments de base (les éléments sont stockés dans Git, mais les métadonnées sont suivies dans la base de données).

**Fonctions clés :**
- Opérations sur les métadonnées des éléments
- Suivi de la vue des articles
- Données sur l'engagement des articles

### item-audit.queries.ts

Opérations du journal d’audit des éléments.

**Fonctions clés :**
- Enregistrer les actions de création, de mise à jour, de suppression et de révision d'éléments
- Interroger l'historique d'audit pour des éléments spécifiques
- Filtrer les journaux d'audit par type d'action, intervenant ou plage de dates

### item-view.queries.ts

Suivi et analyse de la vue des articles.

**Fonctions clés :**
- Enregistrez des vues quotidiennes uniques (dédupliquées par ID de spectateur et date)
- Nombre de vues de requête par élément et plage de dates
- Afficher l'agrégation d'analyses

### emplacement-index.queries.ts

Recherche et indexation basées sur la localisation.

**Fonctions clés :**
- Requêtes géospatiales pour les éléments à proximité
- Gestion de l'index de localisation
- Calculs de distances
- Recherche basée sur la localisation avec filtres

### modération.queries.ts

Système de modération du contenu.

**Fonctions clés :**
- Créer et gérer des rapports de contenu
- Mettre à jour l'état et la résolution du rapport
- Enregistrer les actions de modération
- Statistiques de modération et gestion des files d'attente

### newsletter.queries.ts

Gestion des abonnements à la newsletter.

**Fonctions clés :**
- Opérations d'abonnement et de désabonnement
- Vérifier l'état de l'abonnement
- Liste des abonnés actifs
- Suivre l'historique des envois d'e-mails

### paiement.queries.ts

Opérations de base de données liées aux paiements.

**Fonctions clés :**
- Gestion des prestataires de paiement
- Liaison de compte de paiement
- Enregistrement des transactions
- Requêtes sur l'historique des paiements

### rapport.queries.ts

Requêtes du système de reporting de contenu.

**Fonctions clés :**
- Créer des rapports (élément ou commentaire)
- Répertorier les rapports avec filtres et pagination
- Mettre à jour l'état du rapport
- Analyse des rapports

### abonnement.queries.ts

Gestion du cycle de vie des abonnements (17 Ko).

**Fonctions clés :**
- Créer et mettre à jour des abonnements
- Transitions de statut d'abonnement
- Enregistrement de l'historique des abonnements
- Rechercher des abonnements par ID d'utilisateur ou de fournisseur
- Opérations de renouvellement et d’annulation
- Analyse des abonnements

### enquête.queries.ts

Opérations du système d’enquête.

**Fonctions clés :**
- Opérations d'enquête CRUD
- Enregistrement des réponses à l'enquête
- Agrégation et analyse des réponses
- Gestion du statut de l'enquête (ébauche, publiée, clôturée)

### utilisateur.queries.ts

Requêtes de gestion des utilisateurs.

**Fonctions clés :**
- Opérations CRUD utilisateur
- Recherche et filtrage des utilisateurs
- Gestion des rôles des utilisateurs
- Suppression de compte (suppression logicielle)

### vote.queries.ts

Opérations du système de vote.

**Fonctions clés :**
- Créer, mettre à jour et supprimer des votes
- Vérifier les votes existants pour une paire utilisateur-élément
- Décompte global des votes par élément
- Basculement du type de vote (vote positif/vote négatif)

## Utilitaires partagés

### types.ts

Types TypeScript partagés utilisés dans les modules de requête :

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utils.ts

Fonctions utilitaires partagées pour la création de requêtes :

- Aides à la pagination (calcul du décalage, mise en forme des résultats)
- Générateurs de filtres courants
- Assistants de fragments SQL

## Modèles de requête

### Modèle de requête standard

Tous les modules de requête suivent un modèle cohérent :

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Requêtes paginées

De nombreux modules implémentent des requêtes paginées :

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Requêtes d'agrégation

Les modules d'engagement et de tableau de bord utilisent l'agrégation SQL :

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Convention d'importation

Fonctions de requête d'importation via l'exportation de baril :

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
