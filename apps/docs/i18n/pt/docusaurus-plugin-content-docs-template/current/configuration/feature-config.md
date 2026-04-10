---
id: feature-config
title: "Configuração de Funcionalidades"
sidebar_label: "Feature Config"
sidebar_position: 3
---

# Configuração de Funcionalidades

O template usa um sistema de feature flags para habilitar ou desabilitar funcionalidades de forma controlada com base na configuração do sistema. Isso permite que a aplicação funcione sem um banco de dados (servindo apenas conteúdo estático) enquanto habilita funcionalidades progressivamente à medida que a infraestrutura fica disponível.

## Módulo de Feature Flags

Os feature flags são definidos em `lib/config/feature-flags.ts`.

### Interface FeatureFlags

```ts
interface FeatureFlags {
  /** Funcionalidade de avaliações e resenhas do usuário */
  ratings: boolean;
  /** Comentários de usuários nos itens */
  comments: boolean;
  /** Coleção de itens favoritos do usuário */
  favorites: boolean;
  /** Exibição de itens em destaque gerenciados pelo administrador */
  featuredItems: boolean;
  /** Pesquisas de usuário e coleta de feedback */
  surveys: boolean;
}
```

### Como os Flags são Determinados

Todas as funcionalidades atuais dependem da disponibilidade do banco de dados. Uma funcionalidade é habilitada quando `DATABASE_URL` está configurado:

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

Esse design permite que o template sirva conteúdo do CMS baseado em Git sem nenhum banco de dados, enquanto as funcionalidades interativas dependentes de banco de dados (avaliações, comentários, favoritos) são desabilitadas automaticamente.

### Funções Utilitárias

O módulo fornece várias funções helper:

```ts
// Verificar uma única funcionalidade
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Renderizar componente de comentários
}

// Obter todas as funcionalidades habilitadas
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// ex. ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Obter todas as funcionalidades desabilitadas (útil para depuração)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Verificar se tudo está pronto
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Full platform is operational');
}
```

### Referência Completa da API

| Função | Retorna | Descrição |
|--------|---------|-----------|
| `getFeatureFlags()` | `FeatureFlags` | Todos os flags como objeto booleano |
| `isFeatureEnabled(name)` | `boolean` | Verificar uma única funcionalidade por nome |
| `getEnabledFeatures()` | `string[]` | Array de nomes de funcionalidades habilitadas |
| `getDisabledFeatures()` | `string[]` | Array de nomes de funcionalidades desabilitadas |
| `areAllFeaturesEnabled()` | `boolean` | Verdadeiro se toda funcionalidade estiver habilitada |

## Renderização Dependente de Funcionalidade

### Em Server Components

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### Em Rotas de API

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // Tratar criação de comentário...
}
```

## Configuração do Site (siteConfig)

Além dos feature flags, o template fornece um objeto `siteConfig` em `lib/config.ts` para personalização de branding e metadados. Cada valor pode ser substituído por variáveis de ambiente:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '...',
  keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS?.split(',').map(k => k.trim()) || [...],
  ogImage: {
    gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
    gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
  },
  social: {
    github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '...',
    x: process.env.NEXT_PUBLIC_SOCIAL_X || '...',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '...',
    // ...
  },
  attribution: {
    url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
    name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
  }
} as const;
```

### Personalização via Variáveis de Ambiente

| Variável | Padrão | Propósito |
|----------|--------|-----------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Nome do site em metadados e imagens OG |
| `NEXT_PUBLIC_SITE_TAGLINE` | Padrão do template | Slogan da homepage |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | URL completa do site (sem barra final) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Caminho do logo relativo a `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Nome da Organização Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Padrão do template | Meta descrição SEO |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Padrões do template | Palavras-chave SEO separadas por vírgula |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | Cor de início do gradiente da imagem OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | Cor de fim do gradiente da imagem OG |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | URL Ever Works | Link do perfil GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | URL Ever Works | Link do perfil X (Twitter) |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | Link do rodapé "Feito com" |

### Validação

A função `validateSiteConfig()` verifica as variáveis críticas de produção que estão faltando:

```ts
import { validateSiteConfig } from '@/lib/config';

// Retorna true se todas as variáveis requeridas estiverem definidas, false com avisos caso contrário
const isValid = validateSiteConfig();
```

Avisos são registrados para `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_SITE_NAME` ausentes.

## ConfigManager (Configuração YAML)

A classe `ConfigManager` em `lib/config-manager.ts` gerencia o arquivo `config.yml` do repositório CMS baseado em Git. Trata leitura, escrita e commit de alterações de configuração.

### Lendo Configuração

```ts
import { configManager } from '@/lib/config-manager';

// Obter configuração inteira
const config = configManager.getConfig();

// Obter uma chave específica
const pagination = configManager.getPaginationConfig();
// Retorna: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Obter valor aninhado
const value = configManager.getNestedValue('pagination.type');
```

### Escrevendo Configuração

Todas as escritas são automaticamente commitadas e enviadas ao repositório Git:

```ts
// Atualizar paginação
await configManager.updatePagination('infinite', 24);

// Atualizar qualquer chave de nível superior
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Atualizar chave aninhada
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Integração Git

O ConfigManager automaticamente:
1. Escreve o arquivo YAML no diretório de conteúdo
2. Enfileira um commit Git com uma mensagem descritiva
3. Envia ao repositório GitHub configurado
4. Serializa operações Git para prevenir conflitos de escrita concorrente

Mensagens de commit são contextuais:

```ts
// Para mudanças de paginação:
"Update pagination configuration (type: infinite, itemsPerPage: 24) - 2024-01-20T..."

// Para navegação do cabeçalho:
"Update custom header navigation (5 items) - 2024-01-20T..."

// Para chaves genéricas:
"Update config.yml: myKey - 2024-01-20T..."
```

### Segurança

O ConfigManager inclui proteção contra poluição de protótipos:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

Tentativas de atualizar chaves `__proto__`, `constructor` ou `prototype` são silenciosamente rejeitadas.

## Arquivos Relacionados

| Caminho | Descrição |
|---------|-----------|
| `lib/config/feature-flags.ts` | Definições de feature flags e funções utilitárias |
| `lib/config.ts` | siteConfig seguro para o cliente e re-exportações de tipos |
| `lib/config-manager.ts` | Leitor/escritor de configuração YAML com integração Git |
| `lib/config/index.ts` | Barrel export para o módulo de configuração |
| `lib/config/config-service.ts` | Singleton ConfigService do lado do servidor |
| `lib/config/types.ts` | Definições de tipos TypeScript para configuração |
| `.env.example` | Lista completa de opções de variáveis de ambiente |
