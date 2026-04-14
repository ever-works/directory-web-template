---
id: admin-sponsor-ads-endpoints
title: Endpoints de Anúncios Patrocinados do Admin
sidebar_label: Anúncios Patrocinados do Admin
---

# Endpoints de Anúncios Patrocinados do Admin

A API de Anúncios Patrocinados fornece endpoints para gerenciar anúncios patrocinados, incluindo listagem, visualização, aprovação, rejeição e cancelamento. Os anúncios patrocinados progridem por um ciclo de vida com os status `pending_payment`, `pending`, `active`, `rejected`, `expired` e `cancelled`. Todos os endpoints requerem autenticação de administrador.

## Caminho Base

```
/api/admin/sponsor-ads
```

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/sponsor-ads` | Administrador | Listar anúncios patrocinados paginados |
| `GET` | `/api/admin/sponsor-ads/{id}` | Administrador | Obter anúncio por ID |
| `DELETE` | `/api/admin/sponsor-ads/{id}` | Administrador | Excluir anúncio permanentemente |
| `POST` | `/api/admin/sponsor-ads/{id}/approve` | Administrador | Aprovar e ativar um anúncio |
| `POST` | `/api/admin/sponsor-ads/{id}/reject` | Administrador | Rejeitar um anúncio |
| `POST` | `/api/admin/sponsor-ads/{id}/cancel` | Administrador | Cancelar um anúncio |

---

## Listar Anúncios Patrocinados

```
GET /api/admin/sponsor-ads
```

Retorna lista paginada de anúncios patrocinados com filtragem opcional por status e intervalo de cobrança. Também retorna estatísticas agregadas para o painel de administração. Os parâmetros de consulta são validados com Zod.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (mínimo: 1) |
| `limit` | inteiro | `10` | Resultados por página (1--100) |
| `status` | string | -- | Filtro: `pending_payment`, `pending`, `rejected`, `active`, `expired`, `cancelled` |
| `interval` | string | -- | Filtro: `weekly` ou `monthly` |
| `search` | string | -- | Pesquisar anúncios por texto |
| `sortBy` | string | `createdAt` | Campo de ordenação: `createdAt`, `updatedAt`, `startDate`, `endDate`, `status` |
| `sortOrder` | string | `desc` | Direção: `asc` ou `desc` |

**Resposta (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Spotlight",
      "description": "Featured placement for premium tools",
      "status": "active",
      "interval": "monthly",
      "startDate": "2024-01-20T00:00:00.000Z",
      "endDate": "2024-02-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 25,
    "active": 8,
    "pending": 5,
    "expired": 10,
    "cancelled": 2
  }
}
```

---

## Obter Anúncio Patrocinado

```
GET /api/admin/sponsor-ads/{id}
```

Retorna um anúncio patrocinado específico com detalhes completos, incluindo as informações do usuário associado.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Spotlight",
    "status": "active",
    "interval": "monthly",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Excluir Anúncio Patrocinado

```
DELETE /api/admin/sponsor-ads/{id}
```

Exclui permanentemente um anúncio patrocinado. Esta ação não pode ser desfeita.

**Resposta (200):**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## Aprovar Anúncio Patrocinado

```
POST /api/admin/sponsor-ads/{id}/approve
```

Aprova e ativa um anúncio patrocinado. Anúncios com status `pending` podem ser aprovados diretamente. Para anúncios com status `pending_payment`, defina `forceApprove` como `true` para aprovar sem confirmação de pagamento.

**Corpo da solicitação (opcional):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `forceApprove` | booleano | Não | Defina como `true` para aprovar sem pagamento (para status `pending_payment`) |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active",
    "startDate": "2024-01-20T00:00:00.000Z",
    "endDate": "2024-02-20T00:00:00.000Z"
  },
  "message": "Sponsor ad approved and activated successfully"
}
```

**Respostas de erro:**

| Status | Erro | Descrição |
|--------|------|-----------|
| `400` | `PAYMENT_NOT_RECEIVED` | Anúncio com status `pending_payment`; use `forceApprove` |
| `400` | `Cannot approve...` | Status do anúncio não permite aprovação |
| `404` | `Sponsor ad not found` | Nenhum anúncio com o ID fornecido existe |

---

## Rejeitar Anúncio Patrocinado

```
POST /api/admin/sponsor-ads/{id}/reject
```

Rejeita um anúncio pendente com um motivo obrigatório. Apenas anúncios com status `pending` ou `pending_payment` podem ser rejeitados. O motivo da rejeição é validado com Zod (`rejectSponsorAdSchema`).

**Corpo da solicitação:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `rejectionReason` | string | Sim | Motivo da rejeição (10--500 caracteres) |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## Cancelar Anúncio Patrocinado

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Cancela um anúncio com status `pending`, `pending_payment` ou `active`. Um motivo de cancelamento opcional pode ser fornecido. Validado com Zod (`cancelSponsorAdSchema`).

**Corpo da solicitação (opcional):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `cancelReason` | string | Não | Motivo do cancelamento (máx. 500 caracteres) |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Ciclo de Vida do Status

Os anúncios patrocinados seguem este ciclo de vida de status:

```
pending_payment --> pending --> active --> expired
                       |          |
                       v          v
                   rejected   cancelled
```

- **`pending_payment`** -- Criado pelo usuário, aguardando confirmação de pagamento.
- **`pending`** -- Pagamento recebido, aguardando revisão do administrador.
- **`active`** -- Aprovado e atualmente em exibição.
- **`rejected`** -- Recusado pelo administrador com um motivo.
- **`expired`** -- Data de término alcançada automaticamente.
- **`cancelled`** -- Cancelado pelo administrador ou usuário.

---

## Regras de Validação

| Campo | Regra |
|-------|-------|
| `status` | Deve ser um status válido de anúncio patrocinado |
| `interval` | Deve ser `weekly` ou `monthly` |
| `rejectionReason` | Obrigatório para rejeição; 10--500 caracteres |
| `cancelReason` | Opcional para cancelamento; máx. 500 caracteres |
| `forceApprove` | Booleano; relevante apenas para status `pending_payment` |
| `sortBy` | Deve ser `createdAt`, `updatedAt`, `startDate`, `endDate` ou `status` |
| `sortOrder` | Deve ser `asc` ou `desc` |

## Códigos de erro

| Status | Significado |
|--------|-------------|
| `400` | Erro de validação, transição de status inválida, pagamento não recebido |
| `401` | Autenticação obrigatória |
| `403` | Privilégios de administrador obrigatórios |
| `404` | Anúncio patrocinado não encontrado |
| `500` | Erro interno do servidor |

## Documentação relacionada

- [Visão geral dos Endpoints de Admin](./admin-endpoints.md)
- [API de Usuários do Admin](./admin-users-endpoints.md)
- [Integração de Pagamentos](../payment/overview.md)
