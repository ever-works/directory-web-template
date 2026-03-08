'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Select, SelectItem } from '@/components/ui/select';
import { Flag, X, Loader2, User, Calendar, FileText, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ReportStatus, ReportResolution } from '@/lib/db/schema';
import type { ReportStatusValues, ReportResolutionValues } from '@/lib/db/schema';
import type { AdminReportItem, UpdateReportParams } from '@/hooks/use-admin-reports';

// Extracted className constants for better maintainability
const CLASSES = {
	// Header styles
	headerContainer: 'flex items-center justify-between',
	headerLeft: 'flex items-center gap-3',
	alertIcon: 'w-10 h-10 bg-linear-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg',
	headerText: 'text-xl font-bold text-gray-900 dark:text-white',
	headerSubtext: 'text-sm text-gray-600 dark:text-gray-400',
	closeButton: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1',

	// Info section styles
	infoContainer:
		'bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4',
	infoGrid: 'grid grid-cols-2 gap-4',
	infoItem: 'flex items-center gap-2',
	infoLabel: 'text-xs text-gray-500 dark:text-gray-400',
	infoValue: 'text-sm font-medium text-gray-900 dark:text-white',

	// Details section
	detailsContainer: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4',
	detailsText: 'text-gray-700 dark:text-gray-300 text-sm',

	// Form styles
	formSection: 'space-y-4',
	label: 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2',
	textarea:
		'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary resize-none',

	// Footer styles
	footerContainer: 'flex gap-3 w-full',
	cancelButton: 'flex-1',
	submitButton:
		'flex-1 bg-theme-primary hover:bg-theme-primary/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200'
} as const;

// Resolution options with labels
const RESOLUTION_OPTIONS: { value: ReportResolutionValues; label: string; description: string }[] = [
	{ value: ReportResolution.CONTENT_REMOVED, label: 'Remove Content', description: 'Delete the reported content' },
	{ value: ReportResolution.USER_WARNED, label: 'Warn User', description: 'Send a warning to the content owner' },
	{
		value: ReportResolution.USER_SUSPENDED,
		label: 'Suspend User',
		description: 'Temporarily suspend the user account'
	},
	{ value: ReportResolution.USER_BANNED, label: 'Ban User', description: 'Permanently ban the user' },
	{ value: ReportResolution.NO_ACTION, label: 'No Action', description: 'Dismiss without taking action' }
];

// Status options
const STATUS_OPTIONS: { value: ReportStatusValues; label: string }[] = [
	{ value: ReportStatus.PENDING, label: 'Pending' },
	{ value: ReportStatus.REVIEWED, label: 'Reviewed' },
	{ value: ReportStatus.RESOLVED, label: 'Resolved' },
	{ value: ReportStatus.DISMISSED, label: 'Dismissed' }
];

interface ReportReviewDialogProps {
	report: AdminReportItem;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (id: string, data: UpdateReportParams) => Promise<boolean>;
	onClose: () => void;
}

export default function ReportReviewDialog({ report, open, onOpenChange, onUpdate, onClose }: ReportReviewDialogProps) {
	const t = useTranslations('admin.REPORT_REVIEW_DIALOG');
	const [isLoading, setIsLoading] = useState(false);
	const [status, setStatus] = useState<ReportStatusValues>(report.status);
	const [resolution, setResolution] = useState<ReportResolutionValues | ''>(report.resolution || '');
	const [reviewNote, setReviewNote] = useState(report.reviewNote || '');

	// Sync local state when report prop changes (e.g., after update or selecting different report)
	useEffect(() => {
		setStatus(report.status);
		setResolution(report.resolution || '');
		setReviewNote(report.reviewNote || '');
	}, [report.id, report.status, report.resolution, report.reviewNote]);

	const handleSubmit = async () => {
		setIsLoading(true);
		try {
			const updateData: UpdateReportParams = {
				status,
				reviewNote: reviewNote.trim() || undefined
			};

			if (resolution) {
				updateData.resolution = resolution as ReportResolutionValues;
			}

			const success = await onUpdate(report.id, updateData);
			if (success) {
				onClose();
			}
		} catch (error) {
			console.error('Error updating report:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	return (
		<Modal isOpen={open} onClose={() => onOpenChange(false)} size="xl">
			<ModalContent>
				<ModalHeader>
					<div className={CLASSES.headerContainer}>
						<div className={CLASSES.headerLeft}>
							<div className={CLASSES.alertIcon}>
								<Flag className="h-5 w-5 text-white" />
							</div>
							<div>
								<h2 className={CLASSES.headerText}>{t('TITLE')}</h2>
								<p className={CLASSES.headerSubtext}>{t('SUBTITLE')}</p>
							</div>
						</div>
						<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className={CLASSES.closeButton}>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</ModalHeader>

				<ModalBody>
					<div className="space-y-6">
						{/* Report Info */}
						<div className={CLASSES.infoContainer}>
							<div className={CLASSES.infoGrid}>
								<div className={CLASSES.infoItem}>
									<FileText className="w-4 h-4 text-gray-400" />
									<div>
										<p className={CLASSES.infoLabel}>{t('CONTENT_TYPE')}</p>
										<p className={CLASSES.infoValue}>
											{report.contentType.charAt(0).toUpperCase() + report.contentType.slice(1)}
										</p>
									</div>
								</div>
								<div className={CLASSES.infoItem}>
									<FileText className="w-4 h-4 text-gray-400" />
									<div>
										<p className={CLASSES.infoLabel}>{t('CONTENT_ID')}</p>
										<p className={CLASSES.infoValue}>{report.contentId}</p>
									</div>
								</div>
								<div className={CLASSES.infoItem}>
									<User className="w-4 h-4 text-gray-400" />
									<div>
										<p className={CLASSES.infoLabel}>{t('REPORTED_BY')}</p>
										<p className={CLASSES.infoValue}>
											{report.reporter?.name || report.reporter?.email || t('UNKNOWN')}
										</p>
									</div>
								</div>
								<div className={CLASSES.infoItem}>
									<Calendar className="w-4 h-4 text-gray-400" />
									<div>
										<p className={CLASSES.infoLabel}>{t('DATE')}</p>
										<p className={CLASSES.infoValue}>{formatDate(report.createdAt)}</p>
									</div>
								</div>
							</div>
						</div>

						{/* Reason */}
						<div>
							<p className={CLASSES.label}>{t('REASON')}</p>
							<div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
								<p className="text-red-700 dark:text-red-300 font-medium">
									{report.reason.charAt(0).toUpperCase() + report.reason.slice(1)}
								</p>
							</div>
						</div>

						{/* Details */}
						{report.details && (
							<div>
								<p className={CLASSES.label}>{t('DETAILS')}</p>
								<div className={CLASSES.detailsContainer}>
									<p className={CLASSES.detailsText}>{report.details}</p>
								</div>
							</div>
						)}

						{/* Form Section */}
						<div className={CLASSES.formSection}>
							{/* Status Select */}
							<div>
								<label className={CLASSES.label}>{t('STATUS')}</label>
								<Select
									selectedKeys={[status]}
									onSelectionChange={(keys) => {
										const value = keys[0] as ReportStatusValues;
										if (value) setStatus(value);
									}}
									className="w-full"
								>
									{STATUS_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</Select>
							</div>

							{/* Resolution Select */}
							<div>
								<label className={CLASSES.label}>{t('RESOLUTION')}</label>
								<Select
									placeholder={t('SELECT_RESOLUTION')}
									selectedKeys={resolution ? [resolution] : []}
									onSelectionChange={(keys) => {
										const value = keys[0] as ReportResolutionValues | undefined;
										setResolution(value || '');
									}}
									className="w-full"
								>
									{RESOLUTION_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value} description={option.description}>
											{option.label}
										</SelectItem>
									))}
								</Select>
							</div>

							{/* Review Note */}
							<div>
								<label className={CLASSES.label}>{t('REVIEW_NOTE')}</label>
								<textarea
									value={reviewNote}
									onChange={(e) => setReviewNote(e.target.value)}
									placeholder={t('REVIEW_NOTE_PLACEHOLDER')}
									rows={3}
									className={CLASSES.textarea}
								/>
							</div>
						</div>
					</div>
				</ModalBody>

				<ModalFooter>
					<div className={CLASSES.footerContainer}>
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className={CLASSES.cancelButton}>
							{t('CANCEL')}
						</Button>
						<Button onClick={handleSubmit} disabled={isLoading} className={CLASSES.submitButton}>
							{isLoading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									{t('UPDATING')}
								</>
							) : (
								<>
									<CheckCircle className="h-4 w-4 mr-2" />
									{t('UPDATE_REPORT')}
								</>
							)}
						</Button>
					</div>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
