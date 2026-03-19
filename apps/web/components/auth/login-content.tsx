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
		<div className="relative">
			{/* Background Pattern - only for modal variant */}
			{variant === 'modal' && (
				<div
					className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none"
					style={{
						backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
						backgroundSize: '20px 20px'
					}}
				/>
			)}

			<div className="flex flex-col md:flex-row">
				{/* Left Side - Features */}
				<div
					className={cn(
						'w-full p-6 flex flex-col justify-center relative',
						variant === 'modal' ? 'md:w-[45%]' : 'md:w-1/2',
						'bg-linear-to-br from-gray-50 to-white',
						'dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a]'
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
								<h2
									className={cn(
										'text-2xl font-bold mb-3',
										'bg-linear-to-r from-gray-900 to-gray-700',
										'dark:from-white dark:to-gray-300',
										'bg-clip-text text-transparent'
									)}
								>
									Discover & Connect
								</h2>

								<p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-8">
									Join our network of professionals and unlock new opportunities.
								</p>
							</div>

							{/* Features List */}
							<div className="space-y-4">
								{authFeatures.map((feature) => {
									const colorVariant = feature.colorVariant;
									const bgClasses =
										colorVariant === 'primary'
											? 'bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 group-hover:from-primary-100 group-hover:to-primary-50 dark:group-hover:from-primary-800/30 dark:group-hover:to-primary-900/20 ring-1 ring-primary-100 dark:ring-primary-800/20'
											: colorVariant === 'accent'
												? 'bg-linear-to-br from-accent-50 to-accent-100/50 dark:from-accent-900/20 dark:to-accent-800/10 group-hover:from-accent-100 group-hover:to-accent-50 dark:group-hover:from-accent-800/30 dark:group-hover:to-accent-900/20 ring-1 ring-accent-100 dark:ring-accent-800/20'
												: 'bg-linear-to-br from-secondary-50 to-secondary-100/50 dark:from-secondary-900/20 dark:to-secondary-800/10 group-hover:from-secondary-100 group-hover:to-secondary-50 dark:group-hover:from-secondary-800/30 dark:group-hover:to-secondary-900/20 ring-1 ring-secondary-100 dark:ring-secondary-800/20';

									const iconClasses =
										colorVariant === 'primary'
											? 'text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300'
											: colorVariant === 'accent'
												? 'text-accent-600 dark:text-accent-400 group-hover:text-accent-700 dark:group-hover:text-accent-300'
												: 'text-secondary-600 dark:text-secondary-400 group-hover:text-secondary-700 dark:group-hover:text-secondary-300';

									const titleHoverClasses =
										colorVariant === 'primary'
											? 'group-hover:text-primary-600 dark:group-hover:text-primary-400'
											: colorVariant === 'accent'
												? 'group-hover:text-accent-600 dark:group-hover:text-accent-400'
												: 'group-hover:text-secondary-600 dark:group-hover:text-secondary-400';

									return (
										<div key={feature.titleKey} className="flex items-start group">
											<div
												className={cn(
													'p-2 rounded-lg mr-3 transition-all duration-300 transform group-hover:scale-110',
													bgClasses
												)}
											>
												<feature.icon className={cn('h-4 w-4', iconClasses)} />
											</div>
											<div>
												<h3
													className={cn(
														'font-medium text-gray-900 dark:text-white text-sm transition-colors',
														titleHoverClasses
													)}
												>
													{t(feature.titleKey as any)}
												</h3>
												<p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
													{t(feature.descriptionKey as any)}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>

					{/* Decorative gradient */}
					<div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white dark:from-[#0a0a0a] to-transparent pointer-events-none" />
				</div>

				{/* Right Side - Auth Form */}
				<div
					className={cn(
						'w-full p-6 flex items-center justify-center relative bg-white/40 dark:bg-white/3 backdrop-blur-xs',
						variant === 'modal' ? 'md:w-[55%]' : 'md:w-1/2'
					)}
				>
					<div className="w-full max-w-sm">
						<div className="text-center mb-5">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{message}</h3>
							<p className="text-gray-600 dark:text-gray-400 text-xs">
								Enter your credentials to continue
							</p>
						</div>

						<div className="bg-white dark:bg-white/3 p-4 rounded-lg shadow-xs border border-gray-100 dark:border-white/6">
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
							By signing in, you agree to our{' '}
							<a
								href="#"
								className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
							>
								Terms
							</a>{' '}
							&{' '}
							<a
								href="#"
								className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
							>
								Privacy
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
