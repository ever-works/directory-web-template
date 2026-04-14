---
id: survey-types
title: Definitionen der Umfragetypen
sidebar_label: Umfragetypen
sidebar_position: 6
---

# Definitionen der Umfragetypen

**Quelle:** `lib/types/survey.ts`

Dieses Modul definiert alle gemeinsamen Typdefinitionen für Umfragen und Umfrageantworten. Es dient als Single Source of Truth für umfragebezogene Datenstrukturen, die vom Survey Service, dem Survey API Client und den API-Routenhandlern verwendet werden.

## Aufzählungen

### `SurveyTypeEnum`

Definiert, ob eine Umfrage global gilt oder auf ein bestimmtes Element beschränkt ist.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Wert|Beschreibung|
|-------|-------------|
|`GLOBAL`|Die Umfrage wird auf der gesamten Website angezeigt und ist nicht an ein bestimmtes Element gebunden|
|`ITEM`|Die Umfrage ist mit einem bestimmten Artikel verknüpft (über `itemId`)|

### `SurveyStatusEnum`

Lebenszykluszustände für eine Umfrage.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Wert|Beschreibung|
|-------|-------------|
|`DRAFT`|Die Umfrage wird erstellt/bearbeitet und ist für die Befragten nicht sichtbar|
|`PUBLISHED`|Die Umfrage ist live und akzeptiert Antworten|
|`CLOSED`|Die Umfrage akzeptiert keine Antworten mehr, die Daten bleiben jedoch erhalten|

## Schnittstellen

### `CreateSurveyData`

Daten, die zum Erstellen einer neuen Umfrage erforderlich sind.

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

|Feld|Typ|Erforderlich|Beschreibung|
|-------|------|----------|-------------|
|`title`|`string`|Ja|Titel der Umfrage anzeigen|
|`description`|`string`|Nein|Optionale Beschreibung/Untertitel|
|`type`|`SurveyTypeEnum`|Ja|Ob die Umfrage global oder artikelbezogen ist|
|`itemId`|`string`|Nein|Artikel-ID (erforderlich, wenn `type` `ITEM` ist)|
|`status`|`SurveyStatusEnum`|Nein|Anfangsstatus (Standard ist `DRAFT`)|
|`surveyJson`|`any`|Ja|Survey.js-kompatible JSON-Definition|

### `UpdateSurveyData`

Daten zur Aktualisierung einer bestehenden Umfrage. Alle Felder sind optional.

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

Daten zum Einreichen einer Umfrageantwort eines Befragten.

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

|Feld|Typ|Erforderlich|Beschreibung|
|-------|------|----------|-------------|
|`surveyId`|`string`|Ja|ID der Umfrage, auf die geantwortet wird|
|`userId`|`string`|Nein|Authentifizierte Benutzer-ID (null für anonym)|
|`itemId`|`string`|Nein|Artikelkontext für artikelbezogene Umfragen|
|`data`|`any`|Ja|Antwortdatenobjekt von Survey.js|
|`ipAddress`|`string`|Nein|Befragte IP für Analyse/Deduplizierung|
|`userAgent`|`string`|Nein|Zeichenfolge des Browser-Benutzeragenten|

### `SurveyFilters`

Filter zum Abfragen von Umfragen in Listenendpunkten.

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

Filter zum Abfragen von Umfrageantworten.

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

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`itemId`|`string?`|Antworten nach Element filtern|
|`userId`|`string?`|Antworten nach Benutzer filtern|
|`startDate`|`string?`|ISO-Datumszeichenfolge für den Bereichsanfang|
|`endDate`|`string?`|ISO-Datumszeichenfolge für Bereichsende|
|`page`|`number?`|Seitenzahl der Paginierung|
|`limit`|`number?`|Ergebnisse pro Seite|

## Anwendungsbeispiele

### Erstellen einer globalen Umfrage

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

### Erstellen einer artikelbezogenen Umfrage

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

### Umfragen filtern

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

### Senden einer Antwort

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

### Antworten nach Datumsbereich filtern

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Designhinweise

### Survey.js-Integration

Das Feld `surveyJson` verwendet den Typ `any`, um Survey.js-JSON-Definitionen zu akzeptieren. Survey.js ist eine Drittanbieterbibliothek, die Umfragen als JSON-Objekte definiert, die Seiten, Elemente und deren Konfiguration beschreiben. Die Vorlage speichert diesen JSON-Code unverändert und rendert ihn mithilfe der Survey.js-React-Komponente.

### Umfragelebenszyklus

1. **Entwurf** – Die Umfrage wird erstellt und kann frei bearbeitet werden
2. **Veröffentlicht** – Umfrage ist live; Antworten können abgegeben werden
3. **Geschlossen** – Umfrage nimmt keine Antworten mehr an; Vorhandene Daten bleiben erhalten

### Globale vs. Artikelumfragen

- **Globale Umfragen** (`SurveyTypeEnum.GLOBAL`) erscheinen auf der gesamten Website und sind an kein Element gebunden
- **Artikelumfragen** (`SurveyTypeEnum.ITEM`) werden auf bestimmten Artikeldetailseiten angezeigt und erfordern eine `itemId`

Das Feld `ItemData.showSurveys` (von `item.ts`) steuert, ob der Umfrageabschnitt auf einer Artikelseite angezeigt wird.

## Verwandte Typen

- [`ItemData.showSurveys`](./item-types.md) – Steuert die Sichtbarkeit der Umfrage pro Artikel
- [`ItemData.action`](./item-types.md) – Die Aktion `'start-survey'` verweist auf eine Umfrage
