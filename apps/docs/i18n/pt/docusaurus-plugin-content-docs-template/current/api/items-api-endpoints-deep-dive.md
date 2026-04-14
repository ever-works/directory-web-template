---
id: items-api-endpoints-deep-dive
title: Análise Aprofundada dos Endpoints da API de Itens
sidebar_label: Análise Aprofundada da API de Itens
sidebar_position: 65
---

# Análise Aprofundada dos Endpoints da API de Itens

A API de Itens fornece endpoints voltados ao público para interagir com itens, incluindo comentários, votos, rastreamento de visualizações, associações de empresas e métricas de engajamento. Esses endpoints alimentam as principais funcionalidades voltadas ao usuário do site de diretório.

**Diretório de origem:** `template/app/api/items/`

---

## Mapa de Rotas

| Método | Caminho | Autenticação | Descrição |
|--------|---------|-------------|----------|
| `GET` | `/api/items/{slug}/comments` | Público | Listar comentários do item |
| `POST` | `/api/items/{slug}/comments` | Sessão | Criar um comentário |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Sessão (proprietário) | Atualizar um comentário |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Sessão (proprietário) | Excluir um comentário |
| `GET` | `/api/items/{slug}/comments/rating` | Público | Obter estatísticas de avaliação |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Público | Obter avaliação de comentário único |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Público | Atualizar avaliação de comentário |
| `GET` | `/api/items/{slug}/company` | Admin | Obter empresa do item |
| `POST` | `/api/items/{slug}/company` | Admin | Atribuir empresa ao item |
| `DELETE` | `/api/items/{slug}/company` | Admin | Remover empresa do item |
| `POST` | `/api/items/{slug}/views` | Público | Registrar visualização do item |
| `GET` | `/api/items/{slug}/votes` | Público | Obter info de voto + status do usuário |
| `POST` | `/api/items/{slug}/votes` | Sessão | Registrar ou atualizar voto |
| `DELETE` | `/api/items/{slug}/votes` | Sessão | Remover voto |
| `GET` | `/api/items/{slug}/votes/count` | Público | Obter apenas a contagem de votos |
| `GET` | `/api/items/{slug}/votes/status` | Sessão | Obter registro de voto do usuário |
| `GET` | `/api/items/engagement` | Público | Métricas de engajamento em lote |
| `GET` | `/api/items/popularity-scores` | Público | Depurar pontuações de popularidade |

---

## Comentários

### Listar Comentários

Retorna todos os comentários de um item específico, incluindo informações do perfil do usuário.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/{slug}/comments` |
| **Autenticação** | Nenhuma (público) |
| **Origem** | `items/[slug]/comments/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

#### Exemplo com curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments
```

---

### Criar Comentário

Cria um novo comentário com avaliação para um item.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/items/{slug}/comments` |
| **Autenticação** | Sessão (usuário com perfil de cliente) |
| **Origem** | `items/[slug]/comments/route.ts` |

#### Corpo da Solicitação

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|----------|
| `content` | `string` | Sim | Texto do comentário (não pode estar vazio) |
| `rating` | `integer` | Sim | Avaliação de 1 a 5 |

#### Respostas

| Status | Descrição |
|--------|----------|
| 200 | Comentário criado com sucesso |
| 400 | Conteúdo ou avaliação inválidos |
| 401 | Autenticação obrigatória |
| 403 | Usuário bloqueado (suspenso ou banido) |
| 404 | Perfil de cliente não encontrado |
| 500 | Erro no servidor |

**Status 200**

```json
{
  "success": true,
  "comment": {
    "id": "comment_new123",
    "content": "This tool is excellent for team collaboration!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "awesome-productivity-tool",
    "createdAt": "2024-01-21T14:00:00.000Z",
    "updatedAt": "2024-01-21T14:00:00.000Z",
    "deletedAt": null,
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

#### Exemplo com curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "content": "Great tool!", "rating": 5 }'
```

:::note Moderação
Usuários bloqueados (suspensos ou banidos) recebem uma resposta 403 com uma mensagem explicando seu status de bloqueio. A verificação `isUserBlocked()` é realizada usando o campo de status do perfil do cliente.
:::

---

### Atualizar Comentário

Atualiza o conteúdo e/ou a avaliação de um comentário. Somente o autor do comentário pode atualizá-lo.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `PUT` |
| **Caminho** | `/api/items/{slug}/comments/{commentId}` |
| **Autenticação** | Sessão (proprietário do comentário) |
| **Origem** | `items/[slug]/comments/[commentId]/route.ts` |

#### Corpo da Solicitação

Pelo menos um campo deve ser fornecido:

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

| Campo | Tipo | Obrigatório | Restrições |
|-------|------|------------|-----------|
| `content` | `string` | Não | 1-1000 caracteres |
| `rating` | `integer` | Não | 1-5 |

#### Resposta

**Status 200** — Retorna o comentário atualizado com informações do usuário e um timestamp `editedAt`.

```json
{
  "id": "comment_123abc",
  "content": "Updated review text.",
  "rating": 4,
  "userId": "client_456def",
  "itemId": "awesome-productivity-tool",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:00:00.000Z",
  "editedAt": "2024-01-21T15:00:00.000Z",
  "deletedAt": null,
  "user": {
    "id": "client_456def",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "image": "https://example.com/avatars/john.jpg"
  }
}
```

---

### Excluir Comentário

Exclui suavemente um comentário. Somente o autor do comentário pode excluí-lo.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `DELETE` |
| **Caminho** | `/api/items/{slug}/comments/{commentId}` |
| **Autenticação** | Sessão (proprietário do comentário) |
| **Origem** | `items/[slug]/comments/[commentId]/route.ts` |

#### Resposta

**Status 204** — Sem conteúdo (comentário excluído com sucesso).

| Status | Descrição |
|--------|----------|
| 204 | Comentário excluído |
| 401 | Não autorizado |
| 404 | Comentário não encontrado ou sem autorização |

#### Exemplo com curl

```bash
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/comments/comment_123 \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obter Estatísticas de Avaliação

Retorna estatísticas de avaliação agregadas para um item: avaliação média e contagem total.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/{slug}/comments/rating` |
| **Autenticação** | Nenhuma (público) |
| **Origem** | `items/[slug]/comments/rating/route.ts` |

#### Resposta

**Status 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

| Campo | Tipo | Descrição |
|-------|------|----------|
| `averageRating` | `number` | Avaliação média (0 se não houver avaliações, máx. 5) |
| `totalRatings` | `number` | Total de comentários não excluídos com avaliações |

#### Exemplo com curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments/rating
```

---

### Obter/Atualizar Avaliação de Comentário Único

#### Obter Avaliação do Comentário

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Autenticação** | Nenhuma (público) |

Retorna o objeto completo do comentário para um ID de comentário específico.

#### Atualizar Avaliação do Comentário

| Propriedade | Valor |
|-------------|-------|
| **Método** | `PATCH` |
| **Caminho** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Autenticação** | Nenhuma |

**Corpo da Solicitação:**
```json
{
  "rating": 4
}
```

Retorna o objeto do comentário atualizado.

---

## Associação de Empresa

Endpoints exclusivos para administradores para gerenciar o relacionamento entre itens e empresas.

### Obter Empresa do Item

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/{slug}/company` |
| **Autenticação** | Admin |
| **Origem** | `items/[slug]/company/route.ts` |

#### Resposta

**Status 200** — Empresa encontrada.

```json
{
  "success": true,
  "data": {
    "id": "company_123",
    "name": "Acme Corp",
    "website": "https://acme.com"
  }
}
```

**Status 200** — Nenhuma empresa atribuída.

```json
{
  "success": true,
  "data": null
}
```

---

### Atribuir Empresa ao Item

Atribui uma empresa a um item. Esta operação é idempotente.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/items/{slug}/company` |
| **Autenticação** | Admin |
| **Origem** | `items/[slug]/company/route.ts` |

#### Corpo da Solicitação

```json
{
  "companyId": "company_123"
}
```

#### Respostas

**Status 201** — Nova associação criada.

```json
{
  "success": true,
  "data": { /* objeto de associação */ },
  "created": true,
  "updated": false
}
```

**Status 200** — Associação existente atualizada.

```json
{
  "success": true,
  "data": { /* objeto de associação */ },
  "created": false,
  "updated": true
}
```

**Status 409** — Item já vinculado a outra empresa.

```json
{
  "error": "Item is already linked to another company"
}
```

---

### Remover Empresa do Item

Remove a associação de empresa de um item. Esta operação é idempotente.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `DELETE` |
| **Caminho** | `/api/items/{slug}/company` |
| **Autenticação** | Admin |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### Exemplo com curl

```bash
# Atribuir empresa
curl -s -X POST http://localhost:3000/api/items/awesome-tool/company \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin_session>" \
  -d '{ "companyId": "company_123" }'

# Remover empresa
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/company \
  -H "Cookie: next-auth.session-token=<admin_session>"
```

---

## Visualizações

### Registrar Visualização do Item

Registra uma visualização diária única para um item com deduplicação integrada, detecção de bots e exclusão do proprietário.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/items/{slug}/views` |
| **Autenticação** | Nenhuma (público) |
| **Origem** | `items/[slug]/views/route.ts` |

#### Fluxo de Processamento

1. **Verificação do banco de dados** — verifica a disponibilidade do banco de dados.
2. **Detecção de bots** — rejeita user agents de bots conhecidos.
3. **Validação do item** — confirma que o item existe (retorna 404 se não encontrado).
4. **Exclusão do proprietário** — se autenticado, ignora a contagem se o visualizador for o proprietário do item.
5. **ID do visualizador** — lê ou cria um cookie de visualizador (`VIEWER_COOKIE_NAME`) para rastreamento anônimo.
6. **Deduplicação diária** — registra a visualização apenas uma vez por visualizador por dia.

#### Resposta

**Status 200** — Visualização processada.

```json
{ "success": true, "counted": true }
```

| Cenário | `counted` | `reason` |
|---------|-----------|----------|
| Nova visualização registrada | `true` | — |
| Visualização duplicada (mesmo dia) | `false` | — |
| Bot detectado | `false` | `"bot"` |
| Proprietário visualizando seu item | `false` | `"owner"` |

**Status 404** — Item não encontrado.

```json
{ "success": false, "error": "Item not found" }
```

#### Exemplo com curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/views \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

### Notas de Implementação

- O cookie do visualizador é `HttpOnly`, `Secure` em produção e tem `SameSite: lax`.
- A deduplicação de visualizações é baseada em `(itemId, viewerId, viewedDateUtc)` onde a data é `YYYY-MM-DD` em UTC.
- O utilitário `isBot()` verifica o user agent em relação a padrões de bots conhecidos.

---

## Votos

### Obter Informações de Voto

Retorna a contagem total de votos e o status de voto do usuário atual (se autenticado).

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/{slug}/votes` |
| **Autenticação** | Nenhuma (público; status do usuário requer sessão) |
| **Origem** | `items/[slug]/votes/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Campo | Tipo | Descrição |
|-------|------|----------|
| `count` | `number` | Contagem líquida de votos (votos positivos - votos negativos) |
| `userVote` | `"up" \| "down" \| null` | Voto do usuário (`null` se não autenticado ou sem voto) |

---

### Registrar ou Atualizar Voto

Registra um novo voto ou substitui um voto existente.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/items/{slug}/votes` |
| **Autenticação** | Sessão (usuário com perfil de cliente) |
| **Origem** | `items/[slug]/votes/route.ts` |

#### Corpo da Solicitação

```json
{
  "type": "up"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|----------|
| `type` | `string` | Sim | Tipo de voto: `"up"` ou `"down"` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

| Status | Descrição |
|--------|----------|
| 200 | Voto registrado com sucesso |
| 400 | Tipo de voto inválido |
| 401 | Não autorizado |
| 403 | Usuário bloqueado (suspenso/banido) |
| 404 | Perfil de cliente não encontrado |

#### Exemplo com curl

```bash
# Voto positivo
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "up" }'

# Voto negativo
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "down" }'
```

---

### Remover Voto

Remove o voto do usuário atual de um item.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `DELETE` |
| **Caminho** | `/api/items/{slug}/votes` |
| **Autenticação** | Sessão (usuário com perfil de cliente) |
| **Origem** | `items/[slug]/votes/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Obter Contagem de Votos

Um endpoint leve que retorna apenas a contagem de votos (sem status do usuário).

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/{slug}/votes/count` |
| **Autenticação** | Nenhuma (público) |
| **Origem** | `items/[slug]/votes/count/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "count": 15
}
```

---

### Obter Status de Voto do Usuário

Retorna o registro completo de voto para o voto do usuário autenticado em um item específico.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/{slug}/votes/status` |
| **Autenticação** | Sessão (usuário) |
| **Origem** | `items/[slug]/votes/status/route.ts` |

#### Resposta

**Status 200** — Usuário votou.

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Status 200** — Usuário não votou.

```json
null
```

---

## Métricas de Engajamento

### Métricas de Engajamento em Lote

Busca métricas de engajamento (visualizações, votos, avaliações, favoritos, comentários) para múltiplos itens em uma única solicitação.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/engagement` |
| **Autenticação** | Nenhuma (público) |
| **Cache** | `force-dynamic` |
| **Origem** | `items/engagement/route.ts` |

#### Parâmetros de Consulta

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|----------|
| `slugs` | `string` | Sim | Lista separada por vírgulas de slugs de itens (máx. 200) |

#### Resposta

**Status 200**

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1500,
      "votes": 25,
      "avgRating": 4.2,
      "favorites": 12,
      "comments": 8
    },
    "another-tool": {
      "views": 800,
      "votes": 10,
      "avgRating": 3.8,
      "favorites": 5,
      "comments": 3
    }
  }
}
```

#### Respostas de Erro

| Status | Descrição |
|--------|----------|
| 400 | Parâmetro `slugs` ausente ou mais de 200 slugs |

#### Exemplo com curl

```bash
curl -s "http://localhost:3000/api/items/engagement?slugs=awesome-tool,another-tool,third-tool"
```

---

### Pontuações de Popularidade (Depuração)

Um endpoint de depuração que retorna itens ordenados pela pontuação de popularidade calculada, com detalhamento dos fatores de pontuação.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/items/popularity-scores` |
| **Autenticação** | Nenhuma (público) |
| **Cache** | `force-dynamic` |
| **Origem** | `items/popularity-scores/route.ts` |

#### Parâmetros de Consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|------------|--------|----------|
| `limit` | `integer` | Não | `20` | Número de itens a retornar (máx. 100) |
| `locale` | `string` | Não | `"en"` | Idioma para os itens |

#### Resposta

**Status 200**

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Tool",
      "slug": "top-tool",
      "featured": true,
      "score": 15234,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 2500,
        "votes": 1200,
        "rating": 2100,
        "favorites": 900,
        "comments": 234,
        "recency": 300
      },
      "engagement": {
        "views": 5000,
        "votes": 50,
        "avgRating": 4.2,
        "favorites": 30,
        "comments": 15
      },
      "ageInDays": 15
    }
  ]
}
```

#### Algoritmo de Pontuação

A pontuação de popularidade usa escala logarítmica para evitar que outliers dominem:

| Fator | Peso | Fórmula |
|-------|------|---------|
| Bônus de destaque | 10000 | Bônus fixo para itens em destaque |
| Visualizações | 1000 | `log10(views + 1) * 1000` |
| Votos | 1200 | `log10(max(votes, 0) + 1) * 1200` |
| Avaliação média | 500 | `avgRating * 500` |
| Favoritos | 1100 | `log10(favorites + 1) * 1100` |
| Comentários | 1000 | `log10(comments + 1) * 1000` |
| Atualidade | até 1000 | Bônus decrescente para itens com menos de 180 dias |

Itens sem dados de engajamento recebem uma pequena pontuação heurística com base na qualidade dos metadados (contagem de tags, comprimento do nome, presença de ícone, código promocional).

#### Exemplo com curl

```bash
curl -s "http://localhost:3000/api/items/popularity-scores?limit=10&locale=en"
```

---

## Uso em TypeScript

```typescript
// Buscar comentários de um item
const commentsRes = await fetch(`/api/items/${slug}/comments`);
const { comments } = await commentsRes.json();

// Publicar um comentário
const newComment = await fetch(`/api/items/${slug}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Great tool!', rating: 5 }),
}).then(r => r.json());

// Dar voto positivo em um item
const voteRes = await fetch(`/api/items/${slug}/votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'up' }),
}).then(r => r.json());
console.log(`Nova contagem de votos: ${voteRes.count}`);

// Registrar uma visualização
await fetch(`/api/items/${slug}/views`, { method: 'POST' });

// Buscar engajamento em lote para múltiplos itens
const slugList = ['tool-a', 'tool-b', 'tool-c'].join(',');
const { metrics } = await fetch(`/api/items/engagement?slugs=${slugList}`).then(r => r.json());

// Obter estatísticas de avaliação
const { averageRating, totalRatings } = await fetch(
  `/api/items/${slug}/comments/rating`
).then(r => r.json());
```

## Integração com Moderação

Vários endpoints na API de Itens integram-se com o sistema de moderação:

- **Comentários:** O endpoint `POST /api/items/{slug}/comments` verifica se o usuário está bloqueado (suspenso ou banido) antes de permitir a criação de comentários.
- **Votos:** O endpoint `POST /api/items/{slug}/votes` realiza a mesma verificação de bloqueio.
- Usuários bloqueados recebem uma resposta `403` com uma mensagem legível explicando seu status.

A verificação de bloqueio usa `isUserBlocked()` e `getBlockReasonMessage()` de `@/lib/db/queries/moderation.queries`.
