---
id: admin-management
title: Gerenciamento administrativo
sidebar_label: Gerenciamento administrativo
sidebar_position: 25
---

# Gerenciamento administrativo

O painel de administração fornece uma interface de gerenciamento abrangente para operadores de site. Inclui estatísticas, análises, moderação de conteúdo, gerenciamento de usuários e configurações do sistema – organizados em um layout de guias com recursos de acessibilidade integrados.

## Visão geral da arquitetura

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

## Página do painel

O ponto de entrada do administrador é simples: `app/[locale]/admin/page.tsx` renderiza o componente do painel:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Componente do painel

O componente `AdminDashboard` em `components/admin/admin-dashboard.tsx` organiza o conteúdo em cinco abas:

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

### Estrutura da guia

| Guia | Conteúdo |
|-----|---------|
| **Visão geral** | Cartões de visão geral de estatísticas, detalhamento do status de envio |
| **Análise** | Gráfico de tendências de atividades, itens principais, feed de atividades recentes, distribuição geográfica |
| **Desempenho** | Painel de monitoramento de desempenho |
| **Relatórios** | Ferramentas de exportação de dados e geração de relatórios |
| **Ferramentas** | Cartões de recursos de administração de acesso rápido |

### Recursos de acessibilidade

O painel inclui suporte abrangente de acessibilidade:

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

### Isolamento de erros

Cada seção do painel é encapsulada em seu próprio `AdminErrorBoundary` , portanto, uma falha em um widget não trava todo o painel:

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

### Puxar para atualizar

Os usuários móveis podem baixar para atualizar os dados do painel:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Gancho de estatísticas do administrador

O gancho `hooks/use-admin-stats.ts` busca estatísticas do painel:

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

## Sistema de permissão

As rotas administrativas são protegidas por um sistema de permissão baseado em funções. O módulo `lib/middleware/permission-check.ts` fornece controle de acesso refinado:

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

As strings de permissão seguem o formato `resource:action` (por exemplo, `items:approve` , `users:assignRoles` , `analytics:export` ).

## Submódulos de administração

Cada seção administrativa tem seu próprio grupo de rotas e conjunto de componentes:

### Gerenciamento de usuários ( `admin/users/` )
- Listar, pesquisar e filtrar usuários
- Ver detalhes e atividades do usuário
- Atribuir funções e permissões
- Suspender ou excluir contas

### Moderação de conteúdo ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Analisar envios pendentes
- Aprovar ou rejeitar itens
- Lidar com conteúdo denunciado
- Comentários moderados

### Gerenciamento de categorias e tags ( `admin/categories/` , `admin/tags/` )
- Operações CRUD completas
- Reordenar via ordem de classificação
- Suporte para exclusão reversível e exclusão definitiva

### Gerenciamento de funções ( `admin/roles/` )
- Criar e editar funções
- Atribuir permissões granulares
- Ver atribuições de funções

### Configurações ( `admin/settings/` )
- Configuração do local
- Gerenciamento de sinalizadores de recursos
- Configurações de integração

## Ganchos de administração

O modelo fornece ganchos dedicados para cada domínio administrativo:

| Gancho | Finalidade |
|------|---------|
| `useAdminStats` | Estatísticas do painel |
| `useAdminUsers` | Gerenciamento de usuários CRUD |
| `useAdminItems` | Gerenciamento de itens CRUD |
| `useAdminCategories` | Gerenciamento de categorias CRUD |
| `useAdminTags` | Gerenciamento de tags CRUD |
| `useAdminCollections` | Gestão de coleções CRUD |
| `useAdminComments` | Moderação de comentários |
| `useAdminReports` | Tratamento de relatórios |
| `useAdminRoles` | Gerenciamento de funções e permissões |
| `useAdminNotifications` | Gerenciamento de notificações |
| `useAdminFeaturedItems` | Gerenciamento de itens em destaque |
| `useAdminSponsorAds` | Gestão de anúncios de patrocinadores |
| `useAdminFilters` | Configuração de filtro |
| `useAdminCompanies` | Gestão de empresas |
| `useAdminClients` | Gestão de clientes |

## Internacionalização

Todas as strings da UI administrativa são traduzidas via `next-intl` usando o namespace `admin.DASHBOARD` :

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Referência de arquivo

| Arquivo | Finalidade |
|------|---------|
| `app/[locale]/admin/page.tsx` | Página de entrada do administrador |
| `app/[locale]/admin/layout.tsx` | Layout de administração com barra lateral |
| `components/admin/admin-dashboard.tsx` | Componente principal do painel |
| `components/admin/admin-accessibility.tsx` | Pular links, pontos de referência, títulos |
| `components/admin/admin-error-boundary.tsx` | Limite de erro com escopo definido |
| `components/admin/admin-responsive.tsx` | Utilitários de rede responsivos |
| `components/admin/admin-touch-interactions.tsx` | Suporte pull-to-refresh |
| `hooks/use-admin-stats.ts` | Gancho de estatísticas do painel |
| `lib/middleware/permission-check.ts` | Verificação de permissão |
