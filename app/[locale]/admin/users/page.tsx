"use client";

import { useState } from "react";
import { Button, Card, CardBody, Chip, useDisclosure } from "@heroui/react";
import { Plus, Edit, Trash2, Users, UserCheck, UserX, Search, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import UserForm from "@/components/admin/users/user-form";
import { UserData } from "@/lib/types/user";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useNavigation } from "@/components/providers";

// Helper function to generate consistent avatar colors based on user identifier
function getAvatarColor(identifier: string): string {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-cyan-500 to-cyan-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600'
  ];

  // Create a simple hash from the identifier
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use absolute value and modulo to get consistent index
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

export default function AdminUsersPage() {
  const PAGE_SIZE = 10;

  // Translations
  const t = useTranslations('admin.ADMIN_USERS_PAGE');

  // Use custom hook
  const {
    users,
    stats,
    isLoading,
    isFiltering,
    isSubmitting,
    currentPage,
    totalPages,
    totalUsers,
    searchTerm,
    roleFilter,
    statusFilter,
    deleteUser,
    handlePageChange,
    handleSearch,
    handleRoleFilter,
    handleStatusFilter,
  } = useAdminUsers({
    page: 1,
    limit: PAGE_SIZE,
    search: '',
    role: '',
    status: '',
  });

  // Local state for form
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Handler functions

  const handleDelete = async (id: string) => {
    if (!confirm(t('DELETE_CONFIRMATION'))) {
      return;
    }
    const ok= await deleteUser(id);
    if (ok) onClose();
  };

  const openCreateForm = () => {
    setFormMode('create');
    setSelectedUser(null);
    onOpen();
  };

  const openEditForm = (user: UserData) => {
    setFormMode('edit');
    setSelectedUser(user);
    onOpen();
  };


  const { isInitialLoad } = useNavigation();
  const shouldShowSkeleton = isInitialLoad && isLoading;

  if (shouldShowSkeleton) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Loading Header */}
        <div className="mb-8">
          <div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                <div>
                  <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2"></div>
                  <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                </div>
              </div>
              <div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-2"></div>
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Loading Table */}
        <Card className="border-0 shadow-lg">
          <CardBody className="p-0">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                        <div className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-1"></div>
                          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      <div className="flex space-x-1">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Loading indicator with text */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">{t('LOADING_USERS')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-linear-to-br from-theme-primary to-theme-accent rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {t('TITLE')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-2">
                  <span>{t('SUBTITLE')}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-sm px-2 py-1 bg-theme-primary/10 text-theme-primary rounded-full font-medium">
                    {totalUsers} {t('TOTAL_USERS')}
                  </span>
                </p>
              </div>
            </div>
            <Button
              color="primary"
              size="lg"
              onPress={openCreateForm}
              startContent={<Plus size={18} />}
              className="bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/40 transition-all duration-300 text-white font-medium"
            >
              {t('ADD_USER')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('TOTAL_USERS_STAT')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('ACTIVE_USERS_STAT')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('INACTIVE_USERS_STAT')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-linear-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                <UserX className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

            {/* Modern SaaS-Style Filters */}
      <div className="mb-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('SEARCH_PLACEHOLDER')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          {isFiltering && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="relative">
            <select 
              value={roleFilter} 
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all duration-200 cursor-pointer"
            >
              <option value="">{t('ALL_ROLES')}</option>
              <option value="super-admin">{t('SUPER_ADMIN')}</option>
              <option value="admin">{t('ADMIN')}</option>
              <option value="moderator">{t('MODERATOR')}</option>
              <option value="user">{t('USER')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all duration-200 cursor-pointer"
            >
              <option value="">{t('ALL_STATUSES')}</option>
              <option value="active">{t('ACTIVE')}</option>
              <option value="inactive">{t('INACTIVE')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Active Filters Count */}
          {(searchTerm || roleFilter || statusFilter) && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('FILTERS_APPLIED', {
                  plural: [
                    searchTerm && 'search',
                    roleFilter && 'role',
                    statusFilter && 'status'
                  ].filter(Boolean).length !== 1 ? 's' : ''
                })}
              </span>
              <Button
                variant="light"
                size="sm"
                color="danger"
                onPress={() => {
                  handleSearch('');
                  handleRoleFilter('');
                  handleStatusFilter('');
                }}
                className="h-6 px-2 text-xs"
              >
                {t('CLEAR_ALL')}
              </Button>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {!isLoading && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {t('SHOWING_USERS', { count: users.length, total: totalUsers })}
              {(searchTerm || roleFilter || statusFilter) && (
                <span className="ml-1">
                  {t('FILTERED')}
                </span>
              )}
            </span>
            {totalPages > 1 && (
              <span>
                {t('PAGE_OF', { current: currentPage, total: totalPages })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-lg">
        <CardBody className="p-0">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('USERS_TABLE_TITLE')}</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {totalUsers} {t('USERS_TOTAL_COUNT')}
              </span>
            </div>
          </div>
          
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('NO_USERS_FOUND')}</h3>
              <p className="text-gray-500 dark:text-gray-400">{t('NO_USERS_DESCRIPTION')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((user) => (
                <div key={user.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-linear-to-br ${getAvatarColor(user.name || user.email || user.id)} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                          {(user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{user.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Chip
                        color={user.status === 'active' ? 'success' : 'default'}
                        variant="flat"
                        size="sm"
                      >
                        {user.status === 'active' ? t('ACTIVE') : t('INACTIVE')}
                      </Chip>
                      <Chip
                        color="primary"
                        variant="flat"
                        size="sm"
                      >
                        {user.roleName || t('NO_ROLE')}
                      </Chip>
                      <div className="flex space-x-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => openEditForm(user as unknown as UserData)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

             {/* Pagination */}
       {totalPages > 1 && (
         <div className="mt-6 flex justify-center">
           <div className="flex space-x-2">
             <Button
               variant="bordered"
               size="sm"
               disabled={currentPage === 1}
               onPress={() => handlePageChange(currentPage - 1)}
             >
               {t('PREVIOUS')}
             </Button>
             <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
               {t('PAGE_OF', { current: currentPage, total: totalPages })}
             </span>
             <Button
               variant="bordered"
               size="sm"
               disabled={currentPage === totalPages}
               onPress={() => handlePageChange(currentPage + 1)}
             >
               {t('NEXT')}
             </Button>
           </div>
         </div>
       )}

             {/* Form Modal - Using Reliable CSS Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-60" 
            onClick={() => {
              if (!isSubmitting) {
                onClose();
              }
            }}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formMode === 'create' ? t('CREATE_NEW_USER') : t('EDIT_USER')}
              </h2>
              {!isSubmitting && (
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
              <UserForm
                user={selectedUser || undefined}
                onSuccess={() => onClose()}
                isSubmitting={isSubmitting}
                onCancel={onClose}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 