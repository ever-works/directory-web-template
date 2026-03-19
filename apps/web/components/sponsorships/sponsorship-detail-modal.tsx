'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { FiX, FiPackage, FiCalendar, FiDollarSign, FiClock, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import type { SponsorAdStatus } from '@/lib/types/sponsor-ad';
import { formatDateShort } from '@/utils/date';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';
import { SPONSOR_STATUS_CONFIG, formatSlugToTitle } from './constants';

// ######################### Types #########################

export interface SponsorshipDetailModalProps {
	isOpen: boolean;
	sponsorshipId: string | null;
	onClose: () => void;
	onActionComplete?: () => void;
}

interface CheckoutResponse {
	success: boolean;
	data?: {
		checkoutUrl: string | null;
	};
}

interface CancelResponse {
	success: boolean;
	message?: string;
}

// ######################### Constants #########################

const MODAL_OVERLAY = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
const MODAL_CONTAINER = 'w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col';
const MODAL_HEADER = 'px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between';
const MODAL_BODY = 'p-6 overflow-y-auto flex-1';
const MODAL_FOOTER = 'px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3';
const SECTION_TITLE = 'text-sm font-medium text-gray-500 dark:text-gray-400 mb-2';
const INFO_ROW = 'flex items-center justify-between py-2';
const INFO_LABEL = 'text-sm text-gray-600 dark:text-gray-400';
const INFO_VALUE = 'text-sm font-medium text-gray-900 dark:text-gray-100';

// ######################### Component #########################

export function SponsorshipDetailModal({
	isOpen,
	sponsorshipId,
	onClose,
	onActionComplete,
}: SponsorshipDetailModalProps) {
	const t = useTranslations('client.sponsorships');
	const [isActionLoading, setIsActionLoading] = useState(false);
	const [showCancelConfirm, setShowCancelConfirm] = useState(false);

	const { data: sponsorAd, isLoading, error, refetch } = useSponsorAdDetail(isOpen ? sponsorshipId : null);

	// Handle Escape key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !isActionLoading) {
				if (showCancelConfirm) {
					setShowCancelConfirm(false);
				} else {
					onClose();
				}
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = '';
		};
	}, [isOpen, isActionLoading, showCancelConfirm, onClose]);

	// Handle Pay action
	const handlePay = useCallback(async () => {
		if (!sponsorAd) return;

		setIsActionLoading(true);
		try {
			const response = await serverClient.post<CheckoutResponse>('/api/sponsor-ads/checkout', {
				sponsorAdId: sponsorAd.id,
			});

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response));
			}

			const checkoutUrl = response.data?.data?.checkoutUrl;
			if (checkoutUrl) {
				window.location.href = checkoutUrl;
			} else {
				throw new Error('No checkout URL returned');
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create checkout session';
			toast.error(message);
		} finally {
			setIsActionLoading(false);
		}
	}, [sponsorAd]);

	// Handle Cancel action
	const handleCancel = useCallback(async () => {
		if (!sponsorAd) return;

		setIsActionLoading(true);
		try {
			const response = await serverClient.post<CancelResponse>(`/api/sponsor-ads/user/${sponsorAd.id}/cancel`, {});

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response));
			}

			toast.success(t('CANCEL_SUCCESS'));
			setShowCancelConfirm(false);
			onClose();
			onActionComplete?.();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to cancel sponsorship';
			toast.error(message);
		} finally {
			setIsActionLoading(false);
		}
	}, [sponsorAd, t, onClose, onActionComplete]);

	// Handle Renew action (same as Pay for expired sponsorships)
	const handleRenew = useCallback(async () => {
		// For now, renew redirects to create new sponsorship
		// The checkout API only works for pending_payment status
		window.location.href = '/sponsor';
	}, []);

	const handleCloseModal = useCallback(() => {
		if (!isActionLoading) {
			setShowCancelConfirm(false);
			onClose();
		}
	}, [isActionLoading, onClose]);

	if (!isOpen) return null;

	const statusConfig = sponsorAd ? SPONSOR_STATUS_CONFIG[sponsorAd.status as SponsorAdStatus] || SPONSOR_STATUS_CONFIG.pending : null;
	const canPay = sponsorAd?.status === 'pending_payment';
	const canCancel = sponsorAd?.status === 'pending_payment' || sponsorAd?.status === 'pending' || sponsorAd?.status === 'active';
	const canRenew = sponsorAd?.status === 'expired';
	const showReasonSection = sponsorAd?.status === 'rejected' || sponsorAd?.status === 'cancelled';

	return (
		<div className={MODAL_OVERLAY} onClick={handleCloseModal}>
			<div
				className={MODAL_CONTAINER}
				role="dialog"
				aria-modal="true"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className={MODAL_HEADER}>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
						{t('MODAL_TITLE')}
					</h2>
					<button
						onClick={handleCloseModal}
						disabled={isActionLoading}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
					>
						<FiX className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					{isLoading ? (
						<ModalSkeleton />
					) : error ? (
						<div className="flex flex-col items-center justify-center py-8">
							<FiAlertCircle className="w-12 h-12 text-red-500 mb-4" />
							<p className="text-gray-600 dark:text-gray-400 mb-4">{t('LOAD_ERROR')}</p>
							<Button size="sm" onPress={() => refetch()}>
								{t('RETRY')}
							</Button>
						</div>
					) : sponsorAd ? (
						<div className="space-y-6">
							{/* Status Badge */}
							{statusConfig && (
								<div className="flex justify-center">
									<span
										className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}
									>
										{t(statusConfig.labelKey)}
									</span>
								</div>
							)}

							{/* Item Information */}
							<div>
								<h3 className={SECTION_TITLE}>{t('ITEM_INFORMATION')}</h3>
								<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-10 h-10 bg-linear-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/40 rounded-lg flex items-center justify-center">
											<FiPackage className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-400" />
										</div>
										<div className="min-w-0 flex-1">
											<h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
												{formatSlugToTitle(sponsorAd.itemSlug)}
											</h4>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												/{sponsorAd.itemSlug}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Subscription Details */}
							<div>
								<h3 className={SECTION_TITLE}>{t('SUBSCRIPTION_DETAILS')}</h3>
								<div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
									<div className={INFO_ROW}>
										<span className={INFO_LABEL}>
											<FiClock className="w-4 h-4 inline mr-2" />
											{t('INTERVAL')}
										</span>
										<span className={INFO_VALUE}>
											{t(`INTERVAL_${sponsorAd.interval?.toUpperCase()}`)}
										</span>
									</div>
									<div className={INFO_ROW}>
										<span className={INFO_LABEL}>
											<FiDollarSign className="w-4 h-4 inline mr-2" />
											{t('AMOUNT')}
										</span>
										<span className={INFO_VALUE}>
											{formatCurrencyAmount(sponsorAd.amount, sponsorAd.currency)}
										</span>
									</div>
									{sponsorAd.paymentProvider && (
										<div className={INFO_ROW}>
											<span className={INFO_LABEL}>
												<FiCreditCard className="w-4 h-4 inline mr-2" />
												{t('PAYMENT_PROVIDER')}
											</span>
											<span className={INFO_VALUE}>
												{sponsorAd.paymentProvider}
											</span>
										</div>
									)}
								</div>
							</div>

							{/* Dates */}
							<div>
								<h3 className={SECTION_TITLE}>{t('IMPORTANT_DATES')}</h3>
								<div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
									<div className={INFO_ROW}>
										<span className={INFO_LABEL}>
											<FiCalendar className="w-4 h-4 inline mr-2" />
											{t('CREATED_DATE')}
										</span>
										<span className={INFO_VALUE}>{formatDateShort(sponsorAd.createdAt)}</span>
									</div>
									{sponsorAd.startDate && (
										<div className={INFO_ROW}>
											<span className={INFO_LABEL}>{t('START_DATE')}</span>
											<span className={INFO_VALUE}>{formatDateShort(sponsorAd.startDate)}</span>
										</div>
									)}
									{sponsorAd.endDate && (
										<div className={INFO_ROW}>
											<span className={INFO_LABEL}>{t('END_DATE')}</span>
											<span className={INFO_VALUE}>{formatDateShort(sponsorAd.endDate)}</span>
										</div>
									)}
									{sponsorAd.reviewedAt && (
										<div className={INFO_ROW}>
											<span className={INFO_LABEL}>{t('REVIEWED_DATE')}</span>
											<span className={INFO_VALUE}>{formatDateShort(sponsorAd.reviewedAt)}</span>
										</div>
									)}
								</div>
							</div>

							{/* Rejection/Cancellation Reason */}
							{showReasonSection && (
								<div>
									{sponsorAd.status === 'rejected' && sponsorAd.rejectionReason && (
										<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
											<p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
												{t('REJECTION_REASON')}
											</p>
											<p className="text-sm text-red-600 dark:text-red-300">
												{sponsorAd.rejectionReason}
											</p>
										</div>
									)}
									{sponsorAd.status === 'cancelled' && sponsorAd.cancelReason && (
										<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
											<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
												{t('CANCEL_REASON')}
											</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">
												{sponsorAd.cancelReason}
											</p>
										</div>
									)}
								</div>
							)}

							{/* Cancel Confirmation */}
							{showCancelConfirm && (
								<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
									<p className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">
										{t('CONFIRM_CANCEL_MESSAGE')}
									</p>
									<div className="flex gap-2">
										<Button
											size="sm"
											color="danger"
											onPress={handleCancel}
											isLoading={isActionLoading}
											isDisabled={isActionLoading}
										>
											{t('CONFIRM_CANCEL')}
										</Button>
										<Button
											size="sm"
											variant="bordered"
											onPress={() => setShowCancelConfirm(false)}
											isDisabled={isActionLoading}
										>
											{t('CANCEL_NO')}
										</Button>
									</div>
								</div>
							)}
						</div>
					) : null}
				</div>

				{/* Footer */}
				{sponsorAd && !showCancelConfirm && (
					<div className={MODAL_FOOTER}>
						{canCancel && (
							<Button
								color="danger"
								variant="bordered"
								onPress={() => setShowCancelConfirm(true)}
								isDisabled={isActionLoading}
							>
								{t('CANCEL_SPONSORSHIP')}
							</Button>
						)}
						{canPay && (
							<Button
								color="primary"
								onPress={handlePay}
								isLoading={isActionLoading}
								isDisabled={isActionLoading}
							>
								{t('PAY_NOW')}
							</Button>
						)}
						{canRenew && (
							<Button
								color="primary"
								onPress={handleRenew}
								isDisabled={isActionLoading}
							>
								{t('RENEW_SPONSORSHIP')}
							</Button>
						)}
						{!canPay && !canCancel && !canRenew && (
							<Button variant="bordered" onPress={handleCloseModal}>
								{t('CLOSE')}
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// ######################### Skeleton #########################

function ModalSkeleton() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="flex justify-center">
				<div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
			</div>
			<div>
				<div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
				<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<div className="flex items-start gap-3">
						<div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
						<div className="flex-1 space-y-2">
							<div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
							<div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
						</div>
					</div>
				</div>
			</div>
			<div>
				<div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
				<div className="space-y-3">
					<div className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
					<div className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
				</div>
			</div>
			<div>
				<div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
				<div className="space-y-3">
					<div className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
					<div className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
				</div>
			</div>
		</div>
	);
}
