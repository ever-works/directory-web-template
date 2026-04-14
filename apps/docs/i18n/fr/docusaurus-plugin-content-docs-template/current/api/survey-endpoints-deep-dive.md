---
id: survey-endpoints-deep-dive
title: "Référence API Sondages (Analyse Approfondie)"
sidebar_label: "Sondages (Approfondi)"
sidebar_position: 56
---

# Référence API Sondages (Analyse Approfondie)

## Aperçu

L'API Sondages fournit des opérations CRUD complètes pour les sondages et leurs réponses. Les sondages peuvent être globaux ou spécifiques à un élément, et prennent en charge les états de cycle de vie brouillon/publié/fermé. La création, la mise à jour et la suppression de sondages nécessitent une authentification administrateur, tandis que les utilisateurs publics peuvent consulter les sondages publiés et soumettre des réponses.

## Points de terminaison

### GET /api/surveys

Récupère les sondages avec des filtres optionnels et une pagination. Vérifie la disponibilité de la base de données avant le traitement.

**Requête**

| Paramètre | Type    | Dans    | Description                                               |
| --------- | ------- | ----- | --------------------------------------------------------- |
| type      | string  | query | Filtrer par type : `"global"` ou `"item"`                    |
| itemId    | string  | query | Filtrer par ID d'élément                                         |
| status    | string  | query | Filtrer par statut : `"draft"`, `"published"` ou `"closed"` |
| page      | integer | query | Numéro de page (défaut : 1, minimum : 1)                      |
| limit     | integer | query | Éléments par page (défaut : 10, min : 1, max : 100)            |

**Réponse**

```typescript
{
  success: true;
  data: {
    surveys: Array<Survey>;
    total: number;
    totalPages: number;
    page: number;
  }
}
```

**Exemple**

```typescript
const response = await fetch(
  "/api/surveys?type=global&status=published&page=1&limit=10",
);
const { data } = await response.json();
// data.surveys = [{ id: "...", title: "User Satisfaction", type: "global", ... }]
```

### POST /api/surveys

Crée un nouveau sondage. Nécessite une authentification administrateur.

**Requête**

```typescript
{
  title: string;              // Requis
  description?: string;
  type: "global" | "item";    // Requis
  itemId?: string;            // Requis si type est "item"
  status?: "draft" | "published" | "closed";
  surveyJson: object;         // Requis — Définition JSON compatible SurveyJS
}
```

**Réponse**

```typescript
{
  success: true;
  data: Survey; // L'objet sondage créé
}
```

**Exemple**

```typescript
const response = await fetch("/api/surveys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "User Satisfaction Survey",
    type: "global",
    status: "draft",
    surveyJson: {
      pages: [
        {
          elements: [
            {
              type: "rating",
              name: "satisfaction",
              title: "How satisfied are you?",
            },
          ],
        },
      ],
    },
  }),
});
const { data: survey } = await response.json();
```

### GET `/api/surveys/{surveyId}`

Récupère un sondage spécifique par ID ou slug. Les sondages non publiés ne sont visibles que par les administrateurs.

**Requête**

| Paramètre | Type   | Dans   | Description                  |
| --------- | ------ | ---- | ---------------------------- |
| surveyId  | string | path | ID ou slug du sondage (requis) |

**Réponse**

```typescript
{
  success: true;
  data: Survey;
}
```

**Exemple**

```typescript
const response = await fetch("/api/surveys/user-satisfaction-2024");
const { data: survey } = await response.json();
```

### PUT `/api/surveys/{surveyId}`

Met à jour un sondage par ID ou slug. Nécessite une authentification administrateur.

**Requête**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

**Réponse**

```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

**Exemple**

```typescript
const response = await fetch("/api/surveys/abc-123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});
```

### DELETE `/api/surveys/{surveyId}`

Supprime un sondage par ID ou slug. Nécessite une authentification administrateur.

**Requête**

| Paramètre | Type   | Dans   | Description                  |
| --------- | ------ | ---- | ---------------------------- |
| surveyId  | string | path | ID ou slug du sondage (requis) |

**Réponse**

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### GET `/api/surveys/{surveyId}/responses`

Récupère les réponses paginées pour un sondage spécifique. Nécessite une authentification administrateur.

**Requête**

| Paramètre | Type   | Dans    | Description                   |
| --------- | ------ | ----- | ----------------------------- |
| surveyId  | string | path  | ID du sondage (requis)          |
| itemId    | string | query | Filtrer par ID d'élément             |
| userId    | string | query | Filtrer par ID utilisateur             |
| startDate | string | query | Filtrer à partir de la date (format ISO) |
| endDate   | string | query | Filtrer jusqu'à la date (format ISO)   |
| page      | number | query | Numéro de page                   |
| limit     | number | query | Éléments par page                |

**Réponse**

```typescript
{
  success: true;
  data: {
    responses: Array<{
      id: string;
      surveyId: string;
      userId: string | null;
      itemId: string | null;
      data: object; // Données de réponse au sondage
      completedAt: string; // ISO 8601
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    totalPages: number;
  }
}
```

### POST `/api/surveys/{surveyId}/responses`

Soumet une réponse à un sondage publié. L'authentification est optionnelle — les soumissions anonymes sont autorisées.

**Requête**

```typescript
{
  surveyId: string; // Doit correspondre au paramètre de chemin
  data: object; // Requis — données de réponse au sondage
}
```

**Réponse**

```typescript
{
  success: true;
  data: {
    id: string;
    surveyId: string;
    userId: string | null; // Défini si l'utilisateur est authentifié
    itemId: string | null;
    data: object;
    completedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
  }
  message: "Response submitted successfully";
}
```

**Exemple**

```typescript
const response = await fetch("/api/surveys/abc-123/responses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    surveyId: "abc-123",
    data: { satisfaction: 5, feedback: "Great product!" },
  }),
});
```

### GET `/api/surveys/responses/{responseId}`

Récupère une réponse de sondage spécifique par ID. Nécessite une authentification administrateur.

**Requête**

| Paramètre  | Type   | Dans   | Description            |
| ---------- | ------ | ---- | ---------------------- |
| responseId | string | path | ID de la réponse (requis) |

**Réponse**

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## Authentification

| Point de terminaison                                  | Authentification requise                                |
| ----------------------------------------- | -------------------------------------------- |
| GET /api/surveys                          | Public (la base de données doit être disponible)          |
| POST /api/surveys                         | Administrateur uniquement                                   |
| `GET /api/surveys/{surveyId}`             | Public pour les publiés ; admin pour les brouillons/fermés |
| `PUT /api/surveys/{surveyId}`             | Administrateur uniquement                                   |
| `DELETE /api/surveys/{surveyId}`          | Administrateur uniquement                                   |
| `GET /api/surveys/{surveyId}/responses`   | Administrateur uniquement                                   |
| `POST /api/surveys/{surveyId}/responses`  | Public (auth optionnelle pour le suivi utilisateur)     |
| `GET /api/surveys/responses/{responseId}` | Administrateur uniquement                                   |

## Codes d'erreur

| Statut | Description                                                             |
| ------ | ----------------------------------------------------------------------- |
| 400    | Corps de la requête invalide — champ `data` requis manquant ou JSON malformé |
| 401    | Non autorisé — authentification administrateur requise                           |
| 404    | Sondage ou réponse introuvable                                            |
| 500    | Erreur interne du serveur — échec de la base de données                               |
| 503    | Base de données indisponible ou schéma non initialisé                          |

## Limitation du débit

Aucune limitation de débit explicite. Les soumissions de réponses capturent l'adresse IP et l'agent utilisateur à des fins d'audit. Le point de terminaison GET /api/surveys vérifie la disponibilité de la base de données avant le traitement et retourne `503` si la base de données est inaccessible.

## Points de terminaison associés

- [Points de terminaison de fonctionnalités de configuration](./config-feature-endpoints) — Vérifier si la fonctionnalité de sondages est activée
