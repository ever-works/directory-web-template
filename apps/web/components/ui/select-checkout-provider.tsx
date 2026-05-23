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
				'p-4 rounded-xl',
				'bg-white dark:bg-[#111111]',
				'border border-gray-200 dark:border-white/6',
				'shadow-sm',
				className
			)}
		>
			<div className="flex flex-col md:flex-row items-start justify-between gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3 flex-1 min-w-0 w-full">
					<div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-theme-primary-50 dark:bg-theme-primary-900/30">
						<CreditCard className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
					</div>

					<div className="flex-1 min-w-0">
						<h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
							{t('CHECKOUT_PROVIDER')}
						</h3>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
				<div className="flex-shrink-0 min-w-[200px] w-full md:w-auto">
					<Select
						selectedKeys={[checkoutProvider]}
						onChange={handleChange}
						disabled={disabled}
						variant="bordered"
						size="md"
						className="w-full"
						classNames={{
							trigger: 'bg-white dark:bg-white/5 border-purple-200 dark:border-white/6',
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
								className='bg-white dark:bg-[#161616] cursor-pointer text-xs'
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
