---
id: feature-flags
title: Sistema de sinalizadores de recursos
sidebar_label: Sinalizadores de recursos
sidebar_position: 9
---

# Sistema de sinalizadores de recursos

O modelo Ever Works usa um sistema de sinalizadores de recursos para lidar com dependências ausentes, principalmente a disponibilidade do banco de dados. Recursos que dependem do banco de dados são desabilitados automaticamente quando `DATABASE_URL` não está configurado, permitindo que o template opere em modo de conteúdo estático.

## Configuração

Localizado em `lib/config/feature-flags.ts` , o módulo feature flags fornece resolução de flags no lado do servidor.

### Definições de sinalizadores

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Lógica de Resolução

Todos os sinalizadores atuais dependem da disponibilidade do banco de dados:

```typescript
function getFeatureFlags(): FeatureFlags {
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

## API do lado do servidor

### getFeatureFlags

Retorna todos os sinalizadores como um objeto:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

###isFeatureEnabled

Verifique um único sinalizador:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

###getDisabledFeatures

Retorna uma matriz de nomes de recursos desabilitados, úteis para depuração:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFeatures

Retorna uma matriz de nomes de recursos habilitados:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### areAllFeaturesEnabled

Verifique rapidamente se todos os recursos estão disponíveis:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Ganchos do lado do cliente

### useFeatureFlag

Verifique um único sinalizador de recurso no cliente:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### useFeatureFlags

Obtenha todos os sinalizadores de recursos:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

Gancho estendido que oferece suporte ao modo de simulação de administrador para testar recursos:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

Este gancho é usado pelo sistema de favoritos para ativar/desativar condicionalmente recursos em desenvolvimento.

## Exemplos de integração

### Renderização Condicional de Componentes

```typescript
function ItemDetailPage({ item }) {
  const flags = getFeatureFlags();

  return (
    <div>
      <ItemDetails item={item} />
      {flags.comments && <CommentsSection itemId={item.id} />}
      {flags.ratings && <RatingWidget itemId={item.id} />}
      {flags.favorites && <FavoriteButton item={item} />}
    </div>
  );
}
```

### Controle de recurso em nível de gancho

Muitos ganchos verificam sinalizadores de recursos internamente. Por exemplo, `useFavorites` só busca quando o recurso de favoritos está ativado:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Rotas condicionais de API

Os sinalizadores de recursos também podem ser verificados nas rotas da API para retornar respostas apropriadas:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function GET() {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // ... handle request
}
```

## Adicionando um novo sinalizador de recurso

1. **Adicione a flag à interface** em `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Defina a lógica de resolução** em `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Use em componentes e ganchos** via `isFeatureEnabled('newFeature')` ou nos ganchos do lado do cliente.

## Filosofia de Design

O sistema de sinalizadores de recursos é intencionalmente simples:
- **Sem dependência de serviço externo** -- Os sinalizadores são resolvidos a partir de variáveis de ambiente
- **Sem sobrecarga de tempo de execução** -- Os sinalizadores são computados uma vez por solicitação/renderização
- **Degradação normal** -- Banco de dados ausente desativa recursos dependentes de banco de dados sem erros
- **Amigável ao desenvolvedor** - Nomenclatura clara, tipos TypeScript e funções auxiliares
