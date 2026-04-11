---
id: session-management-deep-dive
title: Aprofundamento do gerenciamento de sessões
sidebar_label: Gerenciamento de sessão
sidebar_position: 4
---

# Aprofundamento no gerenciamento de sessões

Este guia cobre a arquitetura da sessão, incluindo integração NextAuth.js, cache de sessão na memória, extração de token, invalidação de cache e utilitários de sessão do lado do servidor.

## Visão geral da arquitetura

```
Session Management Flow
========================

  Browser (Client)                    Server
  +------------------+                +------------------+
  | useSession()     | -- cookie ---> | getCachedSession |
  | (next-auth/react)|                |      |           |
  +------------------+                |      v           |
                                      | SessionCache     |
                                      |   HIT? -------> Return cached
                                      |   MISS -------> NextAuth auth()
                                      |                  |
                                      |                  v
                                      |              Cache result
                                      |              Return session
                                      +------------------+

  Token Extraction Sources:
  1. Cookie: next-auth.session-token
  2. Cookie: __Secure-next-auth.session-token
  3. Header: Authorization: Bearer <token>
  4. Header: X-Session-Token: <token>
```

## Camada de cache de sessão

### Classe SessionCache

O `SessionCache` em `lib/auth/session-cache.ts` é um cache singleton na memória:

```typescript
// lib/auth/session-cache.ts
class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SIZE = 1000;
  private stats = { hits: 0, misses: 0 };

  async get(identifier: string): Promise<Session | null> {
    const key = await this.generateKey(identifier);
    const cached = this.cache.get(key);

    if (!cached || this.isExpired(cached)) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.session;
  }

  async set(identifier: string, session: Session): Promise<void> {
    const key = await this.generateKey(identifier);
    this.cache.set(key, {
      session,
      expiresAt: Date.now() + this.TTL_MS,
      createdAt: Date.now(),
    });

    // 10% probabilistic cleanup
    if (Math.random() < 0.1) {
      this.cleanup();
    }
  }
}

export const sessionCache = new SessionCache();
```

### Geração de chave de cache

As chaves são derivadas do hash SHA-256 do token de sessão para evitar que dados confidenciais apareçam em dumps de memória:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Construção do identificador de cache

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Recuperação de sessão em cache

### Componentes de servidor e rotas de API

A função `getCachedSession` em `lib/auth/cached-session.ts` é o ponto de entrada principal:

```typescript
// lib/auth/cached-session.ts
export async function getCachedSession(request?: Request): Promise<Session | null> {
  try {
    const sessionToken = extractSessionToken(request);

    // Cache lookup
    if (sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      const cachedSession = await sessionCache.get(identifier);
      if (cachedSession) return cachedSession;
    }

    // Cache miss: fetch from NextAuth
    const auth = await getAuth();
    const session = await auth();

    // Store in cache
    if (session && sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      await sessionCache.set(identifier, session);
    }

    return session;
  } catch (error) {
    // Fallback to direct NextAuth call
    const auth = await getAuth();
    return await auth();
  }
}
```

### Uso da rota da API

```typescript
// In API route handlers
import { getCachedApiSession } from '@/lib/auth/cached-session';

export async function GET(request: NextRequest) {
  const session = await getCachedApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handle authenticated request
}
```

### Uso de componentes do servidor

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Extração de token

A função `extractSessionToken` verifica múltiplas fontes:

```typescript
function extractSessionToken(request?: Request): string | null {
  if (!request) return null;

  // 1. NextAuth session cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const sessionToken =
      cookies['next-auth.session-token'] ||
      cookies['__Secure-next-auth.session-token'] ||
      cookies['next-auth.csrf-token'];
    if (sessionToken) return sessionToken;
  }

  // 2. Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Custom session header
  const sessionHeader = request.headers.get('x-session-token');
  if (sessionHeader) return sessionHeader;

  return null;
}
```

## Invalidação de cache

### Invalidação de Sessão Única

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Limpeza completa do cache

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Estatísticas e monitoramento de cache

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

const stats = getSessionCacheStats();
// {
//   hits: 450,
//   misses: 50,
//   size: 123,
//   hitRate: 90.00
// }
```

### Registro de Desenvolvimento

No modo de desenvolvimento, o cache registra acertos, erros e invalidações automaticamente:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Compatibilidade de tempo de execução do Edge

O módulo de autenticação usa importações dinâmicas para evitar o agrupamento de drivers de banco de dados no Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Gerenciamento de memória

### Estratégia de limpeza

O cache de sessão usa dois mecanismos de limpeza:

1. **Limpeza probabilística (10%)**: Em cada chamada `set()` , há 10% de chance de executar uma limpeza completa.
2. **Remoção de LRU**: Quando o cache excede 1.000 entradas, as entradas mais antigas (por `createdAt` ) são removidas.

```typescript
private cleanup(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, cached] of this.cache.entries()) {
    if (now > cached.expiresAt) {
      this.cache.delete(key);
    }
  }

  // Enforce size limit (LRU eviction)
  if (this.cache.size > this.MAX_SIZE) {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDelete = entries.slice(0, this.cache.size - this.MAX_SIZE);
    toDelete.forEach(([key]) => this.cache.delete(key));
  }
}
```

## Considerações de desempenho

1. **Meta de taxa de acerto do cache**: Apontar para 80%+ taxa de acerto. Taxas mais baixas sugerem que o TTL é muito curto ou que os tokens não estão sendo extraídos corretamente.
2. **Espaço de memória**: cada sessão em cache tem aproximadamente 1 a 2 KB. Na capacidade máxima (1.000), o cache usa aproximadamente 1 a 2 MB.
3. **Sobrecarga SHA-256**: a geração de chaves adiciona aproximadamente 0,1 ms por pesquisa. Isso é insignificante em comparação com a viagem de ida e volta salva no banco de dados.
4. **Penalidade de inicialização a frio**: após a implantação, todas as sessões perdem o cache na primeira solicitação.

## Solução de problemas

### Sessão não armazenada em cache após login

1. Verifique se o cookie do token de sessão está sendo enviado com solicitações.
2. Verifique se `extractSessionToken` consegue analisar o formato do cookie.
3. Certifique-se de que a função `getCachedSession` receba o parâmetro `request` .

### O cache cresce sem limites

1. Verifique se a limpeza probabilística está em execução (verifique as mensagens de log de limpeza).
2. Force a limpeza chamando `sessionCache.clear()` .
3. Monitore o tamanho do cache com `getSessionCacheStats().size` .

### Sessão obsoleta após mudança de função

1. Ligue para `invalidateSessionCache(sessionToken, userId)` após mudanças de função.
2. O TTL de 10 minutos significa que os dados obsoletos persistem por até 10 minutos sem invalidação explícita.

## Documentação Relacionada

- [Aprofundamento da arquitetura de cache](./caching-deep-dive.md)
- [Padrões de recuperação de erros](./error-recovery-patterns.md)
- [Arquitetura de limitação de taxa](./rate-limiting-architecture.md)
