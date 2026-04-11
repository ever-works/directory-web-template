---
id: item-submissions
title: Artikeleinreichungen
sidebar_label: Artikeleinreichungen
sidebar_position: 31
---

# Artikeleinreichungen

Das Artikeleinreichungssystem bietet Benutzern einen vollständigen Arbeitsablauf zum Einreichen, Verwalten und Verfolgen von Verzeichniseinträgen. Es umfasst Statusverfolgung (ausstehend, genehmigt, abgelehnt), Filterung, Statistikkarten, Detailmodalitäten, Bearbeitungsmodalitäten und Löschung mit Bestätigung.

## Architekturübersicht

| Modul | Pfad | Zweck |
|--------|------|---------|
| Einreichungsliste | `components/submissions/submission-list.tsx` | Hauptlistenkomponente mit Paginierung |
| SubmissionItem | `components/submissions/submission-item.tsx` | Individuelle Einreichungskarte |
| SubmissionFilters | `components/submissions/submission-filters.tsx` | Statusregisterkarten und Suche |
| SubmissionStatsCards | `components/submissions/submission-stats-cards.tsx` | Übersicht der Statistikkarten |
| EditSubmissionModal | `components/submissions/edit-submission-modal.tsx` | Modale Inline-Bearbeitung |
| SubmissionDetailModal | `components/submissions/submission-detail-modal.tsx` | Schreibgeschützte Detailansicht |
| DeleteSubmissionDialog | `components/submissions/delete-submission-dialog.tsx` | Löschbestätigung |
| TrashItem | `components/submissions/trash-item.tsx` | Anzeige gelöschter Elemente |
| Planschutz | `lib/guards/plan-features.guard.ts` | Einreichungsgrenzen nach Plan |

## Übermittlungsdatenmodell

Die `Submission` -Schnittstelle stellt eine Übermittlung in der Benutzeroberfläche dar:

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

Der `toSubmission` -Helfer konvertiert aus dem API-Datenmodell:

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

## Einreichungslistenkomponente

Die `SubmissionList` -Komponente rendert die Liste der Übermittlungen mit den Status „Laden“, „Leer“ und „Bevölkert“:

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

Wichtige Verhaltensweisen:

- **Ladezustand** – rendert `SubmissionItemSkeleton` Platzhalter
- **Leerer Zustand** – zeigt einen Call-to-Action an, der mit `/submit` verknüpft ist
- **Bevölkerter Zustand** – ordnet Elemente bis `toSubmission()` zu und rendert `SubmissionItem` für jedes
- **Optimistische Ladeindikatoren** – `deletingId` und `updatingId` deaktivieren betroffene Gegenstände

Die `SubmissionListWithInfo` -Variante fügt die Anzeige von Paginierungsmetadaten hinzu.

## Statuskonfiguration

Jeder Übermittlungsstatus ist einem Symbol, einem Farbschema und einem Übersetzungsschlüssel zugeordnet:

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

Bei abgelehnten Einreichungen wird der Ablehnungsgrund in einem roten Callout-Feld angezeigt.

## Einreichungsfilter

Die `SubmissionFilters` -Komponente bietet Statusfilterung und Textsuche im Tab-Stil:

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

Eigenschaften:

- **Statusregisterkarten** – Pillenschaltflächen für „Alle“, „Genehmigt“, „Ausstehend“ und „Abgelehnt“ mit optionalen Zählabzeichen
- **Sucheingabe** – Volltextsuche mit Schaltfläche „Löschen“ und Lade-Spinner
- **Kompakte Variante** – `SubmissionFiltersCompact` verwendet eine Dropdown-Auswahl für Layouts mit begrenztem Platzangebot

## Statistikkarten

Die Komponente `SubmissionStatsCards` zeigt vier Statistikkarten in einem Raster an:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

Die vier Karten zeigen:

| Karte | Schlüssel | Farbe |
|------|-----|-------|
| Gesamteinreichungen | `total` | Blau |
| Genehmigt | `approved` | Grün |
| Ausstehend | `pending` | Gelb |
| Abgelehnt | `rejected` | Rot |

Jede Karte verfügt über einen Verlaufssymbolhintergrund, ein animiertes Ladeskelett und einen Schwebeschatteneffekt.

## Einreichungsartikelkarte

Jedes `SubmissionItem` ergibt:

- Titel mit Statusabzeichen
- Verkürzte Beschreibung (zweizeilige Klammer)
- Bis zu 5 Tags mit Überlaufzählung
- Metadatenzeile: Kategorie, Einreichungsdatum, Anzahl der Aufrufe, Anzahl der Likes
- Aktionsschaltflächen: Anzeigen, Bearbeiten, Löschen
- Laden von Spinnern auf Bearbeitungs-/Löschschaltflächen, wenn Vorgänge ausgeführt werden
– Deaktivierter Zustand während Massenvorgängen

## Planbasierte Einreichungsbeschränkungen

Das Planschutzsystem steuert, wie viele Einsendungen ein Benutzer vornehmen kann:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

So überprüfen Sie die Grenzwerte vor der Übermittlung:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Zusätzliche plangesteuerte Funktionen für Einreichungen:

| Funktion | Kostenlos | Standard | Prämie |
|---------|------|----------|---------|
| Artikel einreichen | Ja | Ja | Ja |
| Max. Bilder | 1 | 5 | Unbegrenzt |
| Beschreibungswörter | 200 | 500 | Unbegrenzt |
| Video-Upload | Nein | Nein | Ja |
| Verifiziertes Abzeichen | Nein | Ja | Ja |
| Vorrangige Prüfung | Nein | Ja | Ja |
| Sofortige Bewertung | Nein | Nein | Ja |
| Überprüfungszeit (Tage) | 7 | 3 | 1 |

## Einreichungsworkflow

1. **Benutzer sendet** – Füllt das mehrstufige Übermittlungsformular aus
2. **Validierung** – Plangrenzen und Eingabevalidierung werden überprüft
3. **Speicherung** – Artikeldaten werden über den Artikeldienst im Git-basierten CMS gespeichert
4. **Status: Ausstehend** – Die Übermittlung gelangt in die Administrator-Überprüfungswarteschlange
5. **Administratorüberprüfung** – Der Administrator genehmigt oder lehnt mit optionalen Notizen ab
6. **Status: Genehmigt/Abgelehnt** – Der Benutzer sieht den aktualisierten Status in seinem Dashboard
7. **Bearbeiten** – Benutzer können Einreichungen bearbeiten (innerhalb der Planänderungsgrenzen)
8. **Löschen** – Benutzer können ihre eigenen Einsendungen mit einem Bestätigungsdialog löschen

## Internationalisierung

Der gesamte UI-Text verwendet `next-intl` Übersetzungen unter dem `client.submissions` -Namespace:

- `NO_SUBMISSIONS_TITLE` – Leere Statusüberschrift
- `NO_SUBMISSIONS_DESC` – Leere Zustandsbeschreibung
- `SUBMIT_FIRST_PROJECT` – Call-to-Action-Button
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` – Statusetiketten
- `SUBMITTED` – Datumspräfix
- `VIEWS_COUNT` , `LIKES_COUNT` – Metrikbeschriftungen mit Zählparameter
- `REJECTION_REASON` – Hinweisschild zur Ablehnung
- `SEARCH_PLACEHOLDER` – Platzhalter für Sucheingabe
- `SHOWING_RESULTS` , `PAGE_INFO` – Paginierungstext

## Verwandte Dokumentation

- [Mehrstufige Formulare](/docs/template/features/multi-step-forms) – Implementierung des Einreichungsformulars
– [Admin-Verwaltung](/docs/template/features/admin-management) – Administrator-Überprüfungs-Workflow
- [Abstimmung und Kommentare](/docs/template/features/voting-comments) – Engagement bei Einsendungen
