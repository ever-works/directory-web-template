"use client";

import { useState, useMemo } from "react";
import { Plus, Edit, Trash2, Users, UserCheck, UserX, Shield, ShieldCheck, Loader2, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import UserForm from "@/components/admin/users/user-form";
import { Avatar } from "@/components/header/avatar";
import { UserData } from "@/lib/types/user";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useNavigation } from "@/components/providers";
import { Container } from "@/components/ui/container";
import { UniversalPagination } from "@/components/universal-pagination";
import {
  AdminSearchBar,
  AdminStatusTabs,
  AdminFilterPopover,
  AdminActiveFilters,
  type StatusTabOption,
  type FilterSection,
  type ActiveFilter,
} from "@/components/admin/shared";


export default function AdminUsersPage() {
  const PAGE_SIZE = 10;
  const t = useTranslations("admin.ADMIN_USERS_PAGE");

  const {
    users,
    stats,
    isLoading,
    isFetching,
    isSubmitting,
    isSearching,
    currentPage,
    totalPages,
    totalUsers,
    searchTerm,
    roleFilter,
    statusFilter,
    hasActiveSearch,
    deleteUser,
    handlePageChange,
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    clearAllFilters,
  } = useAdminUsers({ page: 1, limit: PAGE_SIZE, role: "", status: "" });

  const hasNonStatusFilters = !!roleFilter || hasActiveSearch;

  const displayUsers = users;
  const displayStats = stats;

  const statusOptions = useMemo<StatusTabOption<"active" | "inactive">[]>(() => [
    { value: "", label: t("ALL_STATUSES"), count: hasNonStatusFilters ? totalUsers : displayStats.total },
    { value: "active",   label: t("ACTIVE"),   count: hasNonStatusFilters ? undefined : displayStats.active },
    { value: "inactive", label: t("INACTIVE"), count: hasNonStatusFilters ? undefined : displayStats.inactive },
  ], [t, displayStats, totalUsers, hasNonStatusFilters]);

  const roleFilterSections = useMemo<FilterSection<string>[]>(() => [
    {
      id: "role",
      label: t("ROLE_SECTION_LABEL"),
      type: "radio",
      options: [
        { id: "admin",  label: t("ADMIN"),  icon: <ShieldCheck className="w-3.5 h-3.5" /> },
        { id: "client", label: t("CLIENT"), icon: <Shield className="w-3.5 h-3.5" /> },
      ],
      selectedValues: roleFilter ? [roleFilter] : [],
      onChange: (values) => setRoleFilter(values[0] || ""),
    },
  ], [t, roleFilter, setRoleFilter]);

  const activeFiltersDisplay = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (searchTerm.trim().length >= 2)
      filters.push({ id: "search", type: "search", label: t("SEARCH_LABEL"), value: searchTerm.trim() });
    if (statusFilter)
      filters.push({
        id: `status:${statusFilter}`,
        type: "status",
        label: t("STATUS_LABEL"),
        value: statusFilter === "active" ? t("ACTIVE") : t("INACTIVE"),
        icon: statusFilter === "active" ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />,
      });
    if (roleFilter) {
      const roleLabels: Record<string, string> = { admin: t("ADMIN"), client: t("CLIENT") };
      filters.push({ id: `role:${roleFilter}`, type: "role", label: t("ROLE_LABEL"), value: roleLabels[roleFilter] || roleFilter });
    }
    return filters;
  }, [searchTerm, statusFilter, roleFilter, t]);

  const handleRemoveFilter = (filter: ActiveFilter) => {
    switch (filter.type) {
      case "search": setSearchTerm(""); break;
      case "status": setStatusFilter(""); break;
      case "role":   setRoleFilter(""); break;
    }
  };

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleDelete = async (id: string) => {
    if (!confirm(t("DELETE_CONFIRMATION"))) return;
    const ok = await deleteUser(id);
    if (ok) setIsFormOpen(false);
  };

  const openCreateForm = () => { setFormMode("create"); setSelectedUser(null); setIsFormOpen(true); };
  const openEditForm = (user: UserData) => { setFormMode("edit"); setSelectedUser(user); setIsFormOpen(true); };

  const { isInitialLoad } = useNavigation();
  const shouldShowSkeleton = isInitialLoad && isLoading;

  if (shouldShowSkeleton) {
    return (
      <Container useGlobalWidth>
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
              <div>
                <div className="h-5 w-32 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2" />
                <div className="h-3.5 w-48 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-28 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse shrink-0" />
          </div>
          <div className="mt-5 h-px bg-gray-200 dark:bg-white/8 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="h-3 w-20 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse" />
              </div>
              <div className="h-7 w-14 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-2" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
            <div className="h-4 w-20 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
                  <div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-1.5" />
                    <div className="h-3 w-44 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-14 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse" />
                  <div className="h-7 w-7 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse" />
                  <div className="h-7 w-7 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container useGlobalWidth>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
                {t("TITLE")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("SUBTITLE")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t("ADD_USER")}
          </button>
        </div>
        <div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
          <div className="flex items-start justify-between mb-4 pt-0.5">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
              {t("TOTAL_USERS_STAT")}
            </p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-2">
            {displayStats.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("TOTAL_USERS")}</p>
        </div>

        <div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
          <div className="flex items-start justify-between mb-4 pt-0.5">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
              {t("ACTIVE_USERS_STAT")}
            </p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-2">
            {displayStats.active}
          </p>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-white/6 rounded-full mb-2 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-400 rounded-full transition-all duration-700"
              style={{ width: `${displayStats.total > 0 ? Math.round((displayStats.active / displayStats.total) * 100) : 0}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {displayStats.total > 0 ? Math.round((displayStats.active / displayStats.total) * 100) : 0}%
            </span>
            <span>{t("ACTIVE")}</span>
          </div>
        </div>

        <div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
          <div className="flex items-start justify-between mb-4 pt-0.5">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
              {t("INACTIVE_USERS_STAT")}
            </p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-2">
            {displayStats.inactive}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("INACTIVE")}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <AdminSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          isSearching={isSearching}
          placeholder={t("SEARCH_PLACEHOLDER")}
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
        {/* Table Header with Filters */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("USERS_TABLE_TITLE")}</h3>
            <div className="flex items-center gap-3">
              <AdminStatusTabs
                options={statusOptions}
                value={statusFilter as "active" | "inactive" | ""}
                onChange={setStatusFilter}
                showCounts={true}
              />
              <AdminFilterPopover
                sections={roleFilterSections}
                activeCount={roleFilter ? 1 : 0}
                onClearAll={clearAllFilters}
                triggerLabel={t("FILTERS")}
              />
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-white/6">
                <button type="button" onClick={() => setViewMode("grid")} title="Grid view"
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setViewMode("list")} title="List view"
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersDisplay.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-50 dark:border-white/4">
            <AdminActiveFilters
              filters={activeFiltersDisplay}
              onRemove={handleRemoveFilter}
              onClearAll={clearAllFilters}
            />
          </div>
        )}

        {/* Users List */}
        <div className={cn(
          "relative transition-opacity duration-200",
          isFetching && !isLoading && "opacity-60"
        )}>
          {isFetching && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white/90 dark:bg-black/50 rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t("LOADING_USERS")}</span>
              </div>
            </div>
          )}

          {displayUsers.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
                <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{t("NO_USERS_FOUND")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
                {t("NO_USERS_DESCRIPTION")}
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {t("ADD_USER")}
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayUsers.map((user) => (
                <div key={user.id} className="group relative flex flex-col gap-3 p-4 rounded-xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/2 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <Avatar
                      src={user.avatar}
                      alt={user.name || user.email || ''}
                      fallback={(user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                      size="md"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset",
                        user.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20" : "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8")}>
                        <span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
                        {user.status === "active" ? t("ACTIVE") : t("INACTIVE")}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-0.5">{user.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{user.email}</p>
                    {user.roleName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
                        {user.roleName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-50 dark:border-white/4">
                    <button type="button" onClick={() => openEditForm(user as unknown as UserData)} title={t("EDIT_USER") || "Edit"}
                      className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <Edit className="w-3.5 h-3.5" />Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(user.id)} title={t("DELETE_USER") || "Delete"}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/4">
              {displayUsers.map((user) => (
                <div key={user.id} className="group flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      src={user.avatar}
                      alt={user.name || user.email || ''}
                      fallback={(user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</h4>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset",
                          user.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20" : "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8")}>
                          <span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
                          {user.status === "active" ? t("ACTIVE") : t("INACTIVE")}
                        </span>
                        {user.roleName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
                            {user.roleName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-13 md:ml-0">
                    <button type="button" onClick={() => openEditForm(user as unknown as UserData)} title={t("EDIT_USER") || "Edit"}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(user.id)} title={t("DELETE_USER") || "Delete"}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-white/6">
            <UniversalPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1"
          onClick={(e) => e.target === e.currentTarget && !isSubmitting && setIsFormOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-4xl w-full my-8">
            <UserForm
              user={selectedUser || undefined}
              onSuccess={() => setIsFormOpen(false)}
              isSubmitting={isSubmitting}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}
    </Container>
  );
}
