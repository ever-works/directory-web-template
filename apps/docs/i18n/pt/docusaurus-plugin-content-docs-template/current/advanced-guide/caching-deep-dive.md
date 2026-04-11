---
id: caching-deep-dive
title: Aprofundamento da arquitetura de cache
sidebar_label: Arquitetura de cache
sidebar_position: 1
---

# Aprofundamento da arquitetura de cache

Este guia aborda a arquitetura de cache multicamadas usada em todo o modelo, desde caches de sessão na memória até estratégias de cache em nível de CDN e ISR Next.js.

## Visão geral da arquitetura

```
Request Flow with Caching Layers
=================================

  Client Request
       |
       v
  +------------------+
  |  CDN / Edge      |  <-- Static assets, ISR pages
  +------------------+
       |
       v
  +------------------+
  |  Next.js Cache   |  <-- unstable_cache, revalidateTag
  +------------------+
       |
       v
  +------------------+
  |  In-Memory Cache |  <-- SessionCache, ServerClient cache
  +------------------+
       |
       v
  +------------------+
  |  Data Source      |  <-- Database, filesystem, APIs
  +------------------+
```

## Camada 1: Cache de Conteúdo (Next.js `unstable_cache` )

O modelo usa configuração de cache centralizada definida em `lib/cache-config.ts` para gerenciar TTL e tags de cache para todos os dados de conteúdo.

### Configuração TTL do cache

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Tags de cache para invalidação direcionada

Tags de cache permitem invalidação refinada sem liberar todo o cache:

```typescript
// lib/cache-config.ts
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  CONFIG: 'config',
  PAGES: 'pages',
  PAGE: (slug: string) => `page:${slug}`,
  ITEMS_LOCALE: (locale: string) => `items:${locale}`,
  CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,
} as const;
```

### Usando `unstable_cache` em funções de conteúdo

Funções de carregamento de conteúdo em `lib/content.ts` leituras do sistema de arquivos wrap com `unstable_cache` :

```typescript
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from './cache-config';

const getCachedItems = unstable_cache(
  async (locale: string) => {
    // Expensive filesystem read
    return await loadItemsFromDisk(locale);
  },
  ['items'],
  {
    tags: [CACHE_TAGS.ITEMS, CACHE_TAGS.CONTENT],
    revalidate: CACHE_TTL.CONTENT,
  }
);
```

## Camada 2: Cache de sessão (na memória)

A classe `SessionCache` em `lib/auth/session-cache.ts` elimina a sobrecarga de autenticação redundante armazenando em cache sessões decodificadas na memória.

### Como funciona

```
Session Lookup Flow
====================

  API Request
       |
       v
  Extract session token (cookie / header)
       |
       v
  SHA-256 hash token -> cache key
       |
       v
  +-- Cache HIT? --+
  |  YES           |  NO
  |  Return cached |  Call NextAuth auth()
  |  session       |  Cache result
  +----------------+  Return session
```

### Principais decisões de design

| Decisão | Valor | Justificativa |
|----------|-------|-----------|
| TTL | 10 minutos | Equilíbrio entre frescor e redução de overhead |
| Tamanho máximo | 1.000 entradas | Evite vazamentos de memória em servidores de longa duração |
| Hash de chave | SHA-256 | Evitar vazamento de token em despejos de memória |
| Limpeza | 10% probabilístico | Amortizar o custo de limpeza entre solicitações |
| Despejo | LRU (mais antigo primeiro) | Remover entradas criadas menos recentemente |

### Invalidação de cache

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Camada 3: Cache do cliente da API do servidor

O `ServerClient` em `lib/api/server-api-client.ts` inclui um cache LRU integrado para solicitações GET:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Comportamento do cache:
- **Somente solicitações GET** são armazenadas em cache (as mutações ignoram o cache)
- **Solicitações com AbortSignal** nunca são armazenadas em cache
- **Remoção de LRU** remove a entrada mais antiga quando o cache atinge 100 itens
- **Expiração baseada em TTL** invalida entradas após 5 minutos

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Estratégia de invalidação de cache

O módulo `lib/cache-invalidation.ts` fornece invalidação segura que lida com restrições da fase de renderização do Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

O wrapper `safeRevalidateTag` detecta erros na fase de renderização e registra avisos em vez de travar:

```typescript
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`Skipping cache invalidation during render phase (tag: ${tag})`);
    } else {
      throw error;
    }
  }
}
```

## ISR (regeneração estática incremental)

As páginas usam ISR por meio de exportação `revalidate` ou TTLs por função:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Considerações de desempenho

1. **Taxa de acertos do cache de sessão**: monitore usando `getSessionCacheStats()` . Uma taxa saudável está acima de 80%.
2. **Cache de conteúdo**: o TTL de 10 minutos significa que as atualizações de conteúdo levam até 10 minutos para aparecer. Forçar a invalidação após a sincronização para atualizações imediatas.
3. **Uso de memória**: O cache da sessão tem limite de 1.000 entradas (aproximadamente 1-2 MB). O cache do cliente do servidor tem um limite de 100 entradas.
4. **Inícios a frio**: a primeira solicitação após a implantação sempre perde todos os caches da memória.

### Monitorando o desempenho do cache

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Referência de configuração

| Camada de Cache | TTL | Tamanho máximo | Despejo | Invalidação |
|---------|-----|----------|----------|-------------|
| Conteúdo (instável_cache) | Anos 600 | Ilimitado | Baseado em tags | `revalidateTag()` |
| Sessão (na memória) | 10 minutos | 1.000 | LRU + TTL | `invalidateSessionCache()` |
| Cliente API do servidor | 5 minutos | 100 | LRU + TTL | `clearCache()` |
| Páginas ISR | Anos 600 | Baseado em disco | Baseado no tempo | `revalidatePath()` |

## Solução de problemas

### Dados desatualizados após atualização de conteúdo

1. Verifique se `invalidateContentCaches()` é chamado após a conclusão da sincronização do repositório.
2. Verifique se as tags de cache correspondem entre a função armazenada em cache e a chamada de invalidação.
3. Para invalidação imediata, chame `clearFetchItemsCache()` para limpar o cache de conteúdo da memória.

### O cache da sessão falha em todas as solicitações

1. Verifique se o token de sessão está presente em cookies ou cabeçalhos.
2. Verifique se `extractSessionToken` consegue analisar o formato do seu cookie.
3. Certifique-se de que os nomes dos cookies token correspondam: `next-auth.session-token` ou `__Secure-next-auth.session-token` .

### Uso de memória crescendo

1. O cache de sessão se limita automaticamente a 1.000 entradas com limpeza probabilística.
2. Forçar limpeza: `sessionCache.clear()` .
3. Monitore com `getSessionCacheStats().size` .

## Documentação Relacionada

- [Aprofundamento no gerenciamento de sessões](./session-management-deep-dive.md)
- [Arquitetura de cliente API](./api-client-architecture.md)
- [Otimização de banco de dados](./database-optimization.md)
