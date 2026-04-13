---
id: admin-notifications-endpoints
title: Endpoints de Notificações do Admin
sidebar_label: Notificações do Admin
sidebar_position: 33
---

# Endpoints de Notificações do Admin

A API de Notificações do Admin gerencia notificações in-app para usuários administradores. Suporta listagem de notificações com contagens de não lidas, criação de novas notificações para usuários específicos e marcação de notificações como lidas (individualmente ou em massa). As notificações são armazenadas no banco de dados e associadas a usuários individuais.

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/notifications` | Administrador | Listar notificações do admin atual |
| `POST` | `/api/admin/notifications` | Autenticado | Criar nova notificação |
| `PATCH` | `/api/admin/notifications/{id}/read` | Autenticado | Marcar notificação como lida |
| `PATCH` | `/api/admin/notifications/mark-all-read` | Autenticado | Marcar todas as notificações como lidas |

## Autenticação

Os endpoints de notificação usam dois níveis de autenticação:

**Somente Admin (GET lista):** Requer autenticação e função de administrador.

**Usuário autenticado (POST, PATCH):** Requer sessão válida, mas não exige função de administrador. Os endpoints de marcar como lida são associados às notificações do próprio usuário autenticado.

## Endpoints

### GET `/api/admin/notifications`

Retorna as últimas 50 notificações do usuário administrador autenticado, ordenadas por data de criação (mais recentes primeiro). Também retorna a contagem total de notificações não lidas.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123abc",
        "userId": "user_456def",
        "type": "item_approved",
        "title": "Item Approved",
        "message": "Your item 'Awesome Tool' has been approved and is now live.",
        "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**Detalhes de comportamento:**
- Máximo de 50 notificações retornadas por requisição
- Resultados ordenados por `createdAt` decrescente (mais recentes primeiro)
- `unreadCount` calculado separadamente contando notificações onde `isRead = false`
- Notificações são associadas ao ID do usuário autenticado

### POST `/api/admin/notifications`

Cria uma nova notificação para um usuário específico. O campo `data` aceita um objeto que será convertido para JSON antes do armazenamento. Este endpoint não requer privilégios de administrador -- qualquer usuário autenticado pode criar notificações (geralmente chamado internamente pelo sistema).

**Corpo da solicitação:**

```json
{
  "type": "item_approved",
  "title": "Item Approved",
  "message": "Your item 'Awesome Tool' has been approved and is now live.",
  "userId": "user_456def",
  "data": {
    "itemId": "item_789ghi",
    "itemName": "Awesome Tool",
    "action": "approved"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | string | Sim | Identificador do tipo de notificação (ex.: `"item_approved"`, `"comment_received"`) |
| `title` | string | Sim | Título curto da notificação |
| `message` | string | Sim | Mensagem completa da notificação |
| `userId` | string | Sim | ID do usuário destinatário |
| `data` | objeto | Não | Metadados adicionais (convertidos para JSON no armazenamento) |

**Resposta (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\", \"action\": \"approved\"}",
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/{id}/read`

Marca uma notificação específica como lida. Define `isRead` como `true`, registra o timestamp atual em `readAt` e atualiza `updatedAt`. Apenas o proprietário da notificação pode marcar suas próprias notificações -- a consulta filtra por ID da notificação e ID do usuário autenticado.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | Identificador único da notificação |

**Resposta (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "isRead": true,
    "readAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/mark-all-read`

Marca todas as notificações não lidas do usuário autenticado como lidas em uma única operação em massa. Atualiza `isRead`, `readAt` e `updatedAt` para cada notificação correspondente. Retorna a contagem de notificações atualizadas.

**Resposta (200):**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**Detalhes de comportamento:**
- Atualiza apenas notificações onde `isRead = false` para o usuário atual
- `updatedCount` pode ser `0` se não houver notificações não lidas
- Todas as notificações correspondentes são atualizadas em uma única consulta ao banco de dados

## Modelo de dados de notificação

| Campo | Tipo | Anulável | Descrição |
|-------|------|----------|-----------|
| `id` | string | Não | Identificador único da notificação |
| `userId` | string | Não | ID do usuário receptor |
| `type` | string | Não | Tipo da notificação (ex.: `"item_approved"`, `"comment_received"`) |
| `title` | string | Não | Título curto de exibição |
| `message` | string | Não | Mensagem completa da notificação |
| `data` | string | Sim | Metadados adicionais em formato JSON |
| `isRead` | booleano | Não | Se a notificação foi lida |
| `readAt` | datetime | Sim | Timestamp de quando foi marcada como lida |
| `createdAt` | datetime | Não | Timestamp de criação |
| `updatedAt` | datetime | Sim | Timestamp da última atualização |

## Códigos de erro

| Status | Erro | Causa |
|--------|------|-------|
| `400` | Campos obrigatórios ausentes | POST sem type, title, message ou userId |
| `400` | ID da notificação é obrigatório | PATCH com parâmetro ID vazio |
| `401` | Não autorizado | Sem sessão ativa |
| `403` | Proibido | Usuário não administrador no endpoint GET lista |
| `404` | Notificação não encontrada | ID inválido ou notificação pertencente a outro usuário |
| `500` | Erro interno do servidor | Falha no banco de dados ou servidor |

## Tipos comuns de notificação

O campo `type` é uma string livre, mas os seguintes valores são comumente utilizados:

| Tipo | Descrição |
|------|-----------|
| `item_approved` | Um item foi aprovado por um administrador |
| `item_rejected` | Um item foi rejeitado |
| `comment_received` | Um novo comentário foi publicado em um item |
| `submission_received` | Uma nova submissão de item foi recebida |

## Documentação relacionada

- [Visão geral dos Endpoints de Admin](./admin-endpoints.md)
- [Padrões de Resposta](./response-patterns.md)
- [Validação de Requisições](./request-validation.md)
