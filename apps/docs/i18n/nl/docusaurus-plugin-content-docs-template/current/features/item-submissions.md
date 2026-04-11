---
id: item-submissions
title: Artikelinzendingen
sidebar_label: Artikelinzendingen
sidebar_position: 31
---

# Artikelinzendingen

Het systeem voor het indienen van items biedt gebruikers een complete workflow voor het indienen, beheren en volgen van directoryvermeldingen. Het omvat het volgen van de status (in behandeling, goedgekeurd, afgewezen), filteren, statistiekkaarten, detailmodaliteiten, bewerkingsmodaliteiten en verwijdering met bevestiging.

## Architectuuroverzicht

| module | Pad | Doel |
|--------|------|---------|
| Inzendingslijst | `components/submissions/submission-list.tsx` | Hoofdlijstcomponent met paginering |
| InzendingItem | `components/submissions/submission-item.tsx` | Individuele inzendingskaart |
| Inzendingsfilters | `components/submissions/submission-filters.tsx` | Statustabbladen en zoeken |
| InzendingStatistiekkaarten | `components/submissions/submission-stats-cards.tsx` | Overzicht statistiekkaarten |
| BewerkenInzendingModal | `components/submissions/edit-submission-modal.tsx` | Inline modaal bewerken |
| SubmissionDetailModal | `components/submissions/submission-detail-modal.tsx` | Alleen-lezen detailweergave |
| Dialoogvenster Indiening verwijderen | `components/submissions/delete-submission-dialog.tsx` | Bevestiging van verwijdering |
| TrashItem | `components/submissions/trash-item.tsx` | Weergave van weggegooid item |
| Planwacht | `lib/guards/plan-features.guard.ts` | Indieningslimieten per plan |

## Gegevensmodel voor indiening

De `Submission` -interface vertegenwoordigt een inzending in de gebruikersinterface:

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

De `toSubmission` -helper converteert vanuit het API-datamodel:

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

## Component Inzendingslijst

De component `SubmissionList` geeft de lijst met inzendingen weer met de statussen laden, leeg en gevuld:

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

Belangrijkste gedragingen:

- **Laadstatus** -- geeft tijdelijke aanduidingen voor `SubmissionItemSkeleton` weer
- **Lege status** -- toont een call-to-action die is gekoppeld aan `/submit` - **Bevolkte staat**: brengt items in kaart via `toSubmission()` en geeft `SubmissionItem` weer voor elk
- **Optimistische laadindicatoren** -- `deletingId` en `updatingId` schakelen de betreffende items uit

De `SubmissionListWithInfo` variant voegt weergave van pagineringsmetagegevens toe.

## Statusconfiguratie

Elke inzendingsstatus wordt toegewezen aan een pictogram, kleurenschema en vertaalsleutel:

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

Bij afgewezen inzendingen wordt de reden van de afwijzing weergegeven in een rood toelichtingsvak.

## Inzendingsfilters

De component `SubmissionFilters` biedt statusfiltering in tabstijl en tekstzoekopdrachten:

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

Kenmerken:

- **Statustabbladen** - Pilknoppen voor Alles, Goedgekeurd, In behandeling en Afgewezen met optionele telbadges
- **Zoekinvoer** -- Zoeken in volledige tekst met duidelijke knop en laadspinner
- **Compacte variant** -- `SubmissionFiltersCompact` gebruikt een vervolgkeuzelijst voor lay-outs met beperkte ruimte

## Statistiekkaarten

De component `SubmissionStatsCards` geeft vier statistiekkaarten weer in een raster:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

De vier kaarten tonen:

| Kaart | Sleutel | Kleur |
|------|-----|-------|
| Totaal aantal inzendingen | `total` | Blauw |
| Goedgekeurd | `approved` | Groen |
| In behandeling | `pending` | Geel |
| Afgewezen | `rejected` | Rood |

Elke kaart heeft een verlooppictogramachtergrond, een geanimeerd laadskelet en een zweefschaduweffect.

## Inzendingsitemkaart

Elke `SubmissionItem` geeft het volgende weer:

- Titel met statusbadge
- Afgeknotte beschrijving (tweeregelige klem)
- Maximaal 5 tags met overlooptelling
- Metagegevensrij: categorie, inzendingsdatum, aantal weergaven, aantal likes
- Actieknoppen: Bekijken, Bewerken, Verwijderen
- Spinners laden op knoppen voor bewerken/verwijderen terwijl er bewerkingen worden uitgevoerd
- Uitgeschakelde status tijdens bulkbewerkingen

## Plangebaseerde indieningslimieten

Het Plan Guard-systeem bepaalt hoeveel inzendingen een gebruiker kan doen:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

Om limieten te controleren vóór indiening:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Extra planafhankelijke functies voor inzendingen:

| Kenmerk | Gratis | Standaard | Premie |
|---------|------|----------|---------|
| Artikelen indienen | Ja | Ja | Ja |
| Max. afbeeldingen | 1 | 5 | Onbeperkt |
| Beschrijving woorden | 200 | 500 | Onbeperkt |
| Video-upload | Nee | Nee | Ja |
| Geverifieerde badge | Nee | Ja | Ja |
| Prioriteitsbeoordeling | Nee | Ja | Ja |
| Directe beoordeling | Nee | Nee | Ja |
| Beoordelingstijd (dagen) | 7 | 3 | 1 |

## Inzendingsworkflow

1. **Gebruiker dient in** - Vult het uit meerdere stappen bestaande indieningsformulier in
2. **Validatie** -- Planlimieten en invoervalidatie worden gecontroleerd
3. **Opslag** -- Artikelgegevens worden via de artikelservice opgeslagen in het op Git gebaseerde CMS
4. **Status: In behandeling** -- De inzending komt in de wachtrij voor beheerdersbeoordeling
5. **Beheerderbeoordeling** -- De beheerder keurt het goed of af met optionele opmerkingen
6. **Status: Goedgekeurd/Afgewezen** - De gebruiker ziet de bijgewerkte status op zijn dashboard
7. **Bewerken** - Gebruikers kunnen inzendingen bewerken (binnen de limieten voor planwijzigingen)
8. **Verwijderen** - Gebruikers kunnen hun eigen inzendingen verwijderen via een bevestigingsvenster

## Internationalisering

Alle UI-tekst gebruikt `next-intl` vertalingen onder de `client.submissions` naamruimte:

- `NO_SUBMISSIONS_TITLE` -- Lege statuskop
- `NO_SUBMISSIONS_DESC` -- Lege statusbeschrijving
- `SUBMIT_FIRST_PROJECT` -- Call-to-action-knop
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- Statuslabels
- `SUBMITTED` -- Datumvoorvoegsel
- `VIEWS_COUNT` , `LIKES_COUNT` -- Metrische labels met telparameter
- `REJECTION_REASON` -- Label voor afwijzing
- `SEARCH_PLACEHOLDER` -- Tijdelijke aanduiding voor zoekinvoer
- `SHOWING_RESULTS` , `PAGE_INFO` -- Pagineringstekst

## Gerelateerde documentatie

- [Multi-Step Forms](/docs/template/features/multi-step-forms) -- Implementatie van indieningsformulier
- [Beheerderbeheer](/docs/template/features/admin-management) -- Workflow voor beheerdersbeoordeling
- [Stemmen en opmerkingen](/docs/template/features/voting-comments) -- Betrokkenheid bij inzendingen
