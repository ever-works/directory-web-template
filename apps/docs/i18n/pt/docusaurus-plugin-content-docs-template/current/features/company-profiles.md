---
id: company-profiles
title: Perfis de empresa
sidebar_label: Perfis de empresa
sidebar_position: 16
---

# Perfis de Empresa

O modelo Ever Works inclui um sistema completo de gerenciamento de empresas que permite aos administradores criar, gerenciar e associar empresas a itens listados. O sistema oferece suporte à desduplicação inteligente por meio de correspondência de domínio e nome, listagem paginada com pesquisa e relacionamento individual entre itens e empresas.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Gancho de cliente para associações de empresas de itens |
| `company.service.ts` | `lib/services/company.service.ts` | Lógica de negócios para criação e desduplicação de empresas |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Consultas de banco de dados para CRUD de empresa e associações |
| `company.ts` | `types/company.ts` | Definições de tipo TypeScript |
| `company.ts` | `lib/validations/company.ts` | Esquemas de validação Zod |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Menu suspenso do seletor de empresa |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Criar/editar modal de empresa |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Exibição de estatísticas da empresa |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Gerenciar associações item-empresa |

## Modelo de dados da empresa

```tsx
// types/company.ts
type Company = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  slug: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};
```

| Campo | Descrição |
|---|---|
| `id` | Identificador único (UUID) |
| `name` | Nome de exibição da empresa |
| `website` | URL completo do site |
| `domain` | Domínio normalizado (por exemplo, `example.com` ) para desduplicação |
| `slug` | Slug seguro para URL gerado a partir do nome |
| `status` | Estado ativo ou inativo |

## Serviço da empresa

O `company.service.ts` fornece lógica de negócios para criação de empresas com desduplicação integrada.

### Estratégia de desduplicação

O serviço usa uma estratégia de pesquisa em três etapas antes de criar uma nova empresa:

1. **Pesquisa de domínio** (primário) – Mais confiável para identificar a mesma empresa
2. **Pesquisa de nome** (substituto) – Correspondência exata do nome da empresa
3. **Criar novo** – Somente se ambas as pesquisas falharem

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Criando a partir de dados do cliente

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Extração de domínio

O serviço normaliza URLs para extrair domínios limpos:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Geração de Lesmas

Slugs são gerados automaticamente a partir de nomes de empresas:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Consultas de banco de dados

O módulo `company.queries.ts` fornece operações CRUD abrangentes:

### CRUD da empresa

| Função | Descrição |
|---|---|
| `createCompany(data)` | Criar uma nova empresa |
| `getCompanyById(id)` | Obtenha empresa por UUID |
| `getCompanyBySlug(slug)` | Obter empresa por slug (sem distinção entre maiúsculas e minúsculas) |
| `getCompanyByDomain(domain)` | Obter empresa por domínio (sem distinção entre maiúsculas e minúsculas) |
| `getCompanyByName(name)` | Obtenha a empresa pelo nome exato (sem distinção entre maiúsculas e minúsculas) |
| `updateCompany(id, data)` | Atualizar campos da empresa |
| `deleteCompany(id)` | Excluir uma empresa |

### Listagem de Empresa

```tsx
import { listCompanies } from '@/lib/db/queries/company.queries';

const result = await listCompanies({
  page: 1,
  limit: 10,
  search: 'acme',           // Searches name and domain
  status: 'active',
  sortBy: 'createdAt',      // 'name' | 'createdAt' | 'updatedAt'
  sortOrder: 'desc'
});

// Returns: { companies, total, page, totalPages, limit, activeCount, inactiveCount }
```

### Associações Item-Empresa

Cada item pode estar vinculado a exatamente uma empresa. A associação é gerenciada através da tabela de junção `itemsCompanies` :

| Função | Descrição |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Link idempotente (cria ou atualiza) |
| `unlinkItemFromCompany(itemSlug)` | Desvinculação idempotente |
| `getCompanyByItemSlug(itemSlug)` | Arranja companhia para um item |
| `listItemsByCompany(companyId, params)` | Listar itens pertencentes a uma empresa |
| `itemHasCompany(itemSlug)` | Verifique se o item possui empresa |
| `getCompaniesWithItemCount(params)` | Listar empresas com suas contagens de itens |

A função `linkItemToCompany` é idempotente:
- Se não existir associação, cria uma
- Caso a mesma empresa já esteja vinculada, retorna a associação existente
- Se uma empresa diferente estiver vinculada, atualiza a associação

## O Gancho `useItemCompany` O gancho do lado do cliente fornece gerenciamento de empresa baseado em React Query para itens:

```tsx
import { useItemCompany } from '@/hooks/use-item-company';

function ItemCompanyManager({ itemSlug }) {
  const {
    company,       // Current company or null
    isLoading,     // Loading state
    isAssigning,   // Assignment in progress
    isRemoving,    // Removal in progress
    assignCompany, // Assign company by ID
    removeCompany, // Remove company association
    refetch        // Refresh data
  } = useItemCompany({ itemSlug, enabled: true });

  const handleAssign = async (companyId: string) => {
    const success = await assignCompany(companyId);
    if (success) console.log('Company assigned!');
  };

  return (
    <div>
      {company ? (
        <div>
          <span>Company: {company.name}</span>
          <button onClick={removeCompany}>Remove</button>
        </div>
      ) : (
        <CompanySelector onSelect={(id) => handleAssign(id)} />
      )}
    </div>
  );
}
```

### Configuração de cache

| Configuração | Valor |
|---|---|
| `staleTime` | 5 minutos |
| `gcTime` | 10 minutos |
| `retry` | 2 tentativas |

### Terminais de API

O gancho se comunica com os seguintes endpoints REST:

| Método | Ponto final | Descrição |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Buscar a empresa atual para um item |
| `POST` | `/api/items/{slug}/company` | Atribuir uma empresa a um item |
| `DELETE` | `/api/items/{slug}/company` | Remover empresa de um item |

## Componentes administrativos

### Seletor de Empresa

Um componente suspenso para selecionar empresas existentes:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Modal da Empresa

Um modal para criar ou editar empresas:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Estatísticas da Empresa

Exibe estatísticas agregadas:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Item Empresa Gancho | `hooks/use-item-company.ts` |
| Atendimento Empresa | `lib/services/company.service.ts` |
| Consultas sobre empresas | `lib/db/queries/company.queries.ts` |
| Tipos de empresa | `types/company.ts` |
| Validações da Empresa | `lib/validations/company.ts` |
| Seletor de Empresa | `components/admin/companies/company-selector.tsx` |
| Modal Empresa | `components/admin/companies/company-modal.tsx` |
| Gerente de Empresa de Itens | `components/admin/items/item-company-manager.tsx` |
