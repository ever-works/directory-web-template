---
id: cache-system
title: "Sistema de Cache"
sidebar_label: "Sistema de Cache"
sidebar_position: 40
---

# Sistema de Cache

## Visão geral

O sistema de cache fornece configuração de cache centralizada e invalidação para o aplicativo Next.js. Ele define durações TTL (Time To Live) consistentes e chaves de cache baseadas em tags usadas com Next.js `unstable_cache` e oferece utilitários seguros de invalidação de cache que lidam com casos extremos, como restrições de fase de renderização em Next.js 16.

## Arquitetura

O sistema de cache é dividido em dois módulos que funcionam juntos:

- **`lib/cache-config.ts`** -- Define todas as constantes TTL de cache e geradores de tags de cache. Esta é a única fonte de verdade sobre quanto tempo os dados permanecem em cache e quais tags são usadas para invalidação direcionada.
- **`lib/cache-invalidation.ts`** -- Fornece funções assíncronas que chamam `revalidateTag()` para invalidar caches específicos ou todos os caches relacionados ao conteúdo. Ele envolve cada chamada na lógica de segurança para lidar com erros de fase de renderização do Next.js normalmente.

Ambos os módulos são consumidos pela camada de conteúdo (`lib/content.ts`) e pelos processos de sincronização em segundo plano para manter os dados em cache atualizados após as atualizações do repositório.

## Referência de API

### Exportações de `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Objeto constante que define durações de cache em segundos para cada categoria de dados.

#### `CACHE_TAGS`

```typescript
export const CACHE_TAGS: {
  CONTENT: 'content';
  ITEMS: 'items';
  ITEM: (slug: string) => string;       // `item:${slug}`
  CATEGORIES: 'categories';
  TAGS: 'tags';
  COLLECTIONS: 'collections';
  CONFIG: 'config';
  PAGES: 'pages';
  PAGE: (slug: string) => string;       // `page:${slug}`
  ITEMS_LOCALE: (locale: string) => string;       // `items:${locale}`
  CATEGORIES_LOCALE: (locale: string) => string;  // `categories:${locale}`
  TAGS_LOCALE: (locale: string) => string;        // `tags:${locale}`
  COLLECTIONS_LOCALE: (locale: string) => string; // `collections:${locale}`
};
```

Definições de tags de cache para uso com `revalidateTag()`. Tags estáticas são strings simples; tags dinâmicas são funções de fábrica que aceitam um parâmetro slug ou locale.

### Exportações de `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Invalida todos os caches relacionados ao conteúdo (conteúdo, itens, categorias, tags, coleções, páginas) e limpa o cache `fetchItems` da memória. Deve ser chamado após uma sincronização de repositório bem-sucedida.

#### `invalidateItemCache(slug: string): Promise<void>`

Invalida o cache para um único item identificado pelo seu slug.

#### `invalidatePageCache(slug: string): Promise<void>`

Invalida o cache de uma única página estática identificada por seu slug.

## Detalhes de implementação

**Segurança na fase de renderização**: Next.js gera um erro quando `revalidateTag()` é chamado durante a fase de renderização do React. O wrapper interno `safeRevalidateTag()` captura esse erro específico usando `isRenderPhaseError()`, que verifica vários padrões de string (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) para ser resiliente contra A mensagem de erro Next.js muda entre as versões.

**Compatibilidade com Next.js 16**: a chamada `revalidateTag()` inclui um segundo argumento `'max'` para semântica obsoleta enquanto revalida, conforme exigido por Next.js 16.

**Limpeza do cache na memória**: após a invalidação baseada em tags, `invalidateContentCaches()` também chama `clearFetchItemsCache()` para liberar quaisquer dados na memória que ignoram o cache baseado em arquivo Next.js.

## Configuração

Nenhuma configuração adicional é necessária. Os valores TTL são constantes codificadas. Para alterar as durações do cache, modifique os valores em `CACHE_TTL`.

|Constante|Duração|Caso de uso|
|----------|----------|----------|
|`CONTENT`|600 (10 minutos)|Cache de conteúdo geral|
|`ITEM`|600 (10 minutos)|Páginas de itens individuais|
|`CONFIG`|600 (10 minutos)|Configuração do site|
|`PAGES`|600 (10 minutos)|Páginas estáticas|

## Exemplos de uso

```typescript
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache-config';
import { unstable_cache } from 'next/cache';

// Cache a data-fetching function with tags and TTL
const getCachedItems = unstable_cache(
  async () => {
    return await fetchItemsFromSource();
  },
  ['items-list'],
  {
    tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS],
    revalidate: CACHE_TTL.CONTENT,
  }
);

// Cache a single item with a dynamic tag
const getCachedItem = unstable_cache(
  async (slug: string) => {
    return await fetchItemBySlug(slug);
  },
  ['item-detail'],
  {
    tags: [CACHE_TAGS.ITEM('my-item-slug')],
    revalidate: CACHE_TTL.ITEM,
  }
);

// Invalidate all caches after a sync
import { invalidateContentCaches } from '@/lib/cache-invalidation';

async function onSyncComplete() {
  await invalidateContentCaches();
}

// Invalidate a single item after editing
import { invalidateItemCache } from '@/lib/cache-invalidation';

async function onItemUpdated(slug: string) {
  await invalidateItemCache(slug);
}
```

## Melhores práticas

- Sempre use constantes `CACHE_TAGS` em vez de strings de tags codificadas para evitar erros de digitação e garantir consistência.
- Chame `invalidateContentCaches()` após cada sincronização bem-sucedida do repositório para manter os dados atualizados.
- Use tags específicas de localidade (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) ao armazenar em cache dados filtrados por localidade para permitir a invalidação direcionada.
- Não ligue para `revalidateTag()` diretamente; use os wrappers seguros de `cache-invalidation.ts` para evitar falhas na fase de renderização.
- Mantenha os valores de TTL alinhados entre os tipos de dados relacionados para evitar referências cruzadas obsoletas.

## Módulos Relacionados

- [Content Library](/template/architecture/content-library) -- Consumidor principal de tags de cache e valores TTL
- [Config Manager System](./config-manager-system) - Usa `CACHE_TAGS.CONFIG` para cache de configuração do site
