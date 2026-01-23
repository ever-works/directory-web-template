import type { ReactNode } from 'react';
import { Card, CardBody, Chip, Button } from '@heroui/react';
import { Megaphone, CheckCircle, XCircle, Ban, Trash2, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SponsorAd } from '@/lib/db/schema';
import type { SponsorAdStatus } from '@/lib/types/sponsor-ad';

interface SponsorTableProps {
	sponsorAds: SponsorAd[];
	totalCount: number;
	isLoading: boolean;
	isSubmitting: boolean;
	confirmDeleteId: string | null;
	onApprove: (id: string) => void;
	onReject: (sponsorAd: SponsorAd) => void;
	onCancel: (id: string) => void;
	onDelete: (id: string) => void;
	/** Optional filter controls to render in the header */
	headerControls?: ReactNode;
}

const TABLE_CARD = 'border-0 shadow-lg';
const TABLE_HEADER = 'px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50';
const TABLE_ROW = 'px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors';
const ICON_PLACEHOLDER = 'w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white';

type ChipColor = 'warning' | 'primary' | 'success' | 'danger' | 'default';
type ChipVariant = 'flat' | 'solid' | 'bordered';

const STATUS_CHIP_CONFIG: Record<string, { color: ChipColor; variant: ChipVariant }> = {
	pending_payment: { color: 'warning', variant: 'bordered' },
	pending: { color: 'warning', variant: 'flat' },
	active: { color: 'success', variant: 'solid' },
	rejected: { color: 'danger', variant: 'flat' },
	expired: { color: 'default', variant: 'bordered' },
	cancelled: { color: 'default', variant: 'flat' },
	// Legacy status (for backwards compatibility with old data)
	approved: { color: 'primary', variant: 'flat' },
};

/**
 * Sponsor Table Component
 * Displays sponsor ads in a table format with actions
 */
export function SponsorTable({
	sponsorAds,
	totalCount,
	isLoading,
	isSubmitting,
	confirmDeleteId,
	onApprove,
	onReject,
	onCancel,
	onDelete,
	headerControls,
}: SponsorTableProps) {
	const t = useTranslations('admin.SPONSORSHIPS');

	return (
		<Card className={TABLE_CARD}>
			<CardBody className="p-0">
				{/* Table Header */}
				<div className={TABLE_HEADER}>
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('SPONSOR_ADS_TITLE')}</h3>
						<div className="flex items-center gap-3">
							{headerControls}
							<span className="text-sm text-gray-500 dark:text-gray-400">
								{totalCount} {t('TOTAL_COUNT')}
							</span>
						</div>
					</div>
				</div>

				{/* Table Body */}
				{sponsorAds.length === 0 ? (
					<EmptyState />
				) : (
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{sponsorAds.map((sponsorAd) => (
							<SponsorRow
								key={sponsorAd.id}
								sponsorAd={sponsorAd}
								isSubmitting={isSubmitting}
								isConfirmingDelete={confirmDeleteId === sponsorAd.id}
								onApprove={onApprove}
								onReject={onReject}
								onCancel={onCancel}
								onDelete={onDelete}
							/>
						))}
					</div>
				)}
			</CardBody>
		</Card>
	);
}

function EmptyState() {
	const t = useTranslations('admin.SPONSORSHIPS');

	return (
		<div className="px-6 py-12 text-center">
			<Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
			<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('NO_SPONSOR_ADS_FOUND')}</h3>
			<p className="text-gray-500 dark:text-gray-400">{t('NO_SPONSOR_ADS_DESCRIPTION')}</p>
		</div>
	);
}

interface SponsorRowProps {
	sponsorAd: SponsorAd;
	isSubmitting: boolean;
	isConfirmingDelete: boolean;
	onApprove: (id: string) => void;
	onReject: (sponsorAd: SponsorAd) => void;
	onCancel: (id: string) => void;
	onDelete: (id: string) => void;
}

function SponsorRow({
	sponsorAd,
	isSubmitting,
	isConfirmingDelete,
	onApprove,
	onReject,
	onCancel,
	onDelete,
}: SponsorRowProps) {
	const t = useTranslations('admin.SPONSORSHIPS');

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const formatDate = (date: Date | string | null) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
	};

	const status = sponsorAd.status as SponsorAdStatus;

	// Button visibility logic:
	// - Approve/Reject: for pending_payment and pending statuses
	// - Cancel: only for active status (to stop the sponsorship)
	// - Delete: only for non-active statuses (to remove the record)
	const canApproveReject = status === 'pending_payment' || status === 'pending';
	const canCancel = status === 'active';
	const canDelete = status !== 'active';

	// Format status for display using translations
	const getStatusLabel = (s: string) => {
		const translationKeys: Record<string, string> = {
			pending_payment: 'STATUS_PENDING_PAYMENT',
			pending: 'STATUS_PENDING',
			active: 'STATUS_ACTIVE',
			rejected: 'STATUS_REJECTED',
			expired: 'STATUS_EXPIRED',
			cancelled: 'STATUS_CANCELLED',
			// Legacy status
			approved: 'STATUS_APPROVED',
		};
		return t(translationKeys[s] || s);
	};

	return (
		<div className={TABLE_ROW}>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				{/* Item Info */}
				<div className="flex items-center space-x-4 flex-1 min-w-0">
					<div className={ICON_PLACEHOLDER}>
						<Megaphone className="w-6 h-6" />
					</div>
					<div className="flex-1 min-w-0">
						<h4 className="font-medium text-gray-900 dark:text-white truncate">
							<a
								href={`/items/${sponsorAd.itemSlug}`}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
							>
								{sponsorAd.itemSlug}
							</a>
						</h4>
						<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
							<span className="truncate">/{sponsorAd.itemSlug}</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span className="capitalize">{sponsorAd.interval}</span>
							<span>•</span>
							<span>{formatCurrency(sponsorAd.amount)}</span>
							{sponsorAd.startDate && (
								<>
									<span>•</span>
									<Calendar className="w-3 h-3" />
									<span>{formatDate(sponsorAd.startDate)}</span>
									{sponsorAd.endDate && (
										<span>- {formatDate(sponsorAd.endDate)}</span>
									)}
								</>
							)}
						</div>
						{sponsorAd.rejectionReason && (
							<p className="text-xs text-red-500 mt-1">
								{t('REJECTION_REASON')}: {sponsorAd.rejectionReason}
							</p>
						)}
					</div>
				</div>

				{/* Status & Actions */}
				<div className="flex items-center gap-2 flex-wrap shrink-0">
					<Chip
						color={STATUS_CHIP_CONFIG[status]?.color || 'default'}
						variant={STATUS_CHIP_CONFIG[status]?.variant || 'flat'}
						size="sm"
						classNames={{
							base: 'px-3 py-1',
							content: 'font-medium text-xs',
						}}
					>
						{getStatusLabel(status)}
					</Chip>

					{/* Approve/Reject buttons for pending_payment and pending */}
					{canApproveReject && (
						<>
							<Button
								size="sm"
								color="success"
								variant="light"
								onPress={() => onApprove(sponsorAd.id)}
								isDisabled={isSubmitting}
								startContent={<CheckCircle className="w-4 h-4" />}
							>
								{t('APPROVE')}
							</Button>
							<Button
								size="sm"
								color="danger"
								variant="light"
								onPress={() => onReject(sponsorAd)}
								isDisabled={isSubmitting}
								startContent={<XCircle className="w-4 h-4" />}
							>
								{t('REJECT')}
							</Button>
						</>
					)}

					{/* Cancel button */}
					{canCancel && (
						<Button
							size="sm"
							color="default"
							variant="light"
							onPress={() => onCancel(sponsorAd.id)}
							isDisabled={isSubmitting}
							startContent={<Ban className="w-4 h-4" />}
						>
							{t('CANCEL')}
						</Button>
					)}

					{/* Delete button only for terminal states */}
					{canDelete && (
						<Button
							size="sm"
							color={isConfirmingDelete ? 'danger' : 'default'}
							variant="light"
							onPress={() => onDelete(sponsorAd.id)}
							isDisabled={isSubmitting}
							startContent={<Trash2 className="w-4 h-4" />}
						>
							{isConfirmingDelete ? t('CONFIRM_DELETE') : ''}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
