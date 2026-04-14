---
id: moderation-endpoints
title: Sistema de Moderação
sidebar_label: Moderação
sidebar_position: 28
---

# Sistema de Moderação

O sistema de moderação fornece moderação de conteúdo programática por meio de uma camada de serviço, e não de endpoints de API independentes. As ações de moderação são acionadas automaticamente quando os administradores resolvem denúncias de conteúdo via API de Denúncias. O sistema suporta avisar usuários, suspender contas, banir contas e remover conteúdo, com histórico completo de auditoria e notificações por e-mail.

## Visão geral

A moderação não é exposta como endpoints REST separados. Em vez disso, é invocada pelo fluxo de resolução de denúncias:

```
PUT /api/admin/reports/[id]  -->  resolução aciona ação de moderação
```

Quando um administrador define um valor de `resolution` em uma denúncia, a função de moderação correspondente é executada automaticamente.

| Valor de Resolução | Função de Moderação | Efeito |
|---|---|---|
| `content_removed` | `removeContent()` | Exclusão suave do comentário ou item denunciado |
| `user_warned` | `warnUser()` | Incrementa o contador de avisos do usuário |
| `user_suspended` | `suspendUser()` | Define o status do usuário como `"suspended"` |
| `user_banned` | `banUser()` | Define o status do usuário como `"banned"` |
| `no_action` | Nenhuma | Nenhuma ação de moderação tomada |

## Ações de Moderação

### Remover Conteúdo

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

Remove o conteúdo denunciado com base em seu tipo. Para comentários, realiza uma exclusão suave (define `deletedAt`). Para itens, exclui o item do repositório de conteúdo baseado em Git.

**Parâmetros:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `contentType` | `"item"` ou `"comment"` | Tipo de conteúdo a remover |
| `contentId` | string | ID ou slug do conteúdo |
| `reportId` | string | ID da denúncia associada |
| `adminId` | string | Usuário administrador que realiza a ação |

**Etapas de Processamento:**

1. Buscar proprietário do conteúdo via `getContentOwner()`
2. Se comentário: exclusão suave via `deleteComment()`
3. Se item: exclusão do repositório Git via `itemRepository.delete()`
4. Registrar histórico de moderação com ação `CONTENT_REMOVED`
5. Enviar e-mail de notificação de remoção de conteúdo ao proprietário

**Origem:** `template/lib/services/moderation.service.ts`

### Avisar Usuário

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Emite um aviso a um usuário incrementando seu campo `warningCount`. Usuários já banidos não podem receber avisos.

**Parâmetros:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `userId` | string | ID do perfil do cliente do usuário |
| `reason` | string | Motivo do aviso |
| `reportId` | string | ID da denúncia associada |
| `adminId` | string | Usuário administrador que realiza a ação |

**Etapas de Processamento:**

1. Verificar se o usuário existe e não está banido
2. Incrementar contador de avisos via `incrementWarningCount()`
3. Registrar histórico de moderação com ação `WARN`
4. Enviar notificação de aviso por e-mail com o contador atual de avisos

**Resultado de Sucesso:**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

**Origem:** `template/lib/services/moderation.service.ts`

### Suspender Usuário

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Suspende uma conta de usuário definindo seu status como `"suspended"` e registrando um timestamp `suspendedAt`. Usuários suspensos não podem criar comentários, enviar votos ou registrar denúncias.

**Guardas:**

- Retorna erro se o usuário já estiver suspenso
- Retorna erro se o usuário já estiver banido

**Etapas de Processamento:**

1. Verificar se o usuário existe e não está suspenso nem banido
2. Definir status como `"suspended"` com timestamp `suspendedAt`
3. Registrar histórico de moderação com ação `SUSPEND`
4. Enviar notificação de suspensão por e-mail

**Origem:** `template/lib/services/moderation.service.ts`

### Banir Usuário

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Bane permanentemente uma conta de usuário definindo seu status como `"banned"` e registrando um timestamp `bannedAt`. Usuários banidos ficam bloqueados de todas as ações autenticadas.

**Guardas:**

- Retorna erro se o usuário já estiver banido

**Etapas de Processamento:**

1. Verificar se o usuário existe e não está banido
2. Definir status como `"banned"` com timestamp `bannedAt`
3. Registrar histórico de moderação com ação `BAN`
4. Enviar notificação de banimento por e-mail

**Origem:** `template/lib/services/moderation.service.ts`

## Resolução do Proprietário do Conteúdo

A função `getContentOwner()` determina quem possui o conteúdo denunciado:

| Tipo de Conteúdo | Fonte do Proprietário |
|---|---|
| `comment` | Campo `comment.userId` da tabela de comentários |
| `item` | Campo `item.submitted_by` do repositório de itens |

Isso é usado por todas as ações de moderação em nível de usuário (`user_warned`, `user_suspended`, `user_banned`) para identificar o usuário alvo da ação.

**Origem:** `template/lib/services/moderation.service.ts`

## Histórico de Moderação

Todas as ações de moderação criam uma trilha de auditoria na tabela `moderationHistory` do banco de dados.

### Campos do Registro de Histórico

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | ID único do registro |
| `userId` | string | ID do perfil do cliente do usuário afetado |
| `action` | string | `"CONTENT_REMOVED"`, `"WARN"`, `"SUSPEND"` ou `"BAN"` |
| `reason` | string ou null | Motivo da ação de moderação |
| `reportId` | string ou null | ID da denúncia associada |
| `performedBy` | string ou null | ID do administrador que realizou a ação |
| `contentType` | string ou null | `"item"` ou `"comment"` (para remoção de conteúdo) |
| `contentId` | string ou null | ID do conteúdo removido |
| `details` | objeto ou null | Contexto adicional (ex: contador de avisos, nome do item) |
| `createdAt` | timestamp | Quando a ação foi realizada |

### Consultas de Histórico

| Função | Descrição |
|---|---|
| `getModerationHistoryByUser(userId, limit)` | Obter todas as ações de moderação de um usuário (limite padrão: 50) |
| `getModerationHistoryByReport(reportId)` | Obter ações de moderação vinculadas a uma denúncia específica |

Ambas as funções de consulta enriquecem os resultados com informações do perfil do usuário e os detalhes do administrador executor.

**Origem:** `template/lib/db/queries/moderation.queries.ts`

## Gerenciamento de Status do Usuário

### Valores de Status

| Status | Descrição |
|---|---|
| `active` | Conta normal, todas as funcionalidades disponíveis |
| `suspended` | Temporariamente restrito, não pode criar conteúdo |
| `banned` | Permanentemente restrito, bloqueado de todas as ações |

### Operações no Banco de Dados

| Função | Descrição |
|---|---|
| `suspendUser(userId)` | Define status como `"suspended"`, registra `suspendedAt` |
| `unsuspendUser(userId)` | Restaura status para `"active"`, limpa `suspendedAt` |
| `banUser(userId)` | Define status como `"banned"`, registra `bannedAt` |
| `unbanUser(userId)` | Restaura status para `"active"`, limpa `bannedAt` |
| `incrementWarningCount(userId)` | Incrementa `warningCount` usando SQL `COALESCE` |

### Verificações de Usuário Bloqueado

Duas funções auxiliares verificam o status do usuário na aplicação:

- **`isUserBlocked(status)`** — Retorna `true` se o status for `"suspended"` ou `"banned"`
- **`getBlockReasonMessage(status)`** — Retorna uma mensagem voltada ao usuário explicando por que a ação está restrita

Essas verificações são usadas pelos endpoints de comentários, votos e denúncias para impedir que usuários bloqueados criem conteúdo.

**Origem:** `template/lib/db/queries/moderation.queries.ts`

## Notificações por E-mail

O `EmailNotificationService` envia notificações não bloqueantes para ações de moderação:

| Método | Gatilho |
|---|---|
| `sendContentRemovedEmail(email, type, reason)` | Conteúdo removido pelo administrador |
| `sendUserWarningEmail(email, reason, count)` | Aviso emitido |
| `sendUserSuspensionEmail(email, reason)` | Conta suspensa |
| `sendUserBanEmail(email, reason)` | Conta banida |

Todos os envios de e-mail usam `.catch()` para evitar que falhas interrompam o fluxo de moderação. Uma falha no e-mail não causa falha na própria ação de moderação.

## Detalhes de Implementação

- **Padrão de Camada de Serviço:** A lógica de moderação reside em `lib/services/moderation.service.ts`, não nos manipuladores de rota de API. Isso permite reutilização em diferentes pontos de entrada.
- **Trilha de Auditoria:** Cada ação de moderação cria um registro `moderationHistory`, fornecendo um log de auditoria completo para conformidade e revisão.
- **E-mails Não Bloqueantes:** As notificações por e-mail são enviadas de forma assíncrona com manipuladores `.catch()`. Se o serviço de e-mail estiver indisponível, a ação de moderação ainda é concluída com sucesso.
- **Guardas de Idempotência:** Cada ação verifica o status atual do usuário antes de prosseguir. Banir um usuário já banido retorna um erro em vez de criar uma ação duplicada.
- **Exclusão Suave vs Exclusão Total:** Comentários são excluídos suavemente (definindo `deletedAt`), enquanto itens são completamente removidos do repositório Git. Essa diferença reflete o modelo de armazenamento (banco de dados vs conteúdo baseado em arquivos).
