---
id: admin-management
title: Gestión administrativa
sidebar_label: Gestión administrativa
sidebar_position: 25
---

# Gestión administrativa

El panel de administración proporciona una interfaz de gestión integral para los operadores del sitio. Incluye estadísticas, análisis, moderación de contenido, administración de usuarios y configuraciones del sistema, organizados en un diseño en pestañas con funciones de accesibilidad integradas.

## Descripción general de la arquitectura

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

## Página del panel

El punto de entrada del administrador es simple: `app/[locale]/admin/page.tsx` representa el componente del panel:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Componente del panel

El componente `AdminDashboard` en `components/admin/admin-dashboard.tsx` organiza el contenido en cinco pestañas:

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

### Estructura de pestañas

| Pestaña | Contenido |
|-----|---------|
| **Descripción general** | Tarjetas de descripción general de estadísticas, desglose del estado de envío |
| **Análisis** | Gráfico de tendencias de actividad, elementos principales, feed de actividad reciente, distribución geográfica |
| **Rendimiento** | Panel de seguimiento del rendimiento |
| **Informes** | Herramientas de exportación de datos y generación de informes |
| **Herramientas** | Tarjetas de funciones de administración de acceso rápido |

### Funciones de accesibilidad

El panel incluye soporte integral de accesibilidad:

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

### Aislamiento de errores

Cada sección del panel está envuelta en su propio `AdminErrorBoundary` , por lo que una falla en un widget no bloquea todo el panel:

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

### Tirar para actualizar

Los usuarios de dispositivos móviles pueden desplegar para actualizar los datos del panel:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Gancho de estadísticas de administrador

El gancho `hooks/use-admin-stats.ts` recupera estadísticas del panel:

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

## Sistema de permisos

Las rutas de administración están protegidas por un sistema de permisos basado en roles. El módulo `lib/middleware/permission-check.ts` proporciona un control de acceso detallado:

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

Las cadenas de permiso siguen el formato `resource:action` (por ejemplo, `items:approve` , `users:assignRoles` , `analytics:export` ).

## Submódulos de administración

Cada sección de administración tiene su propio grupo de rutas y conjunto de componentes:

### Gestión de usuarios ( `admin/users/` )
- Listar, buscar y filtrar usuarios.
- Ver detalles y actividad del usuario.
- Asignar roles y permisos.
- Suspender o eliminar cuentas

### Moderación de contenido ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Revisar envíos pendientes
- Aprobar o rechazar artículos
- Manejar el contenido reportado
- Comentarios moderados

### Gestión de categorías y etiquetas ( `admin/categories/` , `admin/tags/` )
- Operaciones CRUD completas
- Reordenar mediante orden de clasificación
- Soporte de eliminación temporal y eliminación permanente

### Gestión de roles ( `admin/roles/` )
- Crear y editar roles.
- Asignar permisos granulares
- Ver asignaciones de roles

### Configuración ( `admin/settings/` )
- Configuración del sitio
- Gestión de indicadores de funciones
- Configuración de integración

## Ganchos de administración

La plantilla proporciona enlaces dedicados para cada dominio de administración:

| Gancho | Propósito |
|------|---------|
| `useAdminStats` | Estadísticas del panel |
| `useAdminUsers` | Gestión de usuarios CRUD |
| `useAdminItems` | Gestión de artículos CRUD |
| `useAdminCategories` | Gestión de categorías CRUD |
| `useAdminTags` | Gestión de etiquetas CRUD |
| `useAdminCollections` | Gestión de cobros CRUD |
| `useAdminComments` | Moderación de comentarios |
| `useAdminReports` | Manejo de informes |
| `useAdminRoles` | Gestión de roles y permisos |
| `useAdminNotifications` | Gestión de notificaciones |
| `useAdminFeaturedItems` | Gestión de artículos destacados |
| `useAdminSponsorAds` | Gestión de publicidad de patrocinadores |
| `useAdminFilters` | Configuración de filtro |
| `useAdminCompanies` | Gestión de empresas |
| `useAdminClients` | Gestión de clientes |

## Internacionalización

Todas las cadenas de la interfaz de usuario del administrador se traducen a través de `next-intl` usando el espacio de nombres `admin.DASHBOARD` :

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Referencia de archivo

| Archivo | Propósito |
|------|---------|
| `app/[locale]/admin/page.tsx` | Página de entrada de administrador |
| `app/[locale]/admin/layout.tsx` | Diseño de administración con barra lateral |
| `components/admin/admin-dashboard.tsx` | Componente principal del tablero |
| `components/admin/admin-accessibility.tsx` | Saltar enlaces, puntos de referencia, encabezados |
| `components/admin/admin-error-boundary.tsx` | Límite de error de ámbito |
| `components/admin/admin-responsive.tsx` | Utilidades de red responsivas |
| `components/admin/admin-touch-interactions.tsx` | Soporte de extracción para actualizar |
| `hooks/use-admin-stats.ts` | Gancho de estadísticas del panel |
| `lib/middleware/permission-check.ts` | Verificación de permisos |
