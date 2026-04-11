---
id: version-management
title: Gerenciamento de versão
sidebar_label: Gerenciamento de versão
sidebar_position: 15
---

# Gerenciamento de versão

O modelo Ever Works inclui um sistema de gerenciamento de versão que rastreia a versão do repositório de dados, exibe informações de versão para administradores e fornece detecção automática de sincronização. Este sistema monitora o repositório de conteúdo CMS baseado em Git e apresenta detalhes da versão por meio de componentes de UI configuráveis.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | Gancho React Query para buscar dados de versão da API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Gancho utilitário para gerenciamento de cache |
| `VersionDisplay` | `components/version/version-display.tsx` | Componente de exibição de versão configurável |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Dica de ferramenta mostrando informações detalhadas da versão |
| `/api/version` | `app/api/version/route.ts` | Endpoint da API retornando dados da versão atual |

## Estrutura de dados de informações da versão

O sistema de versão rastreia os seguintes dados do repositório de conteúdo:

| Campo | Tipo | Descrição |
|---|---|---|
| `commit` | `string` | Hash de commit curto da versão de dados atual |
| `date` | `string` | String de data ISO do commit |
| `author` | `string` | Nome do autor do commit |
| `message` | `string` | Mensagem de confirmação |
| `repository` | `string` | URL do repositório |
| `lastSync` | `string` | Carimbo de data/hora da última sincronização de dados |

## O Gancho `useVersionInfo` ###Interface

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

### Uso

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### Estratégia de cache

| Configuração | Valor | Descrição |
|---|---|---|
| `staleTime` | 5 minutos | Dados considerados recentes durante 5 minutos |
| `gcTime` | 30 minutos | Coleta de lixo após 30 minutos |
| `refetchOnWindowFocus` | `false` | Nenhuma nova busca na alternância de guias |
| `refetchOnReconnect` | `true` | Buscar novamente quando a rede for reconectada |
| `refetchOnMount` | `false` | Ignorar nova busca se o cache tiver dados |

### Tentar novamente a lógica

O gancho implementa nova tentativa inteligente com espera exponencial:

- Não tenta novamente em erros do cliente (códigos de status 4xx)
- Tenta novamente erros de rede e servidor até 2 vezes
- Usa backoff exponencial: `min(1000 * 2^attempt, 30000ms)` ## Componente de exibição de versão

O componente `VersionDisplay` suporta três variantes visuais:

### Variante embutida (padrão)

Uma exibição compacta e embutida mostrando o hash de commit e o tempo relativo:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Variante do selo

Um emblema em forma de pílula com fundo gradiente:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Variante detalhada

Um cartão com informações completas da versão:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

A variante detalhada mostra:
- Confirmar hash e tempo relativo
- Nome do autor
- Mensagem de commit (primeira linha, entre aspas)
- Carimbo de data e hora da última atualização (quando `showDetails` é verdadeiro)
- Carimbo de data e hora da última sincronização
- Nome do repositório

### Adereços

| Suporte | Tipo | Padrão | Descrição |
|---|---|---|---|
| `className` | `string` | `""` | Classes CSS adicionais |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Estilo de exibição |
| `showDetails` | `boolean` | `false` | Mostrar detalhes estendidos (somente variante detalhada) |
| `refreshInterval` | `number` | `300000` (5 min) | Intervalo de atualização automática em milissegundos |

### Controle de acesso

O componente respeita as funções do usuário:
- **Usuários regulares**: o componente fica oculto quando as informações da versão não estão disponíveis
- **Usuários Dev/Admin**: o estado do erro é mostrado com a mensagem "Versão indisponível"

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Dica de versão

O `VersionTooltip` envolve qualquer elemento com uma dica de ferramenta instantânea exibindo informações detalhadas da versão:

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### Recursos de dicas de ferramentas

| Recurso | Descrição |
|---|---|
| Show atrasado | Atraso configurável antes que a dica de ferramenta apareça (padrão: 300ms) |
| Ocultar rapidamente | Atraso de 100 ms na saída do mouse para interação suave |
| Passar a dica de ferramenta | A dica de ferramenta permanece visível ao passar o mouse sobre ela |
| Suporte para teclado | A tecla Escape descarta a dica de ferramenta |
| Acessibilidade | Atributos ARIA ( `role="tooltip"` , `aria-describedby` ) |
| Degradação graciosa | Retorna filhos sem dica quando os dados não estão disponíveis |

### Adereços

| Suporte | Tipo | Padrão | Descrição |
|---|---|---|---|
| `children` | `ReactNode` | obrigatório | O elemento gatilho |
| `className` | `string` | `""` | Classes CSS adicionais |
| `disabled` | `boolean` | `false` | Desativar totalmente a dica de ferramenta |
| `delay` | `number` | `300` | Mostrar atraso em milissegundos |

## Utilitários de cache

O gancho `useVersionInfoUtils` fornece funções de gerenciamento de cache:

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## Formatação de data

O componente `VersionDisplay` inclui utilitários de formatação de data memorizada:

| Função | Exemplo de saída |
|---|---|
| `formatDate` | "15 de janeiro de 2025, 14h30" |
| `getRelativeTime` | "Agora mesmo", "3h atrás", "2d atrás", "15 de janeiro" |
| `getRepositoryName` | "dados de rastreamento de tempo sempre funcionando/incríveis" |

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Gancho de informações da versão | `hooks/use-version-info.ts` |
| Exibição de versão | `components/version/version-display.tsx` |
| Dica de versão | `components/version/version-tooltip.tsx` |
| Versão API Rota | `app/api/version/route.ts` |
