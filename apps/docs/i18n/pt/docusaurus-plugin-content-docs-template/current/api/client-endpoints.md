---
id: client-endpoints
title: Endpoints de API do Cliente
sidebar_label: Endpoints do Cliente
sidebar_position: 2
---

# Endpoints de API do Cliente

Os endpoints de API voltados ao cliente atendem usuários autenticados (não administradores). Essas rotas gerenciam o painel do cliente, envio de itens, gerenciamento de favoritos e interações públicas com itens como comentários, votos e visualizações.

## Painel e Itens do Cliente (`/api/client`)

Todas as rotas `/api/client/*` requerem uma sessão autenticada com um `clientProfileId` válido.

### Painel

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/client/dashboard/stats` | Estatísticas do painel do cliente (contagem de itens, visualizações, engajamento) |

### Itens do Cliente

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/client/items` | Listar itens enviados pelo cliente atual |
| `POST` | `/api/client/items` | Enviar novo item para revisão |
| `GET` | `/api/client/items/stats` | Estatísticas de itens do cliente (publicados, pendentes, rejeitados) |
| `GET` | `/api/client/items/coordinates` | Obter coordenadas dos itens do cliente |
| `GET` | `/api/client/items/[id]` | Obter detalhes do item |
| `PUT` | `/api/client/items/[id]` | Atualizar próprio item |
| `DELETE` | `/api/client/items/[id]` | Excluir próprio item (soft delete) |
| `POST` | `/api/client/items/[id]/restore` | Restaurar item excluído (soft delete) |

### Estatísticas Geográficas

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/client/geo-stats` | Estatísticas geográficas dos itens do cliente |

## Interações Públicas com Itens (`/api/items`)

Esses endpoints gerenciam recursos de itens voltados ao público. Alguns requerem autenticação (ex.: votar), enquanto outros são totalmente públicos (ex.: visualizar).

### Comentários

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `GET` | `/api/items/[slug]/comments` | Listar comentários de um item | Público |
| `POST` | `/api/items/[slug]/comments` | Adicionar comentário | Obrigatória |
| `GET` | `/api/items/[slug]/comments/[commentId]` | Obter detalhes do comentário | Público |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Atualizar próprio comentário | Obrigatória |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Excluir próprio comentário | Obrigatória |

### Avaliações de Comentários

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `GET` | `/api/items/[slug]/comments/rating` | Obter resumo de avaliações | Público |
| `POST` | `/api/items/[slug]/comments/rating` | Enviar avaliação | Obrigatória |
| `GET` | `/api/items/[slug]/comments/rating/[commentId]` | Obter avaliação de um comentário | Público |

### Votos

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `GET` | `/api/items/[slug]/votes/count` | Obter contagem de votos | Público |
| `GET` | `/api/items/[slug]/votes/status` | Obter status de voto do usuário atual | Obrigatória |
| `POST` | `/api/items/[slug]/votes` | Votar em um item (positivo/negativo) | Obrigatória |

### Visualizações

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `POST` | `/api/items/[slug]/views` | Registrar visualização de página | Público |

### Engajamento e Popularidade

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `GET` | `/api/items/engagement` | Obter métricas de engajamento de itens | Público |
| `GET` | `/api/items/popularity-scores` | Obter pontuações de popularidade calculadas | Público |

### Empresa

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `GET` | `/api/items/[slug]/company` | Obter informações da empresa de um item | Público |

## Favoritos (`/api/favorites`)

Gerenciar itens favoritos do usuário. Todos os endpoints de favoritos requerem autenticação.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/favorites` | Listar itens favoritos do usuário atual |
| `POST` | `/api/favorites/[itemSlug]` | Alternar status de favorito para um item |
| `DELETE` | `/api/favorites/[itemSlug]` | Remover item dos favoritos |

## Perfil do Usuário (`/api/user`)

Endpoints de gerenciamento de perfil e assinatura do usuário.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/user/profile/location` | Obter localização detectada do usuário |
| `GET` | `/api/user/currency` | Obter moeda detectada/preferida do usuário |
| `GET` | `/api/user/plan-status` | Obter status do plano de assinatura atual |
| `GET` | `/api/user/subscription` | Obter detalhes da assinatura |
| `GET` | `/api/user/payments` | Obter histórico de pagamentos |

## Usuário Atual (`/api/current-user`)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/current-user` | Obter dados da sessão do usuário autenticado |

## Anúncios Patrocinados — Usuário (`/api/sponsor-ads/user`)

Endpoints para usuários gerenciarem seus próprios anúncios patrocinados.

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/sponsor-ads/user` | Listar anúncios patrocinados do usuário |
| `GET` | `/api/sponsor-ads/user/stats` | Estatísticas de desempenho de anúncios do usuário |
| `GET` | `/api/sponsor-ads/user/[id]` | Obter detalhes do anúncio |
| `PUT` | `/api/sponsor-ads/user/[id]` | Atualizar próprio anúncio |
| `POST` | `/api/sponsor-ads/user/[id]/cancel` | Cancelar próprio anúncio |
| `POST` | `/api/sponsor-ads/user/[id]/renew` | Renovar anúncio expirado |

## Pesquisas (`/api/surveys`)

Gerenciamento de pesquisas e coleta de respostas.

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `GET` | `/api/surveys` | Listar pesquisas publicadas | Público |
| `GET` | `/api/surveys/[surveyId]` | Obter detalhes da pesquisa | Público |
| `POST` | `/api/surveys/[surveyId]/responses` | Enviar resposta de pesquisa | Público |
| `GET` | `/api/surveys/responses/[responseId]` | Obter detalhes da resposta | Obrigatória |

## Relatórios (`/api/reports`)

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| `POST` | `/api/reports` | Enviar relatório de conteúdo | Obrigatória |

## Endpoints de Dados Públicos

Esses endpoints não requerem autenticação:

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/categories/exists` | Verificar se um slug de categoria existe |
| `GET` | `/api/collections/exists` | Verificar se um slug de coleção existe |
| `GET` | `/api/featured-items` | Listar itens em destaque |
| `GET` | `/api/sponsor-ads` | Obter anúncios patrocinados ativos para exibição |
| `POST` | `/api/sponsor-ads/checkout` | Iniciar checkout de anúncio patrocinado |

## Padrões de Paginação

Os endpoints de lista voltados ao cliente suportam os parâmetros de paginação padrão:

```
GET /api/client/items?page=1&limit=10&sort=createdAt&order=desc
GET /api/items/[slug]/comments?page=1&limit=20
GET /api/favorites?page=1&limit=50
```

As respostas incluem metadados de paginação:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```
