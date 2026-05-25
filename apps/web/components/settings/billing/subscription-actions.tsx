'use client';

import { useState, useCallback, useMemo } from 'react';
import { Play, Pause, Settings, AlertTriangle, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export interface SubscriptionActionsProps {
	subscriptionId: string;
	status: string;
	planName: string;
	onActionComplete?: () => void;
	className?: string;
}

interface ActionConfig {
	id: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	variant: 'default' | 'destructive' | 'secondary' | 'success';
	disabled: boolean;
	confirmMessage?: string;
	action: () => Promise<void>;
}

const SUBSCRIPTION_STATUSES = {
	ACTIVE: 'active',
	TRIALING: 'trialing',
	PAST_DUE: 'past_due',
	CANCELLED: 'cancelled',
	INCOMPLETE: 'incomplete',
	INCOMPLETE_EXPIRED: 'incomplete_expired',
	UNPAID: 'unpaid'
} as const;

const variantClass: Record<ActionConfig['variant'], string> = {
	default:
		'bg-neutral-100 dark:bg-white/8 hover:bg-neutral-200 dark:hover:bg-white/12 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/10',
	secondary:
		'bg-neutral-100 dark:bg-white/8 hover:bg-neutral-200 dark:hover:bg-white/12 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/10',
	destructive:
		'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20',
	success:
		'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
};

export function SubscriptionActions({
	subscriptionId,
	status,
	planName,
	onActionComplete,
	className
}: SubscriptionActionsProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const {
		cancelSubscriptionById,
		reactivateSubscription,
		isCancelling,
		isReactivating,
		cancelError,
		reactivateError,
		createBillingPortalSession,
		isCreateBillingPortalSessionPending,
		isCreateBillingPortalSessionSuccess,
		isCreateBillingPortalSessionError
	} = useSubscription();
	const router = useRouter();

	const handleActionWithToast = useCallback(
		async (
			action: () => Promise<void>,
			loadingMessage: string,
			successMessage: string,
			errorMessage: string
		) => {
			setIsProcessing(true);
			const toastId = toast.loading(loadingMessage, { duration: Infinity });
			try {
				await action();
				toast.success(successMessage, { id: toastId, duration: 3000 });
				setShowConfirmDialog(null);
				setIsExpanded(false);
				onActionComplete?.();
			} catch (error) {
				console.error('Action failed:', error);
				toast.error(errorMessage, { id: toastId, duration: 5000 });
			} finally {
				setIsProcessing(false);
			}
		},
		[onActionComplete]
	);

	const handleUpdatePlan = useCallback(async () => {
		await handleActionWithToast(
			async () => {
				const result = await createBillingPortalSession.mutateAsync();
				if (result) window.open(result.data.url, '_blank');
			},
			'Updating plan…',
			'Plan update submitted.',
			'Failed to update plan. Please try again.'
		);
	}, [createBillingPortalSession, handleActionWithToast]);

	const handleCancelSubscription = useCallback(
		async (cancelAtPeriodEnd: boolean) => {
			await handleActionWithToast(
				async () => {
					await cancelSubscriptionById.mutateAsync({ subscriptionId, cancelAtPeriodEnd });
				},
				cancelAtPeriodEnd ? 'Scheduling cancellation…' : 'Cancelling…',
				cancelAtPeriodEnd ? 'Cancellation scheduled.' : 'Subscription cancelled.',
				'Failed to cancel subscription. Please try again.'
			);
		},
		[subscriptionId, cancelSubscriptionById, handleActionWithToast]
	);

	const handleReactivateSubscription = useCallback(async () => {
		await handleActionWithToast(
			async () => {
				await reactivateSubscription.mutateAsync({ subscriptionId });
			},
			'Reactivating…',
			'Subscription reactivated.',
			'Failed to reactivate subscription. Please try again.'
		);
	}, [subscriptionId, reactivateSubscription, handleActionWithToast]);

	const handleBillingPortalSession = useCallback(async () => {
		await handleActionWithToast(
			async () => {
				const result = await createBillingPortalSession.mutateAsync();
				router.push(result.data.url);
			},
			'Opening billing portal…',
			'Redirecting…',
			'Failed to open billing portal. Please try again.'
		);
	}, [createBillingPortalSession, handleActionWithToast, router]);

	const availableActions = useMemo((): ActionConfig[] => {
		const portalBusy =
			isProcessing ||
			isCreateBillingPortalSessionPending ||
			isCreateBillingPortalSessionSuccess ||
			isCreateBillingPortalSessionError;

		const base: ActionConfig[] = [
			{
				id: 'update',
				label: 'Update Plan',
				icon: Settings,
				variant: 'default',
				disabled: portalBusy,
				confirmMessage: 'Open the billing portal to update your plan?',
				action: handleUpdatePlan
			}
		];

		switch (status.toLowerCase()) {
			case SUBSCRIPTION_STATUSES.ACTIVE:
				base.push({
					id: 'cancel',
					label: 'Cancel Subscription',
					icon: Pause,
					variant: 'destructive',
					disabled: isCancelling || isProcessing,
					confirmMessage: 'Cancel your subscription at the end of the current period?',
					action: async () => handleCancelSubscription(true)
				});
				break;
			case SUBSCRIPTION_STATUSES.TRIALING:
				base.push({
					id: 'cancel',
					label: 'End Trial',
					icon: Pause,
					variant: 'destructive',
					disabled: isCancelling || isProcessing,
					confirmMessage: 'End your trial period now?',
					action: async () => handleCancelSubscription(false)
				});
				break;
			case SUBSCRIPTION_STATUSES.CANCELLED:
				base.push({
					id: 'reactivate',
					label: 'Reactivate',
					icon: Play,
					variant: 'success',
					disabled: isReactivating || isProcessing,
					confirmMessage: 'Reactivate your subscription?',
					action: handleReactivateSubscription
				});
				break;
		}

		return base;
	}, [
		status,
		isCancelling,
		isReactivating,
		isProcessing,
		isCreateBillingPortalSessionPending,
		isCreateBillingPortalSessionSuccess,
		isCreateBillingPortalSessionError,
		handleUpdatePlan,
		handleCancelSubscription,
		handleReactivateSubscription
	]);

	const handleActionClick = useCallback((action: ActionConfig) => {
		if (action.confirmMessage) setShowConfirmDialog(action.id);
		else action.action();
	}, []);

	const handleConfirmAction = useCallback(
		async (actionId: string) => {
			if (actionId === 'cancel') {
				await handleCancelSubscription(status.toLowerCase() === SUBSCRIPTION_STATUSES.ACTIVE);
			} else if (actionId === 'reactivate') {
				await handleReactivateSubscription();
			} else if (actionId === 'update') {
				await handleUpdatePlan();
			} else if (actionId === 'billing-portal') {
				await handleBillingPortalSession();
			}
		},
		[status, handleCancelSubscription, handleReactivateSubscription, handleUpdatePlan, handleBillingPortalSession]
	);

	const errorMessages = [cancelError?.message, reactivateError?.message].filter(Boolean);

	if (availableActions.length === 0) return null;

	return (
		<div className={cn('space-y-3', className)}>
			{/* Toggle */}
			<div className="flex justify-end">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
				>
					<Settings className="h-3.5 w-3.5" />
					{isExpanded ? 'Hide Actions' : 'Actions'}
				</button>
			</div>

			{isExpanded && (
				<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-lg p-4">
					<div className="flex items-center justify-between mb-3">
						<p className="text-xs font-semibold text-neutral-900 dark:text-white">Subscription Actions</p>
						<div className="flex items-center gap-2">
							<span className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
								{status.replace('_', ' ')}
							</span>
							<span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{planName}</span>
						</div>
					</div>

					{errorMessages.length > 0 && (
						<div className="mb-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
							<p className="text-xs text-red-700 dark:text-red-400">{errorMessages[0]}</p>
						</div>
					)}

					<div className="flex flex-wrap gap-2 justify-end">
						{availableActions.map((action) => (
							<button
								key={action.id}
								onClick={() => handleActionClick(action)}
								disabled={action.disabled}
								className={cn(
									'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
									variantClass[action.variant]
								)}
							>
								<action.icon className="h-3.5 w-3.5" />
								{action.disabled ? 'Processing…' : action.label}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Confirmation dialog */}
			{showConfirmDialog && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-neutral-900 rounded-xl p-5 max-w-sm w-full mx-4 shadow-xl border border-neutral-200 dark:border-white/10">
						<div className="flex items-center gap-2 mb-3">
							<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
							<p className="text-sm font-semibold text-neutral-900 dark:text-white">Confirm Action</p>
						</div>
						<p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
							{availableActions.find((a) => a.id === showConfirmDialog)?.confirmMessage}
						</p>
						<div className="flex gap-2 justify-end">
							<button
								onClick={() => setShowConfirmDialog(null)}
								disabled={isProcessing}
								className="inline-flex items-center h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={() => handleConfirmAction(showConfirmDialog)}
								disabled={isProcessing}
								className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50"
							>
								{isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
