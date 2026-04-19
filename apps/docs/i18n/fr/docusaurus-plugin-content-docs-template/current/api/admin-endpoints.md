---
id: admin-endpoints
title: Points de terminaison API d'administration
sidebar_label: Endpoints Admin
sidebar_position: 1
---

# Points de terminaison API d'administration

L'API d'administration contient environ 60 gestionnaires de routes répartis en 19 groupes de ressources. Tous les points de terminaison admin sont protégés par le middleware `withAdminAuth`, qui vérifie à la fois l'authentification et l'attribution du rôle administrateur via une requête en base de données.

## Authentification

Chaque point de terminaison admin requiert :

1. Une session JWT valide (vérifiée via `auth()`)
2. Un rôle administrateur dans la table `user_roles` (vérifié via `isAdmin()` de `lib/db/roles.ts`)

Les requêtes non authentifiées reçoivent une réponse `401`. Les requêtes authentifiées sans rôle admin reçoivent une réponse `403`.

## Groupes de ressources

### Catégories (`/api/admin/categories`)

Gérer les catégories de contenu avec persistance basée sur Git.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/categories` | Lister les catégories avec pagination |
| `POST` | `/api/admin/categories` | Créer une nouvelle catégorie |
| `GET` | `/api/admin/categories/all` | Obtenir toutes les catégories (sans pagination) |
| `POST` | `/api/admin/categories/git` | Synchroniser les catégories avec le dépôt Git |
| `POST` | `/api/admin/categories/reorder` | Réordonner les positions des catégories |
| `GET` | `/api/admin/categories/[id]` | Obtenir une catégorie par ID |
| `PUT` | `/api/admin/categories/[id]` | Mettre à jour une catégorie |
| `DELETE` | `/api/admin/categories/[id]` | Supprimer une catégorie |

### Clients (`/api/admin/clients`)

Gérer les comptes et profils des utilisateurs clients.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/clients` | Lister les profils clients avec pagination |
| `POST` | `/api/admin/clients/advanced-search` | Recherche avancée de clients avec filtres |
| `POST` | `/api/admin/clients/bulk` | Opérations en masse sur les clients |
| `GET` | `/api/admin/clients/dashboard` | Statistiques du tableau de bord client |
| `GET` | `/api/admin/clients/stats` | Statistiques agrégées des clients |
| `GET` | `/api/admin/clients/[clientId]` | Obtenir les détails du profil client |
| `PUT` | `/api/admin/clients/[clientId]` | Mettre à jour le profil client |
| `DELETE` | `/api/admin/clients/[clientId]` | Supprimer le compte client |

### Collections (`/api/admin/collections`)

Gérer les collections d'éléments organisées.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/collections` | Lister toutes les collections |
| `POST` | `/api/admin/collections` | Créer une nouvelle collection |
| `GET` | `/api/admin/collections/[id]` | Obtenir les détails d'une collection |
| `PUT` | `/api/admin/collections/[id]` | Mettre à jour une collection |
| `DELETE` | `/api/admin/collections/[id]` | Supprimer une collection |
| `GET` | `/api/admin/collections/[id]/items` | Lister les éléments d'une collection |
| `PUT` | `/api/admin/collections/[id]/items` | Mettre à jour les éléments d'une collection |

### Commentaires (`/api/admin/comments`)

Modérer les commentaires des utilisateurs.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/comments` | Lister les commentaires avec filtres de modération |
| `GET` | `/api/admin/comments/[id]` | Obtenir les détails d'un commentaire |
| `PUT` | `/api/admin/comments/[id]` | Mettre à jour un commentaire (approuver/rejeter) |
| `DELETE` | `/api/admin/comments/[id]` | Supprimer un commentaire |

### Entreprises (`/api/admin/companies`)

Gérer les profils d'entreprises liés aux éléments.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/companies` | Lister les entreprises |
| `POST` | `/api/admin/companies` | Créer une entreprise |
| `GET` | `/api/admin/companies/[id]` | Obtenir les détails d'une entreprise |
| `PUT` | `/api/admin/companies/[id]` | Mettre à jour une entreprise |
| `DELETE` | `/api/admin/companies/[id]` | Supprimer une entreprise |

### Tableau de bord (`/api/admin/dashboard`)

Analyses agrégées du tableau de bord.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Statistiques récapitulatives du tableau de bord |

### Éléments en vedette (`/api/admin/featured-items`)

Gérer les éléments mis en avant.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/featured-items` | Lister les éléments en vedette |
| `POST` | `/api/admin/featured-items` | Mettre un élément en vedette |
| `GET` | `/api/admin/featured-items/[id]` | Obtenir les détails d'un élément en vedette |
| `PUT` | `/api/admin/featured-items/[id]` | Mettre à jour les paramètres de l'élément en vedette |
| `DELETE` | `/api/admin/featured-items/[id]` | Retirer de la vedette |

### Analyses géographiques (`/api/admin/geo-analytics`)

Données d'analyses géographiques et de distribution des visiteurs.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/geo-analytics` | Obtenir les données d'analyses géographiques |

### Éléments (`/api/admin/items`)

Gestion complète du contenu des éléments.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/items` | Lister les éléments avec filtres et pagination |
| `POST` | `/api/admin/items` | Créer un nouvel élément |
| `POST` | `/api/admin/items/bulk` | Opérations en masse sur les éléments (approuver, rejeter, supprimer) |
| `GET` | `/api/admin/items/stats` | Statistiques agrégées des éléments |
| `GET` | `/api/admin/items/[id]` | Obtenir les détails d'un élément |
| `PUT` | `/api/admin/items/[id]` | Mettre à jour un élément |
| `DELETE` | `/api/admin/items/[id]` | Supprimer un élément |
| `GET` | `/api/admin/items/[id]/history` | Obtenir l'historique d'audit d'un élément |
| `POST` | `/api/admin/items/[id]/review` | Soumettre une révision d'élément (approuver/rejeter) |

### Index de localisation (`/api/admin/location-index`)

Gérer l'indexation de recherche géographique.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/admin/location-index` | Reconstruire l'index de recherche de localisation |

### Navigation (`/api/admin/navigation`)

Configuration de la navigation admin.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/navigation` | Obtenir la structure de navigation |
| `PUT` | `/api/admin/navigation` | Mettre à jour la navigation |

### Notifications (`/api/admin/notifications`)

Gestion des notifications admin.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/notifications` | Lister les notifications admin |
| `POST` | `/api/admin/notifications/mark-all-read` | Marquer toutes les notifications comme lues |
| `POST` | `/api/admin/notifications/[id]/read` | Marquer une notification comme lue |

### Signalements (`/api/admin/reports`)

Gestion et modération des signalements de contenu.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/reports` | Lister les signalements de contenu |
| `GET` | `/api/admin/reports/stats` | Statistiques des signalements |
| `GET` | `/api/admin/reports/[id]` | Obtenir les détails d'un signalement |
| `PUT` | `/api/admin/reports/[id]` | Mettre à jour le statut d'un signalement (résoudre, ignorer) |

### Rôles (`/api/admin/roles`)

Gestion des rôles et permissions pour le RBAC.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/roles` | Lister les rôles avec pagination |
| `POST` | `/api/admin/roles` | Créer un nouveau rôle |
| `GET` | `/api/admin/roles/active` | Obtenir uniquement les rôles actifs |
| `GET` | `/api/admin/roles/stats` | Statistiques des rôles |
| `GET` | `/api/admin/roles/[id]` | Obtenir les détails d'un rôle |
| `PUT` | `/api/admin/roles/[id]` | Mettre à jour un rôle |
| `DELETE` | `/api/admin/roles/[id]` | Supprimer un rôle (suppression douce) |
| `GET` | `/api/admin/roles/[id]/permissions` | Obtenir les permissions d'un rôle |
| `PUT` | `/api/admin/roles/[id]/permissions` | Mettre à jour les permissions d'un rôle |

### Paramètres (`/api/admin/settings`)

Gestion des paramètres de l'application.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/settings` | Obtenir tous les paramètres |
| `PUT` | `/api/admin/settings` | Mettre à jour les paramètres |
| `GET` | `/api/admin/settings/map-status` | Obtenir le statut de la fonctionnalité carte |

### Publicités sponsors (`/api/admin/sponsor-ads`)

Modération des publicités sponsors.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/sponsor-ads` | Lister les publicités sponsors |
| `GET` | `/api/admin/sponsor-ads/[id]` | Obtenir les détails d'une publicité |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Mettre à jour une publicité |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Approuver une publicité sponsor |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Rejeter une publicité sponsor |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Annuler une publicité sponsor |

### Tags (`/api/admin/tags`)

Gestion des tags de contenu.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/tags` | Lister les tags avec pagination |
| `POST` | `/api/admin/tags` | Créer un nouveau tag |
| `GET` | `/api/admin/tags/all` | Obtenir tous les tags (sans pagination) |
| `GET` | `/api/admin/tags/[id]` | Obtenir les détails d'un tag |
| `PUT` | `/api/admin/tags/[id]` | Mettre à jour un tag |
| `DELETE` | `/api/admin/tags/[id]` | Supprimer un tag |

### CRM Twenty (`/api/admin/twenty-crm`)

Configuration et test de l'intégration CRM.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | Obtenir la configuration CRM |
| `PUT` | `/api/admin/twenty-crm/config` | Mettre à jour la configuration CRM |
| `POST` | `/api/admin/twenty-crm/test-connection` | Tester la connexion CRM |

### Utilisateurs (`/api/admin/users`)

Gestion des utilisateurs par l'administrateur.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/users` | Lister les utilisateurs avec pagination |
| `POST` | `/api/admin/users` | Créer un nouvel utilisateur |
| `GET` | `/api/admin/users/stats` | Statistiques des utilisateurs |
| `GET` | `/api/admin/users/check-email` | Vérifier la disponibilité d'un e-mail |
| `GET` | `/api/admin/users/check-username` | Vérifier la disponibilité d'un nom d'utilisateur |
| `GET` | `/api/admin/users/[id]` | Obtenir les détails d'un utilisateur |
| `PUT` | `/api/admin/users/[id]` | Mettre à jour un utilisateur |
| `DELETE` | `/api/admin/users/[id]` | Supprimer un utilisateur |

## Modèles communs

### Opérations en masse

Plusieurs ressources prennent en charge des opérations en masse via POST avec un tableau d'IDs :

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Points de terminaison de statistiques

La plupart des groupes de ressources incluent un endpoint `/stats` retournant des comptages agrégés :

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```
