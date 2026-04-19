---
id: reports-endpoints
title: Endpoints de Relatórios
sidebar_label: Relatórios
sidebar_position: 20
---

# Endpoints de Relatórios

O sistema de relatórios permite que usuários autenticados denunciem conteúdo inapropriado e oferece aos administradores ferramentas para revisar, moderar e resolver as denúncias. Os relatórios suportam tipos de conteúdo como itens e comentários, com prevenção integrada de duplicatas.

## Visão geral

| Endpoint | Método | Autenticação | Descrição |
|---|---|---|---|
| `/api/reports` | POST | Usuário | Enviar uma denúncia de conteúdo |
| `/api/admin/reports` | GET | Admin | Listar denúncias com filtros |
| `/api/admin/reports/stats` | GET | Admin | Obter estatísticas de denúncias |
| `/api/admin/reports/[id]` | GET | Admin | Obter uma única denúncia |
| `/api/admin/reports/[id]` | PUT | Admin | Atualizar status e resolução da denúncia |

## Endpoints Públicos

### Enviar uma Denúncia

```
POST /api/reports
```

Usuários autenticados podem denunciar itens ou comentários por conteúdo inapropriado. Cada usuário só pode denunciar o mesmo conteúdo uma vez (prevenção de duplicatas via verificação `hasUserReportedContent`). Usuários bloqueados (suspensos ou banidos) são impedidos de enviar denúncias.

**Autenticação:** Obrigatória (baseada em sessão)

**Corpo da solicitação:**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `contentType` | string | Sim | Tipo de conteúdo: `"item"` ou `"comment"` |
| `contentId` | string | Sim | ID ou slug do conteúdo sendo denunciado |
| `reason` | string | Sim | Um dos seguintes: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |
| `details` | string | Não | Contexto adicional sobre a denúncia |

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Respostas de Erro:**

| Status | Condição |
|---|---|
| 400 | Tipo de conteúdo inválido, ID de conteúdo ausente ou motivo inválido |
| 401 | Usuário não autenticado |
| 403 | Perfil de cliente obrigatório, ou usuário está suspenso/banido |
| 404 | Perfil de cliente não encontrado |
| 409 | Usuário já denunciou este conteúdo |
| 500 | Erro interno do servidor |

**Fonte:** `template/app/api/reports/route.ts`

## Endpoints de Administração

Todos os endpoints de administração requerem que `session.user.isAdmin` seja `true`.

### Listar Denúncias

```
GET /api/admin/reports
```

Retorna uma lista paginada de denúncias de conteúdo com informações do denunciante. Suporta filtragem por status, tipo de conteúdo e motivo, além de pesquisa de texto em ID do conteúdo, detalhes e nome/e-mail do denunciante.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | integer | 1 | Número da página (mínimo 1) |
| `limit` | integer | 10 | Resultados por página (1-100) |
| `search` | string | - | Pesquisar por ID do conteúdo, detalhes, nome/e-mail do denunciante |
| `status` | string | - | Filtro: `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `contentType` | string | - | Filtro: `"item"`, `"comment"` |
| `reason` | string | - | Filtro: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**Fonte:** `template/app/api/admin/reports/route.ts`

### Obter Estatísticas de Denúncias

```
GET /api/admin/reports/stats
```

Retorna estatísticas agregadas sobre denúncias, incluindo contagens por status, tipo de conteúdo e motivo.

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**Fonte:** `template/app/api/admin/reports/stats/route.ts`

### Obter Denúncia por ID

```
GET /api/admin/reports/[id]
```

Recupera uma única denúncia com detalhes completos, incluindo informações do denunciante e do revisor.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | string | ID da denúncia |

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

| Status | Condição |
|---|---|
| 403 | Não é administrador |
| 404 | Denúncia não encontrada |

**Fonte:** `template/app/api/admin/reports/[id]/route.ts`

### Atualizar Denúncia

```
PUT /api/admin/reports/[id]
```

Atualiza o status, a resolução e a nota de revisão de uma denúncia. Quando uma resolução é definida, o sistema executa automaticamente a ação de moderação correspondente (remoção de conteúdo, aviso ao usuário, suspensão ou banimento).

**Corpo da solicitação:**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | string | Não | `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `resolution` | string | Não | `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"` |
| `reviewNote` | string | Não | Notas do administrador sobre a revisão |

**Ações de Moderação por Resolução:**

As seguintes ações automáticas são disparadas com base no valor da resolução:

| Resolução | Ação |
|---|---|
| `content_removed` | Chama `removeContent()` para remover o item ou comentário denunciado |
| `user_warned` | Chama `warnUser()` para emitir um aviso ao proprietário do conteúdo |
| `user_suspended` | Chama `suspendUser()` para suspender a conta do proprietário do conteúdo |
| `user_banned` | Chama `banUser()` para banir permanentemente o proprietário do conteúdo |
| `no_action` | Nenhuma ação de moderação é tomada |

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

| Status | Condição |
|---|---|
| 400 | Valor de status ou resolução inválido; proprietário do conteúdo não encontrado para ações a nível de usuário |
| 403 | Não é administrador |
| 404 | Denúncia não encontrada |

**Fonte:** `template/app/api/admin/reports/[id]/route.ts`

## Modelo de Dados

As denúncias utilizam os seguintes enums definidos em `lib/db/schema`:

- **ReportContentType:** `"item"`, `"comment"`
- **ReportReason:** `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`
- **ReportStatus:** `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`
- **ReportResolution:** `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`

## Integração com Moderação

Quando uma denúncia é resolvida com uma resolução a nível de usuário (`user_warned`, `user_suspended`, `user_banned`), o sistema:

1. Busca o proprietário do conteúdo via `getContentOwner()`
2. Executa a função de moderação apropriada de `lib/services/moderation.service`
3. Usa o `reviewNote` como motivo para a ação de moderação
4. Registra o ID do administrador como revisor

Se a ação de moderação falhar, a atualização da denúncia ainda é bem-sucedida, mas a falha é registrada. O campo `moderationResult` na resposta indica se a ação foi bem-sucedida.
