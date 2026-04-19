---
id: vote-endpoints
title: Points de terminaison Votes
sidebar_label: Votes
sidebar_position: 25
---

# Points de terminaison Votes

Le système de vote fournit des points de terminaison pour voter positivement ou négativement sur des éléments. Les votes utilisent un modèle de score net où le comptage représente les votes positifs moins les votes négatifs. Les points de terminaison publics retournent les comptages de votes, tandis que les points de terminaison authentifiés permettent de voter, mettre à jour et supprimer des votes. Les utilisateurs bloqués ne peuvent pas voter.

## Aperçu

| Point de terminaison | Méthode | Auth | Description |
| -------------------- | ------- | ---- | ----------- |
| `/api/items/[slug]/votes` | GET | Public | Obtenir le comptage et le statut de vote de l'utilisateur |
| `/api/items/[slug]/votes` | POST | Utilisateur | Voter ou mettre à jour un vote |
| `/api/items/[slug]/votes` | DELETE | Utilisateur | Supprimer un vote |
| `/api/items/[slug]/votes/count` | GET | Public | Obtenir uniquement le comptage net |
| `/api/items/[slug]/votes/status` | GET | Utilisateur | Obtenir le vote complet de l'utilisateur |

## Point de terminaison de vote combiné

### Obtenir les informations de vote

```
GET /api/items/[slug]/votes
```

Retourne le comptage net de votes pour un élément et le statut de vote de l'utilisateur actuel s'il est authentifié. L'authentification n'est pas requise, mais les utilisateurs authentifiés reçoivent leur statut de vote dans la réponse.

**Paramètres de chemin :**

| Paramètre | Type | Description |
| --------- | ---- | ----------- |
| `slug` | chaîne | Slug de l'élément |

**Réponse réussie (200) :**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Champ | Type | Description |
| ----- | ---- | ----------- |
| `success` | booléen | Toujours `true` en cas de succès |
| `count` | entier | Comptage net (votes positifs moins négatifs) |
| `userVote` | chaîne ou null | `"up"`, `"down"` ou `null` si non authentifié ou sans vote |

Pour les utilisateurs non authentifiés, `userVote` est toujours `null`. Le `count` peut être négatif s'il y a plus de votes négatifs que positifs.

**Source :** `template/app/api/items/[slug]/votes/route.ts`

### Voter ou mettre à jour un vote

```
POST /api/items/[slug]/votes
```

Vote sur un élément ou remplace un vote existant. Si l'utilisateur a déjà voté, le vote précédent est supprimé avant que le nouveau soit créé. Passer d'un vote positif à un vote négatif (ou vice versa) est une opération unique.

**Authentification :** Requise

**Corps de la requête :**

```json
{
  "type": "up"
}
```

| Champ | Type | Requis | Description |
| ----- | ---- | ------ | ----------- |
| `type` | chaîne | Oui | `"up"` pour vote positif, `"down"` pour vote négatif |

**Réponse réussie (200) :**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

La réponse retourne le comptage net mis à jour après l'application du vote.

**Réponses d'erreur :**

| Statut | Condition |
| ------ | --------- |
| 400 | Type de vote invalide (doit être `"up"` ou `"down"`) |
| 401 | Non authentifié |
| 403 | Utilisateur suspendu ou banni |
| 404 | Profil client introuvable |

**Source :** `template/app/api/items/[slug]/votes/route.ts`

### Supprimer un vote

```
DELETE /api/items/[slug]/votes
```

Supprime le vote de l'utilisateur actuel sur un élément. Si aucun vote n'existe, l'opération se complète avec succès sans erreur (idempotente). Après suppression, `userVote` est `null`.

**Authentification :** Requise

**Réponse réussie (200) :**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

| Statut | Condition |
| ------ | --------- |
| 401 | Non authentifié |
| 404 | Profil client introuvable |

**Source :** `template/app/api/items/[slug]/votes/route.ts`

## Point de terminaison du comptage de votes

### Obtenir le comptage de votes

```
GET /api/items/[slug]/votes/count
```

Retourne uniquement le comptage net de votes pour un élément. Il s'agit d'un point de terminaison public léger optimisé pour la récupération rapide du comptage sans statut de vote spécifique à l'utilisateur.

**Réponse réussie (200) :**

```json
{
  "success": true,
  "count": 15
}
```

Le comptage peut être positif, négatif ou nul selon l'équilibre des votes.

