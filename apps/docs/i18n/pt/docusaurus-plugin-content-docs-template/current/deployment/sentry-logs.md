---
id: sentry-logs
title: Configuração de Logs do Sentry
sidebar_label: Logs Sentry
sidebar_position: 7
---

# Configuração de Logs do Sentry

Este documento explica como configurar e usar o Sentry Logs no repositório Template e no repositório Ever Works.

## Visão Geral

O Sentry Logs fornece gerenciamento centralizado de logs, permitindo capturar, encaminhar e analisar logs da aplicação no Logs Explorer do Sentry. Todos os logs são automaticamente encaminhados ao Sentry quando habilitado, fornecendo uma visão unificada do comportamento da aplicação em diferentes ambientes.

## Funcionalidades

- ✅ Encaminhamento automático de logs para o Sentry
- ✅ Suporte para todos os níveis de log (debug, info, warn, error)
- ✅ Logging com contexto e marcação automática
- ✅ Configuração específica por ambiente
- ✅ Logging estruturado com suporte a metadados
- ✅ Integração com o utilitário de logger existente

## Configuração

### Variáveis de Ambiente

Adicione estas variáveis ao seu arquivo `.env.local` para desenvolvimento local:

```env
# Configuração do Sentry (obrigatório para logs)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Habilitar Sentry em desenvolvimento (opcional, padrão apenas em produção)
SENTRY_ENABLE_DEV=true

# Modo de debug do Sentry (opcional)
SENTRY_DEBUG=false

# Configuração de logs do Sentry
SENTRY_LOGS_ENABLED=true  # Habilitar/desabilitar Sentry Logs (padrão: true)
SENTRY_LOGS_LEVEL=info    # Nível mínimo de log para capturar (padrão: info)
```

### Configuração Específica por Ambiente

#### Desenvolvimento Local

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Capturar todos os logs em desenvolvimento
```

#### Desenvolvimento/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # Capturar logs info, warn e error
```

#### Produção

```env
SENTRY_ENABLE_DEV=false  # Não necessário em produção
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Capturar apenas avisos e erros em produção
```

## Uso

### Logging Básico

O logger encaminha automaticamente logs ao Sentry quando habilitado:

```typescript
import { logger } from '@/lib/logger';

// Log de info
logger.info('User logged in', { userId: '12345' });

// Log de aviso
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// Log de erro
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Log de debug (apenas em desenvolvimento)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### Logging Contextual

Crie um logger com um contexto específico para melhor organização:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### Níveis de Log

O logger suporta quatro níveis de log, mapeados automaticamente para os níveis de severidade do Sentry:

| Nível Logger | Nível Sentry | Descrição |
|-------------|-------------|-------------|
| `DEBUG` | `debug` | Informações detalhadas de debug (apenas desenvolvimento) |
| `INFO` | `info` | Mensagens informativas gerais |
| `WARN` | `warning` | Mensagens de aviso para problemas potenciais |
| `ERROR` | `error` | Mensagens de erro para falhas |

## Como Funciona

### Inicialização

O Sentry Logs é habilitado tanto na instrumentação do cliente quanto do servidor:

1. **Lado do servidor** (`instrumentation.ts`): Inicializa o Sentry para o runtime Node.js
2. **Lado do cliente** (`instrumentation-client.ts`): Inicializa o Sentry para o runtime do navegador

Ambas as configurações incluem:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### Encaminhamento de Logs

O utilitário de logger (`lib/logger.ts`) automaticamente:
1. Verifica se o Sentry Logs está habilitado
2. Formata as entradas de log com contexto e metadados
3. Encaminha logs ao Sentry usando `Sentry.captureMessage()` com as tags e níveis adequados
4. Faz fallback gracioso se o Sentry estiver indisponível

### Estrutura dos Logs

Cada entrada de log enviada ao Sentry inclui:
- **Mensagem**: A mensagem de log com prefixo de contexto opcional
- **Nível**: Nível de severidade (debug, info, warning, error)
- **Tags**:
  - `logLevel`: O nível de log original
  - `logType`: Sempre `application_log`
  - `context`: Identificador de contexto opcional
- **Dados Extras**:
  - `data`: Quaisquer dados adicionais fornecidos
  - `timestamp`: Timestamp ISO

## Visualização de Logs no Sentry

### Logs Explorer

1. Navegue até seu projeto Sentry
2. Vá para **Logs** → **Logs Explorer**
3. Use filtros para encontrar logs específicos:
   - Filtrar por tag `logLevel` (debug, info, warn, error)
   - Filtrar por tag `context` para ver logs de módulos específicos
   - Filtrar por `logType:application_log` para ver apenas logs da aplicação

### Consultando Logs

Exemplos de consultas no Sentry Logs Explorer:

```
# Todos os logs de erro
logLevel:error

# Logs de um contexto específico
context:PaymentService

# Todos os logs da aplicação
logType:application_log

# Erros de um intervalo de tempo específico
logLevel:error timestamp:>2024-01-01
```

## Integração com o Pacote de Monitoramento

Se estiver usando o pacote `@ever-works/monitoring`, certifique-se de que está configurado para funcionar com o Sentry Logs:

1. O pacote de monitoramento deve inicializar o Sentry com logs habilitados
2. O utilitário de logger neste template encaminhará automaticamente logs ao Sentry
3. Ambos os sistemas trabalham juntos para fornecer monitoramento abrangente

## Solução de Problemas

### Logs Não Aparecendo no Sentry

1. **Verificar configuração do DSN**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   Certifique-se de que o DSN está corretamente definido e acessível.

2. **Verificar se os logs estão habilitados**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   Deve ser `true` para que os logs sejam encaminhados.

3. **Verificar inicialização do Sentry**
   - Verifique se `SENTRY_ENABLED` é true
   - Verifique o console do navegador por erros de inicialização do Sentry
   - Verifique se `_experiments.enableLogs` está definido como `true`

4. **Verificar filtragem de nível de log**
   - Certifique-se de que seu nível de log atende ao limite `SENTRY_LOGS_LEVEL`
   - Logs de debug são capturados apenas se o nível for definido como `debug`

### Considerações de Desempenho

- Os logs são enviados de forma assíncrona e não bloquearão sua aplicação
- Em produção, considere definir `SENTRY_LOGS_LEVEL=warn` para reduzir o volume de logs
- O Sentry lida automaticamente com rate limiting e batching

### Desabilitando Logs

Para desabilitar o Sentry Logs sem desabilitar o Sentry completamente:

```env
SENTRY_LOGS_ENABLED=false
```

O logger continuará funcionando normalmente, mas os logs não serão encaminhados ao Sentry.

## Melhores Práticas

1. **Usar Níveis de Log Adequados**
   - Use `debug` para informações detalhadas de desenvolvimento
   - Use `info` para o fluxo geral da aplicação
   - Use `warn` para problemas potenciais que não comprometem a funcionalidade
   - Use `error` para erros reais e exceções

2. **Incluir Contexto**
   - Use loggers contextuais para melhor organização
   - Inclua metadados relevantes nos dados de log

3. **Evitar Dados Sensíveis**
   - Nunca registre senhas, tokens ou dados pessoais
   - Sanitize os dados antes de registrá-los

4. **Configuração de Produção**
   - Defina `SENTRY_LOGS_LEVEL=warn` em produção
   - Monitore o uso da cota do Sentry
   - Revise os logs regularmente em busca de padrões

## Checklist de Validação

- [ ] DSN do Sentry está configurado corretamente
- [ ] `SENTRY_LOGS_ENABLED=true` está definido
- [ ] Logs aparecem no Sentry Logs Explorer
- [ ] Níveis de log estão corretamente mapeados (info, warn, error, debug)
- [ ] Tags de contexto estão visíveis no Sentry
- [ ] Logs funcionam tanto localmente quanto em ambientes de implantação
- [ ] QA consegue ver e filtrar logs no Sentry Logs Explorer

## Recursos Adicionais

- [Documentação Sentry Logs](https://docs.sentry.io/product/logs/)
- [Integração Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Guia Sentry Logs Explorer](https://docs.sentry.io/product/logs/explorer/)
