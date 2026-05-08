'use client';

import { useState, useEffect } from 'react';
import { Save, X, Shield, Loader2 } from 'lucide-react';
import type { RoleData, CreateRoleRequest, UpdateRoleRequest } from '@/hooks/use-admin-roles';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface RoleFormProps {
	role?: RoleData;
	onSubmit: (data: CreateRoleRequest | UpdateRoleRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
	mode: 'create' | 'edit';
}

const INPUT_BASE = cn(
	'w-full h-10 px-3 text-sm rounded-xl',
	'bg-white dark:bg-white/5',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
);

const INPUT_ERROR = cn(INPUT_BASE, 'border-red-400 dark:border-red-500/60');

export function RoleForm({ role, onSubmit, onCancel, isLoading = false, mode }: RoleFormProps) {
	const t = useTranslations('admin.ROLE_FORM');

	const [formData, setFormData] = useState({
		name: '',
		description: '',
		status: 'active' as 'active' | 'inactive',
		isAdmin: false,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (role) {
			setFormData({
				name: role.name,
				description: role.description,
				status: role.status,
				isAdmin: role.isAdmin,
			});
		}
	}, [role]);

	const handleInputChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!formData.name.trim()) newErrors.name = t('ERRORS.NAME_REQUIRED');
		else if (formData.name.length < 3) newErrors.name = t('ERRORS.NAME_MIN_LENGTH');
		else if (formData.name.length > 100) newErrors.name = t('ERRORS.NAME_MAX_LENGTH');
		if (!formData.description.trim()) newErrors.description = t('ERRORS.DESCRIPTION_REQUIRED');
		else if (formData.description.length > 500) newErrors.description = t('ERRORS.DESCRIPTION_MAX_LENGTH');
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;
		onSubmit(formData);
	};

	return (
		<div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
			{/* Header */}
			<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
						<Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
							{mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
						</h2>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
							{mode === 'create' ? t('SUBTITLE_CREATE') : t('SUBTITLE_EDIT')}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onCancel}
					disabled={isLoading}
					aria-label="Close"
					className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Form */}
			<form onSubmit={handleSubmit} className="p-5 space-y-5">
				{/* Role Name */}
				<div>
					<div className="flex items-center justify-between mb-1.5">
						<label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{t('ROLE_NAME')} <span className="text-red-500">*</span>
						</label>
					</div>
					<input
						id="name"
						type="text"
						placeholder={t('ROLE_NAME_PLACEHOLDER')}
						value={formData.name}
						onChange={(e) => handleInputChange('name', e.target.value)}
						disabled={isLoading}
						className={errors.name ? INPUT_ERROR : INPUT_BASE}
					/>
					{errors.name && (
						<p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
							<span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />{errors.name}
						</p>
					)}
				</div>

				{/* Description */}
				<div>
					<label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
						{t('DESCRIPTION')} <span className="text-red-500">*</span>
					</label>
					<textarea
						id="description"
						placeholder={t('DESCRIPTION_PLACEHOLDER')}
						value={formData.description}
						onChange={(e) => handleInputChange('description', e.target.value)}
						disabled={isLoading}
						rows={3}
						className={cn(
							'w-full px-3 py-2.5 text-sm rounded-xl resize-none',
							'bg-white dark:bg-white/5',
							'border border-gray-200 dark:border-white/8',
							'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
							'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
							'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
							errors.description && 'border-red-400 dark:border-red-500/60'
						)}
					/>
					{errors.description && (
						<p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
							<span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />{errors.description}
						</p>
					)}
				</div>

				{/* Status Toggle */}
				<div>
					<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('STATUS')}</p>
					<div className="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={formData.status === 'active'}
							onClick={() => handleInputChange('status', formData.status === 'active' ? 'inactive' : 'active')}
							disabled={isLoading}
							className={cn(
								'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
								'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950',
								'disabled:opacity-50 disabled:cursor-not-allowed',
								formData.status === 'active' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-white/20'
							)}
						>
							<span className={cn(
								'pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out',
								'bg-white dark:bg-gray-900',
								formData.status === 'active' ? 'translate-x-4' : 'translate-x-0'
							)} />
						</button>
						<span className="text-sm text-gray-600 dark:text-gray-400">
							{formData.status === 'active' ? t('ACTIVE') : t('INACTIVE')}
						</span>
					</div>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{formData.status === 'active' ? t('ACTIVE_DESCRIPTION') : t('INACTIVE_DESCRIPTION')}
					</p>
				</div>

				{/* Role Type */}
				<div>
					<label htmlFor="roleType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
						{t('ROLE_TYPE')}
					</label>
					<select
						id="roleType"
						value={formData.isAdmin ? 'admin' : 'client'}
						onChange={(e) => handleInputChange('isAdmin', e.target.value === 'admin')}
						disabled={isLoading}
						className={cn(INPUT_BASE, 'appearance-none')}
					>
						<option value="client">{t('CLIENT_ROLE')}</option>
						<option value="admin">{t('ADMIN_ROLE')}</option>
					</select>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('ROLE_TYPE_DESCRIPTION')}</p>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/8 -mx-5 -mb-5 px-5 pb-5 mt-5 bg-gray-50/60 dark:bg-white/1.5">
					<button
						type="button"
						onClick={onCancel}
						disabled={isLoading}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
					>
						<X className="w-3.5 h-3.5" />
						{t('CANCEL')}
					</button>
					<button
						type="submit"
						disabled={isLoading}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
					>
						{isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
						{isLoading
							? (mode === 'create' ? t('CREATING') : t('UPDATING'))
							: (mode === 'create' ? t('CREATE_ROLE') : t('UPDATE_ROLE'))
						}
					</button>
				</div>
			</form>
		</div>
	);
}
