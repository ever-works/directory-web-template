---
id: survey-endpoints
title: "Points de terminaison API Sondages"
sidebar_label: "Sondages"
sidebar_position: 14
---

# Points de terminaison API Sondages

L'API Sondages fournit des opérations CRUD complètes pour les sondages et la collecte des réponses. Les sondages peuvent être **globaux** (à l'échelle du site) ou **spécifiques à un élément**, et prennent en charge les états de cycle de vie brouillon/publié/fermé.

**Fichiers source :**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[surveyId]/route.ts`
- `template/app/api/surveys/[surveyId]/responses/route.ts`
- `template/app/api/surveys/responses/[responseId]/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/surveys` | Optionnel | Lister les sondages avec filtres |
| POST | `/api/surveys` | Admin | Créer un nouveau sondage |
| GET | `/api/surveys/{surveyId}` | Conditionnel | Obtenir un sondage par ID ou slug |
| PUT | `/api/surveys/{surveyId}` | Admin | Mettre à jour un sondage |
| DELETE | `/api/surveys/{surveyId}` | Admin | Supprimer un sondage |
| GET | `/api/surveys/{surveyId}/responses` | Admin | Lister les réponses d'un sondage |
| POST | `/api/surveys/{surveyId}/responses` | Optionnel | Soumettre une réponse |
| GET | `/api/surveys/responses/{responseId}` | Admin | Obtenir une réponse unique |

---

## GET `/api/surveys`

Récupère une liste paginée de sondages avec filtrages optionnels. La disponibilité de la base de données est vérifiée avant le traitement.

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|----------|---------|-------------|
| `type` | `"global"` ou `"item"` | Non | -- | Filtrer par type de sondage |
| `itemId` | string | Non | -- | Filtrer par ID d'élément associé |
| `status` | `"draft"`, `"published"` ou `"closed"` | Non | -- | Filtrer par statut |
| `page` | integer | Non | 1 | Numéro de page (minimum 1) |
| `limit` | integer | Non | 10 | Éléments par page (1–100) |

### Format de la réponse

#### 200 — Sondages récupérés

```json
{
  "success": true,
  "data": {
    "surveys": [
      {
        "id": "survey_abc123",
        "title": "User Satisfaction Survey",
        "type": "global",
        "status": "published",
        "surveyJson": { "questions": [] }
      }
    ],
    "total": 25,
    "totalPages": 3,
    "page": 1
  }
}
```

### Gestion des erreurs

Le point de terminaison gère de manière spéciale les erreurs de base de données courantes :

- Les **erreurs de connexion** (absence de `DATABASE_URL`, connexions refusées) retournent **503** avec un message descriptif.
- Les **erreurs de schéma** (tables/relations manquantes) retournent **503** suggérant de lancer les migrations.
- Les autres erreurs retournent **500**.

---

## POST `/api/surveys`

Crée un nouveau sondage. **Nécessite une authentification administrateur.**

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `title` | string | **Oui** | Titre du sondage |
| `description` | string | Non | Description du sondage |
| `type` | `"global"` ou `"item"` | **Oui** | Type de sondage |
| `itemId` | string | Non | ID d'élément associé (pour les sondages de type élément) |
| `status` | `"draft"`, `"published"` ou `"closed"` | Non | Statut initial |
| `surveyJson` | object | **Oui** | Définition du sondage (questions, structure) |

### Réponse : 201 Créé

```json
{
  "success": true,
  "data": {
    "id": "survey_new123",
    "title": "New Survey",
    "type": "global",
    "status": "draft",
    "surveyJson": { "questions": [] }
  }
}
```

---

## GET `/api/surveys/{surveyId}`

Récupère un sondage unique par son ID ou slug. Les sondages non publiés ne sont visibles que par les administrateurs.

### Logique de contrôle d'accès

```ts
// Les sondages publiés sont visibles par tous
if (survey.status !== 'published') {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Survey not found' },
      { status: 404 }
    );
  }
}
```

Le point de terminaison tente d'abord une recherche par ID, puis utilise la recherche par slug en cas d'échec.

### Réponse : 404 Non trouvé

Retourné lorsque le sondage n'existe pas OU lorsqu'un non-administrateur demande un sondage non publié :

```json
{
  "success": false,
  "error": "Survey not found"
}
```

---

## PUT `/api/surveys/{surveyId}`

Met à jour un sondage existant. **Nécessite une authentification administrateur.** Le gestionnaire résout d'abord le sondage par ID ou slug avant d'appliquer les mises à jour.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `title` | string | Non | Titre mis à jour |
| `description` | string | Non | Description mise à jour |
| `status` | `"draft"`, `"published"` ou `"closed"` | Non | Statut mis à jour |
| `surveyJson` | object | Non | Définition du sondage mise à jour |

### Réponse : 200 Mis à jour

```json
{
  "success": true,
  "data": { "id": "survey_abc", "title": "Updated Title" },
  "message": "Survey updated successfully"
}
```

---

## DELETE `/api/surveys/{surveyId}`

Supprime définitivement un sondage. **Nécessite une authentification administrateur.**

### Réponse : 200 Supprimé

```json
{
  "success": true,
  "data": null,
  "message": "Survey deleted successfully"
}
```

---

## GET `/api/surveys/{surveyId}/responses`

Récupère les réponses paginées pour un sondage spécifique. **Nécessite une authentification administrateur.**

### Paramètres de requête

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| `itemId` | string | Non | Filtrer les réponses par ID d'élément |
| `userId` | string | Non | Filtrer les réponses par ID utilisateur |
| `startDate` | string (date) | Non | Filtrer les réponses à partir de cette date |
| `endDate` | string (date) | Non | Filtrer les réponses jusqu'à cette date |
| `page` | integer | Non | Numéro de page |
| `limit` | integer | Non | Éléments par page |

### Réponse : 200

```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "id": "resp_123",
        "surveyId": "survey_abc",
        "userId": "user_456",
        "itemId": null,
        "data": { "q1": "answer1" },
        "completedAt": "2024-01-20T10:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 42,
    "totalPages": 5
  }
}
```

---

## POST `/api/surveys/{surveyId}/responses`

Soumet une réponse à un sondage publié. L'authentification est **optionnelle** — les soumissions anonymes sont prises en charge. Le point de terminaison capture les métadonnées d'adresse IP et d'agent utilisateur.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `data` | object | **Oui** | Données de réponse au sondage (réponses) |

### Comment les métadonnées sont capturées

```ts
const forwardedFor = request.headers.get('x-forwarded-for') || '';
const ipAddress =
  (forwardedFor.split(',')[0]?.trim()) ||
  request.headers.get('x-real-ip') ||
  'unknown';

const userAgent = request.headers.get('user-agent') || 'unknown';
```

### Réponse : 201 Créé

```json
{
  "success": true,
  "data": {
    "id": "resp_new123",
    "surveyId": "survey_abc",
    "data": { "q1": "my answer" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  },
  "message": "Response submitted successfully"
}
```

#### 400 — Corps invalide

```json
{
  "success": false,
  "error": "Invalid request body: \"data\" is required"
}
```

---

## GET `/api/surveys/responses/{responseId}`

Récupère une réponse de sondage unique par ID. **Nécessite une authentification administrateur.**

### Réponse : 200

```json
{
  "success": true,
  "data": {
    "id": "resp_123",
    "surveyId": "survey_abc",
    "userId": "user_456",
    "data": { "q1": "answer1" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Fichiers source associés

| Fichier | Rôle |
|------|---------|
| `template/app/api/surveys/route.ts` | Lister et créer des sondages |
| `template/app/api/surveys/[surveyId]/route.ts` | CRUD sondage unique |
| `template/app/api/surveys/[surveyId]/responses/route.ts` | Liste et soumission de réponses |
| `template/app/api/surveys/responses/[responseId]/route.ts` | Récupération de réponse unique |
| `template/lib/services/survey.service.ts` | Logique métier des sondages |
| `template/lib/types/survey.ts` | Types et interfaces TypeScript |
