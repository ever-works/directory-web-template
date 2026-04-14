---
id: pagination-system
title: "Sistema de paginação"
sidebar_label: "Sistema de paginação"
sidebar_position: 45
---

# Sistema de paginação

## Visão geral

O sistema de paginação fornece cálculo de paginação no lado do servidor e utilitários de navegação de página no lado do cliente. Ele consiste em dois módulos pequenos e focados: `lib/paginate.ts` para calcular metadados de página (números de páginas, deslocamentos) e `utils/pagination.ts` para fixar números de páginas com segurança e acionar o comportamento de rolagem para o topo nas alterações de página.

## Arquitetura

O sistema de paginação é intencionalmente leve e dividido em duas camadas:

- **`lib/paginate.ts`** (Servidor/compartilhado) -- Funções puras para matemática de paginação. Usado em rotas de API, componentes de servidor e lógica de busca de dados para calcular qual fatia de dados retornar.
- **`utils/pagination.ts`** (Cliente) - Um auxiliar de UI que fixa os números das páginas a intervalos válidos e rola a página até o topo. Usado por componentes de paginação e visualizações de lista.

Ambos os módulos são consumidos pelos componentes da UI de paginação e pelas páginas de listagem de conteúdo. O `ConfigManager` fornece o valor `itemsPerPage` que alimenta esses cálculos.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## Referência de API

### Exportações de `lib/paginate.ts`

#### `PER_PAGE: number`

Constante de itens padrão por página. Valor: `12`.

#### `totalPages(size: number, perPage?: number): number`

Calcula o número total de páginas para um determinado tamanho de coleção. Usa `Math.ceil()` para garantir que a última página parcial seja incluída.

**Parâmetros:**
- `size` -- Número total de itens na coleção
- `perPage` -- Itens por página (o padrão é `PER_PAGE`)

**Retornos:** Contagem total de páginas (mínimo 1 para coleções não vazias)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Calcula metadados de paginação a partir de um parâmetro de página bruto (que pode vir como uma string de parâmetros de consulta de URL).

**Parâmetros:**
- `rawPage` -- O número da página solicitada (o padrão é `1`). Aceita `number` e `string`.
- `perPage` -- Itens por página (o padrão é `PER_PAGE`)

**Retornos:**
- `page` -- O número da página analisada como um número inteiro
- `start` -- O deslocamento do índice baseado em zero para fatiar a matriz de dados

### Exportações de `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Navega com segurança para uma nova página fixando o valor no intervalo válido `[1, total]`, atualizando o estado da página e rolando a janela até o topo com animação suave.

**Parâmetros:**
- `newPage` -- O número da página solicitada (pode estar fora do intervalo)
- `total` -- Número total de páginas
- `setPage` -- Função setter de estado React para a página atual

**Comportamento:**
- Fixa os valores `NaN` na página 1
- Fixa valores abaixo de 1 na página 1
- Fixa valores acima de `total` a `total`
- Chama `window.scrollTo({ top: 0, behavior: 'smooth' })` (seguro para SSR; verifica `typeof window`)

## Detalhes de implementação

**Análise de string**: `paginateMeta` aceita `string | number` para o parâmetro `rawPage` porque os parâmetros de consulta de URL chegam como strings. Ele usa `parseInt()` para conversão.

**Deslocamento baseado em zero**: O valor `start` retornado por `paginateMeta` é calculado como `(page - 1) * perPage`, fornecendo um índice baseado em zero adequado para cláusulas `Array.slice()` ou SQL `OFFSET`.

**Segurança SSR**: `clampAndScrollToTop` verifica `typeof window !== 'undefined'` antes de chamar `window.scrollTo()`, tornando seguro chamar em contextos de renderização no lado do servidor.

**Manuseio NaN**: `clampAndScrollToTop` converte a entrada com `Number()` e volta para a página 1 se o resultado for `NaN`.

## Configuração

O tamanho de página padrão (`PER_PAGE = 12`) é uma constante em `lib/paginate.ts`. O tamanho da página de tempo de execução pode ser substituído por `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

O `ConfigManager` suporta dois tipos de paginação:
- `'standard'` -- Navegação tradicional página por página
- `'infinite'` -- Padrão de rolagem infinita/carregar mais

## Exemplos de uso

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## Melhores práticas

- Sempre use `paginateMeta()` para analisar parâmetros de página de strings de consulta de URL para lidar com coerção de tipo e padrões com segurança.
- Passe a substituição `perPage` de `ConfigManager` em vez de confiar na constante `PER_PAGE` codificada quando o administrador pode ter alterado o tamanho da página.
- Use `clampAndScrollToTop()` em toda a navegação de página do lado do cliente para evitar números de página fora do intervalo e fornecer UX consistente.
- Para implementações de rolagem infinita, use o deslocamento `start` de `paginateMeta()` para calcular a próxima fatia de itens a serem acrescentados.
- Considere a paginação `type` de `ConfigManager` (`'standard'` vs `'infinite'`) ao escolher qual componente de UI de paginação renderizar.

## Módulos Relacionados

- [Config Manager System](./config-manager-system) - Fornece configuração de paginação em tempo de execução (`type`, `itemsPerPage`)
- [Biblioteca de conteúdo](/template/architecture/content-library) – Usa paginação para páginas de listagem de conteúdo
