---
id: multi-tenancy
title: Configuração Multi-Tenant
sidebar_label: Multi-Tenant
sidebar_position: 13
---

# Configuração Multi-Tenant

Este documento explica como o suporte multi-tenant funciona no Directory Web Template.

## Visão Geral

O template usa uma abordagem de **banco de dados compartilhado com isolamento em nível de linha**:

- Um único banco de dados PostgreSQL atende múltiplos **tenants** (sites de diretório).
- Cada tabela tem uma coluna `tenant_id` que limita os dados a um tenant específico.
- Todas as consultas filtram automaticamente pelo tenant atual — sem vazamento de dados entre tenants.

## Configuração Rápida

### 1. Definir a Variável de Ambiente

Na sua plataforma de deployment (Vercel, Docker, etc.) ou `.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

Pode ser qualquer string única (ex.: um UUID ou um slug legível como `"my-directory"`).

### 2. Fazer o Deploy

Na primeira inicialização, a aplicação irá:

1. Executar migrações do banco de dados (adiciona a coluna `tenant_id` se não estiver presente)
2. Criar uma linha de tenant correspondente ao valor do `TENANT_ID`
3. Migrar os dados `tenant_id` NULL existentes para o seu tenant
4. Popular dados padrão (usuário administrador, funções, permissões)

Nenhum SQL manual é necessário — tudo é automático.

### 3. Verificar

Verifique os logs do servidor para:

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## Como Funciona a Resolução de Tenant

Quando a aplicação precisa determinar o tenant atual, usa uma estratégia em **cascata**:

| Prioridade | Fonte             | Descrição                                                          |
| ---------- | ----------------- | ------------------------------------------------------------------ |
| 1          | **Sessão**        | `user.tenantId` do token JWT (usuários autenticados)               |
| 2          | **Variável Env**  | Variável de ambiente `TENANT_ID`                                   |
| 3          | **Header HTTP**   | Header `x-tenant-domain` (para roteamento por subdomínio)          |
| 4          | **Banco de Dados**| Primeira linha de tenant ativa (fallback final)                    |

A função `getTenantId()` de `lib/auth/tenant.ts` implementa essa cadeia e é chamada por cada consulta ao banco de dados.

## Arquitetura

### Arquivos Principais

| Arquivo                                  | Propósito                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/auth/tenant.ts`                     | `getTenantId()` — resolução de tenant no servidor com cache                  |
| `lib/config/env.ts`                      | Validação da variável de ambiente `TENANT_ID`                                |
| `lib/db/schema.ts`                       | Tabela de tenant + FK `tenant_id` em todas as tabelas                        |
| `lib/db/initialize.ts`                   | Cria automaticamente o tenant do ambiente + executa migração de dados na inicialização |
| `lib/db/migrate-tenant-data.ts`          | Atribui linhas com `tenant_id` NULL ao tenant atual                          |
| `lib/auth/index.ts`                      | Callbacks JWT/sessão injetam `tenantId`                                      |
| `components/context/tenant-provider.tsx` | Contexto React para acesso ao tenant no cliente                              |
| `app/api/tenant/route.ts`                | `GET /api/tenant` — retorna informações do tenant atual                      |

### Fluxo de Dados

```
Requisição do Usuário → getTenantId() → Resolve a partir de sessão/env/headers/DB
                                                 ↓
                              Todas as consultas DB filtram por este tenant_id
                                                 ↓
                              Apenas dados para este tenant são retornados
```

### Integração com Autenticação

- **Login com credenciais**: Usuários admin e clientes obtêm o `tenantId` da coluna `users.tenant_id`.
- **Login OAuth**: O adapter Drizzle é envolto para injetar `tenantId` na criação do usuário.
- **Callback JWT**: Lê `tenantId` do registro do usuário e o incorpora no token.
- **Callback de sessão**: Propaga `tenantId` para `session.user.tenantId`.
- **Componentes cliente**: Usam o hook `useTenant()` do `TenantProvider` para informações do tenant.

## Múltiplos Diretórios (Multi-Tenant)

Para executar múltiplos sites de diretório em um único banco de dados:

1. **Cada site** define um `TENANT_ID` diferente em seu ambiente:
    - Site A: `TENANT_ID="directory-a-uuid"`
    - Site B: `TENANT_ID="directory-b-uuid"`

2. **Todos os sites** se conectam ao **mesmo banco de dados** (`DATABASE_URL`).

3. **O isolamento de dados** é automático — o Site A vê apenas linhas onde `tenant_id = 'directory-a-uuid'`.

4. **Usuários, funções, comentários, assinaturas** e todos os outros dados são completamente isolados por tenant.

## Tratamento de Dados Existentes

Ao atualizar de uma versão sem tenant:

- A coluna `tenant_id` é adicionada como **nullable** (não quebra dados existentes)
- Na primeira inicialização, `migrateNullTenantIds()` atribui automaticamente as linhas NULL ao tenant resolvido
- Esta migração é **idempotente** — segura para executar múltiplas vezes
- Após a migração, todos os dados existentes ficam visíveis sob o tenant atual

## Roteamento por Subdomínio (Avançado)

Para roteamento de tenant baseado em subdomínio (ex.: `tenant-a.example.com`):

1. Configure seu reverse proxy para adicionar o header `x-tenant-domain`
2. Crie registros de tenant com os campos `domain` ou `slug`:
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. A estratégia `resolveFromHeaders()` irá corresponder ao domínio e resolver o tenant

## Schema da Tabela de Tenant

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
