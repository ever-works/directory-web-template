'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@heroui/react';
import * as Select from '@radix-ui/react-select';
import { X, Building2, Globe, Link as LinkIcon, Hash, Trash2, ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/lib/validations/company';
import type { Company } from '@/types/company';

// Define form schema for validation (before transformation)
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

/**
 * Company Modal Component
 * Handles company creation and editing with react-hook-form and zod validation
 */
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
		defaultValues: {
			name: '',
			website: '',
			domain: '',
			slug: '',
			status: 'active',
		},
	});

	const statusValue = watch('status');

	// Prefill form when editing
	useEffect(() => {
		if (mode === 'edit' && company) {
			reset({
				name: company.name,
				website: company.website || '',
				domain: company.domain || '',
				slug: company.slug || '',
				status: company.status,
			});
		} else if (mode === 'create') {
			reset({
				name: '',
				website: '',
				domain: '',
				slug: '',
				status: 'active',
			});
		}
	}, [mode, company, reset]);

	const handleFormSubmit = async (data: CompanyFormData) => {
		// Transform empty strings to undefined for optional fields
		if (mode === 'create') {
			const submitData: CreateCompanyInput = {
				name: data.name,
				website: data.website || undefined,
				domain: data.domain || undefined,
				slug: data.slug || undefined,
				status: data.status,
			};
			await onSubmit(submitData);
		} else {
			// Defensive check: ensure company exists in edit mode
			if (!company) {
				console.error('CompanyModal: Company is required in edit mode but was not provided');
				throw new Error('Company is required in edit mode');
			}

			const submitData: UpdateCompanyInput = {
				id: company.id,
				name: data.name,
				website: data.website || undefined,
				domain: data.domain || undefined,
				slug: data.slug || undefined,
				status: data.status,
			};
			await onSubmit(submitData);
		}
		reset();
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
				{/* Header */}
				<div className="bg-linear-to-r from-theme-primary to-theme-accent px-6 py-4 flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
							<Building2 className="w-6 h-6 text-white" />
						</div>
						<div>
							<h2 className="text-xl font-bold text-white">
								{mode === 'create' ? t('ADD_COMPANY') : t('EDIT_COMPANY')}
							</h2>
							<p className="text-white/80 text-sm">
								{mode === 'create' ? t('ADD_COMPANY_SUBTITLE') : t('EDIT_COMPANY_SUBTITLE')}
							</p>
						</div>
					</div>
					<Button
						isIconOnly
						variant="light"
						onPress={handleClose}
						className="text-white hover:bg-white/20"
						isDisabled={isSubmitting}
					>
						<X className="w-5 h-5" />
					</Button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
					{/* Name - Required */}
					<div>
						<Input
							{...register('name')}
							label={t('COMPANY_NAME')}
							placeholder={t('COMPANY_NAME_PLACEHOLDER')}
							isRequired
							isInvalid={!!errors.name}
							errorMessage={errors.name?.message}
							startContent={<Building2 className="w-4 h-4 text-gray-400" />}
							classNames={{
								input: 'text-sm',
								label: 'font-medium',
							}}
							isDisabled={isSubmitting}
						/>
					</div>

					{/* Website - Optional */}
					<div>
						<Input
							{...register('website')}
							label={t('COMPANY_WEBSITE')}
							placeholder={t('COMPANY_WEBSITE_PLACEHOLDER')}
							isInvalid={!!errors.website}
							errorMessage={errors.website?.message}
							startContent={<Globe className="w-4 h-4 text-gray-400" />}
							classNames={{
								input: 'text-sm',
								label: 'font-medium',
							}}
							isDisabled={isSubmitting}
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('COMPANY_WEBSITE_HINT')}</p>
					</div>

					{/* Domain - Optional */}
					<div>
						<Input
							{...register('domain')}
							label={t('COMPANY_DOMAIN')}
							placeholder={t('COMPANY_DOMAIN_PLACEHOLDER')}
							isInvalid={!!errors.domain}
							errorMessage={errors.domain?.message}
							startContent={<LinkIcon className="w-4 h-4 text-gray-400" />}
							classNames={{
								input: 'text-sm',
								label: 'font-medium',
							}}
							isDisabled={isSubmitting}
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('COMPANY_DOMAIN_HINT')}</p>
					</div>

					{/* Slug - Optional */}
					<div>
						<Input
							{...register('slug')}
							label={t('COMPANY_SLUG')}
							placeholder={t('COMPANY_SLUG_PLACEHOLDER')}
							isInvalid={!!errors.slug}
							errorMessage={errors.slug?.message}
							startContent={<Hash className="w-4 h-4 text-gray-400" />}
							classNames={{
								input: 'text-sm',
								label: 'font-medium',
							}}
							isDisabled={isSubmitting}
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('COMPANY_SLUG_HINT')}</p>
					</div>

					{/* Status */}
					<div>
						<label className="block text-sm font-medium mb-2">{t('COMPANY_STATUS')}</label>
						<Select.Root
							value={statusValue}
							onValueChange={(value) => setValue('status', value as 'active' | 'inactive')}
							disabled={isSubmitting}
						>
							<Select.Trigger
								className={cn(
									"flex h-12 w-full items-center justify-between rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm",
									"focus:outline-none focus:ring-2 focus:ring-theme-primary-500",
									"disabled:cursor-not-allowed disabled:opacity-50"
								)}
							>
								<Select.Value placeholder={t('SELECT_STATUS')} />
								<Select.Icon>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Select.Icon>
							</Select.Trigger>
							<Select.Portal>
								<Select.Content
									className="overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
									position="popper"
									sideOffset={4}
								>
									<Select.Viewport className="p-1">
										<Select.Item
											value="active"
											className="relative flex items-center px-8 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
										>
											<Select.ItemIndicator className="absolute left-2 inline-flex items-center">
												<Check className="h-4 w-4" />
											</Select.ItemIndicator>
											<Select.ItemText>{t('STATUS_ACTIVE')}</Select.ItemText>
										</Select.Item>
										<Select.Item
											value="inactive"
											className="relative flex items-center px-8 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
										>
											<Select.ItemIndicator className="absolute left-2 inline-flex items-center">
												<Check className="h-4 w-4" />
											</Select.ItemIndicator>
											<Select.ItemText>{t('STATUS_INACTIVE')}</Select.ItemText>
										</Select.Item>
									</Select.Viewport>
								</Select.Content>
							</Select.Portal>
						</Select.Root>
					</div>

					{/* Form Actions */}
					<div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
						<Button variant="bordered" onPress={handleClose} isDisabled={isSubmitting}>
							{t('CANCEL')}
						</Button>
						<Button
							type="submit"
							className="bg-linear-to-r from-theme-primary to-theme-accent text-white"
							isLoading={isSubmitting}
							isDisabled={isSubmitting}
						>
							{mode === 'create' ? t('CREATE_COMPANY') : t('UPDATE_COMPANY')}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

interface DeleteConfirmationModalProps {
	isOpen: boolean;
	companyName?: string;
	isDeleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

/**
 * Delete Confirmation Modal Component
 * Handles company deletion confirmation
 */
export function DeleteConfirmationModal({
	isOpen,
	companyName,
	isDeleting,
	onConfirm,
	onCancel,
}: DeleteConfirmationModalProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6">
				<div className="text-center">
					<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
						<Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
					</div>
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('DELETE_COMPANY')}</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('DELETE_CONFIRMATION')}</p>
					{companyName && (
						<p className="text-sm font-medium text-gray-900 dark:text-white mb-6">&ldquo;{companyName}&rdquo;</p>
					)}
					<div className="flex justify-center space-x-3 mt-6">
						<Button color="default" variant="bordered" onPress={onCancel} isDisabled={isDeleting}>
							{t('CANCEL')}
						</Button>
						<Button color="danger" onPress={onConfirm} isLoading={isDeleting} isDisabled={isDeleting}>
							{t('DELETE')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
