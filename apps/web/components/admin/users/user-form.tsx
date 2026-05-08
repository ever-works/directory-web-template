'use client';

import { useState, useEffect } from 'react';
import { useCreateUser, useUpdateUser, useCheckUsername, useCheckEmail } from '@/hooks/use-users';
import { useActiveRoles } from '@/hooks/use-active-roles';
import { UserData, CreateUserRequest, UpdateUserRequest } from '@/lib/types/user';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Save, X, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

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

const SELECT_BASE = cn(INPUT_BASE, 'appearance-none');

export default function UserForm({ user, onSuccess, isSubmitting = false, onCancel }: UserFormProps) {
	const t = useTranslations('admin.USER_FORM');

	const createUserMutation = useCreateUser();
	const updateUserMutation = useUpdateUser();
	const checkUsernameMutation = useCheckUsername();
	const checkEmailMutation = useCheckEmail();

	const isCreatingUser = createUserMutation.isPending;
	const isUpdatingUser = updateUserMutation.isPending;
	const { roles, loading: rolesLoading, getActiveRoles } = useActiveRoles();

	const [showPassword, setShowPassword] = useState(false);
	const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
	const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
	const [checkingUsername, setCheckingUsername] = useState(false);
	const [checkingEmail, setCheckingEmail] = useState(false);
	const [isSubmittingForm, setIsSubmittingForm] = useState(false);

	const initialEmail = user?.email || '';
	const initialUsername = user?.username || '';
	const isEditing = !!user;

	useEffect(() => {
		const abortController = new AbortController();
		getActiveRoles(abortController.signal);
		return () => abortController.abort();
	}, [getActiveRoles]);

	const [formData, setFormData] = useState({
		username: user?.username || '',
		email: user?.email || '',
		name: user?.name || '',
		title: user?.title || '',
		avatar: user?.avatar || '',
		role: user?.role || '',
		status: user?.status || 'active',
		password: '',
	});

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	useEffect(() => {
		const check = async () => {
			if (isEditing && formData.username === initialUsername) { setUsernameAvailable(null); return; }
			if (!formData.username || formData.username.length < 3) { setUsernameAvailable(null); return; }
			setCheckingUsername(true);
			try {
				const result = await checkUsernameMutation.mutateAsync({ username: formData.username, excludeId: user?.id });
				setUsernameAvailable(result);
			} catch { setUsernameAvailable(null); }
			finally { setCheckingUsername(false); }
		};
		const id = setTimeout(check, 500);
		return () => clearTimeout(id);
	}, [formData.username, user?.id, checkUsernameMutation, isEditing, initialUsername]);

	useEffect(() => {
		const check = async () => {
			if (isEditing && formData.email === initialEmail) { setEmailAvailable(null); return; }
			if (!formData.email || !formData.email.includes('@')) { setEmailAvailable(null); return; }
			setCheckingEmail(true);
			try {
				const result = await checkEmailMutation.mutateAsync({ email: formData.email, excludeId: user?.id });
				setEmailAvailable(result);
			} catch { setEmailAvailable(null); }
			finally { setCheckingEmail(false); }
		};
		const id = setTimeout(check, 500);
		return () => clearTimeout(id);
	}, [formData.email, user?.id, checkEmailMutation, isEditing, initialEmail]);

	const isBusy = isSubmitting || isSubmittingForm || isCreatingUser || isUpdatingUser;

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmittingForm) return;
		if (!formData.role) { toast.error(t('ERRORS.SELECT_ROLE')); return; }
		if (isEditing) {
			if (formData.username !== initialUsername && usernameAvailable === false) { toast.error(t('ERRORS.USERNAME_TAKEN')); return; }
			if (formData.email !== initialEmail && emailAvailable === false) { toast.error(t('ERRORS.EMAIL_TAKEN')); return; }
		} else {
			if (usernameAvailable === false) { toast.error(t('ERRORS.USERNAME_TAKEN')); return; }
			if (emailAvailable === false) { toast.error(t('ERRORS.EMAIL_TAKEN')); return; }
		}
		setIsSubmittingForm(true);
		try {
			if (isEditing) {
				const updateData: UpdateUserRequest = {
					username: formData.username, email: formData.email, name: formData.name,
					title: formData.title, avatar: formData.avatar, role: formData.role, status: formData.status,
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

	const initials = formData.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

	return (
		<div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
			{/* Header */}
			<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
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
						aria-label="Close"
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>

			<form onSubmit={onSubmit} className="p-5 space-y-5">
				{/* Avatar row */}
				<div className="flex items-center gap-4">
					<div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/8 flex items-center justify-center text-gray-600 dark:text-gray-300 text-lg font-semibold shrink-0 border border-gray-200 dark:border-white/8">
						{initials}
					</div>
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('AVATAR_URL')}</label>
						<input
							type="text"
							placeholder={t('AVATAR_PLACEHOLDER')}
							value={formData.avatar}
							onChange={(e) => handleInputChange('avatar', e.target.value)}
							disabled={isBusy}
							className={INPUT_BASE}
						/>
					</div>
				</div>

				{/* Name + Title */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
							{t('FULL_NAME')} <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							placeholder={t('FULL_NAME_PLACEHOLDER')}
							value={formData.name}
							onChange={(e) => handleInputChange('name', e.target.value)}
							disabled={isBusy}
							required
							className={INPUT_BASE}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('TITLE_FIELD')}</label>
						<input
							type="text"
							placeholder={t('TITLE_PLACEHOLDER')}
							value={formData.title}
							onChange={(e) => handleInputChange('title', e.target.value)}
							disabled={isBusy}
							className={INPUT_BASE}
						/>
					</div>
				</div>

				{/* Username + Email */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
							{t('USERNAME')} <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								type="text"
								placeholder={t('USERNAME_PLACEHOLDER')}
								value={formData.username}
								onChange={(e) => handleInputChange('username', e.target.value)}
								disabled={isBusy}
								required
								className={INPUT_BASE}
							/>
							{checkingUsername && (
								<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
							)}
						</div>
						{usernameAvailable === true && (
							<p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{t('USERNAME_AVAILABLE')}</p>
						)}
						{usernameAvailable === false && (
							<p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('USERNAME_TAKEN')}</p>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
							{t('EMAIL')} <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								type="email"
								placeholder={t('EMAIL_PLACEHOLDER')}
								value={formData.email}
								onChange={(e) => handleInputChange('email', e.target.value)}
								disabled={isBusy}
								required
								className={INPUT_BASE}
							/>
							{checkingEmail && (
								<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
							)}
						</div>
						{emailAvailable === true && (
							<p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{t('EMAIL_AVAILABLE')}</p>
						)}
						{emailAvailable === false && (
							<p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('EMAIL_TAKEN')}</p>
						)}
					</div>
				</div>

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
						<select
							value={formData.role}
							onChange={(e) => handleInputChange('role', e.target.value)}
							disabled={rolesLoading || isBusy}
							className={SELECT_BASE}
						>
							<option value="">{rolesLoading ? t('LOADING_ROLES') : t('SELECT_ROLE')}</option>
							{roles.filter((r) => r.status === 'active').map((role) => (
								<option key={role.id} value={role.id}>{role.name}</option>
							))}
						</select>
					</div>

					{isEditing && (
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
								{t('STATUS')} <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.status}
								onChange={(e) => handleInputChange('status', e.target.value)}
								disabled={isBusy}
								className={SELECT_BASE}
							>
								<option value="active">{t('ACTIVE')}</option>
								<option value="inactive">{t('INACTIVE')}</option>
							</select>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/8 -mx-5 -mb-5 px-5 pb-5 mt-5 bg-gray-50/60 dark:bg-white/1.5">
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
