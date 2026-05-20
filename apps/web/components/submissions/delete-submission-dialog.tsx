'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { FiAlertTriangle, FiTrash2, FiLoader, FiInfo } from 'react-icons/fi';
import { Submission } from './submission-item';
import { cn } from '@/lib/utils';

export interface DeleteSubmissionDialogProps {
	submission: Submission | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}

export function DeleteSubmissionDialog({
	submission,
	open,
	onOpenChange,
	onConfirm,
}: DeleteSubmissionDialogProps) {
	const t = useTranslations('client.submissions');
	const [isLoading, setIsLoading] = useState(false);

	const handleConfirm = async () => {
		setIsLoading(true);
		try {
			await onConfirm();
		} catch (error) {
			console.error('Error deleting submission:', error);
		} finally {
			setIsLoading(false);
		}
	};

	if (!submission) return null;

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)} size="sm" hideCloseButton>
			<ModalContent className="border-gray-200 bg-white dark:border-white/8 dark:bg-[#111111]">
				<div className="p-5">
					<div className="flex items-start gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20">
							<FiAlertTriangle
								className="h-4 w-4 text-rose-600 dark:text-rose-400"
								aria-hidden="true"
							/>
						</div>
						<div className="min-w-0 flex-1 pt-0.5">
							<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
								{t('DELETE_SUBMISSION_TITLE')}
							</h2>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{t('DELETE_CONFIRM_MESSAGE')}
							</p>
						</div>
					</div>

					<div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-white/6 dark:bg-white/3">
						<p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
							{submission.title}
						</p>
						<p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
							{submission.description}
						</p>
					</div>

					<div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-white/6 dark:bg-white/3">
						<FiInfo
							className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400"
							aria-hidden="true"
						/>
						<p className="text-[11px] text-gray-600 dark:text-gray-400">{t('RESTORE_INFO')}</p>
					</div>

					<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
							className="h-9 px-4 text-xs"
						>
							{t('CANCEL')}
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={isLoading}
							className={cn(
								'h-9 px-4 text-xs font-semibold text-white shadow-sm',
								'bg-rose-600 hover:bg-rose-700',
								'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40'
							)}
						>
							{isLoading ? (
								<>
									<FiLoader className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
									{t('DELETING')}
								</>
							) : (
								<>
									<FiTrash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
									{t('DELETE')}
								</>
							)}
						</Button>
					</div>
				</div>
			</ModalContent>
		</Modal>
	);
}
