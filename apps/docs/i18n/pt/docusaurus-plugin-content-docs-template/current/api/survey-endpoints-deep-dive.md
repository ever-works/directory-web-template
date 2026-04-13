---
id: survey-endpoints-deep-dive
title: "Referência da API de Pesquisas"
sidebar_label: "Pesquisas (Análise Aprofundada)"
sidebar_position: 56
---

# Referência da API de Pesquisas

Anote detalhada dos endpoints da API de Pesquisas com interfaces TypeScript completas, regras de autenticação, respostas de erro e padrões de implementação.

## Visão Geral de Autenticação

| Endpoint | Autenticação | Papel Requerido |
|----------|--------------|----------------|
| GET `/api/surveys` | Nenhuma | Público |
| POST `/api/surveys` | Obrigatória | Admin |
| GET `/api/surveys/{id}` | Opcional | Admin para não publicado |
| PUT `/api/surveys/{id}` | Obrigatória | Admin |
| DELETE `/api/surveys/{id}` | Obrigatória | Admin |
| GET `/api/surveys/{id}/responses` | Obrigatória | Admin |
| POST `/api/surveys/{id}/responses` | Nenhuma | Público |
| GET `/api/surveys/responses/{id}` | Obrigatória | Admin |

## Interfaces TypeScript

```typescript
type SurveyStatus = "draft" | "published" | "closed";
type SurveyType = "global" | "item";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  type: SurveyType;
  itemId: string | null;
  status: SurveyStatus;
  surveyJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string | null;
  itemId: string | null;
  data: Record<string, unknown>;
  completedAt: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

type BillingInterval = "monthly" | "yearly" | "weekly" | "daily";
```

## Detalhes de Cada Endpoint

### GET `/api/surveys` — Listar pesquisas

Retorna pesquisas paginadas com filtros opcionais.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Obrigatório | Padrão |
|-----------|------|------------|--------|
| `type` | `"global"` ou `"item"` | Não | -- |
| `itemId` | string | Não | -- |
| `status` | `"draft"` \| `"published"` \| `"closed"` | Não | -- |
| `page` | integer | Não | `1` |
| `limit` | integer (1-100) | Não | `10` |

**Resposta (200):**
```typescript
{
  success: true;
  data: {
    surveys: Survey[];
    total: number;
    totalPages: number;
    page: number;
  };
}
```

**Resposta de erro (503 — Banco de dados indisponível):**
```typescript
{
  success: false;
  error: string; // Descrevendo o problema de conexão
}
```

### POST `/api/surveys` — Criar pesquisa

Cria uma nova pesquisa. Requer privilégios de administrador.

**Corpo da solicitação:**
```typescript
{
  title: string;              // Obrigatório
  description?: string;       // Opcional
  type: SurveyType;           // Obrigatório: "global" | "item"
  itemId?: string;            // Opcional; relevante apenas para type: "item"
  status?: SurveyStatus;      // Opcional; padrão geralmente "draft"
  surveyJson: object;         // Obrigatório: estrutura de perguntas/resposta
}
```

**Resposta (201):**
```typescript
{
  success: true;
  data: Survey;
}
```

### GET `/api/surveys/{surveyId}` — Obter pesquisa

Busca por ID ou slug. Pesquisas não publicadas retornam 404 para usuários não-admin.

**Resposta (200):**
```typescript
{ success: true; data: Survey; }
```

**Resposta (401 — Não autenticado para rota de admin):**
```typescript
{ success: false; error: "Unauthorized"; }
```

**Resposta (404 — Não encontrado ou não publicado):**
```typescript
{ success: false; error: "Survey not found"; }
```

### PUT `/api/surveys/{surveyId}` — Atualizar pesquisa

Atualiza campos de uma pesquisa existente. Todos os campos são opcionais.

**Corpo da solicitação:**
```typescript
{
  title?: string;
  description?: string;
  status?: SurveyStatus;
  surveyJson?: object;
}
```

**Resposta (200):**
```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

### DELETE `/api/surveys/{surveyId}` — Excluir pesquisa

**Resposta (200):**
```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### GET `/api/surveys/{surveyId}/responses` — Listar respostas

**Parâmetros de consulta:**

| Parâmetro | Tipo | Descrição |
|-----------|------|----------|
| `itemId` | string | Filtrar por ID de item |
| `userId` | string | Filtrar por ID de usuário |
| `startDate` | string | Data de início do período |
| `endDate` | string | Data de fim do período |
| `page` | integer | Número da página (padrão: 1) |
| `limit` | integer | Itens por página (padrão: 10) |

**Resposta (200):**
```typescript
{
  success: true;
  data: {
    responses: SurveyResponse[];
    total: number;
    totalPages: number;
  };
}
```

### POST `/api/surveys/{surveyId}/responses` — Enviar resposta

Autenticação opcional — aceita envios anônimos. O IP e user-agent são capturados automaticamente.

**Corpo da solicitação:**
```typescript
{
  data: Record<string, unknown>; // Obrigatório
}
```

**Resposta (201):**
```typescript
{
  success: true;
  data: SurveyResponse;
  message: "Response submitted successfully";
}
```

**Resposta (400 — dados ausentes):**
```typescript
{
  success: false;
  error: "Invalid request body: \"data\" is required";
}
```

### GET `/api/surveys/responses/{responseId}` — Obter resposta

**Resposta (200):**
```typescript
{ success: true; data: SurveyResponse; }
```

**Resposta (404):**
```typescript
{ success: false; error: "Survey response not found"; }
```

## Respostas de Erro Comuns

| Código | Situação | Corpo |
|--------|----------|-------|
| 400 | Corpo inválido / campo ausente | `{ success: false, error: "..." }` |
| 401 | Sessão ausente ou inválida | `{ success: false, error: "Unauthorized" }` |
| 404 | Recurso não encontrado | `{ success: false, error: "..." }` |
| 500 | Erro interno do servidor | `{ success: false, error: "Internal server error" }` |
| 503 | Banco de dados indisponível | `{ success: false, error: "Database connection..." }` |

## Limitação de Taxa

Não há limitação de taxa explícita nos endpoints de pesquisa. Para envio de respostas, considere implementar limitação de taxa baseada em IP para evitar abusos.
