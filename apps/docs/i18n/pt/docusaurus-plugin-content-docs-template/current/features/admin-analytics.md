---
id: admin-analytics
title: Análise administrativa
sidebar_label: Análise administrativa
sidebar_position: 32
---

# Análise administrativa

O sistema de análise administrativa fornece estatísticas de toda a plataforma, métricas de engajamento, rastreamento de crescimento de usuários e processamento de dados em segundo plano. Ele combina consultas de banco de dados em tempo real, agregações em cache e integração PostHog opcional para análises abrangentes.

## Visão geral da arquitetura

| Módulo | Caminho | Finalidade |
|--------|------|--------|
| Repositório de estatísticas de administração | `lib/repositories/admin-stats.repository.ts` | Estatísticas do painel principal |
| Consultas do painel | `lib/db/queries/dashboard.queries.ts` | Consultas de agregação de engajamento |
| Consultas de engajamento | `lib/db/queries/engagement.queries.ts` | Métricas por item |
| Processador de segundo plano analítico | `lib/services/analytics-background-processor.ts` | Agendador de trabalhos em segundo plano |
| Cliente analítico | `lib/analytics/index.ts` | Integração PostHog/Sentry do lado do cliente |
| Serviço de API PostHog | `lib/services/posthog-api.service.ts` | Consultas PostHog do lado do servidor |
| Exportação de análises | `lib/services/analytics-export.service.ts` | Funcionalidade de exportação de dados |
| Relatórios agendados | `lib/services/analytics-scheduled-reports.service.ts` | Geração automatizada de relatórios |

## Estatísticas do painel de administração

O `AdminStatsRepository` agrega quatro categorias de estatísticas usando `Promise.allSettled` para carregamento resiliente de dados:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Estatísticas do usuário

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

As consultas usam limites de data normalizados pelo UTC para garantir resultados consistentes, independentemente do fuso horário do servidor:

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### Estatísticas de envio

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Obtido do método `ItemRepository.getStats()` , pois os itens residem no CMS baseado em Git.

### Estatísticas de atividades

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

As visualizações são originadas do PostHog quando configuradas, voltando para zero:

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### Estatísticas do boletim informativo

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Processamento de análise em segundo plano

O `AnalyticsBackgroundProcessor` agenda seis jobs recorrentes:

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

| Trabalho | Intervalo | Finalidade |
|-----|----------|---------|
| Agregação de crescimento de usuários | 10 minutos | Atualiza tendências de crescimento de usuários |
| Agregação de tendências de atividades | 5 minutos | Atualiza séries temporais de engajamento |
| Classificação dos principais itens | 15 minutos | Recalcula classificações de popularidade de itens |
| Atualização de atividades recentes | 2 minutos | Atualiza o feed de atividades mais recente |
| Atualização de métricas de desempenho | 30 seg | Atualiza dados de desempenho em tempo real |
| Limpeza de cache | 1 hora | Remove agregações em cache obsoletas |

Os trabalhos podem ser desativados configurando `DISABLE_AUTO_SYNC=true` .

Cada trabalho rastreia seu próprio status:

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## Métricas de engajamento

### Métricas por item

A função `getEngagementMetricsPerItem` busca todas as métricas em paralelo:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Quatro consultas paralelas são executadas:

1. Veja as contagens de `item_views` 2. Pontuações líquidas de votos de `votes` (voto positivo = +1, voto negativo = -1)
3. Contagens favoritas de `favorites` 4. Contagem de comentários e avaliações médias de `comments` (excluindo exclusão reversível)

### Pontuação de popularidade

Os itens são pontuados usando um algoritmo logarítmico:

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## Análise do lado do cliente

A classe singleton `Analytics` em `lib/analytics/index.ts` gerencia o rastreamento do lado do cliente:

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### Provedores de rastreamento de exceções

O módulo analítico oferece suporte a três configurações de rastreamento de exceções:

| Provedor | Descrição |
|----------|------------|
| `posthog` | Erros enviados apenas para PostHog |
| `sentry` | Erros enviados apenas ao Sentry |
| `both` | Erros enviados para PostHog e Sentry |

O provedor é determinado em `EXCEPTION_TRACKING_PROVIDER` com fallback automático se o provedor configurado estiver indisponível.

### Configuração PostHog

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

As taxas de amostragem controlam a porcentagem de sessões rastreadas, configuradas por meio de variáveis ​​de ambiente.

## Consultas de dados do painel

### Tendências de engajamento semanal

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Usa PostgreSQL `to_char(date, 'IYYY-IW')` para agrupamento de semanas ISO.

### Análise das atividades diárias

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### Itens de melhor desempenho

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Os itens são classificados por engajamento total (votos mais comentários).

## Carregamento de dados resiliente

O método `getAllStats` usa `Promise.allSettled` para garantir que falhas parciais não quebrem o painel:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## Requisitos de permissão

Os recursos de análise são controlados pelo sistema de permissão:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Acesso a recursos baseados em plano:

| Recurso | Grátis | Padrão | Prémio |
|--------|------|----------|---------|
| Ver estatísticas | Não | Sim | Sim |
| Análise Avançada | Não | Não | Sim |

## Documentação Relacionada

- [Histórico do Analytics](/docs/template/services/analytics-background) -- Detalhes do processamento em segundo plano
- [Serviço PostHog](/docs/template/services/posthog-service) -- API do lado do servidor PostHog
- [Serviço de exportação](/docs/template/services/export-service) -- Exportação de dados
- [Serviço de atividades](/docs/template/services/activity-service) -- Rastreamento de atividades do usuário
- [Serviço de engajamento](/docs/template/services/engagement-services) -- Pontuação de popularidade
