'use client';

import { useEffect } from 'react';
import { Button } from '@heroui/react';
import { RefreshCw, CreditCard, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SponsorAd } from '@/lib/db/schema';

interface PricingConfig {
	enabled: boolean;
	weeklyPrice: number;
	monthlyPrice: number;
	currency: string;
}

interface RenewDialogProps {
	isOpen: boolean;
	sponsorAd: SponsorAd | null;
	pricingConfig: PricingConfig;
	isSubmitting: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

// Styling constants
const MODAL_OVERLAY = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
const MODAL_CONTAINER = 'w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden';
const MODAL_HEADER = 'bg-linear-to-r from-green-500 to-emerald-600 px-6 py-4';
const MODAL_BODY = 'p-6';
const ITEM_PREVIEW = 'p-4 bg-gray-100 dark:bg-gray-800 rounded-lg';
const PRICING_BOX =
	'flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50';
const INFO_BOX =
	'flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50';

function formatSlugToTitle(slug: string): string {
	return slug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

function formatAmount(amount: number, currency: string = 'usd'): string {
	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: (currency || 'usd').toUpperCase()
	}).format(amount);
}

/**
 * Renew Dialog Component
 * Modal for renewing sponsor ads with pricing confirmation
 */
export function RenewDialog({ isOpen, sponsorAd, pricingConfig, isSubmitting, onConfirm, onClose }: RenewDialogProps) {
	const t = useTranslations('client.sponsorships');

	// Handle Escape key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !isSubmitting) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';

			return () => {
				document.removeEventListener('keydown', handleEscape);
				document.body.style.overflow = '';
			};
		}
	}, [isOpen, isSubmitting, onClose]);

	if (!isOpen || !sponsorAd) return null;

	// Fallback to monthly if interval is undefined
	const interval = sponsorAd.interval || 'monthly';
	const intervalLabel = t(`INTERVAL_${interval.toUpperCase()}`);

	// Get renewal price based on interval from current pricing config
	const renewalPrice = interval === 'weekly' ? pricingConfig.weeklyPrice : pricingConfig.monthlyPrice;

	return (
		<div className={MODAL_OVERLAY} onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
			<div className={MODAL_CONTAINER} role="dialog" aria-modal="true" aria-labelledby="renew-dialog-title">
				{/* Header */}
				<div className={MODAL_HEADER}>
					<div className="flex items-center space-x-3">
						<div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20">
							<RefreshCw className="h-6 w-6 text-white" />
						</div>
						<h2 id="renew-dialog-title" className="text-xl font-semibold text-white">
							{t('RENEW_DIALOG_TITLE')}
						</h2>
					</div>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('RENEW_DIALOG_DESCRIPTION')}</p>

					{/* Item Preview */}
					<div className={ITEM_PREVIEW}>
						<p className="font-medium text-gray-900 dark:text-white">
							{formatSlugToTitle(sponsorAd.itemSlug)}
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{intervalLabel} {t('SPONSORSHIP')}
						</p>
						<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
							{t('RENEWAL_DURATION', { interval: intervalLabel.toLowerCase() })}
						</p>
					</div>

					{/* Pricing */}
					<div className={`${PRICING_BOX} mt-4`}>
						<div className="flex items-center gap-2">
							<CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
								{t('RENEWAL_PRICE')}
							</span>
						</div>
						<span className="text-xl font-bold text-green-600 dark:text-green-400">
							{formatAmount(renewalPrice, pricingConfig.currency)}
						</span>
					</div>

					{/* Info about redirect */}
					<div className={`${INFO_BOX} mt-4`}>
						<ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
						<p className="text-sm text-blue-800 dark:text-blue-200">{t('RENEW_REDIRECT_INFO')}</p>
					</div>

					{/* Actions */}
					<div className="flex justify-end space-x-3 mt-6">
						<Button color="default" variant="bordered" onPress={onClose} isDisabled={isSubmitting}>
							{t('CANCEL_BUTTON')}
						</Button>
						<Button
							color="success"
							onPress={onConfirm}
							isLoading={isSubmitting}
							isDisabled={isSubmitting}
							endContent={!isSubmitting && <ExternalLink className="h-4 w-4" />}
						>
							{t('PROCEED_TO_PAYMENT')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
