---
id: internal-api-endpoints
title: Endpoints da API Interna
sidebar_label: API Interna
sidebar_position: 64
---

# Endpoints da API Interna

A API Interna fornece endpoints em nível de sistema usados para operações de infraestrutura. Esses endpoints são restritos ao modo de desenvolvimento e não são acessíveis em produção.

**Diretório de origem:** `template/app/api/internal/`

---

## Inicialização do Banco de Dados

Aciona a migração e a semeadura automáticas do banco de dados, caso ele ainda não esteja inicializado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/internal/db-init` |
| **Autenticação** | Somente modo de desenvolvimento |
| **Runtime** | `nodejs` |
| **Cache** | `force-dynamic` |
| **Origem** | `internal/db-init/route.ts` |

### Segurança

Este endpoint é **acessível somente no modo de desenvolvimento** (`NODE_ENV === 'development'`). Em produção, retorna uma resposta `403 Proibido`.

### Resposta

**Status 200** — Inicialização do banco de dados concluída.

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

**Status 403** — Ambiente de produção (acesso negado).

```json
{
  "error": "Not available in production"
}
```

**Status 500** — Falha na inicialização.

```json
{
  "success": false,
  "error": "Database initialization failed"
}
```

### O que faz

Quando chamado, o endpoint importa e executa dinamicamente o `initializeDatabase()` de `@/lib/db/initialize`, que:

1. Executa migrações pendentes do banco de dados Drizzle.
2. Semeia dados iniciais se o banco estiver vazio (ex: usuário administrador padrão, configuração inicial).
3. Garante que o schema do banco de dados esteja atualizado para o desenvolvimento.

### Exemplo com curl

```bash
# Inicializar banco de dados (somente em desenvolvimento)
curl -s http://localhost:3000/api/internal/db-init
```

### Uso em TypeScript

```typescript
// Normalmente chamado durante a configuração do ambiente de desenvolvimento
async function initializeDevDatabase(): Promise<void> {
  const res = await fetch('/api/internal/db-init');
  const data = await res.json();

  if (data.success) {
    console.log('Banco de dados inicializado com sucesso');
  } else {
    console.error('Falha na inicialização do banco de dados:', data.error);
  }
}
```

### Notas de implementação

- A função `initializeDatabase()` é importada dinamicamente usando `await import()` para evitar carregar o código de inicialização do banco de dados nos pacotes de produção.
- A rota é configurada com `export const runtime = 'nodejs'` para garantir que seja executada no runtime Node.js (não no Edge runtime), pois operações de banco de dados requerem APIs completas do Node.js.
- A rota usa `export const dynamic = 'force-dynamic'` para impedir que o Next.js armazene a resposta em cache.
- O tratamento de erros usa `safeErrorResponse()` para retornar mensagens de erro genéricas enquanto registra erros detalhados no servidor.
- Este endpoint foi projetado para uso durante a configuração de desenvolvimento local e pipelines de CI/CD. Nunca deve ser exposto em produção.

### Comandos relacionados

Para operações manuais de banco de dados fora da API, use os comandos CLI:

```bash
# Gerar arquivos de migração
pnpm db:generate

# Executar migrações
pnpm db:migrate

# Semear banco de dados
pnpm db:seed

# Abrir o estúdio do banco de dados
pnpm db:studio
```
