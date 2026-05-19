'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
	Modal,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalFooter,
} from '@/components/ui/modal';
import { FiEdit, FiAlertTriangle, FiLoader, FiSave } from 'react-icons/fi';
import { Submission } from './submission-item';
import { clientUpdateItemSchema, ClientUpdateItemInput } from '@/lib/validations/client-item';
import { cn } from '@/lib/utils';

const FIELD_LABEL = 'block text-xs font-medium text-gray-700 dark:text-gray-300';
const FIELD_BASE = cn(
	'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm',
	'text-gray-900 placeholder:text-gray-400',
	'transition-colors duration-150',
	'focus:border-theme-primary-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30',
	'dark:border-white/8 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-500',
	'disabled:cursor-not-allowed disabled:opacity-50'
);

export interface EditSubmissionModalProps {
	submission: Submission | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (data: ClientUpdateItemInput) => Promise<void>;
	isLoading?: boolean;
}

export function EditSubmissionModal({
	submission,
	open,
	onOpenChange,
	onSave,
	isLoading = false,
}: EditSubmissionModalProps) {
	const t = useTranslations('client.submissions');
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<ClientUpdateItemInput>({
		resolver: zodResolver(clientUpdateItemSchema),
		defaultValues: {
			name: '',
			description: '',
			source_url: '',
			tags: [],
		},
	});

	useEffect(() => {
		if (submission && open) {
			reset({
				name: submission.title,
				description: submission.description,
				source_url: submission.source_url || '',
				tags: submission.tags,
			});
		}
	}, [submission, open, reset]);

	const handleFormSubmit = async (data: ClientUpdateItemInput) => {
		try {
			await onSave(data);
		} catch (error) {
			console.error('Error updating submission:', error);
		}
	};

	const handleClose = () => {
		if (!isLoading) {
			onOpenChange(false);
		}
	};

	if (!submission) return null;

	const isApproved = submission.status === 'approved';

	return (
		<Modal isOpen={open} onClose={handleClose} size="xl" isDismissable={!isLoading}>
			<ModalContent className="border-gray-200 bg-white dark:border-white/8 dark:bg-[#111111]">
				<form onSubmit={handleSubmit(handleFormSubmit)}>
					<ModalHeader className="border-b border-gray-100 dark:border-white/6">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/8">
								<FiEdit className="h-4 w-4 text-gray-600 dark:text-gray-300" aria-hidden="true" />
							</div>
							<div className="min-w-0">
								<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
									{t('EDIT_SUBMISSION_TITLE')}
								</h2>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
									{t('UPDATE_DETAILS')}
								</p>
							</div>
						</div>
					</ModalHeader>

					<ModalBody>
						<div className="space-y-4 pb-2">
							{isApproved && (
								<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-900/15">
									<div className="flex items-start gap-2">
										<FiAlertTriangle
											className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
											aria-hidden="true"
										/>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
												{t('RE_REVIEW_REQUIRED')}
											</p>
											<p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/90">
												{t('RE_REVIEW_WARNING')}
											</p>
										</div>
									</div>
								</div>
							)}

							<div className="space-y-1.5">
								<label htmlFor="submission-name" className={FIELD_LABEL}>
									{t('TITLE_LABEL')} <span className="text-rose-500">*</span>
								</label>
								<input
									id="submission-name"
									type="text"
									{...register('name')}
									className={FIELD_BASE}
									placeholder={t('TITLE_PLACEHOLDER')}
									disabled={isLoading}
								/>
								{errors.name && (
									<p className="text-xs text-rose-600 dark:text-rose-400">{errors.name.message}</p>
								)}
							</div>

							<div className="space-y-1.5">
								<label htmlFor="submission-description" className={FIELD_LABEL}>
									{t('DESCRIPTION_LABEL')} <span className="text-rose-500">*</span>
								</label>
								<textarea
									id="submission-description"
									{...register('description')}
									rows={4}
									className={cn(FIELD_BASE, 'resize-none')}
									placeholder={t('DESCRIPTION_PLACEHOLDER')}
									disabled={isLoading}
								/>
								{errors.description && (
									<p className="text-xs text-rose-600 dark:text-rose-400">
										{errors.description.message}
									</p>
								)}
							</div>

							<div className="space-y-1.5">
								<label htmlFor="submission-source-url" className={FIELD_LABEL}>
									{t('URL_LABEL')}
								</label>
								<input
									id="submission-source-url"
									type="url"
									{...register('source_url')}
									className={FIELD_BASE}
									placeholder={t('URL_PLACEHOLDER')}
									disabled={isLoading}
								/>
								{errors.source_url && (
									<p className="text-xs text-rose-600 dark:text-rose-400">
										{errors.source_url.message}
									</p>
								)}
							</div>

							<div className="space-y-1.5">
								<label className={FIELD_LABEL}>{t('TAGS')}</label>
								<div className="flex flex-wrap gap-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2 dark:border-white/8 dark:bg-white/3">
									{submission.tags.length > 0 ? (
										submission.tags.map((tag) => (
											<span
												key={tag}
												className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-white/8 dark:text-gray-300 dark:ring-white/8"
											>
												{tag}
											</span>
										))
									) : (
										<span className="text-xs text-gray-500 dark:text-gray-400">{t('NO_TAGS')}</span>
									)}
								</div>
								<p className="text-[11px] text-gray-500 dark:text-gray-400">
									{t('TAGS_CANNOT_EDIT')}
								</p>
							</div>
						</div>
					</ModalBody>

					<ModalFooter className="border-t border-gray-100 dark:border-white/6">
						<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={handleClose}
								disabled={isLoading}
								className="h-9 px-4 text-xs"
							>
								{t('CANCEL')}
							</Button>
							<Button
								type="submit"
								disabled={isLoading || !isDirty}
								className={cn(
									'h-9 px-4 text-xs font-semibold shadow-sm',
									'bg-theme-primary-600 text-white hover:bg-theme-primary-700',
									'dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
									'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40'
								)}
							>
								{isLoading ? (
									<>
										<FiLoader className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
										{t('SAVING')}
									</>
								) : (
									<>
										<FiSave className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
										{t('SAVE_CHANGES')}
									</>
								)}
							</Button>
						</div>
					</ModalFooter>
				</form>
			</ModalContent>
		</Modal>
	);
}
