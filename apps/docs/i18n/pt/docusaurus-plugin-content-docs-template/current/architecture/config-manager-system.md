---
id: config-manager-system
title: "Sistema gerenciador de configuração"
sidebar_label: "Sistema gerenciador de configuração"
sidebar_position: 41
---

# Sistema gerenciador de configuração

## Visão geral

O Config Manager System fornece duas camadas de configuração complementares: a classe **ConfigManager** (`lib/config-manager.ts`) para gerenciar o arquivo de configuração de conteúdo baseado em YAML (`config.yml`) com persistência apoiada por Git, e o **ConfigService** (`lib/config/`) para validar e acessar a configuração de aplicativo baseada em variável de ambiente com esquemas Zod. Juntos, eles abrangem configurações editáveis ​​em tempo de execução e configuração do ambiente em tempo de implantação.

## Arquitetura

O sistema é dividido em dois subsistemas distintos:

### ConfigManager (baseado em YAML, editável em tempo de execução)

`lib/config-manager.ts` gerencia o arquivo `config.yml` dentro do diretório `.content/` (clonado do repositório de dados). Ele lê e grava a configuração YAML e confirma e envia automaticamente as alterações para o repositório Git usando `isomorphic-git`. Isso é usado para configurações que os administradores podem alterar em tempo de execução (paginação, navegação, cabeçalho/rodapé).

### ConfigService (baseado em ambiente, validado na inicialização)

`lib/config/` fornece um singleton validado pelo Zod que lê todas as variáveis de ambiente na inicialização e as organiza em seções digitadas: núcleo, autenticação, email, pagamento, análises e integrações. Inclui sinalizadores de recursos, utilitários de detecção de ambiente e exportações que podem ser agitadas em árvore.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## Referência de API

### ConfigManager (`lib/config-manager.ts`)

#### Tipos

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (Singleton)

A instância singleton exportada padrão de `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Retorna o objeto de configuração completo, mesclando o conteúdo do arquivo com os padrões.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Retorna um valor de configuração de nível superior por chave.

#### `configManager.getNestedValue(keyPath: string): any`

Retorna um valor de configuração aninhado usando notação de ponto (por exemplo, `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Atualiza uma chave de nível superior e persiste no arquivo + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Atualiza uma chave aninhada usando notação de ponto. Inclui protótipo de proteção contra poluição.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Método conveniente para atualizar as configurações de paginação.

#### `configManager.getPaginationConfig(): PaginationConfig`

Retorna a configuração de paginação atual.

### ConfigService (`lib/config/config-service.ts`)

#### `configService` (Singleton)

Singleton somente de servidor que valida todas as variáveis de ambiente na inicialização.

|Propriedade|Tipo|Descrição|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URLs, informações do site, banco de dados|
|`configService.auth`|`AuthConfig`|Segredos, provedores OAuth|
|`configService.email`|`EmailConfig`|SMTP, Reenviar, Novu|
|`configService.payment`|`PaymentConfig`|Listra, LemonSqueezy, Polar|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentinela, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Vinte CRM|

#### Sinalizadores de recursos (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Recursos (classificações, comentários, favoritos, itens em destaque, pesquisas) são habilitados quando `DATABASE_URL` é configurado.

#### Utilitários de ambiente (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Detalhes de implementação

**Fila de operações do Git**: `ConfigManager` usa uma fila serial com um padrão mutex para evitar operações simultâneas do Git. Quando `writeConfig()` é chamado, o arquivo é salvo imediatamente e o commit/push do Git é colocado na fila. Se as operações do Git falharem, o salvamento do arquivo ainda será bem-sucedido.

**Dependências Git de carregamento lento**: `isomorphic-git` e seu módulo HTTP são carregados lentamente via `import()` dinâmico com um padrão singleton para evitar problemas de agrupamento e evitar importações duplicadas.

**Proteção contra poluição de protótipo**: o método `updateNestedKey()` verifica as chaves `__proto__`, `constructor` e `prototype` em todos os níveis do caminho para evitar ataques de poluição de protótipo.

**Validação de inicialização**: `ConfigService` valida todas as variáveis de ambiente usando esquemas Zod durante a primeira importação. Configuração inválida causa falha na inicialização com mensagens de erro descritivas. Os esquemas usam manipuladores `.catch()` para degradação elegante em campos opcionais.

**Aplicação somente de servidor**: `config-service.ts` importa `'server-only'` para evitar inclusão acidental em pacotes de clientes. A configuração segura do cliente é exportada separadamente de `lib/config/client.ts`.

## Configuração

### Variáveis de ambiente do ConfigManager

|Variável|Obrigatório|Descrição|
|----------|----------|-------------|
|`DATA_REPOSITORY`|Sim|URL do repositório Git para conteúdo|
|`GH_TOKEN`|Para Git push|Token de acesso GitHub|
|`GITHUB_BRANCH`|Não|Nome da filial (padrão: `main`)|
|`GIT_NAME`|Não|Nome do committer (padrão: `Website Bot`)|
|`GIT_EMAIL`|Não|E-mail do committer (padrão: `website@ever.works`)|

### Variáveis de ambiente ConfigService

Consulte `.env.example` para obter a lista completa. As seções principais incluem `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` e outras validadas por esquemas Zod.

## Exemplos de uso

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## Melhores práticas

- Use `configManager` para configurações que precisam ser alteradas em tempo de execução pelos administradores sem reimplantação.
- Use `configService` para configuração no momento da implantação que deve ser validada na inicialização.
- Importe a configuração segura do cliente de `@/lib/config/client` nos componentes do cliente, nunca da exportação principal do barril.
- Sempre manipule o retorno `Promise<boolean>` de `updateKey` e `updateNestedKey` para detectar falhas de gravação.
- Use sinalizadores de recurso para degradar a funcionalidade normalmente quando dependências opcionais (como o banco de dados) não estão configuradas.

## Módulos Relacionados

- [Cache System](./cache-system) - Usa `CACHE_TAGS.CONFIG` para cache de configuração
- [Guards System](./guards-system-deep-dive) - Consome configuração de plano/recurso
- [Content Library](/template/architecture/content-library) -- Resolução do caminho de conteúdo usada pelo ConfigManager
