'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
	Modal,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalFooter,
} from '@/components/ui/modal';
import {
	FiEye,
	FiCalendar,
	FiTag,
	FiFolder,
	FiTrendingUp,
	FiCheck,
	FiXCircle,
	FiEdit,
	FiTrash2,
} from 'react-icons/fi';
import { Submission, SubmissionStatusBadge } from './submission-item';
import { cn } from '@/lib/utils';

export interface SubmissionDetailModalProps {
	submission: Submission | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

export function SubmissionDetailModal({
	submission,
	open,
	onOpenChange,
	onEdit,
	onDelete,
}: SubmissionDetailModalProps) {
	const t = useTranslations('client.submissions');
	const locale = useLocale();

	if (!submission) return null;

	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return t('NA');
		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return t('INVALID_DATE');
			return date.toLocaleDateString(locale, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return t('INVALID_DATE');
		}
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)} size="2xl">
			<ModalContent className="border-gray-200 bg-white dark:border-white/8 dark:bg-[#111111]">
				<ModalHeader className="border-b border-gray-100 dark:border-white/6">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/8">
							<FiEye className="h-4 w-4 text-gray-600 dark:text-gray-300" aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
								{t('SUBMISSION_DETAILS')}
							</h2>
							<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
								{t('VIEW_SUBMISSION_INFO')}
							</p>
						</div>
					</div>
				</ModalHeader>

				<ModalBody>
					<div className="space-y-5 pb-2">
						<div className="flex items-start justify-between gap-4">
							<h3 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
								{submission.title}
							</h3>
							<SubmissionStatusBadge status={submission.status} className="shrink-0" />
						</div>

						<DetailSection label={t('DESCRIPTION')}>
							<p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
								{submission.description}
							</p>
						</DetailSection>

						{submission.status === 'approved' && (
							<div className="grid grid-cols-2 gap-3">
								<StatTile
									icon={FiEye}
									label={t('VIEWS')}
									value={submission.views.toLocaleString()}
								/>
								<StatTile
									icon={FiTrendingUp}
									label={t('LIKES')}
									value={submission.likes.toLocaleString()}
								/>
							</div>
						)}

						{submission.status === 'rejected' && submission.rejectionReason && (
							<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800/60 dark:bg-rose-900/20">
								<h4 className="text-xs font-semibold text-rose-700 dark:text-rose-300">
									{t('REJECTION_REASON')}
								</h4>
								<p className="mt-1 text-sm text-rose-700/90 dark:text-rose-200/90">
									{submission.rejectionReason}
								</p>
							</div>
						)}

						<DetailSection label={t('CATEGORY')}>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<MetaRow icon={FiFolder} label={t('CATEGORY')} value={submission.category} />
								{submission.submittedAt && (
									<MetaRow
										icon={FiCalendar}
										label={t('SUBMITTED')}
										value={formatDate(submission.submittedAt)}
									/>
								)}
								{submission.approvedAt && (
									<MetaRow
										icon={FiCheck}
										label={t('APPROVED_ON')}
										value={formatDate(submission.approvedAt)}
									/>
								)}
								{submission.rejectedAt && (
									<MetaRow
										icon={FiXCircle}
										label={t('REJECTED_ON')}
										value={formatDate(submission.rejectedAt)}
									/>
								)}
							</div>
						</DetailSection>

						{submission.tags.length > 0 && (
							<DetailSection label={t('TAGS')}>
								<div className="flex flex-wrap gap-1.5">
									{submission.tags.map((tag) => (
										<span
											key={tag}
											className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
										>
											<FiTag className="h-2.5 w-2.5" aria-hidden="true" />
											{tag}
										</span>
									))}
								</div>
							</DetailSection>
						)}
					</div>
				</ModalBody>

				<ModalFooter className="border-t border-gray-100 dark:border-white/6">
					<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="h-9 px-4 text-xs"
						>
							{t('CLOSE')}
						</Button>
						{onEdit && (
							<Button
								variant="outline"
								onClick={() => {
									onOpenChange(false);
									onEdit(submission.id);
								}}
								className="h-9 px-4 text-xs"
							>
								<FiEdit className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
								{t('EDIT')}
							</Button>
						)}
						{onDelete && (
							<Button
								onClick={() => {
									onOpenChange(false);
									onDelete(submission.id);
								}}
								className={cn(
									'h-9 px-4 text-xs font-semibold text-white',
									'bg-rose-600 hover:bg-rose-700',
									'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40'
								)}
							>
								<FiTrash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
								{t('DELETE')}
							</Button>
						)}
					</div>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="space-y-1.5">
			<h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				{label}
			</h4>
			{children}
		</div>
	);
}

function StatTile({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-white/6 dark:bg-white/3">
			<div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
				<Icon className="h-3 w-3" aria-hidden />
				{label}
			</div>
			<div className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
				{value}
			</div>
		</div>
	);
}

function MetaRow({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-start gap-2 text-xs">
			<Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
			<div className="min-w-0">
				<div className="text-gray-500 dark:text-gray-400">{label}</div>
				<div className="truncate font-medium text-gray-900 dark:text-gray-100">{value}</div>
			</div>
		</div>
	);
}
