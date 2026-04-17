'use client';

import { CredentialsForm } from '@/app/[locale]/auth/components/credentials-form';
import { SocialLogin } from '@/app/[locale]/auth/components/social-login';
import { useConfig } from '@/app/[locale]/config';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { authFeatures } from '@/lib/config/auth-features';
import { useTranslations } from 'next-intl';
import { SiteLogo } from '../shared/site-logo';

interface LoginContentProps {
	variant?: 'modal' | 'page';
	message?: string;
	type?: 'login' | 'signup';
	onSuccess?: () => void;
	callbackUrl?: string;
}

/**
 * Shared login/signup content component used in both modal and full-page contexts
 * No motion.div wrappers to prevent content flashing
 */
export function LoginContent({
	variant = 'modal',
	message = 'Welcome back',
	type = 'login',
	onSuccess,
	callbackUrl
}: LoginContentProps) {
	const _config = useConfig();
	const { currentTheme } = useTheme();
	const _isDark = currentTheme.background === '#000000' || currentTheme.text === '#ffffff';
	const t = useTranslations('common');

	return (
		<div className="flex flex-col md:flex-row">
			{/* Left Side - Features */}
			<div
				className={cn(
					'w-full p-6 flex flex-col justify-center',
					variant === 'modal' ? 'md:w-[42%]' : 'md:w-1/2',
					'bg-gray-50/80 dark:bg-white/2',
					'md:border-r border-gray-100 dark:border-white/6'
				)}
			>
				{/* Logo */}
				<div className="flex items-center mb-5">
					<SiteLogo size="sm" showText={true} />
				</div>

				{/* Title */}
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
					Discover & Connect
				</h2>
				<p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
					Join our network of professionals and unlock new opportunities.
				</p>

				{/* Features */}
				<div className="space-y-3.5">
					{authFeatures.map((feature) => (
						<div key={feature.titleKey} className="flex items-center gap-3">
							<div className="shrink-0 w-8 h-8 rounded-lg bg-theme-primary/10 dark:bg-theme-primary/15 flex items-center justify-center">
								<feature.icon className="h-4 w-4 text-theme-primary" />
							</div>
							<div>
								<h3 className="text-sm font-medium text-gray-900 dark:text-white">
									{t(feature.titleKey as any)}
								</h3>
								<p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
									{t(feature.descriptionKey as any)}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Right Side - Auth Form */}
			<div
				className={cn(
					'w-full p-6 flex items-center justify-center',
					variant === 'modal' ? 'md:w-[58%]' : 'md:w-1/2'
				)}
				aria-label={message}
			>
				<div className="w-full max-w-sm">
					<CredentialsForm type={type} onSuccess={onSuccess} callbackUrl={callbackUrl}>
						<SocialLogin callbackUrl={callbackUrl} />
					</CredentialsForm>

					<p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-4">
						By signing in, you agree to our{' '}
						<a href="#" className="text-theme-primary hover:underline">
							Terms
						</a>{' '}
						&{' '}
						<a href="#" className="text-theme-primary hover:underline">
							Privacy
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
