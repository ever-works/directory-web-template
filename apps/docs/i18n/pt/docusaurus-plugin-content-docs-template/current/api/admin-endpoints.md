---
id: admin-endpoints
title: Endpoints da API de Admin
sidebar_label: Endpoints de Admin
sidebar_position: 1
---

# Endpoints da API de Admin

A API de admin contém aproximadamente 60 handlers de rota distribuídos em 19 grupos de recursos. Todos os endpoints de admin são protegidos pelo middleware `withAdminAuth`, que verifica tanto a autenticação quanto a atribuição de função de administrador via consulta ao banco de dados.

## Autenticação

Cada endpoint de admin requer:

1. Uma sessão JWT válida (verificada via `auth()`)
2. Uma função de administrador na tabela `user_roles` (verificada via `isAdmin()` de `lib/db/roles.ts`)

Solicitações não autenticadas recebem uma resposta `401`. Solicitações autenticadas mas sem privilégios de administrador recebem uma resposta `403`.

## Grupos de Recursos

### Categorias (`/api/admin/categories`)

Gerenciar categorias de conteúdo com persistência baseada em Git.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/categories` | Listar categorias com paginação |
| `POST` | `/api/admin/categories` | Criar uma nova categoria |
| `GET` | `/api/admin/categories/all` | Obter todas as categorias (sem paginação) |
| `POST` | `/api/admin/categories/git` | Sincronizar categorias com repositório Git |
| `POST` | `/api/admin/categories/reorder` | Reordenar posições das categorias |
| `GET` | `/api/admin/categories/[id]` | Obter categoria por ID |
| `PUT` | `/api/admin/categories/[id]` | Atualizar categoria |
| `DELETE` | `/api/admin/categories/[id]` | Excluir categoria |

### Clientes (`/api/admin/clients`)

Gerenciar contas de usuários clientes e perfis.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/clients` | Listar perfis de clientes com paginação |
| `POST` | `/api/admin/clients/advanced-search` | Pesquisa avançada de clientes com filtros |
| `POST` | `/api/admin/clients/bulk` | Operações em massa em clientes |
| `GET` | `/api/admin/clients/dashboard` | Estatísticas do painel de clientes |
| `GET` | `/api/admin/clients/stats` | Estatísticas agregadas de clientes |
| `GET` | `/api/admin/clients/[clientId]` | Obter detalhes do perfil do cliente |
| `PUT` | `/api/admin/clients/[clientId]` | Atualizar perfil de cliente |
| `DELETE` | `/api/admin/clients/[clientId]` | Excluir conta de cliente |

### Coleções (`/api/admin/collections`)

Gerenciar coleções curadas de itens.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/collections` | Listar todas as coleções |
| `POST` | `/api/admin/collections` | Criar uma nova coleção |
| `GET` | `/api/admin/collections/[id]` | Obter detalhes da coleção |
| `PUT` | `/api/admin/collections/[id]` | Atualizar coleção |
| `DELETE` | `/api/admin/collections/[id]` | Excluir coleção |
| `GET` | `/api/admin/collections/[id]/items` | Listar itens de uma coleção |
| `PUT` | `/api/admin/collections/[id]/items` | Atualizar itens da coleção |

### Comentários (`/api/admin/comments`)

Moderar comentários de usuários.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/comments` | Listar comentários com filtros de moderação |
| `GET` | `/api/admin/comments/[id]` | Obter detalhes do comentário |
| `PUT` | `/api/admin/comments/[id]` | Atualizar comentário (aprovar/rejeitar) |
| `DELETE` | `/api/admin/comments/[id]` | Excluir comentário |

### Empresas (`/api/admin/companies`)

Gerenciar perfis de empresas vinculados a itens.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/companies` | Listar empresas |
| `POST` | `/api/admin/companies` | Criar empresa |
| `GET` | `/api/admin/companies/[id]` | Obter detalhes da empresa |
| `PUT` | `/api/admin/companies/[id]` | Atualizar empresa |
| `DELETE` | `/api/admin/companies/[id]` | Excluir empresa |

### Painel (`/api/admin/dashboard`)

Análises agregadas do painel.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/dashboard/stats` | Estatísticas resumidas do painel |

### Itens em Destaque (`/api/admin/featured-items`)

Gerenciar destaques de itens em evidência.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/featured-items` | Listar itens em destaque |
| `POST` | `/api/admin/featured-items` | Destacar um item |
| `GET` | `/api/admin/featured-items/[id]` | Obter detalhes do item em destaque |
| `PUT` | `/api/admin/featured-items/[id]` | Atualizar configurações do item em destaque |
| `DELETE` | `/api/admin/featured-items/[id]` | Remover dos destaques |

### Análise Geográfica (`/api/admin/geo-analytics`)

Análise geográfica e dados de distribuição de visitantes.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/geo-analytics` | Obter dados de análise geográfica |

### Itens (`/api/admin/items`)

Gerenciamento completo do conteúdo de itens.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/items` | Listar itens com filtros e paginação |
| `POST` | `/api/admin/items` | Criar um novo item |
| `POST` | `/api/admin/items/bulk` | Operações em massa de itens (aprovar, rejeitar, excluir) |
| `GET` | `/api/admin/items/stats` | Estatísticas agregadas de itens |
| `GET` | `/api/admin/items/[id]` | Obter detalhes do item |
| `PUT` | `/api/admin/items/[id]` | Atualizar item |
| `DELETE` | `/api/admin/items/[id]` | Excluir item |
| `GET` | `/api/admin/items/[id]/history` | Obter histórico de auditoria do item |
| `POST` | `/api/admin/items/[id]/review` | Enviar revisão do item (aprovar/rejeitar) |

### Índice de Localização (`/api/admin/location-index`)

Gerenciar a indexação de pesquisa de localização geográfica.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `POST` | `/api/admin/location-index` | Reconstruir índice de pesquisa de localização |

### Navegação (`/api/admin/navigation`)

Configuração de navegação do admin.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/navigation` | Obter estrutura de navegação |
| `PUT` | `/api/admin/navigation` | Atualizar navegação |

### Notificações (`/api/admin/notifications`)

Gerenciamento de notificações do admin.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/notifications` | Listar notificações do admin |
| `POST` | `/api/admin/notifications/mark-all-read` | Marcar todas as notificações como lidas |
| `POST` | `/api/admin/notifications/[id]/read` | Marcar uma notificação como lida |

### Relatórios (`/api/admin/reports`)

Gerenciamento e moderação de relatórios de conteúdo.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/reports` | Listar relatórios de conteúdo |
| `GET` | `/api/admin/reports/stats` | Estatísticas de relatórios |
| `GET` | `/api/admin/reports/[id]` | Obter detalhes do relatório |
| `PUT` | `/api/admin/reports/[id]` | Atualizar status do relatório (resolver, descartar) |

### Funções (`/api/admin/roles`)

Gerenciamento de funções e permissões para RBAC.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/roles` | Listar funções com paginação |
| `POST` | `/api/admin/roles` | Criar uma nova função |
| `GET` | `/api/admin/roles/active` | Obter apenas funções ativas |
| `GET` | `/api/admin/roles/stats` | Estatísticas de funções |
| `GET` | `/api/admin/roles/[id]` | Obter detalhes da função |
| `PUT` | `/api/admin/roles/[id]` | Atualizar função |
| `DELETE` | `/api/admin/roles/[id]` | Excluir função (exclusão soft) |
| `GET` | `/api/admin/roles/[id]/permissions` | Obter permissões da função |
| `PUT` | `/api/admin/roles/[id]/permissions` | Atualizar permissões da função |

### Configurações (`/api/admin/settings`)

Gerenciamento de configurações da aplicação.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/settings` | Obter todas as configurações |
| `PUT` | `/api/admin/settings` | Atualizar configurações |
| `GET` | `/api/admin/settings/map-status` | Obter status do recurso de mapa |

### Anúncios Patrocinados (`/api/admin/sponsor-ads`)

Moderação de anúncios patrocinados.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/sponsor-ads` | Listar anúncios patrocinados |
| `GET` | `/api/admin/sponsor-ads/[id]` | Obter detalhes do anúncio |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Atualizar anúncio |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Aprovar anúncio patrocinado |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Rejeitar anúncio patrocinado |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Cancelar anúncio patrocinado |

### Tags (`/api/admin/tags`)

Gerenciamento de tags de conteúdo.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/tags` | Listar tags com paginação |
| `POST` | `/api/admin/tags` | Criar uma nova tag |
| `GET` | `/api/admin/tags/all` | Obter todas as tags (sem paginação) |
| `GET` | `/api/admin/tags/[id]` | Obter detalhes da tag |
| `PUT` | `/api/admin/tags/[id]` | Atualizar tag |
| `DELETE` | `/api/admin/tags/[id]` | Excluir tag |

### Twenty CRM (`/api/admin/twenty-crm`)

Configuração e teste de integração com CRM.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/twenty-crm/config` | Obter configuração do CRM |
| `PUT` | `/api/admin/twenty-crm/config` | Atualizar configuração do CRM |
| `POST` | `/api/admin/twenty-crm/test-connection` | Testar conexão com CRM |

### Usuários (`/api/admin/users`)

Gerenciamento de usuários do admin.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/admin/users` | Listar usuários com paginação |
| `POST` | `/api/admin/users` | Criar um novo usuário |
| `GET` | `/api/admin/users/stats` | Estatísticas de usuários |
| `GET` | `/api/admin/users/check-email` | Verificar disponibilidade de e-mail |
| `GET` | `/api/admin/users/check-username` | Verificar disponibilidade de nome de usuário |
| `GET` | `/api/admin/users/[id]` | Obter detalhes do usuário |
| `PUT` | `/api/admin/users/[id]` | Atualizar usuário |
| `DELETE` | `/api/admin/users/[id]` | Excluir usuário |

## Padrões Comuns

### Operações em Massa

Vários recursos suportam operações em massa via POST com um array de IDs:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Endpoints de Estatísticas

A maioria dos grupos de recursos inclui um endpoint `/stats` retornando contagens agregadas:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### Histórico de Auditoria

Os itens suportam rastreamento de histórico de auditoria via endpoint `/[id]/history`, registrando quem fez alterações e quando.
