---
id: reports-endpoints
title: "Points de terminaison Signalements"
sidebar_label: "Signalements"
sidebar_position: 20
---

# Points de terminaison Signalements

Le système de signalements permet aux utilisateurs authentifiés de signaler du contenu inapproprié et fournit aux administrateurs des outils pour examiner, modérer et résoudre les signalements. Les signalements prennent en charge les types de contenu incluant les éléments et les commentaires, avec une prévention intégrée des doublons.

## Aperçu

| Point de terminaison | Méthode | Auth | Description |
|---|---|---|---|
| `/api/reports` | POST | Utilisateur | Soumettre un signalement de contenu |
| `/api/admin/reports` | GET | Admin | Lister les signalements avec filtrage |
| `/api/admin/reports/stats` | GET | Admin | Obtenir les statistiques des signalements |
| `/api/admin/reports/[id]` | GET | Admin | Obtenir un signalement unique |
| `/api/admin/reports/[id]` | PUT | Admin | Mettre à jour le statut et la résolution d'un signalement |

## Points de terminaison publics

### Soumettre un signalement

```
POST /api/reports
```

Les utilisateurs authentifiés peuvent signaler des éléments ou des commentaires pour contenu inapproprié. Chaque utilisateur ne peut signaler le même contenu qu'une seule fois (prévention des doublons via la vérification `hasUserReportedContent`). Les utilisateurs bloqués (suspendus ou bannis) sont empêchés de soumettre des signalements.

**Authentification :** Requise (basée sur la session)

**Corps de la requête :**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

| Champ | Type | Requis | Description |
|---|---|---|---|
| `contentType` | chaîne | Oui | Type de contenu : `"item"` ou `"comment"` |
| `contentId` | chaîne | Oui | ID ou slug du contenu signalé |
| `reason` | chaîne | Oui | L'une des valeurs : `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |
| `details` | chaîne | Non | Contexte supplémentaire sur le signalement |

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Réponses d'erreur :**

| Statut | Condition |
|---|---|
| 400 | Type de contenu invalide, ID de contenu manquant ou raison invalide |
| 401 | Utilisateur non authentifié |
| 403 | Profil client requis ou utilisateur suspendu/banni |
| 404 | Profil client introuvable |
| 409 | L'utilisateur a déjà signalé ce contenu |
| 500 | Erreur interne du serveur |

**Source :** `template/app/api/reports/route.ts`

## Points de terminaison administrateur

Tous les points de terminaison administrateur nécessitent que `session.user.isAdmin` soit `true`.

### Lister les signalements

```
GET /api/admin/reports
```

Retourne une liste paginée de signalements de contenu avec les informations du rapporteur. Prend en charge le filtrage par statut, type de contenu et raison, ainsi que la recherche textuelle dans l'ID du contenu, les détails et le nom/e-mail du rapporteur.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `page` | entier | 1 | Numéro de page (minimum 1) |
| `limit` | entier | 10 | Résultats par page (1-100) |
| `search` | chaîne | - | Recherche dans l'ID du contenu, les détails, le nom/e-mail du rapporteur |
| `status` | chaîne | - | Filtre : `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `contentType` | chaîne | - | Filtre : `"item"`, `"comment"` |
| `reason` | chaîne | - | Filtre : `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**Source :** `template/app/api/admin/reports/route.ts`

### Obtenir les statistiques des signalements

```
GET /api/admin/reports/stats
```

Retourne des statistiques agrégées sur les signalements, incluant les comptages par statut, type de contenu et raison.

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**Source :** `template/app/api/admin/reports/stats/route.ts`

### Obtenir un signalement par ID

```
GET /api/admin/reports/[id]
```

Récupère un signalement unique avec tous les détails, incluant les informations du rapporteur et du réviseur.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|---|---|---|
| `id` | chaîne | ID du signalement |

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

| Statut | Condition |
|---|---|
| 403 | Non administrateur |
| 404 | Signalement introuvable |

**Source :** `template/app/api/admin/reports/[id]/route.ts`

### Mettre à jour un signalement

```
PUT /api/admin/reports/[id]
```

Met à jour le statut, la résolution et la note de révision d'un signalement. Lorsqu'une résolution est définie, le système exécute automatiquement l'action de modération correspondante (suppression de contenu, avertissement utilisateur, suspension ou bannissement).

**Corps de la requête :**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

| Champ | Type | Requis | Description |
|---|---|---|---|
| `status` | chaîne | Non | `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `resolution` | chaîne | Non | `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"` |
| `reviewNote` | chaîne | Non | Notes de l'administrateur sur la révision |

**Actions de modération par résolution :**

Les actions automatisées suivantes sont déclenchées en fonction de la valeur de résolution :

| Résolution | Action |
|---|---|
| `content_removed` | Appelle `removeContent()` pour supprimer l'élément ou le commentaire signalé |
| `user_warned` | Appelle `warnUser()` pour émettre un avertissement au propriétaire du contenu |
| `user_suspended` | Appelle `suspendUser()` pour suspendre le compte du propriétaire du contenu |
| `user_banned` | Appelle `banUser()` pour bannir définitivement le propriétaire du contenu |
| `no_action` | Aucune action de modération n'est prise |

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

| Statut | Condition |
|---|---|
| 400 | Valeur de statut ou de résolution invalide ; propriétaire du contenu introuvable pour les actions au niveau utilisateur |
| 403 | Non administrateur |
| 404 | Signalement introuvable |

**Source :** `template/app/api/admin/reports/[id]/route.ts`

## Modèle de données

Les signalements utilisent les énumérations suivantes définies dans `lib/db/schema` :

- **ReportContentType :** `"item"`, `"comment"`
- **ReportReason :** `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`
- **ReportStatus :** `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`
- **ReportResolution :** `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`

## Intégration avec la modération

Lorsqu'un signalement est résolu avec une résolution au niveau utilisateur (`user_warned`, `user_suspended`, `user_banned`), le système :

1. Recherche le propriétaire du contenu via `getContentOwner()`
2. Exécute la fonction de modération appropriée de `lib/services/moderation.service`
3. Utilise la `reviewNote` comme raison de l'action de modération
4. Enregistre l'ID de l'administrateur comme réviseur

Si l'action de modération échoue, la mise à jour du signalement réussit quand même, mais l'échec est enregistré. Le champ `moderationResult` dans la réponse indique si l'action a réussi.
