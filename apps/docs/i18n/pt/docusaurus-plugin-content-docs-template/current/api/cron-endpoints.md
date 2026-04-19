---
id: cron-endpoints
title: Endpoints de API de Tarefas Cron
sidebar_label: Endpoints Cron
sidebar_position: 6
---

# Endpoints de API de Tarefas Cron

O template inclui três endpoints de tarefas cron que são executados em intervalos agendados via Vercel Cron. Esses endpoints gerenciam sincronização de conteúdo, lembretes de assinatura e processamento de expiração de assinatura.

## Configuração de Cron

Os agendamentos cron são definidos em `vercel.json`:

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

## Sincronização de conteúdo (`/api/cron/sync`)

| Método | Caminho | Agendamento | Descrição |
|--------|---------|-------------|-----------|
| `GET` | `/api/cron/sync` | Diariamente às 3h UTC | Sincronizar repositório de conteúdo baseado em Git |

### O que faz

A tarefa cron de sincronização obtém o conteúdo mais recente do repositório de dados Git configurado (`DATA_REPOSITORY`) e atualiza o cache de conteúdo local. Isso garante que a aplicação reflita quaisquer alterações feitas diretamente no repositório de conteúdo (ex.: via merge de PR no GitHub).

### Processo de sincronização

```
1. Verificar autorização CRON_SECRET
2. Verificar se a sincronização já está em andamento (mutex lock)
3. Obter as últimas alterações do repositório Git remoto
4. Analisar e validar os arquivos de conteúdo YAML atualizados
5. Atualizar o cache de conteúdo local
6. Retornar resultado da sincronização com duração
```

### Comportamentos principais

- **Mutex lock**: Apenas uma sincronização pode ser executada por vez. Solicitações simultâneas são rejeitadas com uma mensagem de status
- **Timeout**: As operações de sincronização têm um timeout de 5 minutos para evitar processos descontrolados
- **Lógica de repetição**: Sincronizações com falha são repetidas até 3 vezes
- **Modo de desenvolvimento**: A sincronização automática pode ser desativada via variável de ambiente `DISABLE_AUTO_SYNC=true`

### Resposta

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Lembretes de assinatura (`/api/cron/subscription-reminders`)

| Método | Caminho | Agendamento | Descrição |
|--------|---------|-------------|-----------|
| `GET` | `/api/cron/subscription-reminders` | Diariamente às 9h UTC | Enviar lembretes de renovação de assinatura |

### O que faz

Consulta assinaturas próximas da data de renovação e envia e-mails de lembrete aos assinantes. Isso ajuda a reduzir o churn involuntário, alertando os usuários antes que o pagamento seja processado.

### Lógica de lembrete

```
1. Verificar autorização CRON_SECRET
2. Consultar assinaturas que renovam dentro da janela de lembrete
3. Filtrar assinaturas já notificadas
4. Enviar e-mails de lembrete via serviço de notificação por e-mail
5. Marcar assinaturas como notificadas
6. Retornar contagem de lembretes enviados
```

### Janelas de lembrete

Janelas de lembrete típicas:
- **7 dias antes da renovação**: Primeiro lembrete
- **1 dia antes da renovação**: Lembrete final

### Resposta

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## Expiração de assinatura (`/api/cron/subscription-expiration`)

| Método | Caminho | Agendamento | Descrição |
|--------|---------|-------------|-----------|
| `GET` | `/api/cron/subscription-expiration` | Diariamente à meia-noite UTC | Processar assinaturas expiradas |

### O que faz

Identifica assinaturas além da data de expiração e atualiza seu status. Isso lida com assinaturas que foram canceladas mas tinham tempo restante, bem como assinaturas que falharam ao renovar.

### Processo de expiração

```
1. Verificar autorização CRON_SECRET
2. Consultar assinaturas com data de expiração no passado
3. Atualizar status da assinatura para 'expired'
4. Revogar acesso/permissões associados
5. Enviar e-mails de notificação de expiração
6. Registrar eventos de expiração para trilha de auditoria
7. Retornar contagem de expirações processadas
```

### Resposta

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## Tarefas em segundo plano (`/api/cron/jobs`)

O arquivo `background-jobs-init.ts` no diretório de tarefas cron inicializa o processamento de tarefas em segundo plano. Isso configura quaisquer tarefas recorrentes que precisam ser executadas dentro do runtime da aplicação.

## Segurança

### Verificação de CRON_SECRET

Todos os endpoints cron verificam um cabeçalho ou parâmetro de consulta `CRON_SECRET` para evitar execução não autorizada:

```typescript
// Verificação típica de autorização cron
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Autorização do Vercel Cron

Quando implantado no Vercel, as tarefas cron são automaticamente chamadas pelo agendador cron do Vercel com o cabeçalho `CRON_SECRET` adequado. O segredo é configurado no painel do Vercel nas configurações do projeto.

| Variável de ambiente | Descrição |
|----------------------|-----------|
| `CRON_SECRET` | Segredo compartilhado para autorização de tarefas cron |

### Execução manual

Os endpoints cron podem ser acionados manualmente para depuração incluindo o `CRON_SECRET` no cabeçalho Authorization:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## Monitoramento

### Status de sincronização

O status da tarefa cron de sincronização pode ser monitorado via:
- `/api/version/sync` - Retorna hora e resultado da última sincronização
- Logs do servidor - As operações de sincronização são registradas com o prefixo `[SYNC_MANAGER]`

### Tratamento de erros

Todas as tarefas cron implementam tratamento de erros abrangente:
- Operações com falha são registradas com detalhes completos do erro
- Falhas parciais não impedem o processamento dos itens restantes
- Contagens de erros são incluídas na resposta para monitoramento
- Falhas críticas acionam erros de console para alertas de agregação de logs

## Referência de agendamento

| Expressão Cron | Significado |
|----------------|-------------|
| `0 3 * * *` | Todos os dias às 3h UTC |
| `0 9 * * *` | Todos os dias às 9h UTC |
| `0 0 * * *` | Todos os dias à meia-noite UTC |

Todos os horários estão em UTC. Considere a distribuição de fuso horário da sua base de usuários ao ajustar esses agendamentos.
