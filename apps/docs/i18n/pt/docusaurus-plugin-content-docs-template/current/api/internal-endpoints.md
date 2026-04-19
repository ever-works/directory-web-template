---
id: internal-endpoints
title: "Endpoints Internos e do Sistema"
sidebar_label: "Internos e do Sistema"
sidebar_position: 17
---

# Endpoints Internos e do Sistema

Esses endpoints fornecem operações em nível de sistema: inicialização do banco de dados, configuração de flags de funcionalidades, verificações de saúde, informações de versão e sincronização de repositório. A maioria é usada pela própria plataforma, e não por usuários finais.

**Arquivos de origem:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Resumo dos Endpoints

| Método | Caminho | Autenticação | Descrição |
|--------|---------|-------------|----------|
| GET | `/api/internal/db-init` | Somente dev | Acionar inicialização do banco de dados |
| GET | `/api/config/features` | Nenhuma | Obter flags de disponibilidade de funcionalidades |
| GET | `/api/health/database` | Nenhuma | Verificação de saúde do banco de dados |
| GET | `/api/version` | Nenhuma | Obter informações de versão do aplicativo |
| GET | `/api/version/sync` | Nenhuma | Obter status de sincronização |
| POST | `/api/version/sync` | Nenhuma | Acionar sincronização manual do repositório |

---

## GET `/api/internal/db-init`

Aciona a migração e a semeadura automáticas do banco de dados, caso ele ainda não esteja inicializado.

### Segurança

Este endpoint está **disponível somente no modo de desenvolvimento**. Em produção, retorna 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Configuração de Runtime

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Resposta: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Resposta: 403 (Produção)

```json
{
  "error": "Not available in production"
}
```

---

## GET `/api/config/features`

Retorna as flags de disponibilidade de funcionalidades atuais com base na configuração do sistema (principalmente a disponibilidade do banco de dados). Este é um **endpoint público** usado pelo frontend para lidar graciosamente com funcionalidades ausentes.

### Resposta: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Resposta: 200 (Sem Banco de Dados)

Quando o banco de dados não está configurado, todas as funcionalidades são desativadas:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Cache

Respostas bem-sucedidas são armazenadas em cache por 5 minutos com stale-while-revalidate:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

Respostas de erro usam `Cache-Control: no-cache`.

### Comportamento em Erro

Em caso de erro, o endpoint retorna todas as funcionalidades como desativadas (com status 500) para garantir que o frontend degrede graciosamente.

---

## GET `/api/health/database`

Uma verificação de saúde leve que testa a conexão com o banco de dados executando `SELECT 1`.

### Resposta: 200 (Saudável)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Resposta: 500 (Não Saudável)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Casos de Uso

- Probes de liveness e readiness do Kubernetes/Docker
- Dashboards de monitoramento
- Scripts de verificação de implantação
- Verificações de saúde de balanceadores de carga

---

## GET `/api/version`

Recupera informações abrangentes de versão do repositório Git de conteúdo, incluindo os detalhes do último commit, informações do autor, branch e status de sincronização.

### Como Funciona

1. Valida que o diretório Git existe no caminho do conteúdo
2. Se o diretório `.git` estiver ausente, tenta sincronizar (useful para partidas a frio no Vercel)
3. Lê o último commit usando `isomorphic-git`
4. Retorna informações de versão formatadas com cabeçalhos de cache

### Resposta: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### Cabeçalhos de Resposta

| Cabeçalho | Valor | Descrição |
|-----------|-------|----------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | Cache do cliente por 1 minuto |
| `ETag` | `"a1b2c3d-1705312200000"` | Baseado no hash do commit |
| `Last-Modified` | `Mon, 15 Jan 2024 10:30:00 GMT` | Timestamp do commit |

### Respostas de Erro

Todos os erros incluem um formato estruturado com código de erro:

| Status | Código | Condição |
|--------|--------|----------|
| 404 | `REPOSITORY_NOT_FOUND` | Diretório Git não existe |
| 404 | `NO_COMMITS` | Repositório sem commits |
| 500 | `GIT_ERROR` | Falha ao ler informações do commit |
| 500 | `VALIDATION_ERROR` | Dados do commit sem campos obrigatórios |
| 500 | `INTERNAL_ERROR` | Erro inesperado |

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Retorna o status atual de sincronização, incluindo se uma sincronização está em andamento, quando ocorreu a última sincronização e o uptime do servidor.

### Resposta: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Resposta: 200 (Nunca Sincronizado)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## POST `/api/version/sync`

Aciona manualmente uma sincronização em segundo plano do repositório Git de conteúdo. Prevêne operações de sincronização concorrentes (se uma sincronização já estiver em execução, retorna sucesso com uma mensagem informativa).

### Corpo da Solicitação

Opcional. Reservado para uso futuro:

```json
{}
```

### Resposta: 200 (Sincronização Concluída)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### Resposta: 200 (Já Em Andamento)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### Resposta: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

As respostas de GET e POST incluem `Cache-Control: no-cache, no-store, must-revalidate` para evitar status de sincronização desatualizado.

---

## Arquivos de Origem Relacionados

| Arquivo | Propósito |
|---------|----------|
| `template/app/api/internal/db-init/route.ts` | Endpoint de inicialização do banco de dados |
| `template/app/api/config/features/route.ts` | Endpoint de flags de funcionalidades |
| `template/app/api/health/database/route.ts` | Verificação de saúde do banco de dados |
| `template/app/api/version/route.ts` | Endpoint de informações de versão |
| `template/app/api/version/sync/route.ts` | Acionador e status de sincronização |
| `template/lib/db/initialize.ts` | Lógica de inicialização do banco de dados |
| `template/lib/config/feature-flags.ts` | Resolução de flags de funcionalidades |
| `template/lib/services/sync-service.ts` | Serviço de sincronização do repositório |
| `template/lib/lib.ts` | Utilitários de caminho de conteúdo e sistema de arquivos |
