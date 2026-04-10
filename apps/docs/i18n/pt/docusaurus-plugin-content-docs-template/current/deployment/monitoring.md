---
id: monitoring
title: Monitoramento & Analytics
sidebar_label: Monitoramento
sidebar_position: 6
---

# Monitoramento & Analytics

O template Ever Works usa um sistema de analytics unificado que suporta múltiplos provedores de rastreamento de exceções: PostHog, Sentry, ambos simultaneamente ou nenhum.

## Rastreamento de Exceções

### Modos Suportados

| Modo | Variável de Ambiente | Quando Usar |
|------|---------------------|-------------|
| **PostHog** | `EXCEPTION_PROVIDER=posthog` | Analytics + rastreamento de erros em um único lugar |
| **Sentry** | `EXCEPTION_PROVIDER=sentry` | Rastreamento de erros dedicado, excelente para depuração |
| **Ambos** | `EXCEPTION_PROVIDER=both` | Redundância máxima e cobertura |
| **Nenhum** | `EXCEPTION_PROVIDER=none` | Desabilitar para desenvolvimento local |

### Configuração

```bash
# Exception tracking mode
EXCEPTION_PROVIDER=posthog  # posthog | sentry | both | none

# PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry error tracking
SENTRY_DSN=https://key@sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project
SENTRY_AUTH_TOKEN=your_token  # for source maps
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## Sentry

### Instalação

```bash
pnpm add @sentry/nextjs
```

### Configuração

Configurar em `sentry.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';
import { sentryConfig } from '@/lib/analytics/sentry';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  ...sentryConfig,
});
```

### Benefícios do Sentry

- Rastreamento detalhado de stack traces
- Reprodução de sessões (opcional)
- Monitoramento de desempenho
- Alertas por email/Slack
- Grouping de erros por fingerprint
- Integração com GitHub para rastreamento de issues
- Gestão de releases e regras de alerta

## PostHog

### Benefícios do PostHog

PostHog combina analytics de produto com rastreamento de erros:

- Análise de funis e retenção
- Gravação de sessões
- Feature flags
- Testes A/B
- Rastreamento de exceções com contexto completo

### Propriedades das Exceções

O sistema de analytics captura exceções com estas propriedades:

| Propriedade | Descrição |
|------------|-----------|
| `message` | Mensagem de erro |
| `stack` | Stack trace completo |
| `context` | Objeto de contexto adicional |
| `userId` | ID do usuário afetado |
| `url` | URL onde o erro ocorreu |
| `environment` | `production`, `development` etc. |

### Configuração do Dashboard

1. No PostHog, crie um novo **Dashboard**
2. Adicione widgets para: **Taxa de Erros ao Longo do Tempo**, **Top Erros**, **Usuários Afetados por Erros**
3. Configure alertas em **Alerts** → Criar alerta para taxa de erros acima de um limiar

## Capturando Exceções

### Uso da API

```typescript
import { analytics } from '@/lib/analytics';

// Capture an exception
analytics.captureException(error, {
  userId: user?.id,
  context: { action: 'checkout', productId },
});
```

### Rastreamento Automático

O sistema rastreia automaticamente:

- Erros de renderização do React (através de error boundaries)
- Rejeições de Promises não tratadas
- Falhas de rotas de API
- Erros de Server Components

## Melhores Práticas

### 1. Usar Contexto Significativo

```typescript
analytics.captureException(error, {
  context: {
    action: 'user_checkout',
    cartItems: cart.length,
    paymentMethod: selectedMethod,
  }
});
```

### 2. Categorizar Erros

```typescript
// Business logic errors
analytics.captureException(new BusinessError('Payment failed'), {
  context: { type: 'payment', provider: 'stripe' }
});

// Integration errors
analytics.captureException(new IntegrationError('API timeout'), {
  context: { type: 'external_api', service: 'sendgrid' }
});
```

### 3. Não Capturar Erros Esperados

```typescript
// ❌ Don't log expected validation errors
try {
  validateForm(data);
} catch (e) {
  if (e instanceof ValidationError) {
    showFormError(e.message); // just show to user
    return;
  }
  analytics.captureException(e); // only unexpected errors
}
```

### 4. Filtrar Dados Sensíveis

```typescript
analytics.captureException(error, {
  context: {
    userId: user.id,
    // ❌ Never include: passwords, tokens, credit card numbers
    // ✅ Include: IDs, actions, non-sensitive metadata
  }
});
```

## Solução de Problemas

### Exceções Não Aparecendo

1. Verificar se `EXCEPTION_PROVIDER` está definido (não `none`)
2. Verificar se os DSNs/chaves de API estão corretos
3. Verificar se o `NODE_ENV` corresponde ao ambiente configurado
4. Confirmar que o provedor está inicializado antes do primeiro uso

### Fallback de Provedor

Se o provedor primário falhar, o sistema retorna automaticamente para logging no console em desenvolvimento.

## Guia de Migração

### Migrando do Sentry para PostHog

```bash
# 1. Atualizar variável de ambiente
EXCEPTION_PROVIDER=posthog

# 2. Verificar configuração do PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# 3. Reimplantar
```

### Migrando do PostHog para Sentry

```bash
# 1. Atualizar variável de ambiente
EXCEPTION_PROVIDER=sentry

# 2. Verificar configuração do Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 3. Reimplantar
```

### Usando Ambos Simultaneamente

```bash
EXCEPTION_PROVIDER=both
# Configure both providers' env vars
```

## Monitoramento de Desempenho

### Core Web Vitals

```typescript
// instrumentation-client.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(metric => analytics.track('web_vitals', { metric: 'CLS', value: metric.value }));
onFID(metric => analytics.track('web_vitals', { metric: 'FID', value: metric.value }));
onLCP(metric => analytics.track('web_vitals', { metric: 'LCP', value: metric.value }));
```

### Métricas Personalizadas

```typescript
// Track custom performance metrics
const start = performance.now();
await heavyOperation();
const duration = performance.now() - start;

analytics.track('performance', {
  operation: 'heavy_operation',
  duration,
  context: operationContext,
});
```

## Infraestrutura

### Verificação de Saúde

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await runHealthChecks();
  return Response.json({
    status: checks.allPassed ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

Verificar via:

```bash
curl -s https://yourdomain.com/api/health
```

### Serviços de Uptime

Monitorar o endpoint de saúde com qualquer serviço de uptime:

- **UptimeRobot** (gratuito, verificações a cada 5 min.)
- **Better Uptime** (página de status incluída)
- **Pingdom** (análises avançadas)
- **Checkly** (monitoramento baseado em código)
