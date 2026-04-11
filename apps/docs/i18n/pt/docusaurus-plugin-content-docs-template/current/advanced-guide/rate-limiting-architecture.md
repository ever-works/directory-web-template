---
id: rate-limiting-architecture
title: Arquitetura de limitação de taxa
sidebar_label: Limitação de taxa
sidebar_position: 5
---

# Arquitetura de limitação de taxa

Este guia aborda o sistema de limitação de taxa, incluindo armazenamento na memória, configuração por rota, comportamento da janela deslizante, cabeçalhos de limite de taxa e regras de bypass.

## Visão geral da arquitetura

```
Rate Limiting Flow
===================

  Incoming Request
       |
       v
  +------------------------+
  | Extract Identifier     |  <-- IP address, user ID, API key
  +------------------------+
       |
       v
  +------------------------+
  | Build Rate Limit Key   |  <-- "ip:192.168.1.1:/api/items"
  +------------------------+
       |
       v
  +------------------------+
  | Check In-Memory Store  |
  |   Entry exists?        |
  |   Window expired?      |
  |   Count < limit?       |
  +------------------------+
       |
  +----+----+
  ALLOW     DENY
  |         |
  v         v
  Increment   Return 429
  counter     + Retry-After
  Continue    + Rate limit headers
```

## Função de limitação de taxa principal

A função `ratelimit` em `lib/utils/rate-limit.ts` implementa um limitador de taxa de janela fixa:

```typescript
// lib/utils/rate-limit.ts
export async function ratelimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + windowMs;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment counter
  entry.count++;
  return { success: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}
```

### Interface de resultado de limite de taxa

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## Armazenamento na memória

O limitador de taxa usa `Map<string, RateLimitEntry>` para pesquisas O(1):

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Limpeza Automática

As entradas expiradas são limpas a cada 5 minutos para evitar vazamentos de memória:

```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

## Configuração por rota

### Limites recomendados

| Padrão de rota | Limite | Janela | Justificativa |
|-------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 minutos | Evitar a força bruta |
| `POST /api/auth/register` | 3 | 1 hora | Evitar spam na conta |
| `POST /api/comments` | 10 | 1 minuto | Evitar spam de comentários |
| `GET /api/items` | 100 | 1 minuto | Permitir navegação |
| `POST /api/submit` | 5 | 10 minutos | Evitar spam de envio |
| `POST /api/contact` | 3 | 1 hora | Evitar spam por e-mail |
| `POST /api/webhook/*` | 1000 | 1 minuto | Alto rendimento para provedores |

### Implementando limites por rota

```typescript
// In an API route handler
import { ratelimit } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `signin:${ip}`;

  const result = await ratelimit(key, 5, 15 * 60 * 1000);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  // Process the request...
}
```

## Cabeçalhos de limite de taxa

Inclua cabeçalhos de limite de taxa padrão em todas as respostas da API:

```typescript
function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));

  if (!result.success && result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter));
  }

  return response;
}
```

### Referência de cabeçalho

| Cabeçalho | Descrição | Exemplo |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Máximo de pedidos por janela | `100` |
| `X-RateLimit-Remaining` | Pedidos restantes na janela | `87` |
| `X-RateLimit-Reset` | Carimbo de data/hora Unix quando a janela é redefinida | `1709654400000` |
| `Retry-After` | Segundos até a próxima solicitação permitida | `45` |

## Verificando o status do limite de taxa

Consulte o status atual sem incrementar o contador:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Redefinindo limites de taxa

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Ignorar regras

### Fontes confiáveis

```typescript
const BYPASS_IPS = new Set([
  '127.0.0.1',           // Localhost
  '::1',                 // IPv6 localhost
]);

const BYPASS_AGENTS = new Set([
  'stripe-webhook',
  'lemonsqueezy-webhook',
]);

function shouldBypass(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') || '';

  // Bypass for trusted IPs
  if (ip && BYPASS_IPS.has(ip)) return true;

  // Bypass for webhook providers
  if (BYPASS_AGENTS.has(userAgent)) return true;

  // Bypass for authenticated admin users
  // (check session in middleware)

  return false;
}
```

## Estratégias-chave compostas

### Baseado em IP (anônimo)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### Baseado no usuário (autenticado)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Combinado (IP + Rota)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Considerações de desempenho

1. **Uso de memória**: cada entrada usa aproximadamente 100 bytes. Com 100.000 chaves ativas, isso equivale a aproximadamente 10 MB.
2. **Frequência de limpeza**: O intervalo de limpeza de 5 minutos é um bom equilíbrio. Reduza para aplicativos de alto tráfego.
3. **Desempenho do mapa**: JavaScript `Map` fornece O(1) get/set. Nenhum desempenho diz respeito a milhões de entradas.
4. **Implantação distribuída**: o armazenamento na memória não compartilha o estado entre as instâncias. Para implantações de várias instâncias, use a limitação de taxa apoiada pelo Redis.

## Considerações sobre produção

### Implantações de múltiplas instâncias

O limitador de taxa na memória não compartilha o estado entre as instâncias do servidor. Para produção:

```typescript
// Option 1: Redis-backed rate limiter (recommended for production)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Option 2: Accept per-instance limiting
// Each instance has its own counter. Effective limit = limit * instance_count.
```

### Janela deslizante vs. janela fixa

A implementação atual usa **janelas fixas**. Isso significa que uma explosão de solicitações no limite da janela pode permitir até `2 * limit` solicitações em um curto período. Para uma limitação mais rigorosa, implemente uma janela deslizante:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Solução de problemas

### Limite de taxa não aplicado

1. Verifique se a chave é exclusiva por cliente (verifique a extração de IP).
2. Certifique-se de que `ratelimit()` seja chamado antes da lógica do manipulador de solicitações.
3. Verifique se a resposta é retornada imediatamente em `!result.success` .

### Todas as taxas de solicitações são limitadas imediatamente

1. Verifique se o parâmetro `limit` não é 0 ou negativo.
2. Verifique se o parâmetro `windowMs` está em milissegundos e não em segundos.
3. Verifique a chave – se todas as solicitações compartilharem a mesma chave, elas compartilharão o mesmo limite.

### Memória crescendo sem limites

1. O intervalo de limpeza de 5 minutos deve resolver isso. Verifique se o temporizador de intervalo está em execução.
2. Chame `resetRateLimit(key)` para limpar manualmente chaves específicas.
3. Monitore o tamanho da loja em desenvolvimento.

## Documentação Relacionada

- [Padrões de recuperação de erros](./error-recovery-patterns.md)
- [Arquitetura Webhook](./webhook-architecture.md)
- [Aprofundamento no gerenciamento de sessões](./session-management-deep-dive.md)
