---
id: survey-types
title: Définitions des types d'enquête
sidebar_label: Types d'enquêtes
sidebar_position: 6
---

# Définitions des types d'enquête

**Source :** `lib/types/survey.ts`

Ce module définit toutes les définitions de types partagés pour les enquêtes et les réponses aux enquêtes. Il sert de source unique de vérité pour les structures de données liées aux enquêtes utilisées par le service d'enquête, le client API d'enquête et les gestionnaires de routes API.

## Énumérations

### `SurveyTypeEnum`

Définit si une enquête s'applique globalement ou est limitée à un élément spécifique.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Valeur|Descriptif|
|-------|-------------|
|`GLOBAL`|L'enquête apparaît sur l'ensemble du site, sans être liée à un élément spécifique|
|`ITEM`|L'enquête est associée à un élément spécifique (via `itemId`)|

### `SurveyStatusEnum`

États du cycle de vie d’une enquête.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Valeur|Descriptif|
|-------|-------------|
|`DRAFT`|L'enquête est en cours de création/modification et n'est pas visible pour les répondants|
|`PUBLISHED`|L'enquête est en ligne et accepte les réponses|
|`CLOSED`|L'enquête n'accepte plus de réponses mais les données sont préservées|

## Interfaces

### `CreateSurveyData`

Données requises pour créer une nouvelle enquête.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

|Champ|Tapez|Obligatoire|Descriptif|
|-------|------|----------|-------------|
|`title`|`string`|Oui|Afficher le titre de l'enquête|
|`description`|`string`|Non|Description/sous-titre facultatif|
|`type`|`SurveyTypeEnum`|Oui|Que l'enquête soit globale ou ponctuelle|
|`itemId`|`string`|Non|ID d'article (obligatoire lorsque `type` est `ITEM`)|
|`status`|`SurveyStatusEnum`|Non|Statut initial (par défaut `DRAFT`)|
|`surveyJson`|`any`|Oui|Définition JSON compatible Survey.js|

### `UpdateSurveyData`

Données pour mettre à jour une enquête existante. Tous les champs sont facultatifs.

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

Données permettant de soumettre une réponse à une enquête d'un répondant.

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

|Champ|Tapez|Obligatoire|Descriptif|
|-------|------|----------|-------------|
|`surveyId`|`string`|Oui|ID de l'enquête à laquelle vous avez répondu|
|`userId`|`string`|Non|ID utilisateur authentifié (nul pour anonyme)|
|`itemId`|`string`|Non|Contexte des éléments pour les enquêtes ciblées sur les éléments|
|`data`|`any`|Oui|Objet de données de réponse Survey.js|
|`ipAddress`|`string`|Non|IP du répondant pour l’analyse/déduplication|
|`userAgent`|`string`|Non|Chaîne de l'agent utilisateur du navigateur|

### `SurveyFilters`

Filtres pour interroger des enquêtes dans les points de terminaison de liste.

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

Filtres pour interroger les réponses à l’enquête.

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`itemId`|`string?`|Filtrer les réponses par élément|
|`userId`|`string?`|Filtrer les réponses par utilisateur|
|`startDate`|`string?`|Chaîne de date ISO pour le début de la plage|
|`endDate`|`string?`|Chaîne de date ISO pour la fin de la plage|
|`page`|`number?`|Numéro de page de pagination|
|`limit`|`number?`|Résultats par page|

## Exemples d'utilisation

### Créer une enquête mondiale

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### Création d'une enquête limitée à un élément

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### Filtrage des enquêtes

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### Soumettre une réponse

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### Filtrage des réponses par plage de dates

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Notes de conception

### Intégration Survey.js

Le champ `surveyJson` utilise le type `any` pour accepter les définitions JSON Survey.js. Survey.js est une bibliothèque tierce qui définit les enquêtes comme des objets JSON décrivant les pages, les éléments et leur configuration. Le modèle stocke ce JSON tel quel et le restitue à l'aide du composant Survey.js React.

### Cycle de vie de l'enquête

1. **Brouillon** - L'enquête est créée et peut être modifiée librement
2. **Publié** - L'enquête est en ligne ; les réponses peuvent être soumises
3. **Fermé** - L'enquête cesse d'accepter les réponses ; les données existantes sont préservées

### Enquêtes globales ou par article

- **Les enquêtes mondiales** (`SurveyTypeEnum.GLOBAL`) apparaissent sur l'ensemble du site et ne sont liées à aucun élément.
- **Enquêtes sur les articles** (`SurveyTypeEnum.ITEM`) sont affichées sur des pages de détails d'articles spécifiques et nécessitent un `itemId`

Le champ `ItemData.showSurveys` (de `item.ts`) contrôle si la section des enquêtes est affichée sur une page d'article.

## Types associés

- [`ItemData.showSurveys`](./item-types.md) - Contrôle la visibilité de l'enquête par élément
- [`ItemData.action`](./item-types.md) - L'action `'start-survey'` renvoie à une enquête
