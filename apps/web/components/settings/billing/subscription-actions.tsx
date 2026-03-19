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

	// Helper function to handle toast lifecycle and UI state
	const handleActionWithToast = useCallback(async (
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
	}, [onActionComplete]);

	// Action handlers
	const handleUpdatePlan = useCallback(async () => {
		await handleActionWithToast(
			async () => {
				const result = await createBillingPortalSession.mutateAsync();
				if (result) {
					window.open(result.data.url, '_blank');
				}
			},
			'Updating plan...',
			'Plan update submitted successfully.',
			'Failed to update plan. Please try again.'
		);
	}, [createBillingPortalSession, handleActionWithToast]);

	const handleCancelSubscription = useCallback(async (cancelAtPeriodEnd: boolean) => {
		const loadingMessage = cancelAtPeriodEnd ? 'Scheduling cancellation...' : 'Cancelling...';
		const successMessage = cancelAtPeriodEnd ? 'Cancellation scheduled.' : 'Subscription cancelled.';

		await handleActionWithToast(
			async () => {
				await cancelSubscriptionById.mutateAsync({ subscriptionId, cancelAtPeriodEnd });
			},
			loadingMessage,
			successMessage,
			'Failed to cancel subscription. Please try again.'
		);
	}, [subscriptionId, cancelSubscriptionById, handleActionWithToast]);

	const handleReactivateSubscription = useCallback(async () => {
		await handleActionWithToast(
			async () => {
				await reactivateSubscription.mutateAsync({ subscriptionId });
			},
			'Reactivating...',
			'Subscription reactivated successfully.',
			'Failed to reactivate subscription. Please try again.'
		);
	}, [subscriptionId, reactivateSubscription, handleActionWithToast]);

	const handleBillingPortalSession = useCallback(async () => {
		await handleActionWithToast(
			async () => {
				const result = await createBillingPortalSession.mutateAsync();
				router.push(result.data.url);
			},
			'Creating billing portal session...',
			'Billing portal session created successfully.',
			'Failed to create billing portal session. Please try again.'
		);
	}, [createBillingPortalSession, handleActionWithToast, router]);

	// Memoized action configurations based on subscription status
	const availableActions = useMemo((): ActionConfig[] => {
		const baseActions: ActionConfig[] = [
			{
				id: 'update',
				label: 'Update Plan',
				icon: Settings,
				variant: 'default',
				disabled: isProcessing || isCreateBillingPortalSessionPending || isCreateBillingPortalSessionSuccess || isCreateBillingPortalSessionError,
				confirmMessage: 'Are you sure you want to update your plan?',
				action: async () => handleUpdatePlan()
			}
		];

		// Status-specific actions
		switch (status.toLowerCase()) {
			case SUBSCRIPTION_STATUSES.ACTIVE:
				baseActions.push({
					id: 'cancel',
					label: 'Cancel Subscription',
					icon: Pause,
					variant: 'destructive',
					disabled: isCancelling || isProcessing,
					confirmMessage: 'Are you sure you want to cancel your subscription?',
					action: async () => handleCancelSubscription(true)
				});
				break;

			case SUBSCRIPTION_STATUSES.TRIALING:
				baseActions.push({
					id: 'cancel',
					label: 'End Trial',
					icon: Pause,
					variant: 'destructive',
					disabled: isCancelling || isProcessing,
					confirmMessage: 'Are you sure you want to end your trial?',
					action: async () => handleCancelSubscription(false)
				});
				break;

			case SUBSCRIPTION_STATUSES.CANCELLED:
				baseActions.push({
					id: 'reactivate',
					label: 'Reactivate',
					icon: Play,
					variant: 'success',
					disabled: isReactivating || isProcessing,
					confirmMessage: 'Are you sure you want to reactivate your subscription?',
					action: async () => handleReactivateSubscription()
				});
			}

		return baseActions;
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
		if (action.confirmMessage) {
			setShowConfirmDialog(action.id);
		} else {
			action.action();
		}
	}, []);

	const handleConfirmAction = useCallback(async (actionId: string) => {
		if (actionId === 'cancel') {
			const cancelAtPeriodEnd = status.toLowerCase() === SUBSCRIPTION_STATUSES.ACTIVE;
			await handleCancelSubscription(cancelAtPeriodEnd);
		} else if (actionId === 'reactivate') {
			await handleReactivateSubscription();
		} else if (actionId === 'update') {
			await handleUpdatePlan();
		}
		else if (actionId === 'billing-portal') {
			await handleBillingPortalSession();
		}
	}, [status, handleCancelSubscription, handleReactivateSubscription, handleUpdatePlan, handleBillingPortalSession]);

	// Error aggregation
	const hasErrors = cancelError || reactivateError;
	const errorMessages = [cancelError?.message, reactivateError?.message].filter(Boolean);

	if (availableActions.length === 0) {
		return null;
	}

	return (
		<div className={cn('space-y-3', className)}>
			{/* Actions Toggle */}
			<div className="flex justify-end">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors"
				>
					<Settings className="w-4 h-4" />
					{isExpanded ? 'Hide' : 'Actions'}
				</button>
			</div>

			{/* Actions Panel */}
			{isExpanded && (
				<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-xs">
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
							Subscription Actions
						</h4>
						<div className="flex items-center gap-2">
							<span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
								{status.replace('_', ' ')}
							</span>
							<span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
								{planName}
							</span>
						</div>
					</div>

					{/* Error Display */}
					{hasErrors && (
						<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
							<div className="flex items-center gap-2">
								<AlertTriangle className="w-4 h-4 text-red-500" />
								<p className="text-sm text-red-700 dark:text-red-300">
									{errorMessages[0] || 'Action failed'}
								</p>
							</div>
						</div>
					)}

					{/* Actions Grid */}
					<div className="flex flex-wrap gap-2 justify-end">
						{availableActions.map((action) => (
							<button
								key={action.id}
								onClick={() => handleActionClick(action)}
								disabled={action.disabled}
								className={cn(
									'flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm',
									action.variant === 'default' && 'bg-slate-900/10 hover:bg-slate-900/10 text-slate-200 border border-slate-900/50 dark:border-slate-100/50',
									action.variant === 'destructive' && 'bg-red-900 hover:bg-red-900 text-white border border-red-900/50 dark:border-red-100/50',
									action.variant === 'success' && 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300/50 dark:border-emerald-100/50',
									action.variant === 'secondary' && 'bg-slate-900/50 hover:bg-slate-900/10 text-slate-200 border border-slate-900/50 dark:border-slate-100/50'
								)}
							>
								<action.icon className="w-3.5 h-3.5" />
								<span className="font-medium">
									{action.disabled ? 'Processing...' : action.label}
								</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Confirmation Dialog */}
			{showConfirmDialog && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-slate-800 rounded-lg p-4 max-w-sm mx-4 shadow-lg border border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-2 mb-3">
							<AlertTriangle className="w-5 h-5 text-orange-500" />
							<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
								Confirm Action
							</h3>
						</div>

						<p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
							{availableActions.find((a) => a.id === showConfirmDialog)?.confirmMessage}
						</p>

						<div className="flex gap-2 justify-end">
							<button
								onClick={() => setShowConfirmDialog(null)}
								className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors"
								disabled={isProcessing}
							>
								Cancel
							</button>
							<button
								onClick={() => handleConfirmAction(showConfirmDialog)}
								className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50"
								disabled={isProcessing}
							>
								{isProcessing ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									'Confirm'
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
