---
id: company-profiles
title: Profili aziendali
sidebar_label: Profili aziendali
sidebar_position: 16
---

# Profili aziendali

Il modello Ever Works include un sistema di gestione aziendale completo che consente agli amministratori di creare, gestire e associare le aziende agli elementi elencati. Il sistema supporta la deduplicazione intelligente attraverso la corrispondenza di domini e nomi, elenchi impaginati con ricerca e una relazione uno a uno tra elementi e aziende.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Gancio cliente per associazioni articolo-azienda |
| `company.service.ts` | `lib/services/company.service.ts` | Logica di business per la creazione e la deduplicazione di aziende |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Interrogazioni database per CRUD aziendali e associazioni |
| `company.ts` | `types/company.ts` | Definizioni di tipo TypeScript |
| `company.ts` | `lib/validations/company.ts` | Schemi di validazione Zod |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Menu a discesa del selettore dell'azienda |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Crea/modifica modale azienda |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Visualizzazione delle statistiche aziendali |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Gestire associazioni articolo-azienda |

## Modello dati aziendali

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

| Campo | Descrizione |
|---|---|
| `id` | Identificatore univoco (UUID) |
| `name` | Nome visualizzato dell'azienda |
| `website` | URL completo del sito web |
| `domain` | Dominio normalizzato (ad esempio, `example.com` ) per la deduplicazione |
| `slug` | Slug sicuro per URL generato da nome |
| `status` | Stato attivo o inattivo |

## Servizio aziendale

Il `company.service.ts` fornisce la logica aziendale per la creazione di aziende con deduplicazione integrata.

### Strategia di deduplicazione

Il servizio utilizza una strategia di ricerca in tre passaggi prima di creare una nuova società:

1. **Ricerca dominio** (primario): il più affidabile per identificare la stessa azienda
2. **Ricerca nome** (fallback): corrispondenza esatta del nome dell'azienda
3. **Crea nuovo** - Solo se entrambe le ricerche falliscono

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Creazione dai dati del cliente

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Estrazione del dominio

Il servizio normalizza gli URL per estrarre domini puliti:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Generazione di lumache

Gli slug vengono generati automaticamente dai nomi delle aziende:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

##Query sul database

Il modulo `company.queries.ts` fornisce operazioni CRUD complete:

### Azienda CRUD

| Funzione | Descrizione |
|---|---|
| `createCompany(data)` | Creare una nuova azienda |
| `getCompanyById(id)` | Ottieni azienda tramite UUID |
| `getCompanyBySlug(slug)` | Ottieni compagnia tramite slug (senza distinzione tra maiuscole e minuscole) |
| `getCompanyByDomain(domain)` | Ottieni azienda per dominio (senza distinzione tra maiuscole e minuscole) |
| `getCompanyByName(name)` | Ottieni l'azienda per nome esatto (senza distinzione tra maiuscole e minuscole) |
| `updateCompany(id, data)` | Aggiorna campi aziendali |
| `deleteCompany(id)` | Elimina un'azienda |

### Elenco delle aziende

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

### Associazioni articolo-azienda

Ogni articolo può essere collegato esattamente a un'azienda. L'associazione viene gestita tramite la tabella di giunzione `itemsCompanies` :

| Funzione | Descrizione |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Collegamento idempotente (crea o aggiorna) |
| `unlinkItemFromCompany(itemSlug)` | Scollegamento idempotente |
| `getCompanyByItemSlug(itemSlug)` | Ottieni compagnia per un articolo |
| `listItemsByCompany(companyId, params)` | Elenca elementi appartenenti a un'azienda |
| `itemHasCompany(itemSlug)` | Controlla se l'articolo ha un'azienda |
| `getCompaniesWithItemCount(params)` | Elenca le aziende con il numero di articoli |

La funzione `linkItemToCompany` è idempotente:
- Se non esiste alcuna associazione, ne crea una
- Se la stessa azienda è già collegata, restituisce l'associazione esistente
- Se viene collegata un'azienda diversa, aggiorna l'associazione

## Il gancio `useItemCompany` L'hook lato client fornisce la gestione aziendale basata su React Query per gli elementi:

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

### Configurazione della memorizzazione nella cache

| Impostazione | Valore |
|---|---|
| `staleTime` | 5 minuti |
| `gcTime` | 10 minuti |
| `retry` | 2 tentativi |

### Endpoint API

L'hook comunica con i seguenti endpoint REST:

| Metodo | Punto finale | Descrizione |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Recupera l'azienda attuale per un articolo |
| `POST` | `/api/items/{slug}/company` | Assegnare un'azienda a un articolo |
| `DELETE` | `/api/items/{slug}/company` | Rimuovere l'azienda da un elemento |

## Componenti di amministrazione

### Selettore aziendale

Un componente a discesa per selezionare le aziende esistenti:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Modale aziendale

Una modalità per creare o modificare aziende:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Statistiche aziendali

Visualizza le statistiche aggregate:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## File chiave

| File | Percorso |
|---|---|
| Articolo Azienda Gancio | `hooks/use-item-company.ts` |
| Servizio aziendale | `lib/services/company.service.ts` |
| Domande aziendali | `lib/db/queries/company.queries.ts` |
| Tipi di società | `types/company.ts` |
| Convalide aziendali | `lib/validations/company.ts` |
| Selettore azienda | `components/admin/companies/company-selector.tsx` |
| Azienda Modale | `components/admin/companies/company-modal.tsx` |
| Responsabile azienda articolo | `components/admin/items/item-company-manager.tsx` |
