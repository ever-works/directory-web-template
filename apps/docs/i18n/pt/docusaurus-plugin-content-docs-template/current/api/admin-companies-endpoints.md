---
id: admin-companies-endpoints
title: Endpoints de Empresas do Admin
sidebar_label: Empresas do Admin
sidebar_position: 32
---

# Endpoints de Empresas do Admin

A API de Empresas do Admin fornece endpoints de gerenciamento para registros de empresas. Empresas representam organizações associadas a itens listados. A API suporta operações CRUD completas com validação baseada em Zod, verificação de exclusividade de domínio/slug e sincronização opcional com CRM em atualizações.

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/companies` | Administrador | Listar empresas (paginado, pesquisável) |
| `POST` | `/api/admin/companies` | Administrador | Criar uma nova empresa |
| `GET` | `/api/admin/companies/{id}` | Administrador | Obter uma única empresa por UUID |
| `PUT` | `/api/admin/companies/{id}` | Administrador | Atualizar uma empresa |
| `DELETE` | `/api/admin/companies/{id}` | Administrador | Excluir permanentemente uma empresa |

## Autenticação

Todos os endpoints de empresa verificam se a sessão tem privilégios de administrador:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Endpoints

### GET `/api/admin/companies`

Retorna uma lista paginada de empresas com filtragem por pesquisa e status. Também retorna contagens globais de empresas ativas e inativas independentemente dos filtros aplicados.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (deve ser >= 1) |
| `limit` | inteiro | `10` | Itens por página (1--100) |
| `q` | string | -- | Pesquisar por nome ou domínio (sem distinção de maiúsculas) |
| `status` | string | -- | Filtro: `"active"` ou `"inactive"` |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

Os valores `meta.activeCount` e `meta.inactiveCount` refletem totais globais e não são afetados pelos filtros `q` ou `status`. Isso permite que a interface exiba contagens de abas junto com os resultados filtrados.

### POST `/api/admin/companies`

Cria um novo registro de empresa. Os dados da solicitação são validados com o schema Zod (`createCompanySchema`). Os valores de domínio e slug são normalizados para letras minúsculas. A exclusividade é verificada para `domain` e `slug` antes da inserção.

**Corpo da solicitação:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome da empresa (1--255 caracteres) |
| `website` | string (URI) | Não | URL completa do site |
| `domain` | string | Não | Domínio normalizado (máx. 255 caracteres) |
| `slug` | string | Não | Identificador amigável para URL (`^[a-z0-9-]+$`, máx. 255) |
| `status` | string | Não | `"active"` ou `"inactive"` (padrão: `"active"`) |

**Validação:** Usa validação de schema Zod. Em caso de falha, retorna erros detalhados por campo:

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Resposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Recupera uma única empresa pelo seu UUID.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string (UUID) | Identificador único da empresa |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Atualiza uma empresa existente. Suporta atualizações parciais -- apenas os campos fornecidos são alterados. Validado com `updateCompanySchema`. A exclusividade de domínio e slug é verificada novamente quando esses campos mudam. Após uma atualização bem-sucedida, os dados da empresa são opcionalmente sincronizados com um sistema CRM.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string (UUID) | Identificador único da empresa |

**Corpo da solicitação:**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

Todos os campos são opcionais. Apenas os campos fornecidos serão atualizados.

**Sincronização com CRM:**

Quando `TWENTY_CRM_ENABLED` não está definido como `"false"`, a empresa atualizada é automaticamente sincronizada com o sistema Twenty CRM. Essa sincronização é não bloqueante -- se falhar, a API ainda retorna sucesso para a atualização do banco de dados:

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Exclui permanentemente uma empresa. Esta é uma exclusão definitiva (hard delete) -- o registro é removido do banco de dados. Os vínculos item-empresa associados são removidos via restrições CASCADE.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string (UUID) | Identificador único da empresa |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
A exclusão de empresa é permanente e não pode ser desfeita. Todas as associações de itens para a empresa excluída serão removidas pelas regras CASCADE do banco de dados.
:::

## Regras de Validação

Os dados da empresa são validados usando schemas Zod definidos em `lib/validations/company.ts`:

| Campo | Regra |
|-------|-------|
| `name` | Obrigatório, 1--255 caracteres |
| `website` | Opcional, deve ter formato URI válido |
| `domain` | Opcional, máx. 255 caracteres, normalizado para minúsculas |
| `slug` | Opcional, máx. 255 caracteres, alfanumérico em minúsculas e hífens apenas |
| `status` | Opcional, deve ser `"active"` ou `"inactive"` |

## Códigos de erro

| Status | Erro | Causa |
|--------|------|-------|
| `400` | Erro de validação | Falha na validação do schema Zod (inclui detalhes por campo) |
| `400` | Parâmetro de página inválido | Página não é um inteiro positivo |
| `400` | Parâmetro de limite inválido | Limite fora do intervalo 1--100 |
| `401` | Não autorizado | Sessão ausente ou não é admin |
| `404` | Empresa não encontrada | Nenhuma empresa com o UUID fornecido |
| `409` | Empresa com domínio já existe | Violação de exclusividade de domínio |
| `409` | Empresa com slug já existe | Violação de exclusividade de slug |
| `500` | Falha ao criar/atualizar/excluir empresa | Erro de servidor ou banco de dados |

## Documentação relacionada

- [Visão geral dos Endpoints de Admin](./admin-endpoints.md)
- [Padrões de Resposta](./response-patterns.md)
- [Validação de Solicitações](./request-validation.md)
