---
id: cron-api-endpoints
title: Endpoints de API Cron
sidebar_label: API Cron
sidebar_position: 59
---

# Endpoints de API Cron

A API Cron fornece endpoints de tarefas agendadas acionados pelo Vercel Cron, agendadores externos ou pelo `BackgroundJobManager` interno. Todos os endpoints cron requerem autenticação via variável de ambiente `CRON_SECRET` usando um token `Bearer` no cabeçalho `Authorization`.

**Diretório de origem:** `template/app/api/cron/`

---

## Autenticação

Os endpoints cron usam um segredo compartilhado para autorização:

- **Produção:** A variável de ambiente `CRON_SECRET` deve estar definida. As solicitações devem incluir `Authorization: Bearer <CRON_SECRET>`.
- **Desenvolvimento:** Se `CRON_SECRET` não estiver configurado, o acesso é permitido sem autenticação para uma experiência de desenvolvimento local sem atritos.
- **Segurança:** Todos os endpoints cron usam `crypto.timingSafeEqual()` para comparação em tempo constante, prevenindo ataques de temporização.

**Resposta de não autorizado (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Configuração do Vercel Cron

O agendamento cron é definido em `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

| Tarefa | Agendamento | Descrição |
|--------|-------------|-----------|
| Sincronização de conteúdo | Diariamente às 3h UTC | Sincroniza conteúdo do CMS baseado em Git |
| Lembretes de assinatura | Diariamente às 9h UTC | Envia e-mails de lembrete de renovação |
| Expiração de assinatura | Diariamente à meia-noite UTC | Processa assinaturas expiradas |

---

## Sincronização de conteúdo

Aciona uma sincronização de conteúdo do repositório CMS baseado em Git.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/cron/sync` |
| **Auth** | `CRON_SECRET` (token Bearer) |
| **Origem** | `cron/sync/route.ts` |

### Resposta

**Status 200** -- Sincronização concluída com sucesso.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** -- Falha na sincronização.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `success` | `boolean` | Se a sincronização foi bem-sucedida |
| `timestamp` | `string` (ISO 8601) | Quando a sincronização foi concluída |
| `duration` | `number` | Duração em milissegundos |
| `message` | `string` | Mensagem de status legível |
| `details` | `string` (opcional) | Detalhes adicionais em caso de falha |

### Cabeçalhos de resposta

Todas as respostas incluem `Cache-Control: no-cache, no-store, must-revalidate` para evitar cache dos resultados de sincronização.

### Exemplo com curl

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Expiração de assinatura

Localiza e processa assinaturas expiradas, atualizando seu status de `active` para `expired` e enviando e-mails de notificação.

| Propriedade | Valor |
|-------------|-------|
| **Métodos** | `GET`, `POST` |
| **Caminho** | `/api/cron/subscription-expiration` |
| **Auth** | `CRON_SECRET` (token Bearer) |
| **Origem** | `cron/subscription-expiration/route.ts` |

### Resposta

**Status 200** -- Processado com sucesso.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data.processed` | `number` | Número de assinaturas atualizadas para expiradas |
| `data.affectedUsers` | `array` | Lista de assinaturas afetadas (sem PII) |
| `data.errors` | `string[]` | Erros não fatais (ex.: falhas de entrega de e-mail) |
| `data.timestamp` | `string` | Timestamp de processamento |

### Etapas de processamento

1. Localiza assinaturas ativas além da data de término.
2. Atualiza o status de `active` para `expired`.
3. Envia e-mails de notificação de expiração via serviço de e-mail.
4. Retorna um resumo -- falhas de e-mail não causam falha em toda a tarefa.

### Exemplo com curl

```bash
# Via GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Via POST (também suportado para acionamentos manuais)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Lembretes de assinatura

Envia e-mails de lembrete de renovação para usuários com assinaturas próximas da data de renovação.

| Propriedade | Valor |
|-------------|-------|
| **Métodos** | `GET`, `POST` |
| **Caminho** | `/api/cron/subscription-reminders` |
| **Auth** | `CRON_SECRET` (token Bearer) |
| **Origem** | `cron/subscription-reminders/route.ts` |

### Resposta

**Status 200** -- Tarefa concluída com sucesso.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** -- Tarefa concluída com erros parciais (Multi-Status).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### Exemplo com curl

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Inicialização de tarefas em segundo plano

O módulo de tarefas em segundo plano (`cron/jobs/background-jobs-init.ts`) não é um endpoint de API, mas um módulo de inicialização singleton usado para configurar o modo de agendamento na inicialização da aplicação.

**Origem:** `cron/jobs/background-jobs-init.ts`

### Modos de agendamento

| Modo | Descrição |
|------|-----------|
| `vercel` | Tarefas gerenciadas pelo Vercel Cron via endpoints `/api/cron/*` |
| `local` | Agendador interno (para implantações auto-hospedadas) |
| `trigger-dev` | Integração com Trigger.dev para tarefas em segundo plano gerenciadas |
| `disabled` | Sincronização em segundo plano desativada (`DISABLE_AUTO_SYNC=true`) |

### Uso

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Chamado uma vez a partir de layout.tsx -- seguro para chamadas múltiplas
await ensureBackgroundJobsInitialized();
```
