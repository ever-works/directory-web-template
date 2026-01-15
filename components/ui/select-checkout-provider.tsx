'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLayoutTheme } from '@/components/context';
import { useTranslations } from 'next-intl';
import { Select, SelectItem } from './select';
import { CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { CheckoutProvider } from '@/components/context/LayoutThemeContext';
import { usePaymentAvailability } from '@/hooks/use-payment-availability';

interface SelectCheckoutProviderProps {
	className?: string;
	disabled?: boolean;
}

const PROVIDER_INFO = {
	stripe: {
		name: 'Stripe',
		icon: '💳',
		color: 'from-blue-500 to-indigo-600',
		description: 'Credit card payments via Stripe'
	},
	lemonsqueezy: {
		name: 'Lemon Squeezy',
		icon: '🍋',
		color: 'from-yellow-500 to-orange-500',
		description: 'Simple checkout experience'
	},
	polar: {
		name: 'Polar',
		icon: '❄️',
		color: 'from-cyan-500 to-blue-600',
		description: 'Modern payment platform'
	},
	solidgate: {
		name: 'Solidgate',
		icon: '',
		color: 'from-emerald-500 to-teal-600',
		description: 'Secure payment gateway'
	}
} as const;

const SelectCheckoutProvider: React.FC<SelectCheckoutProviderProps> = ({ className, disabled = false }) => {
	const { checkoutProvider, setCheckoutProvider, configuredProviders } = useLayoutTheme();
	const { shouldShowPaymentWarning } = usePaymentAvailability();
	const t = useTranslations('settings');

	const allProviders = useMemo(() => {
		return (['stripe', 'lemonsqueezy', 'polar', 'solidgate'] as CheckoutProvider[]).map((provider) => ({
			value: provider,
			...PROVIDER_INFO[provider],
			configured: configuredProviders.includes(provider)
		}));
	}, [configuredProviders]);

	const handleChange = (e: { target: { value: string } }) => {
		if (disabled) return;

		const newProvider = e.target.value as CheckoutProvider;

		if (!configuredProviders.includes(newProvider)) {
			toast.error(t('CHECKOUT_PROVIDER_NOT_CONFIGURED', { provider: PROVIDER_INFO[newProvider].name }), {
				duration: 3000,
				description: t('CHECKOUT_PROVIDER_NOT_CONFIGURED_DESC')
			});
			return;
		}

		setCheckoutProvider(newProvider);

		toast.success(t('CHECKOUT_PROVIDER_CHANGED', { provider: PROVIDER_INFO[newProvider].name }), {
			duration: 2000,
			description: t('SETTINGS_SAVED_AUTOMATICALLY')
		});
	};

	return (
		<div
			className={cn(
				// Structure - relative z-10 to ensure dropdown appears above sibling sections
				'group p-5 rounded-xl relative z-10',

				// Purple/pink gradient - payment/checkout theme
				'bg-gradient-to-br from-purple-50/80 via-pink-50/60 to-rose-50/40',
				'dark:from-purple-950/40 dark:via-pink-950/30 dark:to-rose-950/20',

				// Glassmorphism
				'backdrop-blur-xl backdrop-saturate-150',

				// Border with purple/pink tones
				'border border-purple-200/40 dark:border-purple-800/30',

				// Enhanced shadow
				'shadow-lg shadow-black/5 dark:shadow-black/20',

				// Spring animation on hover
				'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',

				// Hover effects - lift and enhanced border
				'hover:shadow-2xl hover:shadow-purple-500/10',
				'hover:border-purple-300/60 dark:hover:border-purple-700/50',

				// Animation entrance
				'animate-fade-in-up',

				className
			)}
		>
			<div className="flex items-start justify-between gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3 flex-1 min-w-0">
					{/* Icon container with purple gradient and glassmorphism */}
					<div
						className={cn(
							'p-2 rounded-lg flex-shrink-0',
							'bg-gradient-to-br from-purple-100 to-pink-200',
							'dark:from-purple-900/40 dark:to-pink-900/40',
							'backdrop-blur-md',
							'border border-purple-300/50 dark:border-purple-700/50',
							'shadow-inner',
							// Icon animation
							'transition-transform duration-700 ease-in-out',
							'group-hover:scale-110 group-hover:rotate-3'
						)}
					>
						<CreditCard className="h-5 w-5 text-purple-700 dark:text-purple-300" />
					</div>

					{/* Text content with improved typography */}
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold tracking-tight leading-tight text-gray-900 dark:text-gray-100">
							{t('CHECKOUT_PROVIDER')}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
							{t('CHECKOUT_PROVIDER_DESC')}
						</p>

						{shouldShowPaymentWarning && (
							<div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
								<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
								<p className="text-xs text-amber-700 dark:text-amber-300">
									{t('NO_CHECKOUT_PROVIDERS_CONFIGURED')}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Select dropdown */}
				<div className="flex-shrink-0 min-w-[200px]">
					<Select
						selectedKeys={[checkoutProvider]}
						onChange={handleChange}
						disabled={disabled}
						variant="bordered"
						size="md"
						className="w-full"
						classNames={{
							trigger: 'bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700',
							value: 'text-gray-900 dark:text-gray-100',
							popover: 'z-[1000]'
						}}
					>
						{allProviders.map((provider) => (
							<SelectItem
								key={provider.value}
								value={provider.value}
								disabled={!provider.configured}
								description={!provider.configured ? t('PROVIDER_NOT_CONFIGURED') : undefined}
							>
								{provider.name}
							</SelectItem>
						))}
					</Select>
				</div>
			</div>
		</div>
	);
};

export default SelectCheckoutProvider;
