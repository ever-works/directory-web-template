---
id: item-history
title: Histórico e auditoria de itens
sidebar_label: Histórico e auditoria de itens
sidebar_position: 17
---

# Histórico e auditoria de itens

O modelo Ever Works inclui um sistema abrangente de trilha de auditoria que rastreia todas as alterações feitas nos itens ao longo de seu ciclo de vida. Cada criação, atualização, alteração de status, revisão, exclusão e restauração é registrada com informações detalhadas de alteração, identidade do executor e carimbos de data/hora.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Camada de serviço para registrar ações de auditoria |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Consultas de banco de dados para log de auditoria CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | Gancho React Query para buscar logs de auditoria |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | UI modal para visualizar o histórico de itens |

## Ações de auditoria

O sistema rastreia seis tipos de ações:

| Ação | Constante | Descrição |
|---|---|---|
| Criado | `ItemAuditAction.CREATED` | O item foi criado |
| Atualizado | `ItemAuditAction.UPDATED` | Os campos dos itens foram modificados |
| Status alterado | `ItemAuditAction.STATUS_CHANGED` | O status do item foi alterado |
| Revisado | `ItemAuditAction.REVIEWED` | Item foi revisado (aprovado/rejeitado) |
| Excluído | `ItemAuditAction.DELETED` | O item foi excluído (soft ou hard) |
| Restaurado | `ItemAuditAction.RESTORED` | O item foi restaurado da exclusão |

## Campos rastreados

O serviço de auditoria monitora os seguintes campos para detecção de alterações:

| Campo | Tipo |
|---|---|
| `name` | Nome do item |
| `description` | Descrição do item |
| `source_url` | URL da fonte/produto |
| `category` | Atribuição de categoria |
| `tags` | Matriz de tags |
| `collections` | Atribuições de cobrança |
| `featured` | Status em destaque |
| `icon_url` | URL do ícone/logotipo |
| `status` | Situação do item |

## Serviço de auditoria de itens

O `itemAuditService` fornece métodos de registro de alto nível que são chamados de rotas e serviços de API.

### Criação de item de registro

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Registrando atualizações de itens

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Registro de avaliações

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Exclusão e restauração de registro

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Design sem bloqueio

Todo o log de auditoria é agrupado em blocos try-catch e não gerará erros que possam bloquear a operação primária:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## Detecção de alterações

A função `detectChanges` compara dois estados de item e retorna uma comparação detalhada:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Exemplo de saída:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

A função lida com igualdade profunda para arrays (comparação ordenada) e retorna `null` se nenhuma alteração for detectada.

## Camada de banco de dados

### Esquema de registro de auditoria

Cada entrada do log de auditoria contém:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | ID exclusivo |
| `itemId` | `string` | Slug/ID do item |
| `itemName` | `string` | Nome do item no momento da ação |
| `action` | `ItemAuditActionValues` | Tipo de ação |
| `previousStatus` | `string \| null` | Situação antes da ação |
| `newStatus` | `string \| null` | Situação após ação |
| `changes` | `JSON \| null` | Detalhes da alteração em nível de campo |
| `performedBy` | `string \| null` | ID do usuário que executou a ação |
| `performedByName` | `string \| null` | Nome de exibição do usuário |
| `notes` | `string \| null` | Notas adicionais (por exemplo, comentários de revisão) |
| `metadata` | `JSON \| null` | Dados extras de contexto |
| `createdAt` | `timestamp` | Quando a ação ocorreu |

### Funções de consulta

| Função | Descrição |
|---|---|
| `createItemAuditLog(data)` | Crie uma nova entrada de log de auditoria |
| `getItemHistory(params)` | Obtenha histórico paginado com informações do artista |
| `getLatestItemAuditLog(itemId)` | Obtenha a entrada de registro mais recente |
| `getAuditLogsByAction(action, limit)` | Filtrar logs por tipo de ação |
| `getAuditLogsByPerformer(userId, limit)` | Filtrar logs por executor |
| `getItemAuditStats(itemId)` | Obtenha o detalhamento da contagem por tipo de ação |

### Consulta de histórico paginado

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

A consulta se une à tabela `users` para incluir o e-mail do artista ao lado de cada entrada de log.

## O Gancho `useItemHistory`

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### Configuração do Gancho

| Opção | Padrão | Descrição |
|---|---|---|
| `itemId` | obrigatório | ID do item/slug para buscar o histórico |
| `page` | `1` | Número da página |
| `limit` | `20` | Itens por página |
| `actionFilter` | `undefined` | Matriz de tipos de ação para filtrar |
| `enabled` | `true` | Se a consulta está ativa |
| `staleTime` | 30 segundos | Duração da atualização do cache |

## Modal de histórico de itens

O componente `ItemHistoryModal` fornece uma UI completa para visualizar o histórico de auditoria de itens:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Recursos modais

| Recurso | Descrição |
|---|---|
| Filtragem de ações | Menu suspenso para filtrar por tipo de ação (criada, atualizada, etc.) |
| Entradas codificadas por cores | Cada tipo de ação possui um ícone e esquema de cores distintos |
| Mudanças expansíveis | Clique para expandir os detalhes da alteração no nível do campo |
| Carimbos de data e hora relativos | "2h atrás", "3d atrás" com data completa ao passar o mouse |
| Exibição do artista | Mostra nome de usuário, e-mail ou “Sistema” para ações automatizadas |
| Contexto de revisão | Mostra rótulos "Aprovado"/"Rejeitado" e motivos de rejeição |
| Paginação | Paginação integrada para longos históricos |
| Suporte para teclado | A tecla Escape fecha o modal |

### Esquema de cores de ação

| Ação | Cor | Ícone |
|---|---|---|
| Criado | Verde | Mais |
| Atualizado | Azul | Editar2 |
| Status alterado | Amarelo | AtualizarCw |
| Revisado | Roxo | VerifiqueCírculo |
| Excluído | Vermelho | Lixo2 |
| Restaurado | Azul-petróleo | GirarCcw |

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Serviço de Auditoria | `lib/services/item-audit.service.ts` |
| Consultas de auditoria | `lib/db/queries/item-audit.queries.ts` |
| Gancho de história | `hooks/use-item-history.ts` |
| História Modal | `components/admin/items/item-history-modal.tsx` |
