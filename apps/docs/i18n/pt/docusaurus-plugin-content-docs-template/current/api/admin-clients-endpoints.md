---
id: admin-clients-endpoints
title: Endpoints de Clientes do Admin
sidebar_label: Clientes do Admin
sidebar_position: 38
---

# Endpoints de Clientes do Admin

A API de Clientes fornece endpoints para gerenciar perfis de clientes, incluindo criação, atualizações, pesquisa avançada, operações em massa, análise de painel e estatísticas abrangentes. Clientes representam perfis de usuários finais vinculados a contas de autenticação. Todos os endpoints requerem autenticação de administrador.

## Caminho Base

```
/api/admin/clients
```

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/clients` | Administrador | Obter lista paginada de clientes |
| `POST` | `/api/admin/clients` | Administrador | Criar um novo perfil de cliente |
| `GET` | `/api/admin/clients/stats` | Administrador | Obter estatísticas abrangentes de clientes |
| `GET` | `/api/admin/clients/dashboard` | Administrador | Obter dados combinados do painel |
| `GET` | `/api/admin/clients/advanced-search` | Administrador | Pesquisa avançada com múltiplos filtros |
| `PUT` | `/api/admin/clients/bulk` | Administrador | Atualizar perfis de clientes em massa |
| `DELETE` | `/api/admin/clients/bulk` | Administrador | Excluir perfis de clientes em massa |
| `GET` | `/api/admin/clients/{clientId}` | Administrador | Obter cliente por ID |
| `PUT` | `/api/admin/clients/{clientId}` | Administrador | Atualizar perfil de cliente |
| `DELETE` | `/api/admin/clients/{clientId}` | Administrador | Excluir perfil de cliente |

---

## Listar Clientes

```
GET /api/admin/clients
```

Retorna uma lista paginada de perfis de clientes com filtragem básica.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (mínimo: 1) |
| `limit` | inteiro | `10` | Resultados por página (1--100) |
| `search` | string | -- | Pesquisar por nome ou e-mail |
| `status` | string | -- | Filtro: `active`, `inactive`, `suspended`, `trial` |
| `plan` | string | -- | Filtro: `free`, `standard`, `premium` |
| `accountType` | string | -- | Filtro: `individual`, `business`, `enterprise` |
| `provider` | string | -- | Filtrar por provedor de autenticação |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Criar Cliente

```
POST /api/admin/clients
```

Cria um novo perfil de cliente. Se não existir conta de usuário para o e-mail fornecido, um novo usuário é criado automaticamente com uma senha temporária. Aciona sincronização com CRM quando habilitado.

**Corpo da solicitação:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | Sim | Endereço de e-mail do cliente |
| `displayName` | string | Não | Nome de exibição (padrão: prefixo do e-mail) |
| `username` | string | Não | Nome de usuário único |
| `bio` | string | Não | Biografia do cliente |
| `jobTitle` | string | Não | Cargo |
| `company` | string | Não | Nome da empresa |
| `industry` | string | Não | Setor de atuação |
| `phone` | string | Não | Número de telefone |
| `website` | string | Não | URL do site |
| `location` | string | Não | Localização |
| `accountType` | string | Não | `individual` (padrão), `business`, `enterprise` |
| `status` | string | Não | `active` (padrão), `inactive`, `suspended`, `trial` |
| `plan` | string | Não | `free` (padrão), `standard`, `premium` |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Obter Estatísticas de Clientes

```
GET /api/admin/clients/stats
```

Retorna análises abrangentes de todos os clientes, agrupadas por visão geral, crescimento, planos, tipos de conta, engajamento, dados demográficos e provedores de autenticação.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Painel

```
GET /api/admin/clients/dashboard
```

Retorna uma resposta combinada com lista paginada de clientes, estatísticas agregadas e metadados de paginação. Suporta todos os filtros básicos mais parâmetros de intervalo de datas.

**Parâmetros de consulta adicionais:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `createdAfter` | string | Data ISO ou `YYYY-MM-DD` -- criado após |
| `createdBefore` | string | Data ISO ou `YYYY-MM-DD` -- criado antes |

---

## Pesquisa Avançada

```
GET /api/admin/clients/advanced-search
```

Realiza uma pesquisa multidimensional nos perfis de clientes. Além dos filtros básicos da lista, suporta pesquisas por campo específico, intervalos numéricos, sinalizadores booleanos e intervalos de datas. Retorna metadados de pesquisa incluindo filtros aplicados e tempo de execução.

**Parâmetros de consulta adicionais:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `sortBy` | string | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder` | string | `asc` ou `desc` |
| `createdAfter` | string | Filtro de data-hora ISO |
| `createdBefore` | string | Filtro de data-hora ISO |
| `emailDomain` | string | Filtrar por domínio de e-mail (ex.: `example.com`) |
| `companySearch` | string | Pesquisar dentro de nomes de empresas |
| `locationSearch` | string | Pesquisar dentro de localizações |
| `industrySearch` | string | Pesquisar dentro de setores |
| `minSubmissions` | inteiro | Contagem mínima de submissões |
| `maxSubmissions` | inteiro | Contagem máxima de submissões |
| `emailVerified` | booleano | Filtrar por status de verificação de e-mail |
| `twoFactorEnabled` | booleano | Filtrar por status de 2FA |
| `hasAvatar` | booleano | Filtrar clientes com/sem avatar |
| `hasWebsite` | booleano | Filtrar clientes com/sem site |
| `hasPhone` | booleano | Filtrar clientes com/sem telefone |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Operações em Massa

### Atualização em Massa

```
PUT /api/admin/clients/bulk
```

Atualiza múltiplos perfis de clientes em uma única solicitação. Cada objeto de cliente deve incluir um campo `id` mais os campos a serem atualizados. Falhas individuais não abortam toda a operação.

**Corpo da solicitação:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Exclusão em Massa

```
DELETE /api/admin/clients/bulk
```

Exclui permanentemente múltiplos perfis de clientes. Cada objeto no array deve incluir um campo `id`.

**Corpo da solicitação:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Resposta (200) -- ambos os endpoints em massa:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Obter / Atualizar / Excluir Cliente

### Obter Cliente

```
GET /api/admin/clients/{clientId}
```

Retorna o perfil completo do cliente incluindo nome de exibição, empresa, plano, tipo de conta e registros de data/hora de atividade.

### Atualizar Cliente

```
PUT /api/admin/clients/{clientId}
```

Atualização parcial -- apenas os campos fornecidos são modificados. Aciona sincronização com CRM quando dados da empresa ou do perfil são alterados.

**Corpo da solicitação (todos os campos opcionais):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Excluir Cliente

```
DELETE /api/admin/clients/{clientId}
```

Exclui permanentemente um perfil de cliente. Esta ação não pode ser desfeita.

**Resposta (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Regras de Validação

| Campo | Regra |
|-------|-------|
| `email` | Obrigatório para criação; formato de e-mail válido |
| `status` | Deve ser `active`, `inactive`, `suspended` ou `trial` |
| `plan` | Deve ser `free`, `standard` ou `premium` |
| `accountType` | Deve ser `individual`, `business` ou `enterprise` |
| `clients` | Massa: array não vazio com `id` obrigatório em cada objeto |

## Códigos de erro

| Status | Significado |
|--------|-------------|
| `400` | Erro de validação, e-mail ausente, falha na criação do usuário |
| `401` | Autenticação obrigatória |
| `403` | Privilégios de administrador obrigatórios |
| `404` | Cliente não encontrado |
| `500` | Erro interno do servidor |

## Documentação relacionada

- [API de Usuários do Admin](./admin-users-endpoints.md) -- gerenciamento de contas de usuário
- [API de Funções do Admin](./admin-roles-endpoints.md) -- gerenciamento de funções e permissões
- [Autenticação](../architecture/nextauth-configuration.md) -- gerenciamento de sessão e guardas
