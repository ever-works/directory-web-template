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
	const tAuth = useTranslations('auth');

	return (
		<div className="relative">

			<div className="flex flex-col md:flex-row">
				{/* Left Side - Features */}
				<div
					className={cn(
						'w-full p-6 relative',
						variant === 'modal' ? 'md:w-[45%]' : 'md:w-1/2'
					)}
				>
					<div className="relative z-10">
						<div className="mb-6">
							{/* Logo */}
							<div className="flex items-center mb-6 space-x-2">
								<SiteLogo size="sm" showText={true} />
							</div>

							{/* Title */}
							<div>
								<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
									{tAuth('DISCOVER_AND_CONNECT')}
								</h2>

								<p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-8">
									{tAuth('JOIN_NETWORK_DESC')}
								</p>
							</div>

							{/* Features List */}
							<div className="space-y-4">
								{authFeatures.map((feature) => (
									<div key={feature.titleKey} className="flex items-center">
										<div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl mr-4 transition-colors">
											<feature.icon className="h-3 w-3 text-gray-400 dark:text-gray-500" />
										</div>
										<div>
											<span className="font-semibold text-sm text-gray-900 dark:text-white block">
												{t(feature.titleKey as any)}
											</span>
											<span className="text-xs text-gray-600 dark:text-gray-400">
												{t(feature.descriptionKey as any)}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Decorative gradient */}
					<div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white dark:from-[#0a0a0a] to-transparent pointer-events-none" />
				</div>

				{/* Right Side - Auth Form */}
				<div
					className={cn(
						'w-full p-6 flex items-center justify-center relative bg-white/50 dark:bg-white/3 backdrop-blur-xs',
						variant === 'modal' ? 'md:w-[55%]' : 'md:w-1/2'
					)}
				>
					<div className="w-full max-w-sm">
						<div className="mb-5">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{message}</h3>
							<p className="text-gray-600 dark:text-gray-400 text-xs">
								{tAuth('ENTER_CREDENTIALS')}
							</p>
						</div>

						<div>
							<CredentialsForm type={type} onSuccess={onSuccess} callbackUrl={callbackUrl}>
								<div className="space-y-3">
									<div className="relative">
										<div className="absolute inset-0 flex items-center">
											<div className="w-full border-t border-gray-200 dark:border-white/6" />
										</div>
									</div>
									<SocialLogin callbackUrl={callbackUrl} />
								</div>
							</CredentialsForm>
						</div>

						<p className="text-center text-[11px] text-gray-500 dark:text-gray-400 mt-4">
							{tAuth('SIGN_IN_AGREEMENT')}{' '}
							<a
								href="#"
								className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
							>
								{t('TERMS')}
							</a>{' '}
							&{' '}
							<a
								href="#"
								className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
							>
								{t('PRIVACY')}
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
