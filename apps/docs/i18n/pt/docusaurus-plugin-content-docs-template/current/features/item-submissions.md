---
id: item-submissions
title: Envios de itens
sidebar_label: Envios de itens
sidebar_position: 31
---

# Envios de itens

O sistema de envio de itens fornece um fluxo de trabalho completo para os usuários enviarem, gerenciarem e rastrearem listagens de diretórios. Inclui rastreamento de status (pendente, aprovado, rejeitado), filtragem, cartões de estatísticas, modais detalhados, modais de edição e exclusão com confirmação.

## Visão geral da arquitetura

| Módulo | Caminho | Finalidade |
|--------|------|--------|
| Lista de envio | `components/submissions/submission-list.tsx` | Componente principal da lista com paginação |
| Item de envio | `components/submissions/submission-item.tsx` | Cartão de submissão individual |
| Filtros de envio | `components/submissions/submission-filters.tsx` | Guias de status e pesquisa |
| SubmissionStatsCards | `components/submissions/submission-stats-cards.tsx` | Visão geral dos cartões de estatísticas |
| EditarSubmissãoModal | `components/submissions/edit-submission-modal.tsx` | Modal de edição inline |
| SubmissionDetailModal | `components/submissions/submission-detail-modal.tsx` | Visualização de detalhes somente leitura |
| DeleteSubmissionDialog | `components/submissions/delete-submission-dialog.tsx` | Confirmação de exclusão |
| LixoItem | `components/submissions/trash-item.tsx` | Exibição de item na lixeira |
| Guarda do Plano | `lib/guards/plan-features.guard.ts` | Limites de submissão por plano |

## Modelo de dados de envio

A interface `Submission` representa um envio na UI:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

O auxiliar `toSubmission` converte do modelo de dados da API:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## Componente da lista de envios

O componente `SubmissionList` renderiza a lista de envios com estados de carregamento, vazio e preenchido:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

Comportamentos principais:

- **Estado de carregamento** -- renderiza `SubmissionItemSkeleton` espaços reservados
- **Estado vazio** – mostra uma call to action vinculada a `/submit` - **Estado preenchido** -- mapeia itens através de `toSubmission()` e renderiza `SubmissionItem` para cada
- **Indicadores de carregamento otimistas** -- `deletingId` e `updatingId` desativam itens afetados

A variante `SubmissionListWithInfo` adiciona exibição de metadados de paginação.

## Configuração de status

Cada status de envio é mapeado para um ícone, esquema de cores e chave de tradução:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

Os envios rejeitados exibem o motivo da rejeição em uma caixa vermelha.

## Filtros de envio

O componente `SubmissionFilters` fornece filtragem de status em estilo de guia e pesquisa de texto:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

Recursos:

- **Guias de status** -- Botões de comprimidos para Todos, Aprovados, Pendentes e Rejeitados com emblemas de contagem opcionais
- **Entrada de pesquisa** - Pesquisa de texto completo com botão limpar e controle giratório de carregamento
- **Variante compacta** -- `SubmissionFiltersCompact` usa uma seleção suspensa para layouts com espaço limitado

## Cartões de estatísticas

O componente `SubmissionStatsCards` exibe quatro cartas de estatísticas em uma grade:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

As quatro cartas mostram:

| Cartão | Chave | Cor |
|------|-----|-------|
| Total de Envios | `total` | Azul |
| Aprovado | `approved` | Verde |
| Pendente | `pending` | Amarelo |
| Rejeitado | `rejected` | Vermelho |

Cada cartão tem um fundo de ícone gradiente, esqueleto de carregamento animado e efeito de sombra flutuante.

## Cartão de item de envio

Cada `SubmissionItem` renderiza:

- Título com emblema de status
- Descrição truncada (fixação de duas linhas)
- Até 5 tags com contagem de estouro
- Linha de metadados: categoria, data de envio, contagem de visualizações, contagem semelhante
- Botões de ação: Visualizar, Editar, Excluir
- Carregando controles giratórios nos botões editar/excluir quando as operações estão em andamento
- Estado desativado durante operações em massa

## Limites de envio baseados em plano

O sistema de proteção de plano controla quantos envios um usuário pode fazer:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

Para verificar os limites antes do envio:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Recursos adicionais controlados por plano para envios:

| Recurso | Grátis | Padrão | Prémio |
|--------|------|----------|---------|
| Enviar itens | Sim | Sim | Sim |
| Máximo de imagens | 1 | 5 | Ilimitado |
| Descrição palavras | 200 | 500 | Ilimitado |
| Carregamento de vídeo | Não | Não | Sim |
| Selo verificado | Não | Sim | Sim |
| Revisão prioritária | Não | Sim | Sim |
| Revisão instantânea | Não | Não | Sim |
| Tempo de revisão (dias) | 7 | 3 | 1 |

## Fluxo de trabalho de envio

1. **O usuário envia** – Preenche o formulário de envio em várias etapas
2. **Validação** – Os limites do plano e a validação de entrada são verificados
3. **Armazenamento** – Os dados do item são armazenados no CMS baseado em Git por meio do serviço de item
4. **Status: Pendente** – O envio entra na fila de revisão do administrador
5. **Revisão do administrador** – O administrador aprova ou rejeita com notas opcionais
6. **Status: Aprovado/Rejeitado** – O usuário vê o status atualizado em seu painel
7. **Editar** – Os usuários podem editar os envios (dentro dos limites de modificação do plano)
8. **Excluir** – Os usuários podem excluir seus próprios envios com uma caixa de diálogo de confirmação

## Internacionalização

Todo o texto da UI usa traduções `next-intl` no namespace `client.submissions` :

- `NO_SUBMISSIONS_TITLE` -- Título de estado vazio
- `NO_SUBMISSIONS_DESC` -- Descrição do estado vazio
- `SUBMIT_FIRST_PROJECT` -- Botão de apelo à ação
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- Etiquetas de status
- `SUBMITTED` -- Prefixo de data
- `VIEWS_COUNT` , `LIKES_COUNT` -- Etiquetas métricas com parâmetro de contagem
- `REJECTION_REASON` -- Etiqueta de texto explicativo de rejeição
- `SEARCH_PLACEHOLDER` -- Espaço reservado para entrada de pesquisa
- `SHOWING_RESULTS` , `PAGE_INFO` -- Texto de paginação

## Documentação Relacionada

- [Formulários Multi-Step](/docs/template/features/multi-step-forms) -- Implementação do formulário de envio
- [Gerenciamento administrativo](/docs/template/features/admin-management) -- Fluxo de trabalho de revisão administrativa
- [Votação e comentários](/docs/template/features/voting-comments) -- Engajamento nos envios
