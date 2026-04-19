---
id: version-sync-endpoints
title: "Referência da API de Versão e Sincronização"
sidebar_label: "Versão e Sincronização"
sidebar_position: 58
---

# Referência da API de Versão e Sincronização

## Visão geral

Os endpoints de Versão e Sincronização fornecem acesso às informações de versão do conteúdo da aplicação e aos controles de sincronização do repositório. O endpoint de versão lê metadados Git do repositório de conteúdo, enquanto os endpoints de sincronização permitem disparar e monitorar operações de sincronização em segundo plano.

## Endpoints

### GET /api/version

Recupera informações completas de versão do repositório Git de conteúdo, incluindo detalhes do último commit, autor, branch e timestamp de sincronização. Tenta automaticamente sincronizar o repositório se o diretório Git não for encontrado (útil para cold starts no Vercel).

**Requisição**

Nenhum parâmetro necessário.

**Resposta**
```typescript
{
  commit: string;       // Hash abreviado do commit (7 caracteres), ex: "a1b2c3d"
  date: string;         // Data do commit no formato ISO 8601
  message: string;      // Mensagem do commit
  author: string;       // Nome do autor do commit
  repository: string;   // URL DATA_REPOSITORY ou "unknown"
  lastSync: string;     // Timestamp atual (ISO 8601) indicando quando estas informações foram obtidas
  branch?: string;      // Branch Git atual (padrão: "main")
}
```

**Cabeçalhos da Resposta**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Exemplo**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

Dispara uma sincronização manual em segundo plano do repositório Git de conteúdo. Evita operações de sincronização concorrentes — se uma sincronização já estiver em andamento, retorna imediatamente com uma mensagem de status.

**Requisição**
```typescript
{
  options?: object;   // Reservado para uso futuro (opcional)
}
```

O corpo da requisição é totalmente opcional.

**Resposta**
```typescript
// Sincronização bem-sucedida
{
  success: true;
  timestamp: string;    // Timestamp de conclusão ISO 8601
  duration: number;     // Duração da operação em milissegundos
  message: string;      // ex: "Repository synchronized successfully"
  details?: string;     // ex: "Updated 5 files, 3 commits ahead"
}

// Sincronização já em andamento
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Falha na sincronização (status 500)
{
  success: false;
  error: string;        // ex: "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // ex: "Git fetch failed: network timeout"
}
```

**Exemplo**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Sync completed in ${result.duration}ms: ${result.message}`);
```

### GET /api/version/sync

Retorna o status atual da sincronização, incluindo se há uma sincronização em andamento, quando ocorreu a última sincronização e o uptime do servidor.

**Requisição**

Nenhum parâmetro necessário.

**Resposta**
```typescript
{
  syncInProgress: boolean;              // Se uma operação de sincronização está em execução
  lastSyncTime: string | null;          // Timestamp ISO 8601 da última sincronização bem-sucedida
  timeSinceLastSync: number | null;     // Milissegundos desde a última sincronização
  timeSinceLastSyncHuman: string;       // Legível por humanos, ex: "300s ago" ou "never"
  uptime: number;                       // Uptime do servidor em segundos
  timestamp: string;                    // Timestamp atual do servidor (ISO 8601)
}
```

**Exemplo**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Sync is currently running...');
} else {
  console.log(`Last synced: ${status.timeSinceLastSyncHuman}`);
}
```

## Autenticação

Todos os endpoints de versão e sincronização são **públicos** — nenhuma autenticação é necessária. Esses endpoints são projetados para dashboards de monitoramento e ferramentas administrativas.

## Respostas de Erro

### GET /api/version

| Status | Código | Descrição |
|--------|--------|-----------|
| 404 | `REPOSITORY_NOT_FOUND` | Diretório Git do repositório de conteúdo não encontrado |
| 404 | `NO_COMMITS` | Repositório existe mas não contém commits |
| 500 | `GIT_ERROR` | Falha ao ler o log Git ou informações do commit |
| 500 | `VALIDATION_ERROR` | Dados do commit com campos obrigatórios ausentes |
| 500 | `INTERNAL_ERROR` | Erro inesperado em tempo de execução |

As respostas de erro incluem um corpo estruturado com os campos `error`, `code`, `timestamp` e `details` opcional.

### POST /api/version/sync

| Status | Descrição |
|--------|-----------|
| 200 | Sincronização concluída com sucesso ou já estava em andamento |
| 500 | Operação de sincronização falhou (inclui duração e detalhes do erro) |

## Limitação de Taxa

- **GET /api/version**: Cache de 1 minuto no cliente com stale-while-revalidate de 5 minutos. Inclui cabeçalhos ETag e Last-Modified para requisições condicionais.
- **GET /api/version/sync** e **POST /api/version/sync**: Sem cache (`Cache-Control: no-cache, no-store, must-revalidate`). A prevenção de sincronizações concorrentes garante que apenas uma execução ocorra por vez.

## Endpoints Relacionados

- [Endpoints de Saúde](./health-endpoints) — Verificação de conectividade do banco de dados
- [Endpoints de Configuração de Recursos](./config-feature-endpoints) — Flags de disponibilidade de funcionalidades
