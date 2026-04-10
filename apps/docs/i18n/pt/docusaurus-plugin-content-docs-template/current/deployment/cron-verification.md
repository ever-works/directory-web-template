---
id: cron-verification
title: Verificação de Cron no Vercel
sidebar_label: Verificação Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Lista de Verificação

## 🎯 Resposta Rápida às Suas Perguntas

### Pergunta 1: Funciona no Vercel sem o Trigger.dev?
**✅ SIM** – O sistema está corretamente configurado para usar Vercel Crons quando:
- `VERCEL=1` (definido automaticamente pelo Vercel)
- As variáveis de ambiente do Trigger.dev **NÃO** estão definidas

### Pergunta 2: Como verificar se está funcionando?
**✅ Siga os 4 passos abaixo**

---

## 📊 Status Atual da Configuração

### ✅ O que foi corrigido

| Componente | Status | Detalhes |
|-----------|--------|---------|
| `vercel.json` | ✅ **CORRIGIDO** | Agora inclui **todos os 3** cron jobs (antes era apenas 1) |
| `initialize-jobs.ts` | ✅ **CORRIGIDO** | Agora registra **todos os 3** jobs (antes eram apenas 2) |
| Endpoints API | ✅ **OK** | Todos os 3 endpoints existem e funcionam |
| Documentação | ✅ **CRIADA** | Novo guia `CRON_JOBS.md` |

### 📋 Lista Completa de Cron Jobs

| # | Nome do Job | Endpoint | Agendamento | Propósito |
|---|------------|----------|-------------|-----------|
| 1 | Sync de Repositório | `/api/cron/sync` | `*/5 * * * *` | Sincroniza conteúdo a cada 5 minutos |
| 2 | Lembretes de Renovação | `/api/cron/subscription-reminders` | `0 9 * * *` | Envia emails de lembrete às 9h diariamente |
| 3 | Limpeza de Expiração | `/api/cron/subscription-expiration` | `0 0 * * *` | Processa assinaturas expiradas à meia-noite |

---

## 🔍 Processo de Verificação em 4 Passos

### Passo 1: Verificar o Dashboard do Vercel – Cron Jobs

**Modelo de URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**Para awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**O que procurar:**
- [ ] Mostra **3 cron jobs** (não apenas 1)
- [ ] Cada um tem o agendamento correto
- [ ] Todos mostram status "Ativo"

**Resultado esperado:**

| Caminho | Agendamento | Status |
|---------|-------------|--------|
| `/api/cron/sync` | A cada 5 minutos | ✅ Ativo |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Ativo |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Ativo |

---

### Passo 2: Verificar os Logs do Vercel

**Modelo de URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Verificar cada endpoint:**

#### A. Logs de Sync
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] Logs aparecem a cada 5 minutos
- [ ] Códigos de status são 200 (sucesso)
- [ ] Sem erros 401 (autenticação)
- [ ] Sem erros 500 (falhas)

#### B. Logs de Lembretes
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] Logs aparecem uma vez por dia às 9:00
- [ ] Códigos de status são 200 ou 207 (sucesso/sucesso parcial)

#### C. Logs de Expiração
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] Logs aparecem uma vez por dia à meia-noite
- [ ] Códigos de status são 200 (sucesso)

---

### Passo 3: Verificar os Logs da Aplicação

#### Na Inicialização da Aplicação
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ Isso confirma:** O sistema detectou o ambiente Vercel

#### A Cada Sync (a cada 5 min.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### Nos Lembretes de Renovação (diariamente às 9h)
```
[Cron] Subscription reminders job completed
```

#### Na Limpeza de Expiração (diariamente à meia-noite)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Passo 4: Verificar as Variáveis de Ambiente

**Necessária:**
```bash
CRON_SECRET=<definido-no-vercel>
```

**NÃO definidas (para usar Vercel, não Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<deve-estar-vazio>
TRIGGER_API_KEY=<deve-estar-vazio>
TRIGGER_API_URL=<deve-estar-vazio>
```

**Verificar via Vercel CLI:**
```bash
vercel env ls
```

---

## 🚨 Problemas Comuns & Soluções

### Problema 1: Apenas 1 cron job visível no Vercel

**Causa:** `vercel.json` antigo foi implantado  
**Solução:**
1. ✅ `vercel.json` está agora corrigido (3 crons)
2. Reimplantar no Vercel: `git push` ou `vercel --prod`
3. Aguardar 1-2 minutos para o Vercel registrar os novos crons

---

### Problema 2: Erros 401 Não Autorizado

**Causa:** `CRON_SECRET` não definido ou incompatível  
**Solução:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### Problema 3: Jobs não estão sendo executados

**Causa:** Usando modo Trigger.dev em vez do modo Vercel

**Verificação:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
