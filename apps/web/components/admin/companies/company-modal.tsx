'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Select from '@radix-ui/react-select';
import { X, Building2, Globe, Link as LinkIcon, Hash, Trash2, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/lib/validations/company';
import type { Company } from '@/types/company';

const companyFormSchema = z.object({
	name: z.string().min(1, 'Company name is required').max(255),
	website: z.string().optional(),
	domain: z.string().optional(),
	slug: z.string().regex(/^[a-z0-9-]*$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional().or(z.literal('')),
	status: z.enum(['active', 'inactive']),
});

type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyModalProps {
	isOpen: boolean;
	mode: 'create' | 'edit';
	company?: Company | null;
	isSubmitting: boolean;
	onSubmit: (data: CreateCompanyInput | UpdateCompanyInput) => Promise<void>;
	onClose: () => void;
}

const SPINNER = (
	<svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

// ─── Reusable native field ────────────────────────────────────────────────────

interface FieldProps {
	label: string;
	hint?: string;
	error?: string;
	required?: boolean;
	icon: React.ReactNode;
	children: React.ReactNode;
}

function Field({ label, hint, error, required, icon, children }: FieldProps) {
	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
				{label}
				{required && <span className="ml-0.5 text-red-500">*</span>}
			</label>
			<div className="relative">
				<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
					{icon}
				</span>
				{children}
			</div>
			{error && (
				<p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
			)}
			{!error && hint && (
				<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
			)}
		</div>
	);
}

const INPUT = cn(
	'w-full h-10 pl-9 pr-3 text-sm rounded-xl',
	'bg-white dark:bg-white/3',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150',
	'disabled:opacity-50 disabled:cursor-not-allowed'
);

const INPUT_ERROR = cn(
	INPUT,
	'border-red-400 dark:border-red-500/60 focus:ring-red-500/20 focus:border-red-400'
);

// ─── Modal ────────────────────────────────────────────────────────────────────

export function CompanyModal({ isOpen, mode, company, isSubmitting, onSubmit, onClose }: CompanyModalProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
		watch,
	} = useForm<CompanyFormData>({
		resolver: zodResolver(companyFormSchema),
		defaultValues: { name: '', website: '', domain: '', slug: '', status: 'active' },
	});

	const statusValue = watch('status');

	useEffect(() => {
		if (mode === 'edit' && company) {
			reset({ name: company.name, website: company.website || '', domain: company.domain || '', slug: company.slug || '', status: company.status });
		} else if (mode === 'create') {
			reset({ name: '', website: '', domain: '', slug: '', status: 'active' });
		}
	}, [mode, company, reset]);

	const handleFormSubmit = async (data: CompanyFormData) => {
		if (mode === 'create') {
			await onSubmit({ name: data.name, website: data.website || undefined, domain: data.domain || undefined, slug: data.slug || undefined, status: data.status } as CreateCompanyInput);
		} else {
			if (!company) throw new Error('Company is required in edit mode');
			await onSubmit({ id: company.id, name: data.name, website: data.website || undefined, domain: data.domain || undefined, slug: data.slug || undefined, status: data.status } as UpdateCompanyInput);
		}
		reset();
	};

	const handleClose = () => { reset(); onClose(); };

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4"
			onClick={(e) => e.target === e.currentTarget && handleClose()}
		>
			<div className="w-full max-w-2xl my-8 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30 max-h-[calc(100vh-4rem)] overflow-y-auto">
				{/* Header */}
				<div className="px-6 py-4 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 ring-1 ring-blue-100 dark:ring-blue-500/20">
							<Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
								{mode === 'create' ? t('ADD_COMPANY') : t('EDIT_COMPANY')}
							</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
								{mode === 'create' ? t('ADD_COMPANY_SUBTITLE') : t('EDIT_COMPANY_SUBTITLE')}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleClose}
						disabled={isSubmitting}
						aria-label={t('CANCEL')}
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-5">
					{/* Name */}
					<Field
						label={t('COMPANY_NAME')}
						required
						error={errors.name?.message}
						icon={<Building2 className="w-4 h-4" />}
					>
						<input
							{...register('name')}
							placeholder={t('COMPANY_NAME_PLACEHOLDER')}
							disabled={isSubmitting}
							className={errors.name ? INPUT_ERROR : INPUT}
						/>
					</Field>

					{/* Website */}
					<Field
						label={t('COMPANY_WEBSITE')}
						hint={t('COMPANY_WEBSITE_HINT')}
						error={errors.website?.message}
						icon={<Globe className="w-4 h-4" />}
					>
						<input
							{...register('website')}
							placeholder={t('COMPANY_WEBSITE_PLACEHOLDER')}
							disabled={isSubmitting}
							className={errors.website ? INPUT_ERROR : INPUT}
						/>
					</Field>

					{/* Domain */}
					<Field
						label={t('COMPANY_DOMAIN')}
						hint={t('COMPANY_DOMAIN_HINT')}
						error={errors.domain?.message}
						icon={<LinkIcon className="w-4 h-4" />}
					>
						<input
							{...register('domain')}
							placeholder={t('COMPANY_DOMAIN_PLACEHOLDER')}
							disabled={isSubmitting}
							className={errors.domain ? INPUT_ERROR : INPUT}
						/>
					</Field>

					{/* Slug */}
					<Field
						label={t('COMPANY_SLUG')}
						hint={t('COMPANY_SLUG_HINT')}
						error={errors.slug?.message}
						icon={<Hash className="w-4 h-4" />}
					>
						<input
							{...register('slug')}
							placeholder={t('COMPANY_SLUG_PLACEHOLDER')}
							disabled={isSubmitting}
							className={errors.slug ? INPUT_ERROR : INPUT}
						/>
					</Field>

					{/* Status */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
							{t('COMPANY_STATUS')}
						</label>
						<Select.Root value={statusValue} onValueChange={(v) => setValue('status', v as 'active' | 'inactive')} disabled={isSubmitting}>
							<Select.Trigger
								className={cn(
									'flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm',
									'bg-white dark:bg-white/3',
									'border border-gray-200 dark:border-white/8',
									'text-gray-900 dark:text-white',
									'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20',
									'transition-all duration-150',
									'disabled:cursor-not-allowed disabled:opacity-50'
								)}
							>
								<Select.Value placeholder={t('SELECT_STATUS')} />
								<Select.Icon><ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" /></Select.Icon>
							</Select.Trigger>
							<Select.Portal>
								<Select.Content
									className="overflow-hidden bg-white dark:bg-[#121212] rounded-xl shadow-lg shadow-black/20 border border-gray-100 dark:border-white/8 z-50"
									position="popper"
									sideOffset={4}
								>
									<Select.Viewport className="p-1">
										{(['active', 'inactive'] as const).map((v) => (
											<Select.Item
												key={v}
												value={v}
												className="relative flex items-center px-8 py-2 text-sm rounded-lg cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 outline-none data-highlighted:bg-gray-50 dark:data-highlighted:bg-white/6 transition-colors duration-100"
											>
												<Select.ItemIndicator className="absolute left-2 inline-flex items-center">
													<Check className="h-4 w-4" />
												</Select.ItemIndicator>
												<Select.ItemText>{v === 'active' ? t('STATUS_ACTIVE') : t('STATUS_INACTIVE')}</Select.ItemText>
											</Select.Item>
										))}
									</Select.Viewport>
								</Select.Content>
							</Select.Portal>
						</Select.Root>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-white/8">
						<button
							type="button"
							onClick={handleClose}
							disabled={isSubmitting}
							className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
						>
							{t('CANCEL')}
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-[#121212]"
						>
							{isSubmitting && SPINNER}
							{mode === 'create' ? t('CREATE_COMPANY') : t('UPDATE_COMPANY')}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

interface DeleteConfirmationModalProps {
	isOpen: boolean;
	companyName?: string;
	isDeleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function DeleteConfirmationModal({ isOpen, companyName, isDeleting, onConfirm, onCancel }: DeleteConfirmationModalProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="w-full max-w-sm bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
				<div className="p-6">
					{/* Icon + close row */}
					<div className="flex items-start justify-between mb-4">
						<div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 ring-1 ring-red-100 dark:ring-red-500/20 flex items-center justify-center shrink-0">
							<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
						</div>
						<button
							type="button"
							onClick={onCancel}
							disabled={isDeleting}
							aria-label={t('CANCEL')}
							className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
						{t('DELETE_COMPANY')}
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
						{t('DELETE_CONFIRMATION')}
					</p>
					{companyName && (
						<p className="text-sm font-medium text-gray-900 dark:text-white mb-6">&ldquo;{companyName}&rdquo;</p>
					)}

					{/* Actions */}
					<div className="flex items-center gap-2.5 mt-6">
						<button
							type="button"
							disabled={isDeleting}
							onClick={onCancel}
							className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
						>
							{t('CANCEL')}
						</button>
						<button
							type="button"
							disabled={isDeleting}
							onClick={onConfirm}
							className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						>
							{isDeleting ? (
								<svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
								</svg>
							) : (
								<Trash2 className="w-4 h-4" />
							)}
							{t('DELETE')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
