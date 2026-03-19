'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentFormProps } from '../../types/payment-types';
import { usePolarEmbed } from './use-polar-embed';
import { cn } from '@/lib/utils';

export interface PolarPaymentFormProps extends Pick<PaymentFormProps, 'onSuccess' | 'onError' | 'successUrl'> {
	checkoutUrl: string | undefined;
	theme?: 'light' | 'dark';
	onClose?: () => void;
}

const PolarSkeleton = () => (
	<div className="w-full h-full p-8 space-y-8 animate-pulse">
		<div className="flex items-center justify-between">
			<div className="space-y-2">
				<div className="h-4 w-32 bg-gray-200 dark:bg-white/[0.08] rounded-lg" />
				<div className="h-6 w-48 bg-gray-300 dark:bg-white/[0.08] rounded-lg" />
			</div>
			<div className="h-10 w-10 bg-gray-200 dark:bg-white/[0.08] rounded-full" />
		</div>
		<div className="space-y-4">
			<div className="h-12 w-full bg-gray-200 dark:bg-white/[0.08] rounded-xl" />
			<div className="grid grid-cols-2 gap-4">
				<div className="h-12 w-full bg-gray-200 dark:bg-white/[0.08] rounded-xl" />
				<div className="h-12 w-full bg-gray-200 dark:bg-white/[0.08] rounded-xl" />
			</div>
			<div className="h-12 w-full bg-gray-200 dark:bg-white/[0.08] rounded-xl" />
		</div>
		<div className="pt-4">
			<div className="h-14 w-full bg-blue-500/20 dark:bg-blue-500/10 rounded-xl border border-blue-500/20" />
		</div>
	</div>
);

export function PolarPaymentForm({ checkoutUrl, onSuccess, onError, theme = 'light', onClose }: PolarPaymentFormProps) {
	const { isLoading, error } = usePolarEmbed({
		checkoutUrl,
		theme,
		onSuccess,
		onError,
		onClose
	});

	if (error) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="flex flex-col items-center justify-center p-8 text-center h-[650px] bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl backdrop-blur-xl"
			>
				<div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-6">
					<span className="text-3xl">⚠️</span>
				</div>
				<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Checkout Error</h3>
				<p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm">{error}</p>
				<Button
					size="lg"
					variant="default"
					className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8"
					onClick={() => window.location.reload()}
				>
					Try Again
				</Button>
			</motion.div>
		);
	}

	return (
		<div className="relative w-full h-[650px] overflow-hidden rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200/50 dark:border-white/[0.04] shadow-2xl transition-all duration-500">
			<AnimatePresence mode="wait">
				{isLoading && (
					<motion.div
						key="loading"
						initial={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.4 }}
						className="absolute inset-0 z-20 bg-white dark:bg-[#0B0F1A] backdrop-blur-sm"
					>
						<PolarSkeleton />
						<div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-3">
							<Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
							<p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
								Securing your connection...
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: isLoading ? 0 : 1 }}
				transition={{ duration: 0.6, delay: 0.2 }}
				className={cn('w-full h-full', isLoading ? 'pointer-events-none' : 'pointer-events-auto')}
			>
				{/* Polar SDK injects the iframe here */}
			</motion.div>

			{/* Subtle decorative elements */}
			<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50" />
			<div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 dark:bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
		</div>
	);
}
