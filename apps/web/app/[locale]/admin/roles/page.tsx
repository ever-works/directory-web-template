'use client';

import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Shield, ShieldCheck, Settings, LayoutGrid, List } from 'lucide-react';
import { RoleForm } from '@/components/admin/roles/role-form';
import { DeleteRoleDialog } from '@/components/admin/roles/delete-role-dialog';
import { RolePermissionsModal } from '@/components/admin/permissions/role-permissions-modal';
import { useAdminRoles, RoleData, CreateRoleRequest, UpdateRoleRequest } from '@/hooks/use-admin-roles';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/components/providers';
import { Container } from '@/components/ui/container';

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
	let hash = 0;
	for (let i = 0; i < identifier.length; i++) {
		hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
	}
	return colors[Math.abs(hash) % colors.length];
}

export default function RolesPage() {
	const t = useTranslations('admin.ADMIN_ROLES_PAGE');
	const { roles, isLoading, createRole, updateRole, deleteRole, isSubmitting, refreshData } = useAdminRoles();

	const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
	const [roleTypeFilter, setRoleTypeFilter] = useState<'all' | 'admin' | 'client'>('all');
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

	const displayRoles = roles;

	const filteredRoles = displayRoles.filter((role) => {
		const matchesSearch =
			role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			role.description?.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = statusFilter === 'all' || role.status === statusFilter;
		const matchesRoleType =
			roleTypeFilter === 'all' ||
			(roleTypeFilter === 'admin' && role.isAdmin) ||
			(roleTypeFilter === 'client' && !role.isAdmin);
		return matchesSearch && matchesStatus && matchesRoleType;
	});

	const stats = {
		total: displayRoles.length,
		admin: displayRoles.filter((r) => r.isAdmin).length,
		client: displayRoles.filter((r) => !r.isAdmin).length
	};

	const handleCreateRole = async (data: CreateRoleRequest) => {
		const ok = await createRole(data);
		if (ok) setIsFormOpen(false);
	};

	const handleUpdateRole = async (data: UpdateRoleRequest) => {
		if (!selectedRole) return;
		const ok = await updateRole(selectedRole.id, data);
		if (ok) { setIsFormOpen(false); setSelectedRole(null); }
	};

	const handleDeleteRole = async (hardDelete: boolean = false) => {
		if (!selectedRole) return;
		const ok = await deleteRole(selectedRole.id, hardDelete);
		if (ok) setSelectedRole(null);
	};

	const openCreateForm = () => { setFormMode('create'); setSelectedRole(null); setIsFormOpen(true); };
	const openEditForm = (role: RoleData) => { setFormMode('edit'); setSelectedRole(role); setIsFormOpen(true); };
	const openDeleteDialog = (role: RoleData) => { setSelectedRole(role); setIsDeleteDialogOpen(true); };
	const openPermissionsModal = (role: RoleData) => { setSelectedRole(role); setIsPermissionsModalOpen(true); };

	const handleFormSubmit = async (data: CreateRoleRequest | UpdateRoleRequest) => {
		if (formMode === 'create') await handleCreateRole(data as CreateRoleRequest);
		else await handleUpdateRole(data as UpdateRoleRequest);
	};

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
								<div className="h-5 w-36 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2" />
								<div className="h-3.5 w-52 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
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
									<div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
									<div>
										<div className="h-4 w-28 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-1.5" />
										<div className="h-3 w-44 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-5 w-14 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse" />
									<div className="h-7 w-7 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse" />
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
							<Shield className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={openCreateForm}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950 shrink-0"
					>
						<Plus className="w-4 h-4" />
						{t('ADD_ROLE')}
					</button>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('TOTAL_ROLES_STAT')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
							<Shield className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-2">{stats.total}</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('TOTAL_ROLES')}</p>
				</div>

				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('ADMIN_ROLES_STAT')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
							<ShieldCheck className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-2">{stats.admin}</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('ADMIN_ROLES')}</p>
				</div>

				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('CLIENT_ROLES_STAT')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
							<Shield className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-2">{stats.client}</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('CLIENT_ROLES')}</p>
				</div>
			</div>

			{/* Search & Filters */}
			<div className="mb-6 space-y-3">
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
						<input
							type="text"
							placeholder={t('SEARCH_PLACEHOLDER')}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							aria-label={t('SEARCH_PLACEHOLDER')}
							className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/6 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
						/>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						{(['all', 'active', 'inactive'] as const).map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setStatusFilter(s)}
								className={cn(
									'px-3 py-2 text-xs font-medium rounded-xl transition-colors duration-150',
									statusFilter === s
										? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
										: 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/6 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/10'
								)}
							>
								{s === 'all' ? t('ALL_STATUSES') : s === 'active' ? t('ACTIVE') : t('INACTIVE')}
							</button>
						))}
						<div className="w-px h-5 bg-gray-200 dark:bg-white/8 mx-1" />
						{(['all', 'admin', 'client'] as const).map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => setRoleTypeFilter(type)}
								className={cn(
									'px-3 py-2 text-xs font-medium rounded-xl transition-colors duration-150',
									roleTypeFilter === type
										? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
										: 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/6 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/10'
								)}
							>
								{type === 'all' ? t('ALL_TYPES') : type === 'admin' ? t('ADMIN_ROLES') : t('CLIENT_ROLES')}
							</button>
						))}
					</div>
				</div>
				<div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
					<span>{t('SHOWING_ROLES', { count: filteredRoles.length, total: stats.total })}</span>
					{(searchTerm || statusFilter !== 'all' || roleTypeFilter !== 'all') && (
						<button
							type="button"
							onClick={() => { setSearchTerm(''); setStatusFilter('all'); setRoleTypeFilter('all'); }}
							className="text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
						>
							{t('CLEAR_ALL')}
						</button>
					)}
				</div>
			</div>

			{/* Roles Table */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('ROLES_TABLE_TITLE')}</h3>
					<div className="flex items-center gap-3">
						<span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
							{filteredRoles.length} / {stats.total} {t('ROLES_TOTAL_COUNT')}
						</span>
						<div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-white/6">
							<button type="button" onClick={() => setViewMode('grid')} title="Grid view"
								className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>
								<LayoutGrid className="w-3.5 h-3.5" />
							</button>
							<button type="button" onClick={() => setViewMode('list')} title="List view"
								className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>
								<List className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>

				{filteredRoles.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
						<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
							<Shield className="w-6 h-6 text-gray-400 dark:text-gray-500" />
						</div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{t('NO_ROLES_FOUND')}</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
							{t('NO_ROLES_DESCRIPTION')}
						</p>
						<button
							type="button"
							onClick={openCreateForm}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200"
						>
							<Plus className="w-4 h-4" />
							{t('ADD_ROLE')}
						</button>
					</div>
				) : viewMode === 'grid' ? (
					<div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{filteredRoles.map((role) => (
							<div key={role.id} className="group relative flex flex-col gap-3 p-4 rounded-xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/2 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm transition-all duration-200">
								<div className="flex items-start justify-between">
									<div className={cn('w-10 h-10 rounded-xl bg-linear-to-br flex items-center justify-center text-white font-semibold text-sm shrink-0', getAvatarColor(role.name || role.id))}>
										{role.name?.charAt(0).toUpperCase() || 'R'}
									</div>
									<div className="flex items-center gap-1.5">
										<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
											role.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' : 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8')}>
											<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
											{role.status === 'active' ? t('ACTIVE') : t('INACTIVE')}
										</span>
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">{role.name}</h4>
									{role.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{role.description}</p>}
									<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
										role.isAdmin ? 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20' : 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8')}>
										{role.isAdmin ? t('ADMIN_ROLE') : t('CLIENT_ROLE')}
									</span>
								</div>
								<div className="flex items-center gap-1 pt-2 border-t border-gray-50 dark:border-white/4">
									<button type="button" onClick={() => openPermissionsModal(role)} title={t('MANAGE_PERMISSIONS')}
										className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
										<Settings className="w-3.5 h-3.5" />{t('MANAGE_PERMISSIONS')}
									</button>
									<div className="ml-auto flex items-center gap-1">
										<button type="button" onClick={() => openEditForm(role)} title={t('EDIT_ROLE_TITLE')}
											className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors">
											<Edit className="w-3.5 h-3.5" />
										</button>
										<button type="button" onClick={() => openDeleteDialog(role)} title={t('DELETE_ROLE_TITLE')}
											className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="divide-y divide-gray-50 dark:divide-white/4">
						{filteredRoles.map((role) => (
							<div key={role.id} className="group flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150">
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<div className={cn('w-10 h-10 rounded-xl bg-linear-to-br flex items-center justify-center text-white font-semibold text-sm shrink-0', getAvatarColor(role.name || role.id))}>
										{role.name?.charAt(0).toUpperCase() || 'R'}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{role.name}</h4>
											<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
												role.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' : 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8')}>
												<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
												{role.status === 'active' ? t('ACTIVE') : t('INACTIVE')}
											</span>
											<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
												role.isAdmin ? 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20' : 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8')}>
												{role.isAdmin ? t('ADMIN_ROLE') : t('CLIENT_ROLE')}
											</span>
										</div>
										{role.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{role.description}</p>}
									</div>
								</div>
								<div className="flex items-center gap-1 ml-4">
									<button type="button" onClick={() => openPermissionsModal(role)} title={t('MANAGE_PERMISSIONS')}
										className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors">
										<Settings className="w-4 h-4" />
									</button>
									<button type="button" onClick={() => openEditForm(role)} title={t('EDIT_ROLE_TITLE')}
										className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors">
										<Edit className="w-4 h-4" />
									</button>
									<button type="button" onClick={() => openDeleteDialog(role)} title={t('DELETE_ROLE_TITLE')}
										className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						))}
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
					aria-labelledby="role-form-title"
				>
					<div className="relative bg-white dark:bg-[#121212] rounded-2xl shadow-xl max-w-4xl w-full my-8 overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/6">
							<h2 id="role-form-title" className="text-base font-semibold text-gray-900 dark:text-white">
								{formMode === 'create' ? t('CREATE_ROLE') : t('EDIT_ROLE')}
							</h2>
							{!isSubmitting && (
								<button
									type="button"
									aria-label="Close"
									onClick={() => setIsFormOpen(false)}
									className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
								>
									<svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							)}
						</div>
						<div className="overflow-y-auto max-h-[calc(90vh-4rem)] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1">
							<RoleForm
								role={selectedRole || undefined}
								onSubmit={handleFormSubmit}
								onCancel={() => setIsFormOpen(false)}
								mode={formMode}
								isLoading={isSubmitting}
							/>
						</div>
					</div>
				</div>
			)}

			{/* Delete Dialog */}
			{selectedRole && (
				<DeleteRoleDialog
					role={selectedRole}
					onConfirm={handleDeleteRole}
					onCancel={() => { setIsDeleteDialogOpen(false); setSelectedRole(null); }}
					isOpen={isDeleteDialogOpen}
				/>
			)}

			{/* Permissions Modal */}
			{selectedRole && (
				<RolePermissionsModal
					role={selectedRole}
					isOpen={isPermissionsModalOpen}
					onClose={() => { setIsPermissionsModalOpen(false); setSelectedRole(null); }}
					onSave={() => refreshData()}
					isLoading={isSubmitting}
				/>
			)}
		</Container>
	);
}
