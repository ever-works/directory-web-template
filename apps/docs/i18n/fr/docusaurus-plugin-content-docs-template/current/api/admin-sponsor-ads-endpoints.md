---
id: admin-sponsor-ads-endpoints
title: Points de terminaison API Admin – Publicités Sponsors
sidebar_label: Admin Pub. Sponsors
sidebar_position: 39
---

# Points de terminaison API Admin – Publicités Sponsors

L'API Publicités Sponsors fournit des points de terminaison pour la gestion des publicités sponsorisées, incluant la liste, la consultation, l'approbation, le rejet et l'annulation des publicités. Les publicités sponsors passent par un cycle de vie composé des statuts `pending_payment`, `pending`, `active`, `rejected`, `expired` et `cancelled`. Tous les points de terminaison requièrent une authentification administrateur.

## Chemin de base

```
/api/admin/sponsor-ads
```

## Résumé des routes

| Méthode  | Chemin                                        | Auth  | Description                                         |
| -------- | --------------------------------------------- | ----- | --------------------------------------------------- |
| `GET`    | `/api/admin/sponsor-ads`                      | Admin | Obtenir la liste paginée des publicités sponsors    |
| `GET`    | `/api/admin/sponsor-ads/{id}`                 | Admin | Obtenir une publicité sponsor par ID                |
| `DELETE` | `/api/admin/sponsor-ads/{id}`                 | Admin | Supprimer définitivement une publicité sponsor      |
| `POST`   | `/api/admin/sponsor-ads/{id}/approve`         | Admin | Approuver et activer une publicité sponsor          |
| `POST`   | `/api/admin/sponsor-ads/{id}/reject`          | Admin | Rejeter une publicité sponsor                       |
| `POST`   | `/api/admin/sponsor-ads/{id}/cancel`          | Admin | Annuler une publicité sponsor                       |

---

## Lister les publicités sponsors

```
GET /api/admin/sponsor-ads
```

Retourne une liste paginée de publicités sponsors avec filtrage optionnel par statut et intervalle de facturation. Retourne également des statistiques agrégées pour le tableau de bord admin. Les paramètres de requête sont validés avec Zod.

**Paramètres de requête :**

| Paramètre   | Type    | Défaut      | Description                                                                           |
| ----------- | ------- | ----------- | ------------------------------------------------------------------------------------- |
| `page`      | entier  | `1`         | Numéro de page (minimum : 1)                                                          |
| `limit`     | entier  | `10`        | Résultats par page (1–100)                                                            |
| `status`    | chaîne  | –           | Filtre : `pending_payment`, `pending`, `rejected`, `active`, `expired`, `cancelled`   |
| `interval`  | chaîne  | –           | Filtre : `weekly` ou `monthly`                                                        |
| `search`    | chaîne  | –           | Recherche dans les publicités sponsors par texte                                      |
| `sortBy`    | chaîne  | `createdAt` | Champ de tri : `createdAt`, `updatedAt`, `startDate`, `endDate`, `status`             |
| `sortOrder` | chaîne  | `desc`      | Sens du tri : `asc` ou `desc`                                                         |

**Réponse (200) :**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Spotlight",
      "description": "Featured placement for premium tools",
      "status": "active",
      "interval": "monthly",
      "startDate": "2024-01-20T00:00:00.000Z",
      "endDate": "2024-02-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 25,
    "active": 8,
    "pending": 5,
    "expired": 10,
    "cancelled": 2
  }
}
```

---

## Obtenir une publicité sponsor

```
GET /api/admin/sponsor-ads/{id}
```

Retourne une publicité sponsor spécifique avec ses détails complets, incluant les informations sur l'utilisateur associé.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Spotlight",
    "status": "active",
    "interval": "monthly",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Supprimer une publicité sponsor

```
DELETE /api/admin/sponsor-ads/{id}
```

Supprime définitivement une publicité sponsor. Cette action est irréversible.

**Réponse (200) :**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## Approuver une publicité sponsor

```
POST /api/admin/sponsor-ads/{id}/approve
```

Approuve et active une publicité sponsor. Les publicités au statut `pending` peuvent être directement approuvées. Pour les publicités au statut `pending_payment`, définissez `forceApprove` à `true` pour approuver sans confirmation de paiement.

**Corps de la requête (optionnel) :**

| Champ          | Type    | Requis | Description                                                               |
| -------------- | ------- | ------ | ------------------------------------------------------------------------- |
| `forceApprove` | booléen | Non    | Définir à `true` pour approuver sans paiement (pour le statut `pending_payment`) |

**Exemple :**

```json
{
  "forceApprove": true
}
```

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active",
    "startDate": "2024-01-20T00:00:00.000Z",
    "endDate": "2024-02-20T00:00:00.000Z"
  },
  "message": "Sponsor ad approved and activated successfully"
}
```

**Réponses d'erreur :**

| Statut | Erreur                    | Description                                                     |
| ------ | ------------------------- | --------------------------------------------------------------- |
| `400`  | `PAYMENT_NOT_RECEIVED`    | La publicité a le statut `pending_payment` ; utiliser `forceApprove` |
| `400`  | `Cannot approve...`       | Le statut de la publicité n'autorise pas l'approbation          |
| `404`  | `Sponsor ad not found`    | Aucune publicité avec l'ID donné n'existe                       |

---

## Rejeter une publicité sponsor

```
POST /api/admin/sponsor-ads/{id}/reject
```

Rejette une publicité sponsor en attente avec une raison obligatoire. Seules les publicités au statut `pending` ou `pending_payment` peuvent être rejetées. La raison du rejet est validée avec Zod (`rejectSponsorAdSchema`).

**Corps de la requête :**

| Champ              | Type   | Requis | Description                                      |
| ------------------ | ------ | ------ | ------------------------------------------------ |
| `rejectionReason`  | chaîne | Oui    | Motif du rejet (10–500 caractères)               |

**Exemple :**

```json
{
  "rejectionReason": "The ad content does not meet our quality standards. Please revise and resubmit."
}
```

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## Annuler une publicité sponsor

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Annule une publicité sponsor au statut `pending`, `pending_payment` ou `active`. Une raison d'annulation optionnelle peut être fournie. Validé avec Zod (`cancelSponsorAdSchema`).

**Corps de la requête (optionnel) :**

| Champ          | Type   | Requis | Description                               |
| -------------- | ------ | ------ | ----------------------------------------- |
| `cancelReason` | chaîne | Non    | Motif d'annulation (max 500 caractères)   |

**Exemple :**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Cycle de vie des statuts

Les publicités sponsors suivent ce cycle de vie :

```
pending_payment --> pending --> active --> expired
                       |                     |
                       v                     v
                   rejected               cancelled
```

## Codes d'erreur

| Statut | Signification                                          |
| ------ | ------------------------------------------------------ |
| `400`  | Erreur de validation ou transition de statut invalide  |
| `401`  | Authentification requise                               |
| `403`  | Privilèges administrateur requis                       |
| `404`  | Publicité sponsor introuvable                          |
| `500`  | Erreur interne du serveur                              |

## Documentation associée

- [Aperçu des points de terminaison Admin](./admin-endpoints.md)
- [Architecture de paiement](./payment-provider-architecture.md)
- [Modèles de réponse](./response-patterns.md)

