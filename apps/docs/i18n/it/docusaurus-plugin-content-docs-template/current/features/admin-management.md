---
id: admin-management
title: Gestione amministrativa
sidebar_label: Gestione amministrativa
sidebar_position: 25
---

# Gestione amministrativa

Il dashboard di amministrazione fornisce un'interfaccia di gestione completa per gli operatori del sito. Include statistiche, analisi, moderazione dei contenuti, gestione degli utenti e impostazioni di sistema, organizzate in un layout a schede con funzionalità di accessibilità integrate.

## Panoramica dell'architettura

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

## Pagina del dashboard

Il punto di ingresso dell'amministratore è semplice: `app/[locale]/admin/page.tsx` esegue il rendering del componente dashboard:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Componente del dashboard

Il componente `AdminDashboard` in `components/admin/admin-dashboard.tsx` organizza il contenuto in cinque schede:

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

### Struttura delle schede

| Scheda | Contenuto |
|-----|---------|
| **Panoramica** | Schede di panoramica delle statistiche, suddivisione dello stato di invio |
| **Analisi** | Grafico dell'andamento delle attività, elementi principali, feed delle attività recenti, distribuzione geografica |
| **Prestazioni** | Cruscotto di monitoraggio delle prestazioni |
| **Rapporti** | Strumenti per l'esportazione dei dati e la generazione di report |
| **Strumenti** | Schede delle funzionalità di amministrazione ad accesso rapido |

### Funzionalità di accessibilità

Il dashboard include il supporto completo per l'accessibilità:

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

### Isolamento degli errori

Ogni sezione del dashboard è racchiusa nel proprio `AdminErrorBoundary` , quindi un errore in un widget non provoca l'arresto anomalo dell'intero dashboard:

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

Gli utenti mobili possono accedere per aggiornare i dati del dashboard:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Hook statistiche amministrative

Il gancio `hooks/use-admin-stats.ts` recupera le statistiche del dashboard:

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

## Sistema di autorizzazione

I percorsi amministrativi sono protetti da un sistema di autorizzazioni basato sui ruoli. Il modulo `lib/middleware/permission-check.ts` fornisce un controllo degli accessi capillare:

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

Le stringhe di autorizzazione seguono il formato `resource:action` (ad esempio, `items:approve` , `users:assignRoles` , `analytics:export` ).

## Sottomoduli di amministrazione

Ogni sezione di amministrazione ha il proprio gruppo di percorsi e set di componenti:

### Gestione utenti ( `admin/users/` )
- Elenca, cerca e filtra gli utenti
- Visualizza i dettagli e l'attività dell'utente
- Assegnare ruoli e autorizzazioni
- Sospendere o eliminare gli account

### Moderazione dei contenuti ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Esaminare le proposte in sospeso
- Approvare o rifiutare gli articoli
- Gestire i contenuti segnalati
- Moderare i commenti

### Gestione categorie e tag ( `admin/categories/` , `admin/tags/` )
- Operazioni CRUD complete
- Riordina tramite ordinamento
- Supporto per l'eliminazione temporanea e l'eliminazione definitiva

### Gestione dei ruoli ( `admin/roles/` )
- Creare e modificare ruoli
- Assegnare autorizzazioni granulari
- Visualizza le assegnazioni di ruolo

### Impostazioni ( `admin/settings/` )
- Configurazione del sito
- Gestione dei flag di funzionalità
- Impostazioni di integrazione

## Hook amministrativi

Il modello fornisce hook dedicati per ciascun dominio di amministrazione:

| Gancio | Scopo |
|------|---------|
| `useAdminStats` | Statistiche del dashboard |
| `useAdminUsers` | Gestione utenti CRUD |
| `useAdminItems` | Gestione articoli CRUD |
| `useAdminCategories` | Gestione delle categorie CRUD |
| `useAdminTags` | Gestione tag CRUD |
| `useAdminCollections` | Gestione collezioni CRUD |
| `useAdminComments` | Moderazione dei commenti |
| `useAdminReports` | Gestione dei rapporti |
| `useAdminRoles` | Gestione ruoli e autorizzazioni |
| `useAdminNotifications` | Gestione delle notifiche |
| `useAdminFeaturedItems` | Gestione degli articoli in evidenza |
| `useAdminSponsorAds` | Gestione pubblicità sponsor |
| `useAdminFilters` | Configurazione filtro |
| `useAdminCompanies` | Gestione aziendale |
| `useAdminClients` | Gestione clienti |

## Internazionalizzazione

Tutte le stringhe dell'interfaccia utente di amministrazione vengono tradotte tramite `next-intl` utilizzando lo spazio dei nomi `admin.DASHBOARD` :

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Riferimento al file

| File | Scopo |
|------|---------|
| `app/[locale]/admin/page.tsx` | Pagina di ingresso dell'amministratore |
| `app/[locale]/admin/layout.tsx` | Layout di amministrazione con barra laterale |
| `components/admin/admin-dashboard.tsx` | Componente principale del cruscotto |
| `components/admin/admin-accessibility.tsx` | Salta collegamenti, punti di riferimento, intestazioni |
| `components/admin/admin-error-boundary.tsx` | Limite dell'errore con ambito |
| `components/admin/admin-responsive.tsx` | Utilità di rete reattive |
| `components/admin/admin-touch-interactions.tsx` | Supporto pull-to-refresh |
| `hooks/use-admin-stats.ts` | Gancio statistiche dashboard |
| `lib/middleware/permission-check.ts` | Verifica autorizzazione |
