---
id: company-profiles
title: Bedrijfsprofielen
sidebar_label: Bedrijfsprofielen
sidebar_position: 16
---

# Bedrijfsprofielen

De Ever Works-sjabloon bevat een volledig bedrijfsbeheersysteem waarmee beheerders bedrijven kunnen creëren, beheren en koppelen aan vermelde items. Het systeem ondersteunt intelligente deduplicatie via het matchen van domeinen en namen, gepagineerde lijsten met zoeken en een één-op-één-relatie tussen items en bedrijven.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Klantenhaak voor item-bedrijfsassociaties |
| `company.service.ts` | `lib/services/company.service.ts` | Bedrijfslogica voor het creëren en ontdubbelen van bedrijven |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Databasequery's voor bedrijf CRUD en verenigingen |
| `company.ts` | `types/company.ts` | TypeScript-typedefinities |
| `company.ts` | `lib/validations/company.ts` | Zod-validatieschema's |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Vervolgkeuzelijst Bedrijfskiezer |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Bedrijfsmodaal aanmaken/bewerken |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Bedrijfsstatistieken weergeven |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Artikel-bedrijfskoppelingen beheren |

## Bedrijfsgegevensmodel

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

| Veld | Beschrijving |
|---|---|
| `id` | Unieke identificatie (UUID) |
| `name` | Weergavenaam bedrijf |
| `website` | Volledige website-URL |
| `domain` | Genormaliseerd domein (bijvoorbeeld `example.com` ) voor deduplicatie |
| `slug` | URL-veilige slug gegenereerd op basis van naam |
| `status` | Actieve of inactieve status |

## Bedrijfsservice

De `company.service.ts` biedt bedrijfslogica voor het opzetten van bedrijven met ingebouwde deduplicatie.

### Deduplicatiestrategie

De service maakt gebruik van een opzoekstrategie in drie stappen voordat een nieuw bedrijf wordt aangemaakt:

1. **Domein opzoeken** (primair) - Meest betrouwbaar voor het identificeren van hetzelfde bedrijf
2. **Naam opzoeken** (fallback) - Exacte overeenkomst op bedrijfsnaam
3. **Nieuwe maken** -- Alleen als beide zoekopdrachten mislukken

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Creëren op basis van klantgegevens

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Domeinextractie

De service normaliseert URL's om schone domeinen te extraheren:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Generatie van naaktslakken

Slugs worden automatisch gegenereerd op basis van bedrijfsnamen:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Databasequery's

De `company.queries.ts` -module biedt uitgebreide CRUD-bewerkingen:

### Bedrijf CRUD

| Functie | Beschrijving |
|---|---|
| `createCompany(data)` | Creëer een nieuw bedrijf |
| `getCompanyById(id)` | Ontvang gezelschap via UUID |
| `getCompanyBySlug(slug)` | Bedrijf ophalen via slug (niet hoofdlettergevoelig) |
| `getCompanyByDomain(domain)` | Bedrijf per domein ophalen (niet hoofdlettergevoelig) |
| `getCompanyByName(name)` | Bedrijf weergeven op exacte naam (niet hoofdlettergevoelig) |
| `updateCompany(id, data)` | Bedrijfsvelden bijwerken |
| `deleteCompany(id)` | Een bedrijf verwijderen |

### Bedrijfsvermelding

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

### Associaties van artikelen en bedrijven

Ieder artikel kan aan precies één bedrijf gekoppeld worden. De vereniging wordt beheerd via de `itemsCompanies` knooppunttabel:

| Functie | Beschrijving |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Idempotente link (aanmaken of bijwerken) |
| `unlinkItemFromCompany(itemSlug)` | Idempotent ontkoppelen |
| `getCompanyByItemSlug(itemSlug)` | Bedrijf zoeken voor een artikel |
| `listItemsByCompany(companyId, params)` | Items weergeven die bij een bedrijf horen |
| `itemHasCompany(itemSlug)` | Controleer of artikel een bedrijf heeft |
| `getCompaniesWithItemCount(params)` | Bedrijven vermelden met hun artikelaantallen |

De functie `linkItemToCompany` is idempotent:
- Als er geen associatie bestaat, wordt er een gecreëerd
- Als hetzelfde bedrijf al is gekoppeld, wordt de bestaande koppeling geretourneerd
- Als er een ander bedrijf is gekoppeld, wordt de koppeling bijgewerkt

## De `useItemCompany` haak

De hook aan de clientzijde biedt bedrijfsbeheer op basis van React Query voor items:

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

### Caching-configuratie

| Instelling | Waarde |
|---|---|
| `staleTime` | 5 minuten |
| `gcTime` | 10 minuten |
| `retry` | 2 pogingen |

### API-eindpunten

De hook communiceert met de volgende REST-eindpunten:

| Werkwijze | Eindpunt | Beschrijving |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Huidig ​​bedrijf voor een artikel ophalen |
| `POST` | `/api/items/{slug}/company` | Een bedrijf aan een artikel toewijzen |
| `DELETE` | `/api/items/{slug}/company` | Bedrijf uit een item verwijderen |

## Beheercomponenten

### Bedrijfskiezer

Een dropdown-component voor het selecteren van bestaande bedrijven:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Bedrijfsmodaal

Een modaal voor het aanmaken of bewerken van bedrijven:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Bedrijfsstatistieken

Geeft geaggregeerde statistieken weer:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Artikel Bedrijf Haak | `hooks/use-item-company.ts` |
| Bedrijfsservice | `lib/services/company.service.ts` |
| Bedrijfsvragen | `lib/db/queries/company.queries.ts` |
| Bedrijfstypen | `types/company.ts` |
| Bedrijfsvalidaties | `lib/validations/company.ts` |
| Bedrijfskiezer | `components/admin/companies/company-selector.tsx` |
| Bedrijf Modaal | `components/admin/companies/company-modal.tsx` |
| Artikel Bedrijfsleider | `components/admin/items/item-company-manager.tsx` |
