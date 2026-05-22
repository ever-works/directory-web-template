'use client';

import { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCreateUser, useUpdateUser } from '@/hooks/use-users';
import { useActiveRoles } from '@/hooks/use-active-roles';
import { UserData, CreateUserRequest, UpdateUserRequest } from '@/lib/types/user';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Save, X, Users, ChevronDown, Check, ShieldCheck, UserCircle, Mail, Calendar, ExternalLink } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/header/avatar';

interface UserFormProps {
	user?: UserData;
	onSuccess: (data: CreateUserRequest | UpdateUserRequest) => void;
	isSubmitting?: boolean;
	onCancel?: () => void;
}

const INPUT_BASE = cn(
	'w-full h-10 px-3 text-sm rounded-xl',
	'bg-white dark:bg-white/5',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
);

const DROPDOWN_TRIGGER = cn(
	INPUT_BASE,
	'flex items-center justify-between cursor-pointer'
);

export default function UserForm({ user, onSuccess, isSubmitting = false, onCancel }: UserFormProps) {
	const t = useTranslations('admin.USER_FORM');
	const locale = useLocale();
	const profileHref = locale === DEFAULT_LOCALE
		? `/client/profile/${user?.username}`
		: `/${locale}/client/profile/${user?.username}`;

	const createUserMutation = useCreateUser();
	const updateUserMutation = useUpdateUser();

	const isCreatingUser = createUserMutation.isPending;
	const isUpdatingUser = updateUserMutation.isPending;
	const { roles, loading: rolesLoading, getActiveRoles } = useActiveRoles();

	const [showPassword, setShowPassword] = useState(false);
	const [isSubmittingForm, setIsSubmittingForm] = useState(false);
	const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
	const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

	const isEditing = !!user;

	useEffect(() => {
		const abortController = new AbortController();
		getActiveRoles(abortController.signal);
		return () => abortController.abort();
	}, [getActiveRoles]);

	const [formData, setFormData] = useState({
		role: user?.role || '',
		status: user?.status || 'active',
		// create-only fields
		username: '',
		email: '',
		name: '',
		title: '',
		avatar: '',
		password: '',
	});

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const isBusy = isSubmitting || isSubmittingForm || isCreatingUser || isUpdatingUser;

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmittingForm) return;
		if (!formData.role) { toast.error(t('ERRORS.SELECT_ROLE')); return; }
		setIsSubmittingForm(true);
		try {
			if (isEditing) {
				const updateData: UpdateUserRequest = {
					role: formData.role,
					status: formData.status,
				};
				await updateUserMutation.mutateAsync({ id: user.id, userData: updateData });
				onSuccess(updateData);
			} else {
				const createData: CreateUserRequest = {
					username: formData.username, email: formData.email, name: formData.name,
					title: formData.title, avatar: formData.avatar, role: formData.role, password: formData.password,
				};
				await createUserMutation.mutateAsync(createData);
				onSuccess(createData);
			}
		} catch (error) {
			console.error('Error saving user:', error);
			toast.error(t('ERRORS.SAVE_FAILED'));
		} finally {
			setIsSubmittingForm(false);
		}
	};

	return (
		<div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/20">
			{/* Header */}
			<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 rounded-t-2xl flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
						<Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
							{isEditing ? t('TITLE_EDIT') : t('TITLE_CREATE')}
						</h2>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
							{isEditing ? t('SUBTITLE_EDIT') : t('SUBTITLE_CREATE')}
						</p>
					</div>
				</div>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						disabled={isBusy}
						aria-label={t('CLOSE')}
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>

			<form onSubmit={onSubmit} className="p-5 space-y-5">
				{/* User identity card (edit mode) — LinkedIn-style */}
				{isEditing && (
					<div className="rounded-xl border border-gray-100 dark:border-white/6 bg-gray-50 dark:bg-white/4 overflow-hidden">
						<div className="p-4 flex gap-3.5 items-start">
							<Avatar
								src={user.avatar}
								alt={user.name || user.email || ''}
								fallback={(user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
								size="lg"
							/>
							<div className="min-w-0 flex-1">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
											{user.name || '—'}
										</p>
										{user.title ? (
											<p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.title}</p>
										) : (
											<p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 italic">{t('NO_TITLE_SET')}</p>
										)}
									</div>
									<a
										href={profileHref}
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-white/8 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/12 transition-colors shrink-0"
									>
										<UserCircle className="w-3 h-3" />
										{t('VIEW_PROFILE')}
										<ExternalLink className="w-3 h-3" />
									</a>
								</div>

								<div className="mt-2.5 flex flex-col gap-1.5">
									<span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<Mail className="w-3 h-3 shrink-0" />
										{user.email}
									</span>
									{(user.roleName || user.role) && (
										<span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
											<ShieldCheck className="w-3 h-3 shrink-0" />
											{user.roleName || user.role}
										</span>
									)}
									<span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<Calendar className="w-3 h-3 shrink-0" />
										{t('MEMBER_SINCE')}{' '}
										{new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
									</span>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Password (create only) */}
				{!isEditing && (
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
							{t('PASSWORD')} <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								placeholder={t('PASSWORD_PLACEHOLDER')}
								value={formData.password}
								onChange={(e) => handleInputChange('password', e.target.value)}
								required
								disabled={isBusy}
								className={cn(INPUT_BASE, 'pr-10')}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
								tabIndex={-1}
							>
								{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
							</button>
						</div>
					</div>
				)}

				{/* Role + Status */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
							{t('ROLE')} <span className="text-red-500">*</span>
						</label>
						<DropdownMenu.Root modal={false} open={roleDropdownOpen} onOpenChange={setRoleDropdownOpen}>
							<DropdownMenu.Trigger asChild>
								<button
									type="button"
									disabled={rolesLoading || isBusy}
									className={DROPDOWN_TRIGGER}
								>
									<span className={cn('truncate pr-2', !formData.role && 'text-gray-400 dark:text-gray-500')}>
										{rolesLoading
											? t('LOADING_ROLES')
											: formData.role
												? (roles.find((r) => r.id === formData.role)?.name ?? t('SELECT_ROLE'))
												: t('SELECT_ROLE')}
									</span>
									<ChevronDown className={cn('h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200', roleDropdownOpen && 'rotate-180')} />
								</button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content
								sideOffset={8}
								align="start"
								className="z-9999 min-w-(--radix-dropdown-menu-trigger-width) bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/6 rounded-lg shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 origin-top-left"
							>
								<div className="p-1">
									{roles.filter((r) => r.status === 'active').map((role) => (
										<DropdownMenu.Item
											key={role.id}
											onSelect={() => handleInputChange('role', role.id)}
											className="relative flex items-center justify-between px-3 py-2 text-sm text-gray-900 dark:text-gray-100 rounded-md cursor-pointer outline-none transition-colors hover:bg-gray-100 dark:hover:bg-white/6 data-highlighted:bg-gray-100 dark:data-highlighted:bg-white/6"
										>
											<span>{role.name}</span>
											{formData.role === role.id && <Check className="h-4 w-4 text-gray-900 dark:text-white" />}
										</DropdownMenu.Item>
									))}
								</div>
								<DropdownMenu.Arrow className="fill-white dark:fill-[#121212]" />
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>

					{isEditing && (
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
								{t('STATUS')} <span className="text-red-500">*</span>
							</label>
							<DropdownMenu.Root modal={false} open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
								<DropdownMenu.Trigger asChild>
									<button
										type="button"
										disabled={isBusy}
										className={DROPDOWN_TRIGGER}
									>
										<span className="truncate pr-2">
											{formData.status === 'active' ? t('ACTIVE') : t('INACTIVE')}
										</span>
										<ChevronDown className={cn('h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200', statusDropdownOpen && 'rotate-180')} />
									</button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content
									sideOffset={8}
									align="start"
									className="z-9999 min-w-(--radix-dropdown-menu-trigger-width) bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/6 rounded-lg shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 origin-top-left"
								>
									<div className="p-1">
										{(['active', 'inactive'] as const).map((status) => (
											<DropdownMenu.Item
												key={status}
												onSelect={() => handleInputChange('status', status)}
												className="relative flex items-center justify-between px-3 py-2 text-sm text-gray-900 dark:text-gray-100 rounded-md cursor-pointer outline-none transition-colors hover:bg-gray-100 dark:hover:bg-white/6 data-highlighted:bg-gray-100 dark:data-highlighted:bg-white/6"
											>
												<span>{status === 'active' ? t('ACTIVE') : t('INACTIVE')}</span>
												{formData.status === status && <Check className="h-4 w-4 text-gray-900 dark:text-white" />}
											</DropdownMenu.Item>
										))}
									</div>
									<DropdownMenu.Arrow className="fill-white dark:fill-[#121212]" />
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/8 -mx-5 -mb-5 px-5 pb-5 mt-5 bg-gray-50/60 dark:bg-white/1.5 rounded-b-2xl">
					{onCancel && (
						<button
							type="button"
							onClick={onCancel}
							disabled={isBusy}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
						>
							<X className="w-3.5 h-3.5" />
							{t('CANCEL')}
						</button>
					)}
					<button
						type="submit"
						disabled={isBusy}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
					>
						{isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
						{isEditing ? t('UPDATE_USER') : t('CREATE_USER')}
					</button>
				</div>
			</form>
		</div>
	);
}
