---
id: survey-endpoints
title: Endpoints da API de Pesquisas
sidebar_label: Pesquisas
sidebar_position: 14
---

# Endpoints da API de Pesquisas

A API de Pesquisas fornece operações CRUD completas para pesquisas e coleta de respostas. As pesquisas podem ser **globais** (para todo o site) ou **específicas de item**, e suportam estados de ciclo de vida rascunho/publicado/fechado.

**Arquivos fonte:**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[surveyId]/route.ts`
- `template/app/api/surveys/[surveyId]/responses/route.ts`
- `template/app/api/surveys/responses/[responseId]/route.ts`

## Resumo dos Endpoints

| Método | Caminho | Autenticação | Descrição |
|--------|---------|--------------|----------|
| GET | `/api/surveys` | Opcional | Listar pesquisas com filtros |
| POST | `/api/surveys` | Admin | Criar uma nova pesquisa |
| GET | `/api/surveys/{surveyId}` | Condicional | Obter uma única pesquisa por ID ou slug |
| PUT | `/api/surveys/{surveyId}` | Admin | Atualizar uma pesquisa |
| DELETE | `/api/surveys/{surveyId}` | Admin | Excluir uma pesquisa |
| GET | `/api/surveys/{surveyId}/responses` | Admin | Listar respostas de uma pesquisa |
| POST | `/api/surveys/{surveyId}/responses` | Opcional | Enviar uma resposta |
| GET | `/api/surveys/responses/{responseId}` | Admin | Obter uma única resposta |

---

## GET `/api/surveys`

Recupera uma lista paginada de pesquisas com filtragem opcional. A disponibilidade do banco de dados é verificada antes do processamento.

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|------------|--------|----------|
| `type` | `"global"` ou `"item"` | Não | -- | Filtrar por tipo de pesquisa |
| `itemId` | string | Não | -- | Filtrar por ID de item associado |
| `status` | `"draft"`, `"published"` ou `"closed"` | Não | -- | Filtrar por status |
| `page` | integer | Não | 1 | Número da página (mínimo 1) |
| `limit` | integer | Não | 10 | Itens por página (1-100) |

### Formato da Resposta

#### 200 — Pesquisas Recuperadas

```json
{
  "success": true,
  "data": {
    "surveys": [
      {
        "id": "survey_abc123",
        "title": "User Satisfaction Survey",
        "type": "global",
        "status": "published",
        "surveyJson": { "questions": [] }
      }
    ],
    "total": 25,
    "totalPages": 3,
    "page": 1
  }
}
```

### Tratamento de Erros

O endpoint possui tratamento especial para erros comuns de banco de dados:

- **Erros de conexão** (falta de `DATABASE_URL`, conexões recusadas) retornam **503** com uma mensagem descritiva.
- **Erros de schema** (tabelas/relações ausentes) retornam **503** sugerindo que as migrações precisam ser executadas.
- Outros erros retornam **500**.

---

## POST `/api/surveys`

Cria uma nova pesquisa. **Requer autenticação de administrador.**

### Corpo da solicitação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|----------|
| `title` | string | **Sim** | Título da pesquisa |
| `description` | string | Não | Descrição da pesquisa |
| `type` | `"global"` ou `"item"` | **Sim** | Tipo de pesquisa |
| `itemId` | string | Não | ID do item associado (para pesquisas do tipo item) |
| `status` | `"draft"`, `"published"` ou `"closed"` | Não | Status inicial |
| `surveyJson` | object | **Sim** | Definição da pesquisa (perguntas, estrutura) |

### Resposta: 201 Criado

```json
{
  "success": true,
  "data": {
    "id": "survey_new123",
    "title": "New Survey",
    "type": "global",
    "status": "draft",
    "surveyJson": { "questions": [] }
  }
}
```

---

## GET `/api/surveys/{surveyId}`

Recupera uma única pesquisa por seu ID ou slug. Pesquisas não publicadas são visíveis apenas para administradores.

### Lógica de Controle de Acesso

```ts
// Pesquisas publicadas são visíveis para todos
if (survey.status !== 'published') {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Survey not found' },
      { status: 404 }
    );
  }
}
```

O endpoint primeiro tenta busca por ID e depois recorre à busca por slug.

### Resposta: 404 Não Encontrado

Retornado quando a pesquisa não existe OU quando um não administrador solicita uma pesquisa não publicada:

```json
{
  "success": false,
  "error": "Survey not found"
}
```

---

## PUT `/api/surveys/{surveyId}`

Atualiza uma pesquisa existente. **Requer autenticação de administrador.** O manipulador primeiro resolve a pesquisa por ID ou slug antes de aplicar as atualizações.

### Corpo da solicitação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|----------|
| `title` | string | Não | Título atualizado |
| `description` | string | Não | Descrição atualizada |
| `status` | `"draft"`, `"published"` ou `"closed"` | Não | Status atualizado |
| `surveyJson` | object | Não | Definição atualizada da pesquisa |

### Resposta: 200 Atualizado

```json
{
  "success": true,
  "data": { "id": "survey_abc", "title": "Updated Title" },
  "message": "Survey updated successfully"
}
```

---

## DELETE `/api/surveys/{surveyId}`

Exclui permanentemente uma pesquisa. **Requer autenticação de administrador.**

### Resposta: 200 Excluído

```json
{
  "success": true,
  "data": null,
  "message": "Survey deleted successfully"
}
```

---

## GET `/api/surveys/{surveyId}/responses`

Recupera respostas paginadas para uma pesquisa específica. **Requer autenticação de administrador.**

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|----------|
| `itemId` | string | Não | Filtrar respostas por ID de item |
| `userId` | string | Não | Filtrar respostas por ID de usuário |
| `startDate` | string (data) | Não | Filtrar respostas a partir desta data |
| `endDate` | string (data) | Não | Filtrar respostas até esta data |
| `page` | integer | Não | Número da página |
| `limit` | integer | Não | Itens por página |

### Resposta: 200

```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "id": "resp_123",
        "surveyId": "survey_abc",
        "userId": "user_456",
        "itemId": null,
        "data": { "q1": "answer1" },
        "completedAt": "2024-01-20T10:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 42,
    "totalPages": 5
  }
}
```

---

## POST `/api/surveys/{surveyId}/responses`

Envia uma resposta para uma pesquisa publicada. A autenticação é **opcional** — envios anônimos são suportados. O endpoint captura metadados de endereço IP e user agent.

### Corpo da solicitação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|----------|
| `data` | object | **Sim** | Dados da resposta da pesquisa (respostas) |

### Como os Metadados são Capturados

```ts
const forwardedFor = request.headers.get('x-forwarded-for') || '';
const ipAddress =
  (forwardedFor.split(',')[0]?.trim()) ||
  request.headers.get('x-real-ip') ||
  'unknown';

const userAgent = request.headers.get('user-agent') || 'unknown';
```

### Resposta: 201 Criado

```json
{
  "success": true,
  "data": {
    "id": "resp_new123",
    "surveyId": "survey_abc",
    "data": { "q1": "my answer" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  },
  "message": "Response submitted successfully"
}
```

#### 400 — Corpo Inválido

```json
{
  "success": false,
  "error": "Invalid request body: \"data\" is required"
}
```

---

## GET `/api/surveys/responses/{responseId}`

Recupera uma única resposta de pesquisa por ID. **Requer autenticação de administrador.**

### Resposta: 200

```json
{
  "success": true,
  "data": {
    "id": "resp_123",
    "surveyId": "survey_abc",
    "userId": "user_456",
    "data": { "q1": "answer1" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Arquivos Fonte Relacionados

| Arquivo | Propósito |
|---------|----------|
| `template/app/api/surveys/route.ts` | Listar e criar pesquisas |
| `template/app/api/surveys/[surveyId]/route.ts` | CRUD de pesquisa individual |
| `template/app/api/surveys/[surveyId]/responses/route.ts` | Lista e envio de respostas |
| `template/app/api/surveys/responses/[responseId]/route.ts` | Recuperação de resposta individual |
| `template/lib/services/survey.service.ts` | Lógica de negócio de pesquisas |
| `template/lib/types/survey.ts` | Tipos e interfaces TypeScript |
