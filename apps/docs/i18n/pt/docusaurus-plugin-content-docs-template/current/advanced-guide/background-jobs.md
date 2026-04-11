---
id: background-jobs
title: Trabalhos em segundo plano
sidebar_label: Trabalhos em segundo plano
sidebar_position: 4
---

# Trabalhos em segundo plano

O modelo Ever Works inclui um sistema robusto de tarefas em segundo plano com uma arquitetura conectável que oferece suporte a vários back-ends de agendamento. Os trabalhos são executados automaticamente para tarefas como sincronização de repositório, gerenciamento de assinaturas e aquecimento de cache analítico.

## Visão geral da arquitetura

O sistema de tarefas em segundo plano segue um **padrão de estratégia** com uma interface `BackgroundJobManager` comum e três implementações intercambiáveis:

| Componente | Arquivo | Finalidade |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Contrato de interface para todos os gestores |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | Programação baseada em `setInterval` para desenvolvimento |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Integração Trigger.dev SDK v4 para produção |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Silencioso no-op para ambientes com deficiência |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Lógica de criação de fábrica + singleton |
| `config.ts` | `lib/background-jobs/config.ts` | Resolução do modo de agendamento |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Registro centralizado de empregos |

### Resolução do modo de agendamento

O sistema determina qual gerenciador utilizar com base na configuração do ambiente, seguindo uma ordem de prioridade estrita:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

A lógica de resolução reside em `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## A interface BackgroundJobManager

Todos os gerenciadores implementam a mesma interface definida em `lib/background-jobs/types.ts` :

```typescript
interface BackgroundJobManager {
  scheduleJob(id: string, name: string, job: () => void | Promise<void>, interval: number): void;
  scheduleCronJob(id: string, name: string, job: () => void | Promise<void>, cronExpression: string): void;
  triggerJob(id: string): Promise<void>;
  stopJob(id: string): void;
  stopAllJobs(): void;
  getJobStatus(id: string): JobStatus | undefined;
  getAllJobStatuses(): JobStatus[];
  getJobMetrics(): JobMetrics;
}
```

### Tipos de chave

```typescript
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

## Fábrica de empregos e Singleton

A fábrica em `lib/background-jobs/job-factory.ts` cria o gerenciador apropriado e expõe um singleton:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

O singleton garante que exista apenas uma instância de gerenciador por processo. Use `resetJobManager()` em testes para limpar a instância.

##LocalJobManager (Desenvolvimento)

O `LocalJobManager` usa `setInterval` e `setTimeout` para agendamento. Ele fornece:

- **Prevenção de sobreposição**: ignora a execução se uma execução anterior do mesmo trabalho ainda estiver em andamento.
- **Acompanhamento de métricas**: rastreia o total de execuções, contagens de sucesso/falha e duração média.
- **Conversão de cron para intervalo**: converte expressões cron comuns em intervalos de milissegundos para agendamento local aproximado.
- **Modo de desenvolvimento silencioso**: Reduz o ruído de registro quando `NODE_ENV=development` .

Conversões cron suportadas:

| Expressão Cron | Intervalo |
|---|---|
| `*/30 * * * * *` | 30 segundos |
| `*/2 * * * *` | 2 minutos |
| `*/5 * * * *` | 5 minutos |
| `*/15 * * * *` | 15 minutos |
| `0 * * * *` | 1 hora |
| `0 9 * * *` | 24 horas |

## TriggerDevJobManager (Produção)

O `TriggerDevJobManager` registra agendamentos com o Trigger.dev SDK v4. Comportamentos principais:

- **Sem temporizadores locais**: Não executa `setInterval` -- a execução real é controlada pelo processo de trabalho Trigger.dev.
- **Carregamento lento do SDK**: importa `@trigger.dev/sdk` dinamicamente para evitar problemas de agrupamento.
- **Conversão de intervalo para cron**: converte intervalos de milissegundos em expressões cron para a API Trigger.dev.
- **Gravação de métricas**: registra métricas de execução quando o trabalhador invoca o manipulador de execução.

### Configuração

Defina as seguintes variáveis de ambiente para ativar o Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

O gerenciador só é ativado quando todas estas condições forem atendidas:
1. `TRIGGER_DEV_API_KEY` e `TRIGGER_DEV_API_URL` estão definidos ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` é `true` 3. `NODE_ENV` é `production` ## NoOpJobManager (Desativado)

Quando `DISABLE_AUTO_SYNC=true` é definido em desenvolvimento, `NoOpJobManager` ignora silenciosamente todas as chamadas de agendamento. Cada método é autônomo e as métricas permanecem em zero. Isso é útil para:

- Executando o servidor de desenvolvimento sem ruído de fundo
- Depuração de recursos somente de frontend
- Reduzindo o uso de recursos durante o desenvolvimento da UI

## Empregos registrados

Os trabalhos são registrados centralmente em `lib/background-jobs/initialize-jobs.ts` . Este módulo é executado durante a inicialização do aplicativo por meio do gancho de instrumentação.

### Trabalhos principais

| ID do trabalho | Nome | Cronograma | Descrição |
|---|---|---|---|
| `repository-sync` | Sincronização de repositório | A cada 5 minutos | Sincroniza conteúdo do repositório CMS baseado em Git |
| `subscription-renewal-reminder` | Lembrete de renovação de assinatura | Diariamente às 9h | Envia lembretes por e-mail para assinaturas que expiram em 7 dias |
| `subscription-expired-cleanup` | Limpeza de expiração de assinatura | Diariamente à meia-noite | Processa e expira assinaturas após a data de término |

### Empregos analíticos

Registrado por `AnalyticsBackgroundProcessor` em `lib/services/analytics-background-processor.ts` :

| ID do trabalho | Nome | Intervalo |
|---|---|---|
| `analytics-user-growth` | Agregação de crescimento de usuários | 10 minutos |
| `analytics-activity-trends` | Agregação de tendências de atividades | 5 minutos |
| `analytics-top-items` | Classificação dos principais itens | 15 minutos |
| `analytics-recent-activity` | Atualização de atividades recentes | 2 minutos |
| `analytics-performance-metrics` | Atualização de métricas de desempenho | 30 segundos |
| `analytics-cache-cleanup` | Limpeza de cache | 1 hora |

### Definições de ID de tarefa de gatilho

IDs de tarefas e cronogramas são definidos em `lib/background-jobs/triggers/` :

| Arquivo | IDs de tarefas | Finalidade |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Aquecimento e limpeza do cache do Analytics |
| `sync.ts` | `SyncTaskIds` | Sincronização de repositório |
| `subscriptions.ts` | `SubscriptionTaskIds` | Gerenciamento do ciclo de vida da assinatura |
| `reports.ts` | `ReportTaskIds` | Geração programada de relatórios |

## Integração Vercel Cron

Quando implantados no Vercel, os trabalhos em segundo plano também podem ser acionados por meio dos Cron Jobs do Vercel configurados em `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Esses endpoints atingem rotas de API que executam a mesma lógica de trabalho, fornecendo um mecanismo de agendamento nativo da plataforma no Vercel.

## Adicionando um novo trabalho em segundo plano

### Etapa 1: Definir IDs de tarefas (opcional)

Crie ou atualize um arquivo em `lib/background-jobs/triggers/` :

```typescript
// lib/background-jobs/triggers/my-feature.ts
export const MyFeatureTaskIds = {
  cleanup: 'my-feature-cleanup',
  notify: 'my-feature-notify',
} as const;

export const MyFeatureCrons: Record<keyof typeof MyFeatureTaskIds, string> = {
  cleanup: '0 2 * * *',   // Daily at 2 AM
  notify: '*/30 * * * *', // Every 30 minutes
};
```

### Etapa 2: Implementar a função de trabalho

Crie a lógica do trabalho em `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Etapa 3: Registre-se em inicialize-jobs.ts

Adicione o trabalho a `lib/background-jobs/initialize-jobs.ts` :

```typescript
manager.scheduleCronJob(
  'my-feature-cleanup',
  'My Feature Cleanup',
  async () => {
    const { myFeatureCleanupJob } = await import('@/lib/services/my-feature-jobs');
    await myFeatureCleanupJob();
  },
  '0 2 * * *'
);
```

**Importante**: Use `import()` dinâmico dentro do retorno de chamada do trabalho para evitar que o webpack agrupe módulos Node.js durante a fase de construção.

### Etapa 4: Adicionar Vercel Cron (opcional)

Se estiver implantando no Vercel, adicione um endpoint cron a `vercel.json` e crie a rota de API correspondente:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Monitoramento e depuração

### Verificando o status do trabalho

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Acionamento manual de tarefas

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Desativando trabalhos em desenvolvimento

Defina a variável de ambiente para ignorar todos os trabalhos em segundo plano:

```bash
DISABLE_AUTO_SYNC=true
```

Isso ativa o `NoOpJobManager` , que ignora silenciosamente todas as chamadas agendadas.

## Melhores práticas

1. **Sempre use importações dinâmicas** em retornos de chamada de trabalho registrados em `initialize-jobs.ts` para evitar problemas de empacotamento de webpack.
2. **Mantenha as funções do trabalho idempotentes** – os trabalhos podem ser executados mais de uma vez se houver sobreposições de tempo ou novas tentativas.
3. **Use o registro estruturado** com o prefixo `[JobName]` para facilitar a filtragem do registro.
4. **Retorna objetos de resultado** de funções de trabalho (como `JobResult` em `subscription-jobs.ts` ) para observabilidade.
5. **Trate os erros normalmente** – o gerenciador captura e registra erros, mas sua lógica de trabalho deve lidar com falhas parciais.
6. **Teste com o LocalJobManager** em desenvolvimento antes de implantar no Trigger.dev.
