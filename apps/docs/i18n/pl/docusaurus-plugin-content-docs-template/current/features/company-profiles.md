---
id: company-profiles
title: Profile firm
sidebar_label: Profile firm
sidebar_position: 16
---

# Profile firm

Szablon Ever Works zawiera pełny system zarządzania firmą, który umożliwia administratorom tworzenie, zarządzanie i kojarzenie firm z wymienionymi elementami. System obsługuje inteligentną deduplikację poprzez dopasowywanie domen i nazw, stronicowanie list z wyszukiwaniem oraz relację jeden do jednego między przedmiotami i firmami.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Hak kliencki dla powiązań przedmiot-firma |
| `company.service.ts` | `lib/services/company.service.ts` | Logika biznesowa dla tworzenia firm i deduplikacji |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Zapytania do baz danych dla firmy CRUD i stowarzyszeń |
| `company.ts` | `types/company.ts` | Definicje typów TypeScript |
| `company.ts` | `lib/validations/company.ts` | Schematy walidacji Zoda |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Lista rozwijana wyboru firmy |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Utwórz/edytuj moduł firmy |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Wyświetlanie statystyk firmy |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Zarządzaj powiązaniami przedmiot-firma |

## Model danych firmy

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

| Pole | Opis |
|---|---|
| `id` | Unikalny identyfikator (UUID) |
| `name` | Wyświetlana nazwa firmy |
| `website` | Pełny adres URL witryny |
| `domain` | Znormalizowana domena (np. `example.com` ) do deduplikacji |
| `slug` | Ślimak bezpieczny dla adresu URL wygenerowany na podstawie nazwy |
| `status` | Stan aktywny lub nieaktywny |

## Serwis firmowy `company.service.ts` zapewnia logikę biznesową do tworzenia firm z wbudowaną deduplikacją.

### Strategia deduplikacji

Usługa wykorzystuje trzyetapową strategię wyszukiwania przed utworzeniem nowej firmy:

1. **Wyszukiwanie domeny** (główne) — Najbardziej wiarygodne w identyfikowaniu tej samej firmy
2. **Wyszukiwanie nazwy** (awaria) — Dokładne dopasowanie nazwy firmy
3. **Utwórz nowy** — tylko jeśli oba wyszukiwania nie powiodą się

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Tworzenie z danych klienta

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Ekstrakcja domeny

Usługa normalizuje adresy URL w celu wyodrębnienia czystych domen:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Generowanie ślimaków

Ślimaki są generowane automatycznie na podstawie nazw firm:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Zapytania do bazy danych

Moduł `company.queries.ts` zapewnia kompleksowe operacje CRUD:

### Firma CRUD

| Funkcja | Opis |
|---|---|
| `createCompany(data)` | Utwórz nową firmę |
| `getCompanyById(id)` | Uzyskaj towarzystwo według UUID |
| `getCompanyBySlug(slug)` | Zdobądź towarzystwo według ślimaka (wielkość liter nie ma znaczenia) |
| `getCompanyByDomain(domain)` | Znajdź firmę według domeny (wielkość liter nie ma znaczenia) |
| `getCompanyByName(name)` | Znajdź firmę według dokładnej nazwy (wielkość liter nie ma znaczenia) |
| `updateCompany(id, data)` | Aktualizuj pola firmy |
| `deleteCompany(id)` | Usuń firmę |

### Lista firm

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

### Stowarzyszenia przedmiot-firma

Każdy element może być powiązany z dokładnie jedną firmą. Zarządzanie powiązaniem odbywa się poprzez tabelę połączeń `itemsCompanies` :

| Funkcja | Opis |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Link idempotentny (tworzy lub aktualizuje) |
| `unlinkItemFromCompany(itemSlug)` | Idempotentne odłączenie |
| `getCompanyByItemSlug(itemSlug)` | Znajdź firmę dla przedmiotu |
| `listItemsByCompany(companyId, params)` | Lista pozycji należących do firmy |
| `itemHasCompany(itemSlug)` | Sprawdź, czy przedmiot ma firmę |
| `getCompaniesWithItemCount(params)` | Wyświetl listę firm wraz z liczbą pozycji |

Funkcja `linkItemToCompany` jest idempotentna:
- Jeśli nie istnieje żadne stowarzyszenie, tworzy je
- Jeśli ta sama firma jest już połączona, zwraca istniejące powiązanie
- Jeśli połączona jest inna firma, aktualizuje ona powiązanie

## Hak `useItemCompany` Hook po stronie klienta umożliwia zarządzanie firmą w oparciu o React Query dla elementów:

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

### Konfiguracja buforowania

| Ustawienie | Wartość |
|---|---|
| `staleTime` | 5 minut |
| `gcTime` | 10 minut |
| `retry` | 2 próby |

### Punkty końcowe interfejsu API

Hook komunikuje się z następującymi punktami końcowymi REST:

| Metoda | Punkt końcowy | Opis |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Pobierz aktualną firmę dla przedmiotu |
| `POST` | `/api/items/{slug}/company` | Przypisz firmę do towaru |
| `DELETE` | `/api/items/{slug}/company` | Usuń firmę z pozycji |

## Składniki administracyjne

### Selektor firmy

Element rozwijany umożliwiający wybór istniejących firm:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Firma Modal

Mod do tworzenia lub edytowania firm:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Statystyki firmy

Wyświetla zbiorcze statystyki:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Pozycja Firma Hak | `hooks/use-item-company.ts` |
| Serwis firmy | `lib/services/company.service.ts` |
| Zapytania firmowe | `lib/db/queries/company.queries.ts` |
| Rodzaje firm | `types/company.ts` |
| Walidacje firm | `lib/validations/company.ts` |
| Selektor firmy | `components/admin/companies/company-selector.tsx` |
| Firma Modal | `components/admin/companies/company-modal.tsx` |
| Menedżer firmy przedmiotu | `components/admin/items/item-company-manager.tsx` |
