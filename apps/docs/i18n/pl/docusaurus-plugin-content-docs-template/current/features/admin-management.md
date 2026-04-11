---
id: admin-management
title: Zarządzanie administratorem
sidebar_label: Zarządzanie administratorem
sidebar_position: 25
---

# Zarządzanie administracyjne

Pulpit administratora zapewnia operatorom witryny kompleksowy interfejs zarządzania. Obejmuje statystyki, analizy, moderację treści, zarządzanie użytkownikami i ustawienia systemowe – zorganizowane w układzie zakładek z wbudowanymi funkcjami ułatwień dostępu.

## Przegląd architektury

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

## Strona panelu kontrolnego

Punkt wejścia administratora jest prosty — `app/[locale]/admin/page.tsx` renderuje komponent dashboardu:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Komponent pulpitu nawigacyjnego

Komponent `AdminDashboard` w `components/admin/admin-dashboard.tsx` organizuje zawartość w pięciu zakładkach:

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

### Struktura zakładek

| Zakładka | Treść |
|-----|--------|
| **Przegląd** | Karty przeglądu statystyk, zestawienie statusu zgłoszeń |
| **Analiza** | Wykres trendów aktywności, najważniejsze pozycje, kanał ostatniej aktywności, rozkład geograficzny |
| **Wydajność** | Panel monitorowania wydajności |
| **Raporty** | Narzędzia do eksportu danych i generowania raportów |
| **Narzędzia** | Karty funkcji administracyjnych szybkiego dostępu |

### Funkcje ułatwień dostępu

Pulpit nawigacyjny obejmuje kompleksową obsługę ułatwień dostępu:

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

### Izolacja błędów

Każda sekcja dashboardu jest owinięta własną „0”, więc awaria w jednym widżecie nie spowoduje awarii całego dashboardu:

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

### Pociągnij, aby odświeżyć

Użytkownicy mobilni mogą przeciągnąć w dół, aby odświeżyć dane na pulpicie nawigacyjnym:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Hak statystyk administratora

Hak `hooks/use-admin-stats.ts` pobiera statystyki dashboardu:

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

## System uprawnień

Trasy administracyjne są chronione przez system uprawnień oparty na rolach. Moduł `lib/middleware/permission-check.ts` zapewnia precyzyjną kontrolę dostępu:

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

Ciągi uprawnień mają format `resource:action` (np. `items:approve` , `users:assignRoles` , `analytics:export` ).

## Podmoduły administracyjne

Każda sekcja administracyjna ma własną grupę tras i zestaw komponentów:

### Zarządzanie użytkownikami ( `admin/users/` )
- Wyświetlaj listy, wyszukuj i filtruj użytkowników
- Zobacz szczegóły użytkownika i aktywność
- Przypisz role i uprawnienia
- Zawieś lub usuń konta

### Moderowanie treści ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Przejrzyj oczekujące zgłoszenia
- Zatwierdź lub odrzuć elementy
- Zajmij się zgłoszoną treścią
- Umiarkowane komentarze

### Zarządzanie kategoriami i tagami ( `admin/categories/` , `admin/tags/` )
- Pełne operacje CRUD
- Zmień kolejność za pomocą kolejności sortowania
- Obsługa miękkiego i twardego usuwania

### Zarządzanie rolami ( `admin/roles/` )
- Twórz i edytuj role
- Przypisz szczegółowe uprawnienia
- Zobacz przypisania ról

### Ustawienia ( `admin/settings/` )
- Konfiguracja witryny
- Zarządzanie flagami funkcji
- Ustawienia integracji

## Haki administracyjne

Szablon udostępnia dedykowane hooki dla każdej domeny administracyjnej:

| Hak | Cel |
|------|-------------|
| `useAdminStats` | Statystyki panelu |
| `useAdminUsers` | Zarządzanie użytkownikami CRUD |
| `useAdminItems` | Zarządzanie przedmiotami CRUD |
| `useAdminCategories` | Zarządzanie kategoriami CRUD |
| `useAdminTags` | Zarządzanie tagami CRUD |
| `useAdminCollections` | Zarządzanie zbiorami CRUD |
| `useAdminComments` | Moderowanie komentarzy |
| `useAdminReports` | Obsługa raportów |
| `useAdminRoles` | Zarządzanie rolami i uprawnieniami |
| `useAdminNotifications` | Zarządzanie powiadomieniami |
| `useAdminFeaturedItems` | Zarządzanie wyróżnionymi przedmiotami |
| `useAdminSponsorAds` | Zarządzanie reklamą sponsora |
| `useAdminFilters` | Konfiguracja filtra |
| `useAdminCompanies` | Zarządzanie firmą |
| `useAdminClients` | Zarządzanie klientami |

## Internacjonalizacja

Wszystkie ciągi interfejsu administratora są tłumaczone poprzez `next-intl` przy użyciu przestrzeni nazw `admin.DASHBOARD` :

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Odniesienie do pliku

| Plik | Cel |
|------|-------------|
| `app/[locale]/admin/page.tsx` | Strona wpisu administratora |
| `app/[locale]/admin/layout.tsx` | Układ administratora z paskiem bocznym |
| `components/admin/admin-dashboard.tsx` | Główny element deski rozdzielczej |
| `components/admin/admin-accessibility.tsx` | Pomiń linki, punkty orientacyjne, nagłówki |
| `components/admin/admin-error-boundary.tsx` | Granica błędu o określonym zakresie |
| `components/admin/admin-responsive.tsx` | Responsywne narzędzia sieciowe |
| `components/admin/admin-touch-interactions.tsx` | Obsługa „przeciągnij, aby odświeżyć” |
| `hooks/use-admin-stats.ts` | Hak statystyk panelu |
| `lib/middleware/permission-check.ts` | Weryfikacja uprawnień |
