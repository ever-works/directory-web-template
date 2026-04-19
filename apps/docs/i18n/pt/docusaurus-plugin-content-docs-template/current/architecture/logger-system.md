---
id: logger-system
title: "Sistema de registro"
sidebar_label: "Sistema de registro"
sidebar_position: 44
---

# Sistema de registro

## Visão geral

O Logger System fornece um utilitário de registro leve e com reconhecimento de ambiente para saída de log consistente em todo o aplicativo. Ele suporta quatro níveis de log (DEBUG, INFO, WARN, ERROR), instâncias de logger com escopo de contexto e formatação específica do ambiente - saída de console estilizada no navegador durante o desenvolvimento e saída simples no formato JSON em Node.js e ambientes de produção.

## Arquitetura

O módulo (`lib/logger.ts`) exporta dois itens:

- **`logger`** -- Uma instância singleton padrão sem um rótulo de contexto, adequada para registro de uso geral.
- **`Logger`** (class) -- A própria classe, para criar instâncias de registradores contextuais com escopo para módulos ou recursos específicos.

O logger segue uma estratégia de filtragem simples: em produção (`NODE_ENV !== 'development'`), apenas mensagens WARN e ERROR são emitidas. No desenvolvimento, todos os níveis são registrados. Isso garante que a saída de depuração detalhada não vaze para ambientes de produção.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## Referência de API

### Exportações

#### `logger` (Singleton)

Uma instância `Logger` pré-instanciada sem contexto. Use para registro rápido e sem escopo.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Classe)

##### `static create(context: string): Logger`

Método de fábrica para criar um criador de logs com escopo de contexto. A sequência de contexto aparece como prefixo em todas as mensagens de log.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Registra uma mensagem em nível de depuração. Emitido apenas em desenvolvimento.

##### `info(message: string, data?: any): void`

Registra uma mensagem informativa. Emitido apenas em desenvolvimento.

##### `warn(message: string, data?: any): void`

Registra uma mensagem de aviso. Emitido em todos os ambientes.

##### `error(message: string, error?: any): void`

Registra uma mensagem de erro. Se o parâmetro `error` for uma instância `Error`, o criador de logs extrairá automaticamente as propriedades `message`, `stack` e `name`. Emitido em todos os ambientes.

##### `api(method: string, url: string, data?: any): void`

Método de conveniência para registrar solicitações de API. Delega para `debug()` com dados estruturados. Somente desenvolvimento.

##### `performance(label: string, duration: number): void`

Método de conveniência para registrar métricas de desempenho. Registra o rótulo e a duração em milissegundos. Somente desenvolvimento.

### Tipos Internos

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## Detalhes de implementação

**Detecção de ambiente**: O registrador verifica `process.env.NODE_ENV === 'development'` no momento da construção e armazena o resultado em cache. Isso evita pesquisas repetidas de ambiente em cada chamada de log.

**Estilo do navegador**: Ao executar no navegador (`typeof window !== 'undefined'`) no modo de desenvolvimento, as mensagens de log são estilizadas usando as diretivas CSS `%c`:

|Nível|Cor|
|-------|-------|
|DEBUGAR|`#6366f1` (índigo)|
|INFORMAÇÕES|`#3b82f6` (azul)|
|AVISO|`#f59e0b` (âmbar)|
|ERRO|`#ef4444` (vermelho)|

**Saída Node.js**: em ambientes Node.js ou produção, as mensagens são formatadas como strings simples com dados serializados JSON (impressos com recuo de 2 espaços).

**Extração de erros**: o método `error()` detecta instâncias `Error` e extrai `errorMessage`, `stack` e `name` em um objeto de dados estruturados para facilitar a depuração.

## Configuração

O criador de logs não requer configuração. Seu comportamento é determinado inteiramente por `NODE_ENV`:

|`NODE_ENV`|DEBUGAR|INFORMAÇÕES|AVISO|ERRO|
|------------|-------|------|------|-------|
|`development`|Sim|Sim|Sim|Sim|
|`production`|Não|Não|Sim|Sim|
|`test`|Não|Não|Sim|Sim|

## Exemplos de uso

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## Melhores práticas

- Crie registradores com escopo de contexto para cada módulo ou área de recurso usando `Logger.create('ModuleName')` para facilitar a filtragem de logs.
- Use `debug()` para rastreamento detalhado que nunca deve aparecer na produção; use `info()` para eventos notáveis.
- Sempre passe objetos `Error` (não strings) para o método `error()` para que os rastreamentos de pilha sejam capturados automaticamente.
- Use o método `api()` para registro de solicitações HTTP para manter uma estrutura de log consistente em chamadas de API.
- Não confie no logger para monitoramento na produção; integrar com uma plataforma de observabilidade adequada (PostHog, Sentry) para rastreamento de erros de produção.

## Módulos Relacionados

- [API Client Layer](/template/architecture/api-client-layer) – Usa o criador de logs para registro de solicitação/resposta
- [Config Manager System](./config-manager-system) -- ConfigService registra resultados de validação na inicialização
