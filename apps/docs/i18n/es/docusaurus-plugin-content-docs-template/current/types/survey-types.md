---
id: survey-types
title: Definiciones de tipos de encuestas
sidebar_label: Tipos de encuestas
sidebar_position: 6
---

# Definiciones de tipos de encuestas

**Fuente:** `lib/types/survey.ts`

Este módulo define todas las definiciones de tipos compartidos para encuestas y respuestas a encuestas. Sirve como fuente única de verdad para las estructuras de datos relacionadas con encuestas utilizadas por Survey Service, Survey API Client y los controladores de ruta API.

## Enumeraciones

### `SurveyTypeEnum`

Define si una encuesta se aplica globalmente o tiene como alcance un elemento específico.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Valor|Descripción|
|-------|-------------|
|`GLOBAL`|La encuesta aparece en todo el sitio y no está vinculada a ningún elemento específico.|
|`ITEM`|La encuesta está asociada con un elemento específico (a través de `itemId`)|

### `SurveyStatusEnum`

Estados del ciclo de vida de una encuesta.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Valor|Descripción|
|-------|-------------|
|`DRAFT`|La encuesta se está creando/editando y no es visible para los encuestados|
|`PUBLISHED`|La encuesta está activa y aceptando respuestas.|
|`CLOSED`|La encuesta ya no acepta respuestas pero los datos se conservan|

## Interfaces

### `CreateSurveyData`

Datos necesarios para crear una nueva encuesta.

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

|campo|Tipo|Requerido|Descripción|
|-------|------|----------|-------------|
|`title`|`string`|si|Mostrar título de la encuesta|
|`description`|`string`|No|Descripción/subtítulo opcional|
|`type`|`SurveyTypeEnum`|si|Si la encuesta es global o tiene un alcance de ítem|
|`itemId`|`string`|No|ID del artículo (obligatorio cuando `type` es `ITEM`)|
|`status`|`SurveyStatusEnum`|No|Estado inicial (por defecto `DRAFT`)|
|`surveyJson`|`any`|si|Definición JSON compatible con Survey.js|

### `UpdateSurveyData`

Datos para actualizar una encuesta existente. Todos los campos son opcionales.

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

Datos para enviar una respuesta a una encuesta de un encuestado.

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

|campo|Tipo|Requerido|Descripción|
|-------|------|----------|-------------|
|`surveyId`|`string`|si|ID de la encuesta a la que se responde|
|`userId`|`string`|No|ID de usuario autenticado (nulo para anónimo)|
|`itemId`|`string`|No|Contexto del artículo para encuestas con alcance de artículo|
|`data`|`any`|si|Objeto de datos de respuesta de Survey.js|
|`ipAddress`|`string`|No|IP del encuestado para análisis/deduplicación|
|`userAgent`|`string`|No|Cadena de agente de usuario del navegador|

### `SurveyFilters`

Filtros para consultar encuestas en puntos finales de lista.

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

Filtros para consultar las respuestas de la encuesta.

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

|campo|Tipo|Descripción|
|-------|------|-------------|
|`itemId`|`string?`|Filtrar respuestas por elemento|
|`userId`|`string?`|Filtrar respuestas por usuario|
|`startDate`|`string?`|Cadena de fecha ISO para el inicio del rango|
|`endDate`|`string?`|Cadena de fecha ISO para el final del rango|
|`page`|`number?`|Número de página de paginación|
|`limit`|`number?`|Resultados por página|

## Ejemplos de uso

### Creando una encuesta global

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

### Crear una encuesta con alcance de elemento

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

### Filtrar encuestas

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

### Enviar una respuesta

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

### Filtrar respuestas por rango de fechas

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Notas de diseño

### Integración de Survey.js

El campo `surveyJson` utiliza el tipo `any` para aceptar definiciones JSON de Survey.js. Survey.js es una biblioteca de terceros que define encuestas como objetos JSON que describen páginas, elementos y su configuración. La plantilla almacena este JSON tal cual y lo representa utilizando el componente Survey.js React.

### Ciclo de vida de la encuesta

1. **Borrador**: la encuesta se crea y se puede editar libremente.
2. **Publicado** - La encuesta está activa; se pueden enviar respuestas
3. **Cerrado**: la encuesta deja de aceptar respuestas; los datos existentes se conservan

### Encuestas globales versus de artículos

- **Las encuestas globales** (`SurveyTypeEnum.GLOBAL`) aparecen en todo el sitio y no están vinculadas a ningún elemento.
- **Las encuestas de artículos** (`SurveyTypeEnum.ITEM`) se muestran en páginas de detalles de artículos específicos y requieren un `itemId`

El campo `ItemData.showSurveys` (de `item.ts`) controla si la sección de encuestas se muestra en la página de un elemento.

## Tipos relacionados

- [`ItemData.showSurveys`](./item-types.md): controla la visibilidad de la encuesta por elemento
- [`ItemData.action`](./item-types.md): la acción `'start-survey'` enlaza a una encuesta.
