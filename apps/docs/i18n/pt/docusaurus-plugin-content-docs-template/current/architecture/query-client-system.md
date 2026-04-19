---
id: query-client-system
title: "Consultar sistema cliente"
sidebar_label: "Consultar sistema cliente"
sidebar_position: 43
---

# Consultar sistema cliente

## Visão geral

O Query Client System fornece configuração centralizada do TanStack React Query para o aplicativo. Ele consiste em dois módulos: uma fábrica de cliente de consulta de uso geral (`lib/query-client.ts`) que lida com o gerenciamento singleton de servidor/cliente e uma configuração otimizada para faturamento (`lib/react-query-config.ts`) com fábricas de chaves de consulta, estratégias de pré-busca e utilitários de invalidação de cache.

## Arquitetura

O sistema tem dois pontos de entrada que atendem a preocupações diferentes:

- **`lib/query-client.ts`** -- O cliente de consulta principal usado no aplicativo. Ele cria instâncias separadas para ambientes de servidor e cliente, garantindo que a renderização do lado do servidor não compartilhe o estado entre as solicitações enquanto o navegador reutiliza uma única instância.
- **`lib/react-query-config.ts`** -- Um cliente de consulta especializado configurado para faturamento e gerenciamento de assinaturas. Ele adiciona fábricas de chaves de consulta, estratégias de pré-busca e utilitários de invalidação de cache personalizados para dados relacionados a pagamentos.

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## Referência de API

### Exportações de `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Função de fábrica que cria um novo `QueryClient` com os seguintes padrões:

|Opção|Valor|Objetivo|
|--------|-------|---------|
|`staleTime`|5 minutos|Dados considerados recentes|
|`gcTime`|10 minutos|Retenção de cache após o último uso|
|`refetchOnWindowFocus`|`false`|Evitar busca excessiva|
|`refetchOnMount`|`false`|Ignorar a nova busca se os dados forem recentes|
|`refetchOnReconnect`|`true`|Buscar novamente na recuperação da rede|
|`retry`|Até 2 tentativas|Nova tentativa simples para todos os erros|
|`retryDelay`|Espera exponencial, máximo de 30s|`1000 * 2^attempt`|
|Mutação `retry`| 1 |Tentar novamente as mutações uma vez|
|Mutação `onError`|Brinde + console.error|Notificação de erro global|

#### `getQueryClient(): QueryClient`

Retorna a instância `QueryClient` apropriada. No servidor, cria uma nova instância por chamada (sem estado compartilhado). No cliente, ele retorna uma instância singleton (criada uma vez e reutilizada).

### Exportações de `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Uma instância `QueryClient` pré-configurada e otimizada para operações de faturamento. Principais diferenças em relação ao cliente geral:

- `refetchOnWindowFocus: true` -- Garante que o status da assinatura esteja sempre atualizado
- `refetchOnMount: true` -- Busca novamente dados obsoletos na montagem do componente
- A nova tentativa ignora os erros 4xx e 401 (erros de cliente/autenticação não são repetidos)
- A espera exponencial inclui jitter (85-115% do atraso base)
- `notifyOnChangeProps` definido como `['data', 'error', 'isLoading', 'isFetching']` para re-renderizações otimizadas

#### `queryKeys`

Fábrica de chaves de consulta hierárquica para gerenciamento de cache consistente:

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

Funções de pré-busca pré-construídas para padrões de navegação comuns:

- `prefetchStrategies.billing()` - Pré-busca dados de assinatura e pagamento
- `prefetchStrategies.userProfile()` -- Pré-busca dados do perfil do usuário

#### `cacheUtils`

Utilitários de gerenciamento de cache:

- `cacheUtils.invalidateBilling()` -- Invalida todas as consultas de faturamento
- `cacheUtils.invalidateSubscription()` -- Invalida consulta de assinatura
- `cacheUtils.invalidatePayments()` -- Invalida consulta de pagamentos
- `cacheUtils.removeBilling()` -- Remove todos os dados de faturamento do cache
- `cacheUtils.resetCache()` -- Limpa todo o cache de consulta

## Detalhes de implementação

**Divisão servidor/cliente**: `getQueryClient()` usa o sinalizador `isServer` do TanStack para determinar o ambiente. As instâncias do servidor são efêmeras (novas por solicitação) para evitar vazamento de dados entre usuários. O singleton do navegador é armazenado em uma variável de nível de módulo.

**Estratégia de tratamento de erros**: O cliente geral usa `toast.error()` da Sonner para erros de mutação, fornecendo feedback imediato ao usuário. O cliente de cobrança ignora novas tentativas em erros 4xx, pois elas indicam problemas do lado do cliente que a nova tentativa não resolverá.

**Tentar novamente com jitter**: o cliente de cobrança adiciona jitter aleatório (85-115% do atraso base) à espera exponencial para evitar problemas de rebanho trovejantes quando muitos clientes tentam novamente simultaneamente após uma interrupção de serviço.

## Configuração

Nenhum arquivo de configuração adicional é necessário. Ambos os clientes são configurados inteiramente em código. Para ajustar os padrões, modifique `defaultOptions` nas respectivas funções de fábrica.

## Exemplos de uso

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## Melhores práticas

- Use `getQueryClient()` de `lib/query-client.ts` para todas as buscas de dados gerais; use o cliente específico de faturamento apenas para recursos relacionados a pagamentos.
- Sempre use fábricas `queryKeys` para consistência de chave de cache; nunca codifique matrizes de chaves de consulta.
- Ligue para `cacheUtils.invalidateBilling()` após qualquer mutação que altere a assinatura ou o estado de pagamento.
- Use `prefetchStrategies` ao passar o mouse ou pré-carregar a rota para melhorar o desempenho percebido.
- Evite chamar `cacheUtils.resetCache()` na produção, a menos que seja absolutamente necessário, pois isso descarta todos os dados armazenados em cache.

## Módulos Relacionados

- [API Client Layer](/template/architecture/api-client-layer) – Faz com que as chamadas de API sejam consumidas pelas funções de consulta
- [Guards System](./guards-system-deep-dive) -- Controle de acesso baseado em plano que pode depender dos dados da assinatura
