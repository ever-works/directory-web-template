---
id: scaling
title: Escalabilidade & Alta Disponibilidade
sidebar_label: Escalabilidade
sidebar_position: 4
---

# Escalabilidade & Alta Disponibilidade

Este guia aborda estratégias para escalar o Ever Works Template de uma implantação de instância única para uma configuração de produção de alta disponibilidade, incluindo configuração serverless, connection pooling, otimização de CDN e funções edge.

## Arquitetura de Implantação

O template suporta múltiplas arquiteturas de implantação:

| Arquitetura | Melhor para | Modelo de Escalabilidade |
|---|---|---|
| Vercel (Serverless) | A maioria das implantações | Escalabilidade horizontal automática |
| Docker (Standalone) | Self-hosted, on-premise | Escalabilidade manual ou baseada em orquestrador |
| Node.js (Direto) | Desenvolvimento, implantações simples | Instância única ou cluster PM2 |

## Configuração Serverless (Vercel)

### Saída Standalone

O template é configurado com saída standalone para implantação serverless otimizada:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

O modo standalone produz um build autocontido em `.next/standalone/` que inclui apenas os arquivos necessários para executar a aplicação. Isso minimiza os tempos de cold start reduzindo o tamanho do pacote de implantação.

### Configuração de Funções

Configure as configurações de funções serverless em `vercel.json` ou via configuração em nível de rota:

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // segundos (Plano Pro: até 300s)
export const dynamic = 'force-dynamic';
```

### Configurações Recomendadas para Funções

| Tipo de Rota | Duração Máx | Memória | Observações |
|---|---|---|---|
| Rotas API (simples) | 10s | 1024 MB | Padrão para a maioria dos endpoints |
| Rotas API (processamento de dados) | 30s | 1024 MB | Para operações em lote |
| Cron jobs | 60s | 1024 MB | Execução de tarefas em background |
| Handlers de webhook | 30s | 1024 MB | Callbacks de pagamento, OAuth |
| Páginas estáticas | N/A | N/A | Pré-renderizadas no momento do build |

### Otimização de Cold Start

Minimize cold starts com estas técnicas:

| Técnica | Implementação | Impacto |
|---|---|---|
| Minimizar tamanho da função | `serverExternalPackages` na configuração | Reduz tempo de inicialização |
| Evitar imports de nível superior | `import()` dinâmico para módulos pesados | Adia o carregamento até ser necessário |
| Usar edge runtime onde possível | `export const runtime = 'edge'` | Cold start quase zero |
| Manter funções aquecidas | Endpoints de health check com monitoramento | Mantém funções ativas |

## Connection Pooling do Banco de Dados

### O Problema

Em ambientes serverless, cada invocação de função pode abrir uma nova conexão com o banco de dados. Sem pooling, isso pode esgotar o limite de conexões do banco de dados.

### Solução: Connection Pooler

Use um connection pooler entre sua aplicação e o banco de dados:

| Pooler | Provedor | Configuração |
|---|---|---|
| PgBouncer | Supabase (integrado) | Use a string de conexão pooled (porta 6543) |
| Neon Pooler | Neon (integrado) | Use a string de conexão `-pooler` |
| PgBouncer | Self-hosted | Implante PgBouncer junto com PostgreSQL |

### Configuração

Use strings de conexão diferentes para conexões pooled e diretas:

```bash
# Conexão pooled para consultas da aplicação (segura para serverless)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Conexão direta apenas para migrações
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

Atualize `drizzle.config.ts` para usar a conexão direta para migrações:

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Limites de Conexão

| Nível | Máx de Conexões | Tamanho de Pool Recomendado |
|---|---|---|
| Hobby (Neon/Supabase) | 50–100 | 10–20 |
| Pro (Neon/Supabase) | 200–500 | 50–100 |
| Enterprise | 1000+ | 100–200 |

### Gerenciamento de Conexões no Código

O módulo de banco de dados do template deve reutilizar um único connection pool por instância de função:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Criar connection pool uma vez por instância serverless
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // Conexões máximas no pool
  idle_timeout: 20, // Fechar conexões ociosas após 20s
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN e Cache

### Vercel Edge Network

Quando implantado no Vercel, a rede Edge fornece automaticamente:

- Distribuição CDN global em mais de 30 regiões
- Cache automático de assets estáticos
- Edge caching para páginas ISR (Incremental Static Regeneration)
- Proteção DDoS

### Headers Cache-Control

Configure o cache para diferentes tipos de conteúdo:

```typescript
// Rota API com headers de cache
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Estratégia de Cache por Tipo de Conteúdo

| Tipo de Conteúdo | Estratégia de Cache | TTL | Observações |
|---|---|---|---|
| Assets estáticos (JS, CSS, imagens) | Imutável | 1 ano | Nomes de arquivo com hash de conteúdo |
| Páginas públicas | ISR | 60–300s | Revalidar sob demanda |
| Respostas de API (públicas) | `s-maxage` | 10–60s | Cache em nível de CDN |
| Respostas de API (autenticadas) | `no-store` | 0 | Nunca armazenar dados específicos de usuário |
| Páginas de conteúdo CMS | ISR | 300s | Revalidar após sincronização de conteúdo |

### ISR (Incremental Static Regeneration)

Use ISR para páginas com muito conteúdo que mudam raramente:

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // Regenerar a cada 5 minutos

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### Revalidação Sob Demanda

Acionar revalidação após atualizações de conteúdo:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { secret, path } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

## Funções Edge

### Quando Usar o Edge Runtime

As funções edge são executadas no Cloudflare Workers (via Vercel) e fornecem tempos de cold start quase zero. Use-as para:

| Caso de Uso | Exemplo |
|---|---|
| Roteamento baseado em geolocalização | Redirecionar usuários para conteúdo regional |
| Testes A/B | Direcionar para variantes de experimento |
| Verificações de autenticação | Validação rápida de sessão |
| Transformação de resposta | Adicionar headers, modificar respostas |
| Endpoints de API simples | Buscas de dados leves |

### Limitações do Edge Runtime

| Limitação | Detalhe |
|---|---|
| Sem APIs Node.js | Não pode usar `fs`, `child_process`, etc. |
| Sem módulos nativos | Não pode usar `bcryptjs`, `postgres` diretamente |
| Tempo de execução limitado | Máx 30 segundos (Vercel Pro) |
| Memória limitada | 128 MB |
| Sem Drizzle ORM | Use clientes de banco de dados compatíveis com edge |

### Exemplo de Função Edge

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

  return Response.json({
    country,
    city,
    timestamp: Date.now(),
  });
}
```

## Estratégias de Escalabilidade Horizontal

### Design de Aplicação Sem Estado

O template é projetado para ser sem estado na camada de aplicação:

| Componente | Localização do Estado | Impacto na Escalabilidade |
|---|---|---|
| Sessões | Banco de dados ou JWT | Sem estado compartilhado entre instâncias |
| Jobs em background | Gerenciador de jobs (por instância ou Trigger.dev) | Use Trigger.dev para multi-instância |
| Uploads de arquivos | Armazenamento externo (S3, Supabase) | Sem dependência do sistema de arquivos local |
| Conteúdo CMS | Repositório Git (clonado no build/início) | Somente leitura, idêntico por instância |
| Cache | In-memory (por instância) ou Redis | Considere Redis para cache compartilhado |

### Considerações de Múltiplas Instâncias

Ao executar múltiplas instâncias (Docker Swarm, Kubernetes ou múltiplas funções Vercel):

1. **Jobs em background**: Use Trigger.dev ou Vercel Cron em vez do `LocalJobManager` para evitar execuções duplicadas.
2. **Conexões do banco de dados**: Habilite o connection pooling para evitar esgotamento de conexões.
3. **Armazenamento de sessões**: Use sessões baseadas em banco de dados em vez de stores in-memory.
4. **Invalidação de cache**: Implemente um cache compartilhado (Redis) ou aceite consistência eventual com caches por instância.

## Monitoramento em Escala

### Métricas Chave para Rastrear

| Métrica | Ferramenta | Limite |
|---|---|---|
| Tempo de resposta (p95) | Sentry, Vercel Analytics | < 500ms |
| Taxa de erro | Sentry | < 1% |
| Contagem de conexões do banco | Dashboard do banco | < 80% do máximo |
| Cold starts de funções | Vercel Analytics | Monitorar frequência |
| Taxa de acerto do cache | Logs da aplicação | > 80% |
| Uso de memória | Métricas Vercel/Docker | < 80% do limite |

### Monitoramento de Desempenho Sentry

O template configura o Sentry com amostragem de trace:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Ajuste `tracesSampleRate` com base no volume de tráfego:

| Requisições Diárias | Taxa de Amostragem Recomendada |
|---|---|
| < 10.000 | 1,0 (100%) |
| 10.000–100.000 | 0,1 (10%) |
| 100.000–1.000.000 | 0,01 (1%) |
| > 1.000.000 | 0,001 (0,1%) |

## Testes de Carga

### Ferramentas Recomendadas

| Ferramenta | Caso de Uso | Complexidade |
|---|---|---|
| `autocannon` | Benchmarks HTTP rápidos | Baixa |
| `k6` | Testes de carga com scripts | Média |
| `Artillery` | Cenários complexos | Média |
| `Locust` | Python-based, distribuído | Alta |

### Exemplo de Teste de Carga

```bash
# Benchmark rápido com autocannon
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# Script k6 para testes mais detalhados
k6 run load-test.js
```

### Checklist de Testes

| Teste | Alvo | Critério de Aprovação |
|---|---|---|
| Carregamento da página inicial | 100 usuários concorrentes | p95 < 1s |
| Endpoint de API | 200 requisições/segundo | p95 < 500ms, 0% de erros |
| Consulta de busca | 50 usuários concorrentes | p95 < 2s |
| Fluxo de autenticação | 20 usuários concorrentes | Todos com sucesso, sem timeouts |

## Checklist de Escalabilidade

| Categoria | Item | Prioridade |
|---|---|---|
| **Banco de Dados** | Habilitar connection pooling | Crítico |
| **Banco de Dados** | Usar réplicas de leitura para cargas de leitura intensas | Alto |
| **Banco de Dados** | Adicionar índices para consultas lentas | Alto |
| **Cache** | Configurar headers de cache do CDN | Crítico |
| **Cache** | Implementar ISR para páginas de conteúdo | Alto |
| **Cache** | Adicionar Redis para cache compartilhado (se multi-instância) | Médio |
| **Compute** | Usar edge runtime para rotas leves | Médio |
| **Compute** | Otimizar cold starts com pacotes externos | Alto |
| **Jobs** | Migrar para Trigger.dev para multi-instância | Alto |
| **Jobs** | Configurar Vercel Cron para tarefas agendadas | Alto |
| **Monitoramento** | Configurar Sentry com amostragem adequada | Crítico |
| **Monitoramento** | Configurar alertas para taxa de erro e latência | Alto |
| **Testes** | Executar testes de carga antes de lançamentos importantes | Alto |
