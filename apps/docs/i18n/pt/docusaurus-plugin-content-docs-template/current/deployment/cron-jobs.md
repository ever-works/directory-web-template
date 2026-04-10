---
id: cron-jobs
title: Configuração de Cron Jobs
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Guia de Configuração de Cron Jobs

## Visão Geral

Este template suporta **três mecanismos de agendamento** para trabalhos em segundo plano:

1. **Local** - `LocalJobManager` usando `setInterval` (desenvolvimento)
2. **Vercel Crons** - Sistema cron integrado da Vercel (produção no Vercel)
3. **Trigger.dev** - Serviço de terceiros (opcional, para diretórios de grande escala)

### Ordem de Prioridade (Detecção automática)

O sistema seleciona automaticamente o modo de agendamento com base no ambiente:

```typescript
// From lib/background-jobs/config.ts
export function getSchedulingMode(): SchedulingMode {
  // 1. Check if disabled
  if (DISABLE_AUTO_SYNC === 'true') return 'disabled';
  
  // 2. Trigger.dev (if fully configured in production)
  if (shouldUseTriggerDev()) return 'trigger-dev';
  
  // 3. Vercel (if VERCEL=1)
  if (isVercelEnvironment()) return 'vercel';
  
  // 4. Local (fallback)
  return 'local';
}
```

---

## 📋 Jobs em Segundo Plano Registrados

### 1. Sincronização de Repositório

**ID do Job:** `repository-sync`  
**Agendamento:** A cada 5 minutos (`*/5 * * * *`)  
**Descrição:** Sincroniza conteúdo do repositório CMS baseado em Git

- **Endpoint Vercel:** `/api/cron/sync`
- **Intervalo Local:** `5 * 60 * 1000` ms (5 minutos)
- **Função:** `syncManager.performSync()`

### 2. Lembretes de Renovação de Assinatura

**ID do Job:** `subscription-renewal-reminder`  
**Agendamento:** Diariamente às 9h (`0 9 * * *`)  
**Descrição:** Envia lembretes por email a usuários com assinaturas expirando em 7 dias

- **Endpoint Vercel:** `/api/cron/subscription-reminders`
- **Cron Local:** `0 9 * * *`
- **Função:** `subscriptionRenewalReminderJob()`

### 3. Limpeza de Assinaturas Expiradas

**ID do Job:** `subscription-expired-cleanup`  
**Agendamento:** Diariamente à meia-noite (`0 0 * * *`)  
**Descrição:** Processa assinaturas expiradas e envia notificações de expiração

- **Endpoint Vercel:** `/api/cron/subscription-expiration`
- **Cron Local:** `0 0 * * *`
- **Função:** `subscriptionService.processExpiredSubscriptions()`

---

## 🚀 Configuração de Deployment no Vercel

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
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

### Variáveis de Ambiente

**Necessárias para Vercel Crons:**

```bash
CRON_SECRET=your-secure-random-secret-here
```

A Vercel envia isso automaticamente no cabeçalho `Authorization: Bearer <CRON_SECRET>` ao chamar os endpoints cron.

**Opcional (para desabilitar o Trigger.dev):**

```bash
# NÃO defina estas variáveis se quiser usar Vercel Crons:
# TRIGGER_SECRET_KEY=
# TRIGGER_API_KEY=
# TRIGGER_API_URL=
```

---

## ✅ Como Verificar os Cron Jobs no Vercel

### 1. Verificar o Dashboard do Vercel

**Navegue até:**
```
https://vercel.com/<team>/<project>/settings/cron-jobs
```

**Exemplo:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**O que procurar:**
- ✅ Todos os 3 cron jobs devem estar listados
- ✅ Agendamentos corretos (a cada 5 min., diariamente às 9h, diariamente à meia-noite)
- ✅ Status deve ser "Ativo"

### 2. Verificar os Logs

**Navegue até:**
```
https://vercel.com/<team>/<project>/logs
```

**Filtrar por Caminho de Requisição:**
- `/api/cron/sync`
- `/api/cron/subscription-reminders`
- `/api/cron/subscription-expiration`

**O que procurar:**
- ✅ Timestamps de execução regulares
- ✅ Códigos de status 200 (sucesso)
- ✅ Sem erros 401 (falhas de autenticação)
- ✅ Sem erros 500 (erros internos)

### 3. Verificar os Logs da Aplicação

**Procure por estas mensagens de log:**

```bash
# Initialization
[BACKGROUND_JOBS] All background jobs registered with BackgroundJobManager

# Sync job
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: ...

# Renewal reminders
[Cron] Subscription reminders job completed

# Expiration cleanup
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: X subscriptions expired
```

### 4. Testar Manualmente (Desenvolvimento)

**Testar endpoints localmente com curl:**

```bash
# Set your CRON_SECRET
export CRON_SECRET="your-secret"

# Test sync endpoint
curl -X GET http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription reminders
curl -X GET http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription expiration
curl -X GET http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Resposta esperada:**
```json
{
  "success": true,
  "timestamp": "2026-01-06T...",
  "message": "...",
  "duration": 123
}
```

---

## 🔧 Solução de Problemas

### Cron Jobs não estão sendo executados

**Verificação 1: Variáveis de Ambiente**
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls

# Should show:
# CRON_SECRET (Production, Preview, Development)
```

**Verificação 2: Deployment**
```bash
# Ensure vercel.json is deployed
git status
git log --oneline -1 -- vercel.json
```

**Verificação 3: Logs**
```bash
# Check for errors in Vercel logs
vercel logs --follow
```

### Erros 401 Não Autorizado

**Problema:** Incompatibilidade de `CRON_SECRET`

**Solução:**
1. Verificar `CRON_SECRET` nas variáveis de ambiente do Vercel
2. Reimplantar o projeto após atualizar as variáveis de ambiente
3. Verificar se o segredo não tem espaços no final

### Jobs sendo executados com muita frequência

**Problema:** Usando modo local em vez do modo Vercel

**Verificação:**
```typescript
// Deve registrar "vercel" em produção no Vercel
console.log(getSchedulingMode()); 
```

**Solução:**
- Garantir que `VERCEL=1` esteja definido (Vercel faz isso automaticamente)
- Garantir que as variáveis de ambiente do Trigger.dev NÃO estejam definidas

---

## 🔄 Guia de Migração

### De Local para Vercel

1. **Adicionar cron jobs ao `vercel.json`** (já feito)
2. **Definir `CRON_SECRET` no dashboard do Vercel**
3. **Fazer deploy para o Vercel**
4. **Verificar nos logs**

### De Vercel para Trigger.dev

1. **Criar uma conta no Trigger.dev** em https://trigger.dev
2. **Definir as variáveis de ambiente:**
   ```bash
   TRIGGER_SECRET_KEY=tr_prod_...
   TRIGGER_API_KEY=...
   TRIGGER_API_URL=https://api.trigger.dev
   TRIGGER_ENABLED=true
   ```
3. **Reimplantar**
4. **O sistema muda automaticamente para o modo Trigger.dev**

### De Trigger.dev de volta para Vercel

1. **Remover as variáveis de ambiente do Trigger.dev:**
   ```bash
   vercel env rm TRIGGER_SECRET_KEY production
   vercel env rm TRIGGER_API_KEY production
   vercel env rm TRIGGER_API_URL production
   vercel env rm TRIGGER_ENABLED production
   ```
2. **Reimplantar**
3. **O sistema retorna automaticamente ao modo Vercel**
