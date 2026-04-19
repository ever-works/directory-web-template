---
id: admin-items-endpoints
title: Points de terminaison API Admin – Éléments
sidebar_label: Admin Éléments
sidebar_position: 37
---

# Points de terminaison API Admin – Éléments

L'API Éléments fournit des points de terminaison pour la gestion des annuaires, notamment la création, les mises à jour, les flux de révision (approbation/rejet), l'historique d'audit, les opérations en masse et les statistiques. Les éléments passent par un cycle de vie composé des statuts `draft`, `pending`, `approved` et `rejected`. Tous les points de terminaison requièrent une authentification administrateur.

## Chemin de base

```
/api/admin/items
```

## Résumé des routes

| Méthode  | Chemin                                | Auth    | Description                                  |
| -------- | ------------------------------------- | ------- | -------------------------------------------- |
| `GET`    | `/api/admin/items`                    | Admin   | Obtenir la liste paginée des éléments        |
| `POST`   | `/api/admin/items`                    | Admin   | Créer un nouvel élément                      |
| `GET`    | `/api/admin/items/stats`              | Admin   | Obtenir les statistiques des éléments        |
| `POST`   | `/api/admin/items/bulk`               | Admin   | Approbation, rejet ou suppression en masse   |
| `GET`    | `/api/admin/items/{id}`               | Admin   | Obtenir un élément par ID                    |
| `PUT`    | `/api/admin/items/{id}`               | Admin   | Mettre à jour un élément                     |
| `DELETE` | `/api/admin/items/{id}`               | Admin   | Supprimer un élément définitivement          |
| `POST`   | `/api/admin/items/{id}/review`        | Admin   | Approuver ou rejeter un élément              |
| `GET`    | `/api/admin/items/{id}/history`       | Admin   | Obtenir l'historique d'audit d'un élément    |

---

## Lister les éléments

```
GET /api/admin/items
```

Retourne une liste paginée d'éléments avec recherche, filtrage par statut/catégorie/tags et tri.

**Paramètres de requête :**

| Paramètre    | Type    | Défaut       | Description                                                    |
| ------------ | ------- | ------------ | -------------------------------------------------------------- |
| `page`       | entier  | `1`          | Numéro de page (minimum : 1)                                   |
| `limit`      | entier  | `10`         | Résultats par page (1–100)                                     |
| `search`     | chaîne  | –            | Recherche par nom ou description                               |
| `status`     | chaîne  | –            | Filtre : `draft`, `pending`, `approved`, `rejected`            |
| `categories` | chaîne  | –            | Slugs de catégories séparés par des virgules                   |
| `tags`       | chaîne  | –            | Slugs de tags séparés par des virgules                         |
| `sortBy`     | chaîne  | `updated_at` | Champ de tri : `name`, `updated_at`, `status`, `submitted_at`  |
| `sortOrder`  | chaîne  | `desc`       | Sens du tri : `asc` ou `desc`                                  |

**Réponse (200) :**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Créer un élément

```
POST /api/admin/items
```

Crée un nouvel élément avec vérification des doublons sur l'ID et le slug. Déclenche une synchronisation CRM (si activée) et une indexation géographique (si activée).

**Corps de la requête :**

| Champ        | Type     | Requis | Description                                        |
| ------------ | -------- | ------ | -------------------------------------------------- |
| `id`         | chaîne   | Oui    | Identifiant unique de l'élément                    |
| `name`       | chaîne   | Oui    | Nom de l'élément                                   |
| `slug`       | chaîne   | Oui    | Slug URL (doit être unique)                        |
| `description`| chaîne   | Oui    | Description de l'élément                           |
| `source_url` | chaîne   | Oui    | URL source de l'élément                            |
| `category`   | chaîne[] | Non    | Tableau de slugs de catégories                     |
| `tags`       | chaîne[] | Non    | Tableau de slugs de tags                           |
| `brand`      | chaîne   | Non    | Nom de la marque (utilisé pour la sync CRM)        |
| `featured`   | booléen  | Non    | Indicateur vedette (défaut : `false`)              |
| `icon_url`   | chaîne   | Non    | URL de l'icône                                     |
| `status`     | chaîne   | Non    | Statut initial (défaut : `draft`)                  |
| `location`   | objet    | Non    | Données de localisation pour l'indexation géo      |

**Réponse (201) :**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Obtenir les statistiques des éléments

```
GET /api/admin/items/stats
```

Retourne les comptages par statut. Prend en charge des filtres optionnels pour délimiter les statistiques.

**Paramètres de requête :**

| Paramètre    | Type   | Description                              |
| ------------ | ------ | ---------------------------------------- |
| `search`     | chaîne | Filtrer les stats par terme de recherche |
| `categories` | chaîne | Slugs de catégories séparés par virgules |
| `tags`       | chaîne | Slugs de tags séparés par virgules       |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## Actions en masse

```
POST /api/admin/items/bulk
```

Effectue une approbation, un rejet ou une suppression en masse sur jusqu'à 100 éléments. Chaque élément est traité individuellement ; les échecs partiels n'interrompent pas l'opération. Envoie des notifications par e-mail aux soumetteurs lors d'une approbation/d'un rejet.

**Corps de la requête :**

| Champ    | Type     | Requis              | Description                                       |
| -------- | -------- | ------------------- | ------------------------------------------------- |
| `action` | chaîne   | Oui                 | `approve`, `reject` ou `delete`                   |
| `ids`    | chaîne[] | Oui                 | IDs des éléments à traiter (1–100, sans doublons) |
| `reason` | chaîne   | Oui (pour `reject`) | Motif du rejet (minimum 10 caractères)            |

**Réponse (200) :**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Obtenir / Mettre à jour / Supprimer un élément

### Obtenir un élément

```
GET /api/admin/items/{id}
```

Retourne les détails complets d'un élément incluant les métadonnées, catégories, tags, notes de révision et métriques d'engagement.

### Mettre à jour un élément

```
PUT /api/admin/items/{id}
```

Mise à jour partielle — seuls les champs fournis sont modifiés. Déclenche une synchronisation CRM lorsque `brand` est fourni, et une ré-indexation géographique lorsque les données de localisation changent.

**Corps de la requête (tous les champs sont optionnels) :**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Supprimer un élément

```
DELETE /api/admin/items/{id}
```

Supprime définitivement un élément et le retire de l'index géographique (si activé). Cette action est irréversible.

**Réponse (200) :**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Réviser un élément

```
POST /api/admin/items/{id}/review
```

Approuve ou rejette un élément. Enregistre la décision de révision avec des notes optionnelles. Envoie une notification par e-mail au soumetteur initial (s'il est un utilisateur enregistré).

**Corps de la requête :**

| Champ          | Type   | Requis | Description                            |
| -------------- | ------ | ------ | -------------------------------------- |
| `status`       | chaîne | Oui    | `approved` ou `rejected`               |
| `review_notes` | chaîne | Non    | Explication de la décision de révision |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Obtenir l'historique d'audit d'un élément

```
GET /api/admin/items/{id}/history
```

Retourne la piste d'audit complète d'un élément, incluant la création, les mises à jour, les changements de statut, les révisions, les suppressions et les restaurations.

**Paramètres de requête :**

| Paramètre | Type    | Défaut | Description                                                                                                              |
| --------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `page`    | entier  | `1`    | Numéro de page                                                                                                           |
| `limit`   | entier  | `20`   | Résultats par page (max 100)                                                                                             |
| `action`  | chaîne  | –      | Filtre séparé par virgules : `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Règles de validation

| Champ        | Règle                                                          |
| ------------ | -------------------------------------------------------------- |
| `id`         | Requis ; doit être unique parmi tous les éléments              |
| `name`       | Requis pour la création                                        |
| `slug`       | Requis ; doit être unique parmi tous les éléments              |
| `description`| Requis pour la création                                        |
| `source_url` | Requis pour la création ; format URL valide                    |
| `status`     | Doit être `draft`, `pending`, `approved` ou `rejected`         |
| `reason`     | Requis pour le rejet en masse ; minimum 10 caractères          |
| `ids`        | En masse : 1–100 chaînes non vides et uniques                  |
| `action`     | Filtre historique : types d'actions d'audit valides uniquement |

## Codes d'erreur

| Statut | Signification                                               |
| ------ | ----------------------------------------------------------- |
| `400`  | Erreur de validation, paramètres invalides, champs manquants|
| `401`  | Authentification requise                                    |
| `403`  | Privilèges administrateur requis                            |
| `404`  | Élément introuvable                                         |
| `409`  | ID ou slug d'élément en doublon                             |
| `500`  | Erreur interne du serveur                                   |

## Documentation associée

- [API Admin Rôles](./admin-roles-endpoints.md) – gérer les rôles assignés aux utilisateurs
- [API Admin Utilisateurs](./admin-users-endpoints.md) – gestion des comptes utilisateurs
- [Authentification](../architecture/nextauth-configuration.md) – gestion des sessions et des gardes

