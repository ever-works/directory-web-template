---
id: survey-types
title: Definições de tipo de pesquisa
sidebar_label: Tipos de pesquisa
sidebar_position: 6
---

# Definições de tipo de pesquisa

**Fonte:** `lib/types/survey.ts`

Este módulo define todas as definições de tipo compartilhado para pesquisas e respostas de pesquisas. Ele serve como a única fonte de verdade para estruturas de dados relacionadas à pesquisa usadas pelo serviço de pesquisa, pelo cliente da API de pesquisa e pelos manipuladores de rotas da API.

## Enums

### `SurveyTypeEnum`

Define se uma pesquisa se aplica globalmente ou tem como escopo um item específico.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Valor|Descrição|
|-------|-------------|
|`GLOBAL`|A pesquisa aparece em todo o site, não vinculada a nenhum item específico|
|`ITEM`|A pesquisa está associada a um item específico (via `itemId`)|

### `SurveyStatusEnum`

Estados do ciclo de vida de uma pesquisa.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Valor|Descrição|
|-------|-------------|
|`DRAFT`|A pesquisa está sendo criada/editada e não está visível para os respondentes|
|`PUBLISHED`|A pesquisa está ativa e aceitando respostas|
|`CLOSED`|A pesquisa não aceita mais respostas, mas os dados são preservados|

## Interfaces

### `CreateSurveyData`

Dados necessários para criar uma nova pesquisa.

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

|Campo|Tipo|Obrigatório|Descrição|
|-------|------|----------|-------------|
|`title`|`string`|Sim|Exibir título da pesquisa|
|`description`|`string`|Não|Descrição/legenda opcional|
|`type`|`SurveyTypeEnum`|Sim|Se a pesquisa é global ou com escopo de item|
|`itemId`|`string`|Não|ID do item (obrigatório quando `type` é `ITEM`)|
|`status`|`SurveyStatusEnum`|Não|Status inicial (o padrão é `DRAFT`)|
|`surveyJson`|`any`|Sim|Definição JSON compatível com Survey.js|

### `UpdateSurveyData`

Dados para atualizar uma pesquisa existente. Todos os campos são opcionais.

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

Dados para enviar uma resposta à pesquisa de um respondente.

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

|Campo|Tipo|Obrigatório|Descrição|
|-------|------|----------|-------------|
|`surveyId`|`string`|Sim|ID da pesquisa que está sendo respondida|
|`userId`|`string`|Não|ID de usuário autenticado (nulo para anônimo)|
|`itemId`|`string`|Não|Contexto do item para pesquisas com escopo de item|
|`data`|`any`|Sim|Objeto de dados de resposta Survey.js|
|`ipAddress`|`string`|Não|IP do respondente para análise/desduplicação|
|`userAgent`|`string`|Não|String do agente do usuário do navegador|

### `SurveyFilters`

Filtros para consultar pesquisas em endpoints de lista.

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

Filtros para consultar respostas de pesquisas.

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

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`itemId`|`string?`|Filtrar respostas por item|
|`userId`|`string?`|Filtrar respostas por usuário|
|`startDate`|`string?`|String de data ISO para início do intervalo|
|`endDate`|`string?`|String de data ISO para final do intervalo|
|`page`|`number?`|Número da página de paginação|
|`limit`|`number?`|Resultados por página|

## Exemplos de uso

### Criando uma pesquisa global

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

### Criando uma pesquisa com escopo de item

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

### Filtrando pesquisas

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

### Enviando uma resposta

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

### Filtrando respostas por período

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Notas de projeto

### Integração Survey.js

O campo `surveyJson` usa o tipo `any` para aceitar definições JSON do Survey.js. Survey.js é uma biblioteca de terceiros que define pesquisas como objetos JSON que descrevem páginas, elementos e suas configurações. O modelo armazena esse JSON como está e o renderiza usando o componente Survey.js React.

### Ciclo de vida da pesquisa

1. **Rascunho** - A pesquisa é criada e pode ser editada livremente
2. **Publicado** - A pesquisa está ativa; as respostas podem ser enviadas
3. **Fechado** - A pesquisa deixa de aceitar respostas; os dados existentes são preservados

### Pesquisas globais vs. itens

- **Pesquisas globais** (`SurveyTypeEnum.GLOBAL`) aparecem em todo o site e não estão vinculadas a nenhum item
- **Pesquisas de itens** (`SurveyTypeEnum.ITEM`) são mostradas em páginas de detalhes de itens específicos e exigem um `itemId`

O campo `ItemData.showSurveys` (de `item.ts`) controla se a seção de pesquisas é exibida em uma página de item.

## Tipos Relacionados

- [`ItemData.showSurveys`](./item-types.md) - Controla a visibilidade da pesquisa por item
- [`ItemData.action`](./item-types.md) - A ação `'start-survey'` vincula-se a uma pesquisa
