---
id: admin-management
title: Beheerder beheer
sidebar_label: Beheerder beheer
sidebar_position: 25
---

# Beheerderbeheer

Het beheerdersdashboard biedt een uitgebreide beheerinterface voor site-exploitanten. Het omvat statistieken, analyses, contentmoderatie, gebruikersbeheer en systeeminstellingen - georganiseerd in een lay-out met tabbladen met ingebouwde toegankelijkheidsfuncties.

## Architectuuroverzicht

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

## Dashboardpagina

Het beheerdersingangspunt is eenvoudig: `app/[locale]/admin/page.tsx` geeft de dashboardcomponent weer:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Dashboardcomponent

De component `AdminDashboard` bij `components/admin/admin-dashboard.tsx` organiseert de inhoud in vijf tabbladen:

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

### Tabstructuur

| Tabblad | Inhoud |
|-----|---------|
| **Overzicht** | Overzichtskaarten voor statistieken, uitsplitsing van de status van de inzending |
| **Analytics** | Activiteitstrendgrafiek, topitems, recente activiteitenfeed, geografische spreiding |
| **Prestaties** | Dashboard voor prestatiemonitoring |
| **Rapporten** | Tools voor gegevensexport en het genereren van rapporten |
| **Hulpmiddelen** | Snel toegankelijke beheerdersfunctiekaarten |

### Toegankelijkheidsfuncties

Het dashboard bevat uitgebreide toegankelijkheidsondersteuning:

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

### Foutisolatie

Elke dashboardsectie is verpakt in een eigen `AdminErrorBoundary` , zodat een fout in één widget niet het hele dashboard laat crashen:

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

Mobiele gebruikers kunnen naar beneden gaan om dashboardgegevens te vernieuwen:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Beheerstatistieken Hook

De `hooks/use-admin-stats.ts` -haak haalt dashboardstatistieken op:

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

## Toestemmingssysteem

Beheerdersroutes worden beschermd door een op rollen gebaseerd toestemmingssysteem. De `lib/middleware/permission-check.ts` -module zorgt voor een fijnmazige toegangscontrole:

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

Toestemmingsreeksen volgen het formaat `resource:action` (bijvoorbeeld `items:approve` , `users:assignRoles` , `analytics:export` ).

## Beheersubmodules

Elke beheerderssectie heeft zijn eigen routegroep en componentenset:

### Gebruikersbeheer ( `admin/users/` )
- Lijst, zoek en filter gebruikers
- Bekijk gebruikersgegevens en activiteit
- Wijs rollen en machtigingen toe
- Accounts opschorten of verwijderen

### Inhoudsmoderatie ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Beoordeel openstaande inzendingen
- Artikelen goedkeuren of afwijzen
- Behandel gerapporteerde inhoud
- Matige opmerkingen

### Categorie- en tagbeheer ( `admin/categories/` , `admin/tags/` )
- Volledige CRUD-bewerkingen
- Nabestellen via sorteervolgorde
- Ondersteuning voor zacht verwijderen en hard verwijderen

### Rolbeheer ( `admin/roles/` )
- Rollen maken en bewerken
- Wijs gedetailleerde machtigingen toe
- Bekijk roltoewijzingen

### Instellingen ( `admin/settings/` )
- Siteconfiguratie
- Functievlagbeheer
- Integratie-instellingen

## Beheerdershaken

De sjabloon biedt speciale hooks voor elk beheerdersdomein:

| Haak | Doel |
|------|---------|
| `useAdminStats` | Dashboardstatistieken |
| `useAdminUsers` | Gebruikersbeheer CRUD |
| `useAdminItems` | Artikelbeheer CRUD |
| `useAdminCategories` | Categoriebeheer CRUD |
| `useAdminTags` | Tagbeheer CRUD |
| `useAdminCollections` | Collectiebeheer CRUD |
| `useAdminComments` | Moderatie van reacties |
| `useAdminReports` | Rapportafhandeling |
| `useAdminRoles` | Beheer van rollen en rechten |
| `useAdminNotifications` | Meldingsbeheer |
| `useAdminFeaturedItems` | Beheer van aanbevolen artikelen |
| `useAdminSponsorAds` | Beheer van sponsoradvertenties |
| `useAdminFilters` | Filterconfiguratie |
| `useAdminCompanies` | Bedrijfsleiding |
| `useAdminClients` | Klantenbeheer |

## Internationalisering

Alle strings van de beheerdersinterface worden vertaald via `next-intl` met behulp van de `admin.DASHBOARD` naamruimte:

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Bestandsreferentie

| Bestand | Doel |
|------|---------|
| `app/[locale]/admin/page.tsx` | Pagina voor beheerdersinvoer |
| `app/[locale]/admin/layout.tsx` | Beheerdersindeling met zijbalk |
| `components/admin/admin-dashboard.tsx` | Hoofddashboardcomponent |
| `components/admin/admin-accessibility.tsx` | Links, oriëntatiepunten, rubrieken overslaan |
| `components/admin/admin-error-boundary.tsx` | Bereikte foutgrens |
| `components/admin/admin-responsive.tsx` | Responsieve netwerkvoorzieningen |
| `components/admin/admin-touch-interactions.tsx` | Ondersteuning voor pull-to-refresh |
| `hooks/use-admin-stats.ts` | Hook voor dashboardstatistieken |
| `lib/middleware/permission-check.ts` | Toestemmingsverificatie |
