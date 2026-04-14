---
id: client-endpoints
title: Points de terminaison API client
sidebar_label: Endpoints Client
sidebar_position: 2
---

# Points de terminaison API client

Les points de terminaison API côté client servent les utilisateurs finaux authentifiés (non-admin). Ces routes gèrent le tableau de bord client, les soumissions d'éléments, la gestion des favoris et les interactions publiques avec les éléments tels que les commentaires, les votes et les vues.

## Tableau de bord et éléments client (`/api/client`)

Toutes les routes `/api/client/*` requièrent une session authentifiée avec un `clientProfileId` valide.

### Tableau de bord

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/client/dashboard/stats` | Statistiques du tableau de bord client (nombre d'éléments, vues, engagement) |

### Éléments du client

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/client/items` | Lister les éléments soumis par le client actuel |
| `POST` | `/api/client/items` | Soumettre un nouvel élément pour révision |
| `GET` | `/api/client/items/stats` | Statistiques des éléments client (publiés, en attente, rejetés) |
| `GET` | `/api/client/items/coordinates` | Obtenir les coordonnées des éléments du client |
| `GET` | `/api/client/items/[id]` | Obtenir les détails d'un élément |
| `PUT` | `/api/client/items/[id]` | Mettre à jour son propre élément |
| `DELETE` | `/api/client/items/[id]` | Supprimer son propre élément (suppression douce) |
| `POST` | `/api/client/items/[id]/restore` | Restaurer un élément supprimé doucement |

### Statistiques géographiques

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/client/geo-stats` | Statistiques géographiques pour les éléments du client |

## Interactions publiques avec les éléments (`/api/items`)

Ces points de terminaison gèrent les fonctionnalités des éléments côté public. Certains requièrent une authentification (par exemple, les votes), tandis que d'autres sont entièrement publics (par exemple, les vues).

### Commentaires

| Méthode | Chemin | Description | Auth |
|---------|--------|-------------|------|
| `GET` | `/api/items/[slug]/comments` | Lister les commentaires d'un élément | Public |
| `POST` | `/api/items/[slug]/comments` | Ajouter un commentaire | Requise |
| `GET` | `/api/items/[slug]/comments/[commentId]` | Obtenir les détails d'un commentaire | Public |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Mettre à jour son propre commentaire | Requise |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Supprimer son propre commentaire | Requise |

### Notes de commentaires

| Méthode | Chemin | Description | Auth |
|---------|--------|-------------|------|
| `GET` | `/api/items/[slug]/comments/rating` | Obtenir le résumé des notes | Public |
| `POST` | `/api/items/[slug]/comments/rating` | Soumettre une note | Requise |
| `GET` | `/api/items/[slug]/comments/rating/[commentId]` | Obtenir la note d'un commentaire | Public |

### Votes

| Méthode | Chemin | Description | Auth |
|---------|--------|-------------|------|
| `GET` | `/api/items/[slug]/votes/count` | Obtenir le nombre de votes | Public |
| `GET` | `/api/items/[slug]/votes/status` | Obtenir le statut de vote de l'utilisateur actuel | Requise |
| `POST` | `/api/items/[slug]/votes` | Voter sur un élément (pour/contre) | Requise |

### Vues

| Méthode | Chemin | Description | Auth |
|---------|--------|-------------|------|
| `POST` | `/api/items/[slug]/views` | Enregistrer une vue de page | Public |

### Engagement et popularité

| Méthode | Chemin | Description | Auth |
|---------|--------|-------------|------|
| `GET` | `/api/items/engagement` | Obtenir les métriques d'engagement pour les éléments | Public |
| `GET` | `/api/items/popularity-scores` | Obtenir les scores de popularité calculés | Public |

### Entreprise

| Méthode | Chemin | Description | Auth |
|---------|--------|-------------|------|
| `GET` | `/api/items/[slug]/company` | Obtenir les informations de l'entreprise pour un élément | Public |

## Favoris (`/api/favorites`)

Gérer les éléments favoris de l'utilisateur. Tous les endpoints favoris requièrent une authentification.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/favorites` | Lister les éléments favoris de l'utilisateur actuel |
| `POST` | `/api/favorites/[itemSlug]` | Basculer le statut favori d'un élément |
| `DELETE` | `/api/favorites/[itemSlug]` | Retirer un élément des favoris |

## Profil utilisateur (`/api/user`)

Points de terminaison de gestion du profil utilisateur et des abonnements.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/user/profile/location` | Obtenir la localisation détectée de l'utilisateur |
| `GET` | `/api/user/currency` | Obtenir la devise détectée/préférée de l'utilisateur |
| `GET` | `/api/user/plan-status` | Obtenir le statut du plan d'abonnement actuel |
| `GET` | `/api/user/subscription` | Obtenir les détails de l'abonnement |
| `GET` | `/api/user/payments` | Obtenir l'historique des paiements |

## Utilisateur actuel (`/api/current-user`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/current-user` | Obtenir les données de session de l'utilisateur authentifié |

## Publicités sponsors — Utilisateur (`/api/sponsor-ads/user`)

Points de terminaison pour les utilisateurs gérant leurs propres publicités sponsorisées.
