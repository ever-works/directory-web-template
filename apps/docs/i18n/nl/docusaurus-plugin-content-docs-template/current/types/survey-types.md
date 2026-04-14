---
id: survey-types
title: Definities van enquêtetypen
sidebar_label: Enquêtetypen
sidebar_position: 6
---

# Definities van enquêtetypen

**Bron:** `lib/types/survey.ts`

Deze module definieert alle gedeelde typedefinities voor enquêtes en enquêtereacties. Het dient als de enige bron van waarheid voor enquêtegerelateerde datastructuren die worden gebruikt door de Survey Service, Survey API Client en API-routehandlers.

## Enums

### `SurveyTypeEnum`

Definieert of een onderzoek globaal van toepassing is of zich richt op een specifiek item.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Waarde|Beschrijving|
|-------|-------------|
|`GLOBAL`|De enquête wordt voor de hele site weergegeven en is niet gebonden aan een specifiek item|
|`ITEM`|Enquête is gekoppeld aan een specifiek item (via `itemId`)|

### `SurveyStatusEnum`

Levenscyclusstatussen voor een enquête.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Waarde|Beschrijving|
|-------|-------------|
|`DRAFT`|De enquête wordt gemaakt/bewerkt en is niet zichtbaar voor respondenten|
|`PUBLISHED`|De enquête is live en accepteert reacties|
|`CLOSED`|De enquête accepteert geen reacties meer, maar de gegevens blijven behouden|

## Interfaces

### `CreateSurveyData`

Gegevens die nodig zijn om een nieuwe enquête aan te maken.

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

|Veld|Typ|Vereist|Beschrijving|
|-------|------|----------|-------------|
|`title`|`string`|Ja|Titel van de enquête weergeven|
|`description`|`string`|Nee|Optionele beschrijving/ondertitel|
|`type`|`SurveyTypeEnum`|Ja|Of de enquête nu mondiaal of itemgericht is|
|`itemId`|`string`|Nee|Artikel-ID (vereist als `type` `ITEM` is)|
|`status`|`SurveyStatusEnum`|Nee|Initiële status (standaard ingesteld op `DRAFT`)|
|`surveyJson`|`any`|Ja|Survey.js-compatibele JSON-definitie|

### `UpdateSurveyData`

Gegevens voor het bijwerken van een bestaand onderzoek. Alle velden zijn optioneel.

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

Gegevens voor het indienen van een enquêtereactie van een respondent.

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

|Veld|Typ|Vereist|Beschrijving|
|-------|------|----------|-------------|
|`surveyId`|`string`|Ja|ID van de enquête waarop wordt gereageerd|
|`userId`|`string`|Nee|Geauthenticeerde gebruikers-ID (null voor anoniem)|
|`itemId`|`string`|Nee|Itemcontext voor itemgerichte onderzoeken|
|`data`|`any`|Ja|Survey.js-antwoordgegevensobject|
|`ipAddress`|`string`|Nee|Respondent-IP voor analyse/deduplicatie|
|`userAgent`|`string`|Nee|Browsergebruikersagenttekenreeks|

### `SurveyFilters`

Filters voor het bevragen van enquêtes in lijsteindpunten.

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

Filters voor het opvragen van enquêtereacties.

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

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`itemId`|`string?`|Filter reacties op item|
|`userId`|`string?`|Filter reacties op gebruiker|
|`startDate`|`string?`|ISO-datumreeks voor start bereik|
|`endDate`|`string?`|ISO-datumreeks voor einde bereik|
|`page`|`number?`|Paginering paginanummer|
|`limit`|`number?`|Resultaten per pagina|

## Gebruiksvoorbeelden

### Een mondiaal onderzoek maken

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

### Een itemgerichte enquête maken

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

### Enquêtes filteren

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

### Het indienen van een reactie

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

### Reacties filteren op datumbereik

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Ontwerpnotities

### Survey.js-integratie

Het veld `surveyJson` gebruikt het type `any` om JSON-definities van Survey.js te accepteren. Survey.js is een bibliotheek van derden die enquêtes definieert als JSON-objecten die pagina's, elementen en hun configuratie beschrijven. De sjabloon slaat deze JSON op zoals hij is en geeft deze weer met behulp van de Survey.js React-component.

### Enquêtelevenscyclus

1. **Concept** - Enquête is gemaakt en kan vrij worden bewerkt
2. **Gepubliceerd** - Enquête is live; reacties kunnen worden ingediend
3. **Gesloten** - Enquête accepteert geen reacties meer; bestaande gegevens blijven behouden

### Mondiale versus itemonderzoeken

- **Wereldwijde enquêtes** (`SurveyTypeEnum.GLOBAL`) verschijnen op de hele site en zijn niet aan enig item gekoppeld
- **Artikelonderzoeken** (`SurveyTypeEnum.ITEM`) worden weergegeven op specifieke artikeldetailpagina's en vereisen een `itemId`

Het veld `ItemData.showSurveys` (van `item.ts`) bepaalt of de enquêtesectie wordt weergegeven op een itempagina.

## Gerelateerde typen

- [`ItemData.showSurveys`](./item-types.md) - Beheert de zichtbaarheid van de enquête per item
- [`ItemData.action`](./item-types.md) - De actie `'start-survey'` linkt naar een enquête
