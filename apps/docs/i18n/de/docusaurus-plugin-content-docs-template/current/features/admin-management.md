---
id: admin-management
title: Admin-Management
sidebar_label: Admin-Management
sidebar_position: 25
---

# Admin-Verwaltung

Das Admin-Dashboard bietet eine umfassende Verwaltungsoberfläche für Site-Betreiber. Es umfasst Statistiken, Analysen, Inhaltsmoderation, Benutzerverwaltung und Systemeinstellungen – organisiert in einem Tab-Layout mit integrierten Barrierefreiheitsfunktionen.

## Architekturübersicht

```
app/[locale]/admin/
  page.tsx             -- Renders AdminDashboard
  layout.tsx           -- Admin layout with sidebar navigation
  categories/          -- Category management pages
  clients/             -- Client management
  collections/         -- Collection management
  comments/            -- Comment moderation
  companies/           -- Company management
  featured-items/      -- Featured items management
  items/               -- Item management
  reports/             -- Report handling
  roles/               -- Role & permission management
  settings/            -- System settings
  sponsorships/        -- Sponsorship management
  surveys/             -- Survey management
  tags/                -- Tag management
  users/               -- User management

components/admin/
  admin-dashboard.tsx              -- Main dashboard component
  admin-stats-overview.tsx         -- Stats cards
  admin-activity-chart.tsx         -- Activity trend charts
  admin-submission-status.tsx      -- Submission status visualization
  admin-recent-activity.tsx        -- Recent activity feed
  admin-top-items.tsx              -- Top items list
  admin-features-grid.tsx          -- Quick-access feature cards
  admin-performance-monitor.tsx    -- Performance monitoring
  admin-data-export.tsx            -- Data export tools
  admin-notifications.tsx          -- Notification center
  admin-error-boundary.tsx         -- Scoped error boundary
  admin-accessibility.tsx          -- Accessibility utilities
  admin-responsive.tsx             -- Responsive grid helpers
  admin-touch-interactions.tsx     -- Touch gesture support
  admin-welcome-section.tsx        -- Welcome header
```

## Dashboard-Seite

Der Admin-Einstiegspunkt ist einfach: `app/[locale]/admin/page.tsx` rendert die Dashboard-Komponente:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Dashboard-Komponente

Die `AdminDashboard` -Komponente bei `components/admin/admin-dashboard.tsx` organisiert Inhalte in fünf Registerkarten:

```tsx
// components/admin/admin-dashboard.tsx
export function AdminDashboard() {
  const t = useTranslations('admin.DASHBOARD');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'performance' | 'reports' | 'tools'
  >('overview');

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminStats();

  // ...
}
```

### Tab-Struktur

| Tab | Inhalt |
|-----|---------|
| **Übersicht** | Statistikübersichtskarten, Aufschlüsselung des Einreichungsstatus |
| **Analytik** | Aktivitätstrenddiagramm, Top-Elemente, aktueller Aktivitäts-Feed, geografische Verteilung |
| **Leistung** | Dashboard zur Leistungsüberwachung |
| **Berichte** | Tools für den Datenexport und die Berichterstellung |
| **Werkzeuge** | Admin-Funktionskarten für den Schnellzugriff |

### Barrierefreiheitsfunktionen

Das Dashboard bietet umfassende Unterstützung für Barrierefreiheit:

```tsx
{/* Skip navigation links */}
<AdminSkipLink href="#main-content">Skip to main content</AdminSkipLink>
<AdminSkipLink href="#dashboard-stats">Skip to statistics</AdminSkipLink>
<AdminSkipLink href="#dashboard-charts">Skip to charts</AdminSkipLink>

{/* Screen reader announcements */}
<AdminStatusAnnouncer
  message={srMessage}
  priority={isError ? 'assertive' : 'polite'}
/>

{/* ARIA landmarks and semantic structure */}
<AdminLandmark as="section" label="Dashboard Statistics" id="dashboard-stats">
  <AdminHeading level={2} visualLevel={3}>
    Dashboard Statistics
  </AdminHeading>
  <AdminErrorBoundary>
    <AdminStatsOverview stats={stats} />
  </AdminErrorBoundary>
</AdminLandmark>
```

### Fehlerisolierung

Jeder Dashboard-Abschnitt ist in ein eigenes `AdminErrorBoundary` eingeschlossen, sodass ein Fehler in einem Widget nicht zum Absturz des gesamten Dashboards führt:

```tsx
<AdminResponsiveGrid cols={2} gap="lg">
  <AdminErrorBoundary>
    <AdminActivityChart data={stats?.activityTrendData || []} />
  </AdminErrorBoundary>
  <AdminErrorBoundary>
    <AdminTopItems data={stats?.topItemsData || []} />
  </AdminErrorBoundary>
</AdminResponsiveGrid>
```

### Pull-to-Refresh

Mobile Benutzer können nach unten ziehen, um die Dashboard-Daten zu aktualisieren:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Admin-Statistik-Hook

Der `hooks/use-admin-stats.ts` -Hook ruft Dashboard-Statistiken ab:

```tsx
// hooks/use-admin-stats.ts
export interface AdminStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalViews: number;
  totalVotes: number;
  totalComments: number;
  totalSubscribers: number;
  // Trend data arrays for charts
  userGrowthData: { month: string; users: number; active: number }[];
  activityTrendData: { day: string; views: number; votes: number }[];
  topItemsData: { name: string; views: number; votes: number }[];
  recentActivity: { type: string; description: string; timestamp: string }[];
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/admin/dashboard/stats', {
        signal,
        credentials: 'include',
      });
      if (!response.ok) throw new HttpError(message, response.status);
      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof HttpError && error.status < 500) return false;
      return failureCount < 3;
    },
  });
}
```

## Berechtigungssystem

Admin-Routen werden durch ein rollenbasiertes Berechtigungssystem geschützt. Das `lib/middleware/permission-check.ts` -Modul bietet eine differenzierte Zugangskontrolle:

```tsx
// Permission check functions
hasPermission(userPerms, 'items:review')
hasAnyPermission(userPerms, ['users:read', 'users:create'])
hasAllPermissions(userPerms, ['roles:read', 'roles:update'])
canManageResource(userPerms, 'categories')
canManageUsers(userPerms)
canManageRoles(userPerms)
canViewAnalytics(userPerms)
isSuperAdmin(userPerms)
```

Berechtigungszeichenfolgen folgen dem `resource:action` -Format (z. B. `items:approve` , `users:assignRoles` , `analytics:export` ).

## Admin-Untermodule

Jeder Admin-Bereich verfügt über eine eigene Routengruppe und einen eigenen Komponentensatz:

### Benutzerverwaltung ( `admin/users/` )
- Benutzer auflisten, suchen und filtern
- Benutzerdetails und Aktivitäten anzeigen
- Weisen Sie Rollen und Berechtigungen zu
- Konten sperren oder löschen

### Inhaltsmoderation ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Überprüfen Sie ausstehende Einreichungen
- Artikel genehmigen oder ablehnen
- Behandeln Sie gemeldete Inhalte
- Moderate Kommentare

### Kategorie- und Tag-Management ( `admin/categories/` , `admin/tags/` )
- Vollständige CRUD-Operationen
- Neuordnung über Sortierreihenfolge
- Unterstützung für Soft-Delete und Hard-Delete

### Rollenverwaltung ( `admin/roles/` )
- Rollen erstellen und bearbeiten
- Weisen Sie detaillierte Berechtigungen zu
- Rollenzuweisungen anzeigen

### Einstellungen ( `admin/settings/` )
- Site-Konfiguration
- Feature-Flag-Verwaltung
- Integrationseinstellungen

## Admin-Hooks

Die Vorlage stellt dedizierte Hooks für jede Admin-Domäne bereit:

| Haken | Zweck |
|------|---------|
| `useAdminStats` | Dashboard-Statistiken |
| `useAdminUsers` | Benutzerverwaltung CRUD |
| `useAdminItems` | Artikelverwaltung CRUD |
| `useAdminCategories` | Kategoriemanagement CRUD |
| `useAdminTags` | Tag-Management CRUD |
| `useAdminCollections` | Sammlungsverwaltung CRUD |
| `useAdminComments` | Kommentarmoderation |
| `useAdminReports` | Berichtsbearbeitung |
| `useAdminRoles` | Rollen- und Berechtigungsverwaltung |
| `useAdminNotifications` | Benachrichtigungsverwaltung |
| `useAdminFeaturedItems` | Verwaltung hervorgehobener Artikel |
| `useAdminSponsorAds` | Verwaltung von Sponsorenanzeigen |
| `useAdminFilters` | Filterkonfiguration |
| `useAdminCompanies` | Unternehmensführung |
| `useAdminClients` | Kundenverwaltung |

## Internationalisierung

Alle Admin-UI-Strings werden über `next-intl` unter Verwendung des `admin.DASHBOARD` -Namespace übersetzt:

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Dateireferenz

| Datei | Zweck |
|------|---------|
| `app/[locale]/admin/page.tsx` | Admin-Eintragsseite |
| `app/[locale]/admin/layout.tsx` | Admin-Layout mit Seitenleiste |
| `components/admin/admin-dashboard.tsx` | Haupt-Dashboard-Komponente |
| `components/admin/admin-accessibility.tsx` | Überspringen Sie Links, Sehenswürdigkeiten und Überschriften |
| `components/admin/admin-error-boundary.tsx` | Bereichsbezogene Fehlergrenze |
| `components/admin/admin-responsive.tsx` | Reaktionsfähige Netzversorgungsunternehmen |
| `components/admin/admin-touch-interactions.tsx` | Pull-to-Refresh-Unterstützung |
| `hooks/use-admin-stats.ts` | Dashboard-Statistik-Hook |
| `lib/middleware/permission-check.ts` | Berechtigungsüberprüfung |
