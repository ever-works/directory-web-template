---
id: company-profiles
title: Firmenprofile
sidebar_label: Firmenprofile
sidebar_position: 16
---

# Firmenprofile

Die Ever Works-Vorlage umfasst ein vollständiges Unternehmensverwaltungssystem, mit dem Administratoren Unternehmen erstellen, verwalten und mit aufgelisteten Artikeln verknüpfen können. Das System unterstützt die intelligente Deduplizierung durch Domänen- und Namensabgleich, paginierte Auflistung mit Suche und eine Eins-zu-eins-Beziehung zwischen Artikeln und Unternehmen.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Client-Hook für Artikel-Firmen-Zuordnungen |
| `company.service.ts` | `lib/services/company.service.ts` | Geschäftslogik für Unternehmensgründung und -deduplizierung |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Datenbankabfragen für Firmen-CRUD und Verbände |
| `company.ts` | `types/company.ts` | TypeScript-Typdefinitionen |
| `company.ts` | `lib/validations/company.ts` | Zod-Validierungsschemata |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Dropdown-Liste zur Firmenauswahl |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Firmenmodal erstellen/bearbeiten |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Anzeige von Unternehmensstatistiken |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Artikel-Firmen-Zuordnungen verwalten |

## Unternehmensdatenmodell

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

| Feld | Beschreibung |
|---|---|
| `id` | Eindeutiger Bezeichner (UUID) |
| `name` | Anzeigename des Unternehmens |
| `website` | Vollständige Website-URL |
| `domain` | Normalisierte Domäne (z. B. `example.com` ) für Deduplizierung |
| `slug` | URL-sicherer Slug, generiert aus dem Namen |
| `status` | Aktiver oder inaktiver Status |

## Unternehmensservice

Der `company.service.ts` bietet Geschäftslogik für die Unternehmensgründung mit integrierter Deduplizierung.

### Deduplizierungsstrategie

Der Dienst verwendet eine dreistufige Suchstrategie, bevor ein neues Unternehmen erstellt wird:

1. **Domain-Suche** (primär) – Am zuverlässigsten zur Identifizierung desselben Unternehmens
2. **Namenssuche** (Fallback) – Genaue Übereinstimmung mit dem Firmennamen
3. **Neu erstellen** – Nur wenn beide Suchvorgänge fehlschlagen

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Aus Kundendaten erstellen

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Domänenextraktion

Der Dienst normalisiert URLs, um saubere Domänen zu extrahieren:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Slug-Generierung

Slugs werden automatisch aus Firmennamen generiert:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Datenbankabfragen

Das `company.queries.ts` -Modul bietet umfassende CRUD-Operationen:

### Unternehmen CRUD

| Funktion | Beschreibung |
|---|---|
| `createCompany(data)` | Erstellen Sie eine neue Firma |
| `getCompanyById(id)` | Erhalten Sie Gesellschaft per UUID |
| `getCompanyBySlug(slug)` | Get Company per Slug (ohne Berücksichtigung der Groß-/Kleinschreibung) |
| `getCompanyByDomain(domain)` | Unternehmen nach Domäne abrufen (Groß-/Kleinschreibung wird nicht beachtet) |
| `getCompanyByName(name)` | Rufen Sie das Unternehmen anhand des genauen Namens ab (Groß-/Kleinschreibung wird nicht beachtet) |
| `updateCompany(id, data)` | Firmenfelder aktualisieren |
| `deleteCompany(id)` | Eine Firma löschen |

### Firmeneintrag

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

### Artikel-Firmen-Zuordnungen

Jeder Artikel kann genau einer Firma zugeordnet werden. Die Zuordnung wird über die Junction-Tabelle `itemsCompanies` verwaltet:

| Funktion | Beschreibung |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Idempotenter Link (erstellt oder aktualisiert) |
| `unlinkItemFromCompany(itemSlug)` | Idempotente Verknüpfung aufheben |
| `getCompanyByItemSlug(itemSlug)` | Holen Sie sich Gesellschaft für einen Artikel |
| `listItemsByCompany(companyId, params)` | Artikel einer Firma auflisten |
| `itemHasCompany(itemSlug)` | Überprüfen Sie, ob für den Artikel ein Unternehmen | vorhanden ist
| `getCompaniesWithItemCount(params)` | Listen Sie Unternehmen mit ihrer Artikelanzahl auf |

Die Funktion `linkItemToCompany` ist idempotent:
- Wenn keine Assoziation vorhanden ist, wird eine erstellt
- Wenn das gleiche Unternehmen bereits verknüpft ist, wird die bestehende Zuordnung zurückgegeben
- Wenn ein anderes Unternehmen verknüpft ist, wird die Zuordnung aktualisiert

## Der `useItemCompany` Haken

Der clientseitige Hook bietet eine auf React Query basierende Unternehmensverwaltung für Artikel:

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

### Caching-Konfiguration

| Einstellung | Wert |
|---|---|
| `staleTime` | 5 Minuten |
| `gcTime` | 10 Minuten |
| `retry` | 2 Versuche |

### API-Endpunkte

Der Hook kommuniziert mit den folgenden REST-Endpunkten:

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Aktuelle Firma für einen Artikel abrufen |
| `POST` | `/api/items/{slug}/company` | Einem Artikel eine Firma zuordnen |
| `DELETE` | `/api/items/{slug}/company` | Firma aus einem Artikel entfernen |

## Admin-Komponenten

### Firmenauswahl

Eine Dropdown-Komponente zur Auswahl bestehender Unternehmen:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Firmenmodal

Ein Modal zum Erstellen oder Bearbeiten von Unternehmen:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Unternehmensstatistik

Zeigt aggregierte Statistiken an:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Artikel Firmenhaken | `hooks/use-item-company.ts` |
| Firmenservice | `lib/services/company.service.ts` |
| Firmenanfragen | `lib/db/queries/company.queries.ts` |
| Unternehmenstypen | `types/company.ts` |
| Unternehmensvalidierungen | `lib/validations/company.ts` |
| Firmenauswahl | `components/admin/companies/company-selector.tsx` |
| Unternehmen Modal | `components/admin/companies/company-modal.tsx` |
| Artikel-Firmenmanager | `components/admin/items/item-company-manager.tsx` |
