---
id: background-jobs-system
title: Sistema de trabalhos em segundo plano
sidebar_label: Trabalhos em segundo plano
sidebar_position: 38
---

# Sistema de trabalhos em segundo plano

O modelo inclui um sistema extensível de tarefas em segundo plano com três implementações intercambiáveis: um gerenciador local baseado em `setInterval` para desenvolvimento, uma integração Trigger.dev para produção e um gerenciador autônomo para desabilitar tarefas totalmente.

## Estrutura de arquivo

```
lib/background-jobs/
  index.ts                      # Public API - exports types, factory, config
  types.ts                      # BackgroundJobManager interface, types
  config.ts                     # Trigger.dev configuration, scheduling mode
  job-factory.ts                # Factory function and singleton management
  local-job-manager.ts          # Local setInterval-based implementation
  trigger-dev-job-manager.ts    # Trigger.dev SDK integration
  noop-job-manager.ts           # No-op implementation for disabled mode
  initialize-jobs.ts            # Centralized job registration
  triggers/                     # Job-specific trigger definitions
    analytics.ts
    reports.ts
    subscriptions.ts
    sync.ts
```

## A interface `BackgroundJobManager`

Todas as implementações compartilham uma interface comum:

```ts
export interface BackgroundJobManager {
  // Schedule by interval (milliseconds)
  scheduleJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    interval: number
  ): void;

  // Schedule by cron expression
  scheduleCronJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    cronExpression: string
  ): void;

  // Manually trigger a job
  triggerJob(id: string): Promise<void>;

  // Stop a specific job
  stopJob(id: string): void;

  // Stop all jobs
  stopAllJobs(): void;

  // Get status of a specific job
  getJobStatus(id: string): JobStatus | undefined;

  // Get all job statuses
  getAllJobStatuses(): JobStatus[];

  // Get execution metrics
  getJobMetrics(): JobMetrics;
}
```

### Tipos de status e métricas

```ts
type JobStatusType = 'running' | 'completed' | 'failed' | 'scheduled' | 'stopped';

interface JobStatus {
  id: string;
  name: string;
  status: JobStatusType;
  lastRun: Date | null;
  nextRun: Date | null;
  duration: number;
  error?: string;
}

interface JobMetrics {
  totalExecutions: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}
```

## Fábrica de empregos (`job-factory.ts`)

A fábrica cria o gerente apropriado com base no ambiente:

```ts
import { getJobManager, resetJobManager } from '@/lib/background-jobs';

// Get the singleton manager (created on first call)
const manager = getJobManager();

// Register a job
manager.scheduleJob(
  'cleanup',
  'Daily Cleanup',
  async () => { /* ... */ },
  24 * 60 * 60 * 1000 // 24 hours
);

// Reset (useful for testing)
resetJobManager();
```

### Lógica de Seleção

A fábrica segue esta ordem de prioridade:

1. **NoOpJobManager** - Se `DISABLE_AUTO_SYNC=true` estiver em desenvolvimento
2. **TriggerDevJobManager** - Se Trigger.dev estiver totalmente configurado e habilitado na produção
3. **LocalJobManager** - Fallback para todos os outros ambientes

```ts
export function createJobManager(): BackgroundJobManager {
  if (coreConfig.NODE_ENV === 'development' && process.env.DISABLE_AUTO_SYNC === 'true') {
    return new NoOpJobManager();
  }

  if (shouldUseTriggerDev()) {
    return new TriggerDevJobManager(getTriggerDevConfig());
  }

  return new LocalJobManager();
}
```

## LocalJobManager

Usa `setInterval` para agendamento. Ideal para desenvolvimento e implantações auto-hospedadas:

```ts
const manager = new LocalJobManager();

// Interval-based scheduling
manager.scheduleJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, 5 * 60 * 1000); // Every 5 minutes

// Cron-based scheduling (converted to interval internally)
manager.scheduleCronJob('cleanup', 'Nightly Cleanup', async () => {
  await runCleanup();
}, '0 0 * * *'); // Daily at midnight
```

### Conversão Cron para Intervalo

O `LocalJobManager` converte expressões cron comuns em intervalos aproximados:

|Padrão Cron|Intervalo|
|-------------|----------|
| `*/30 * * * * *` |30 segundos|
| `*/2 * * * *` |2 minutos|
| `*/5 * * * *` |5 minutos|
| `*/10 * * * *` |10 minutos|
| `*/15 * * * *` |15 minutos|
| `0 * * * *` |1 hora|
| `0 9 * * *` |24 horas|
|Outro|1 minuto (padrão)|

### Guardas de Execução

O gerenciador local evita execuções sobrepostas. Se um trabalho já estiver em execução quando seu intervalo for acionado, a execução será ignorada:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Registra trabalhos com o SDK Trigger.dev para execução baseada em nuvem. Na produção, o agendamento e a execução reais são controlados pelo trabalhador Trigger.dev, não pelos timers locais.

```ts
const config: TriggerDevConfig = {
  enabled: true,
  apiKey: 'tr_dev_...',
  apiUrl: 'https://api.trigger.dev',
  environment: 'production',
  isFullyConfigured: true,
  isPartiallyConfigured: false,
};

const manager = new TriggerDevJobManager(config);

// Jobs are registered with Trigger.dev schedules
manager.scheduleCronJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, '*/5 * * * *');
```

### Como funciona

1. `scheduleJob` converte o intervalo em uma expressão cron
2. `registerTask` carrega preguiçosamente `@trigger.dev/sdk` e chama `schedules.task()`
3. O manipulador de execução registra métricas quando executado pelo trabalhador Trigger.dev
4. `stopJob` apenas limpa o estado local (programações remotas são gerenciadas através do painel Trigger.dev)

## NoOpJobManager

Todas as operações são autônomas. Usado quando os trabalhos em segundo plano estão desativados:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Configuração (`config.ts`)

### Configuração do Trigger.dev

```ts
import { getTriggerDevConfig, shouldUseTriggerDev } from '@/lib/background-jobs';

const config = getTriggerDevConfig();
// => {
//   enabled: boolean,
//   apiKey: string | undefined,
//   apiUrl: string,           // default: 'https://api.trigger.dev'
//   environment: string,      // default: 'development'
//   isFullyConfigured: boolean, // apiKey AND apiUrl present
//   isPartiallyConfigured: boolean,
// }

if (shouldUseTriggerDev()) {
  // Use Trigger.dev (fully configured + enabled + production)
}
```

### Modo de agendamento

A função `getSchedulingMode` determina qual sistema usar:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Ordem de prioridade:

1. **desativado** - `DISABLE_AUTO_SYNC` é verdadeiro
2. **trigger-dev** – Totalmente configurado e habilitado em produção
3. **vercel** - Executando na plataforma Vercel
4. **local** – substituto

## Registro de trabalho (`initialize-jobs.ts`)

Todos os trabalhos em segundo plano são registrados centralmente via `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Empregos registrados

|ID do trabalho|Nome|Cronograma|Descrição|
|--------|------|----------|-------------|
|`repository-sync`|Sincronização de repositório|A cada 5 minutos|Sincroniza o conteúdo CMS baseado em Git|
|`subscription-renewal-reminder`|Lembrete de renovação de assinatura|Diariamente às 9h|Envia lembretes para assinaturas expiradas|
|`subscription-expired-cleanup`|Limpeza de expiração de assinatura|Diariamente à meia-noite|Processa e expira assinaturas vencidas|

### Guarda Solteiro

A função de inicialização inclui uma proteção singleton para evitar registro duplo:

```ts
let isInitialized = false;

export async function initializeBackgroundJobs(): Promise<void> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (isInitialized) return;
  isInitialized = true;

  const { getJobManager } = await import('@/lib/background-jobs');
  const manager = getJobManager();

  // Register jobs with dynamic imports to prevent webpack bundling issues
  manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
    const { syncManager } = await import('@/lib/services/sync-service');
    await syncManager.performSync();
  }, 5 * 60 * 1000);

  // ... more jobs
}
```

As importações dinâmicas dentro dos retornos de chamada do trabalho evitam que o webpack analise toda a cadeia de dependências no momento da construção.

## Variáveis de ambiente

|Variável|Obrigatório|Descrição|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Para Trigger.dev|Chave de API para Trigger.dev|
|`TRIGGER_DEV_API_URL`|Não|URL da API personalizada (padrão: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|Não|Habilite Trigger.dev (padrão: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|Não|Nome do ambiente (padrão: `development`)|
|`DISABLE_AUTO_SYNC`|Não|Defina como `true` para desativar todos os trabalhos em segundo plano|
|`VERCEL`|Configuração automática|Definido como `1` pela plataforma Vercel|

## Arquivos relacionados

- `lib/background-jobs/index.ts` - Exportações de API públicas
- `lib/background-jobs/types.ts` - Definições de interface e tipo
- `lib/background-jobs/config.ts` - Ajudantes de configuração
- `lib/background-jobs/job-factory.ts` - Fábrica e singleton
- `lib/background-jobs/local-job-manager.ts` - Implementação local
- `lib/background-jobs/trigger-dev-job-manager.ts` - Implementação Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - Implementação autônoma
- `lib/background-jobs/initialize-jobs.ts` - Registro de trabalho
- `lib/services/sync-service.ts` - Serviço de sincronização de repositório
- `lib/services/subscription-jobs.ts` - Implementações de trabalho de assinatura
