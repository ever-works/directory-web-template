'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { signInAction, signUp } from '../actions';
import { ActionState } from '@/lib/auth/middleware';
import { PropsWithChildren, useActionState, useEffect, useState, useTransition } from 'react';
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button, cn } from '@heroui/react';
import { useConfig } from '../../config';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ReCAPTCHA from 'react-google-recaptcha';
import { RECAPTCHA_SITE_KEY } from '@/lib/constants';
import { useAutoRecaptchaVerification } from '../hooks/useRecaptchaVerification';
import { useUserCache } from '@/hooks/use-current-user';
import { AuthErrorCode } from '@/lib/auth/auth-error-codes';
import { isValidCallbackUrl } from '@/lib/auth/validate-callback-url';
import { useSession } from 'next-auth/react';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvent } from '@/lib/analytics/types';
import { isDemoMode } from '@/lib/utils';

export function CredentialsForm({
	type,
	children,
	hideSwitchButton = false,
	onSuccess,
	clientMode = false,
	callbackUrl: callbackUrlProp
}: PropsWithChildren<{
	type: 'login' | 'signup';
	hideSwitchButton?: boolean;
	onSuccess?: () => void;
	clientMode?: boolean;
	callbackUrl?: string;
}>) {
	const isLogin = type === 'login';
	const t = useTranslations('auth');
	const tCred = useTranslations('admin.CREDENTIALS_FORM');
	const locale = useLocale();
	const searchParams = useSearchParams();
	const rawRedirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
	const redirect = isValidCallbackUrl(rawRedirect) ? rawRedirect : null;
	const router = useRouter();
	const config = useConfig();
	const auth = config.auth || {};
	const [showPassword, setShowPassword] = useState(false);
	const [showPasswordTips, setShowPasswordTips] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const [captchaError, setCaptchaError] = useState<string | null>(null);
	const { verifyToken, isLoading: isVerifying, error: verificationError } = useAutoRecaptchaVerification();
	const { invalidateAllUserData } = useUserCache();
	const { update: refreshSession } = useSession();
	const [isPending, startTransition] = useTransition();
	const { track, identify } = useAnalytics();

	const [state, formAction, pending] = useActionState<ActionState, FormData>(isLogin ? signInAction : signUp, {});

	// Local state used only in clientMode for login
	const [clientPending, setClientPending] = useState(false);
	const [clientError, setClientError] = useState<string | null>(null);
	const [clientSuccess, setClientSuccess] = useState(false);
	const [authSyncError, setAuthSyncError] = useState<string | null>(null);
	// Store password locally for autoLogin - NEVER returned from server for security
	const [pendingPassword, setPendingPassword] = useState<string | null>(null);

	// Helper to get translated error message based on error code
	const getTranslatedErrorMessage = (errorCode: string | undefined): string => {
		if (!errorCode) return tCred('GENERIC_ERROR_MESSAGE');

		switch (errorCode) {
			case AuthErrorCode.ACCOUNT_NOT_FOUND:
				return tCred('ACCOUNT_NOT_FOUND');
			case AuthErrorCode.INVALID_PASSWORD:
				return tCred('INVALID_PASSWORD');
			case AuthErrorCode.PROFILE_NOT_FOUND:
				return tCred('PROFILE_NOT_FOUND');
			case AuthErrorCode.RATE_LIMITED:
				return tCred('RATE_LIMITED');
			case AuthErrorCode.USE_OAUTH_PROVIDER:
				return tCred('USE_OAUTH_PROVIDER');
			case AuthErrorCode.SESSION_REFRESH_FAILED:
				return tCred('SESSION_REFRESH_FAILED');
			case AuthErrorCode.PAGE_REFRESH_FAILED:
				return tCred('PAGE_REFRESH_FAILED');
			case AuthErrorCode.GENERIC_ERROR:
			default:
				return tCred('GENERIC_ERROR_MESSAGE');
		}
	};

	useEffect(() => {
		if (!state.success) return;

		// Track success
		track(isLogin ? AnalyticsEvent.USER_LOGGED_IN : AnalyticsEvent.USER_SIGNED_UP, {
			method: 'credentials',
			email: state.email || state.credentials?.email
		});

		if (state.email || state.credentials?.email) {
			identify(state.userId || state.email || state.credentials?.email, {
				email: state.email || state.credentials?.email,
				name: state.name || state.credentials?.name,
				avatar: config.logo,
				app_name: config.company_name,
				is_tester: isDemoMode()
			});
		}

		// Auto-login flow for login/registration (client-side signIn to ensure cookies are set properly on Vercel)
		// For login: use state.email (from server) + pendingPassword (from form state)
		// For signup: use state.credentials (still returned from signUp action)
		const autoLoginEmail = state.email || state.credentials?.email;
		const autoLoginPassword = pendingPassword || state.credentials?.password;

		if (state.autoLogin && autoLoginEmail && autoLoginPassword) {
			const doAutoLogin = async () => {
				setAuthSyncError(null);
				try {
					const { signIn } = await import('next-auth/react');
					const res = await signIn('credentials', {
						email: autoLoginEmail,
						password: autoLoginPassword,
						redirect: false
					});

					if (res?.error) {
						console.error('Auto-login failed:', res.error);
						setAuthSyncError(tCred('SESSION_REFRESH_FAILED'));
						return;
					}

					// Await session refresh to ensure cookies are properly set before navigation
					await refreshSession();

					invalidateAllUserData();

					const redirectPath = redirect || callbackUrlProp || state.redirect || '/client/dashboard';
					const shouldPrefixLocale =
						state.preserveLocale && locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
					const finalRedirectPath = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;

					// Use window.location.href for reliable navigation on Vercel
					// router.push() can fail if middleware doesn't see session immediately
					if (onSuccess) onSuccess();
					window.location.href = finalRedirectPath;
				} catch (err) {
					console.error('Auto-login error:', err);
					setAuthSyncError(tCred('SESSION_REFRESH_FAILED'));
				}
			};
			void doAutoLogin();
			return;
		}

		// Modal success flow - refresh session and handle errors
		if (onSuccess) {
			const doModalSuccess = async () => {
				setAuthSyncError(null);
				invalidateAllUserData();
				try {
					await refreshSession();
				} catch (err) {
					console.error('Failed to refresh session after auth', err);
					setAuthSyncError(tCred('SESSION_REFRESH_FAILED'));
					return;
				}
				router.refresh();
				onSuccess();
			};
			void doModalSuccess();
			return;
		}

		// Default redirect logic with callback URL priority and double-prefix prevention
		const redirectPath = redirect || state.redirect || '/client/dashboard';
		// Handle locale preservation for redirects (avoid double prefix if path already has locale)
		const shouldPrefixLocale = state.preserveLocale && locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
		const finalRedirectPath = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;
		invalidateAllUserData();

		router.push(finalRedirectPath);
	}, [
		state.success,
		state.redirect,
		state.preserveLocale,
		state.autoLogin,
		state.credentials,
		state.email,
		redirect,
		callbackUrlProp,
		pendingPassword,
		router,
		onSuccess,
		locale,
		invalidateAllUserData,
		refreshSession,
		tCred
	]);

	useEffect(() => {
		if (RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
			const timeout = setTimeout(() => {
				console.log('ReCAPTCHA loading timeout - hiding loader');
			}, 3000);

			return () => clearTimeout(timeout);
		}
	}, []);
	const isRecaptchaRequired = !!(RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);
	const isRecaptchaBlocking = isRecaptchaRequired && !captchaToken;

	const handleFormAction = async (formData: FormData) => {
		if (isRecaptchaRequired) {
			if (!captchaToken) {
				setCaptchaError(tCred('PLEASE_COMPLETE_CAPTCHA'));

				return;
			}
			try {
				setCaptchaError(null);
				console.log('Verifying ReCAPTCHA token before submission...');

				const isValid = await verifyToken(captchaToken);
				if (!isValid) {
					setCaptchaError(tCred('RECAPTCHA_VERIFICATION_FAILED'));
					return;
				}

				console.log('ReCAPTCHA verified successfully');
			} catch (error: unknown) {
				console.error('ReCAPTCHA verification error:', error);
				setCaptchaError(tCred('RECAPTCHA_VERIFICATION_FAILED'));
				return;
			}
		}

		if (captchaToken) {
			formData.append('captchaToken', captchaToken);
		}

		formData.append('authProvider', config.authConfig?.provider || 'next-auth');

		// Store password locally for autoLogin (never sent back from server for security)
		const passwordValue = formData.get('password') as string;
		if (passwordValue) {
			setPendingPassword(passwordValue);
		}

		startTransition(() => {
			formAction(formData);
		});
	};

	// Client-side submit when clientMode is true (admin login path)
	const handleClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!isLogin) return;

		const form = e.currentTarget;
		const email = (form.elements.namedItem('email') as HTMLInputElement).value;
		const password = (form.elements.namedItem('password') as HTMLInputElement).value;

		setClientPending(true);
		setClientError(null);

		try {
			const { signIn } = await import('next-auth/react');
			const res = await signIn('credentials', {
				email,
				password,
				isAdmin: clientMode,
				redirect: false
			});

			if (res && !res.error) {
				setClientSuccess(true);

				// Track success for client-side login
				track(AnalyticsEvent.USER_LOGGED_IN, {
					method: 'credentials',
					email,
					isAdmin: clientMode
				});

				identify(email, {
					email,
					app_name: config.company_name,
					is_tester: isDemoMode(),
					is_admin: clientMode
				});

				// Await session refresh to ensure cookies are properly set before navigation
				await refreshSession();

				invalidateAllUserData();

				// If onSuccess is provided (e.g., admin login page), let it handle the redirect
				if (onSuccess) {
					onSuccess();
					return;
				}

				// Default redirect using window.location.href for reliable navigation on Vercel
				// router.push() can fail if middleware doesn't see the session immediately
				const redirectPath = redirect || (clientMode ? '/admin' : '/client/dashboard');
				const shouldPrefixLocale = locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
				const finalRedirectPath = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;
				window.location.href = finalRedirectPath;
			} else {
				setClientError(res?.error || 'Authentication failed');
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : typeof error === 'string' ? error : 'Authentication failed';
			setClientError(errorMessage);
			track(AnalyticsEvent.API_ERROR, {
				context: 'client_login',
				error: errorMessage
			});
		} finally {
			setClientPending(false);
		}
	};
	return (
		<div className="w-full">
			{/* Header */}
			<div className="mb-5">
				<h1 className="text-lg font-semibold text-gray-900 dark:text-white">
					{isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}
				</h1>
				<p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
					{isLogin ? tCred('WELCOME_BACK_MESSAGE') : tCred('CREATE_ACCOUNT_MESSAGE')}
				</p>
			</div>

			{auth.credentials && (
				<form
					{...(clientMode ? { onSubmit: handleClientSubmit } : { action: handleFormAction as any })}
					className="space-y-4"
					aria-label={isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}
				>
					{/* Name field (signup only) */}
					{!isLogin && (
						<div className="space-y-1.5">
							<label
								htmlFor="name"
								className="block text-xs font-medium text-gray-600 dark:text-gray-400"
							>
								{t('FULL_NAME')}
								<span className="text-red-500 ml-1">*</span>
							</label>
							<div className="relative group">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
									<User className="h-4 w-4 text-gray-400 group-focus-within:text-theme-primary transition-colors" />
								</div>
								<input
									id="name"
									type="text"
									className="pl-9 pr-4 w-full py-2 text-sm border border-gray-200 dark:border-white/8 rounded-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 placeholder:text-gray-400 transition-colors"
									placeholder={t('ENTER_YOUR_FULL_NAME')}
									name="name"
									defaultValue={state?.name}
									required
									autoComplete="name"
									aria-describedby="name-error"
									aria-required="true"
									aria-invalid={!!state?.error || !!clientError}
								/>
							</div>
						</div>
					)}

					{authSyncError && (
						<div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-red-500 dark:text-red-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-red-700 dark:text-red-300">{authSyncError}</p>
						</div>
					)}

					{/* Email field */}
					<div className="space-y-1.5">
						<label htmlFor="email" className="block text-xs font-medium text-gray-600 dark:text-gray-400">
							{t('EMAIL_ADDRESS')}
							<span className="text-red-500 ml-1">*</span>
						</label>
						<div className="relative group">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
								<Mail className="h-4 w-4 text-gray-400 group-focus-within:text-theme-primary transition-colors" />
							</div>
							<input
								id="email"
								type="email"
								className="pl-9 pr-4 w-full py-2 text-sm border border-gray-200 dark:border-white/8 rounded-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 placeholder:text-gray-400 transition-colors"
								placeholder={t('ENTER_YOUR_EMAIL')}
								name="email"
								defaultValue={state?.email}
								required
								autoComplete="email"
								aria-describedby="email-error"
								aria-required="true"
								aria-invalid={!!state?.error || !!clientError}
							/>
						</div>
					</div>

					{/* Password field */}
					<div className="space-y-1.5">
						<label
							htmlFor="password"
							className="block text-xs font-medium text-gray-600 dark:text-gray-400"
						>
							{t('PASSWORD')}
							<span className="text-red-500 ml-1">*</span>
						</label>
						<div className="relative group">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
								<Lock className="h-4 w-4 text-gray-400 group-focus-within:text-theme-primary transition-colors" />
							</div>
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								className="pl-9 pr-9 w-full py-2 text-sm border border-gray-200 dark:border-white/8 rounded-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 placeholder:text-gray-400 transition-colors"
								placeholder={t('ENTER_YOUR_PASSWORD')}
								name="password"
								required
								autoComplete={isLogin ? 'current-password' : 'new-password'}
								onFocus={() => setShowPasswordTips(!isLogin)}
								onBlur={() => setShowPasswordTips(false)}
								aria-describedby={!isLogin && showPasswordTips ? 'password-tips' : undefined}
								aria-required="true"
								aria-invalid={!!state?.error || !!clientError}
							/>
							<button
								type="button"
								className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-theme-primary transition-colors z-10"
								onClick={() => setShowPassword((v) => !v)}
								aria-label={showPassword ? tCred('HIDE_PASSWORD') : tCred('SHOW_PASSWORD')}
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
						{/* Password tips for signup */}
						{!isLogin && showPasswordTips && (
							<div
								id="password-tips"
								className="mt-2 p-3 bg-theme-primary/5 border border-theme-primary/15 rounded-lg"
							>
								<p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
									<Lock className="w-3 h-3 text-theme-primary" />
									{tCred('SECURITY_REQUIREMENTS')}
								</p>
								<ul className="space-y-1">
									<li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<div className="w-1 h-1 bg-theme-primary/60 rounded-full"></div>
										<span>{tCred('AT_LEAST_8_CHARS')}</span>
									</li>
									<li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<div className="w-1 h-1 bg-theme-primary/60 rounded-full"></div>
										<span>{tCred('UPPERCASE_LOWERCASE')}</span>
									</li>
									<li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<div className="w-1 h-1 bg-theme-primary/60 rounded-full"></div>
										<span>{tCred('NUMBER_SPECIAL_CHAR')}</span>
									</li>
								</ul>
							</div>
						)}
					</div>

					{/* Error message */}
					{(state?.error || clientError) && (
						<div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-red-500 dark:text-red-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-red-700 dark:text-red-300">
								{getTranslatedErrorMessage(clientError || state?.error)}
							</p>
						</div>
					)}

					{/* Server-side success message */}
					{state?.success && !clientMode && (
						<div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-green-500 dark:text-green-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-green-700 dark:text-green-300">
								{isLogin ? tCred('LOGIN_SUCCESSFUL') : tCred('ACCOUNT_CREATED_SUCCESSFULLY')}
								{' — '}
								{isLogin ? tCred('REDIRECTING') : tCred('WELCOME_SETTING_UP_ACCOUNT')}
							</p>
						</div>
					)}

					{/* Client-side success message for admin login */}
					{clientMode && clientSuccess && (
						<div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-green-500 dark:text-green-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-green-700 dark:text-green-300">
								{tCred('ADMIN_LOGIN_SUCCESSFUL')} — {tCred('REDIRECTING_TO_ADMIN')}
							</p>
						</div>
					)}

					{/* Forgot password link (login only) */}
					{isLogin && (
						<div className="flex justify-end">
							<Link
								href="/auth/forgot-password"
								className="text-xs font-medium text-theme-primary hover:text-theme-primary/80 transition-colors hover:underline"
							>
								{t('FORGOT_PASSWORD')}
							</Link>
						</div>
					)}

					{/* ReCAPTCHA */}
					{(RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) && (
						<div className="mb-4">
							<div className="flex justify-center">
								<div className="recaptcha-container">
									<ReCAPTCHA
										sitekey={
											RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''
										}
										onChange={(token: string | null) => {
											setCaptchaToken(token);
											setCaptchaError(null);
										}}
										onError={(error) => {
											console.error('ReCAPTCHA error:', error);
											setCaptchaError(tCred('FAILED_TO_LOAD_VERIFICATION'));
										}}
										onExpired={() => {
											setCaptchaToken(null);
											setCaptchaError(tCred('VERIFICATION_EXPIRED'));
										}}
										theme="light"
										size="normal"
										className="scale-90 transform-gpu w-[50px] flex justify-center"
										tabindex={0}
									/>
								</div>
							</div>
							{(captchaError || verificationError) && (
								<div className="mt-2 text-sm text-red-600 dark:text-red-400">
									{captchaError || verificationError?.message || 'ReCAPTCHA verification failed'}
								</div>
							)}
							{isVerifying && (
								<div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
									{tCred('VERIFYING')}
								</div>
							)}
							{isRecaptchaBlocking && (
								<div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
									{tCred('PLEASE_COMPLETE_VERIFICATION')}
								</div>
							)}
						</div>
					)}
					<Button
						disabled={
							clientPending || clientSuccess || pending || isPending || isVerifying || isRecaptchaBlocking
						}
						type="submit"
						className={cn(
							'w-full h-10 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium rounded-sm',
							'hover:bg-theme-primary/90 focus:outline-none',
							'focus:ring-2 focus:ring-theme-primary/30 transition-colors duration-150',
							'disabled:opacity-50 disabled:cursor-not-allowed'
						)}
						isLoading={
							(pending && !state.success) || clientPending || clientSuccess || isPending || isVerifying
						}
						aria-busy={
							(pending && !state.success) || clientPending || clientSuccess || isPending || isVerifying
						}
						aria-disabled={
							(pending && !state.success) ||
							clientPending ||
							clientSuccess ||
							isPending ||
							isVerifying ||
							isRecaptchaBlocking
						}
					>
						{(pending && !state.success) || clientPending ? (
							<span>{isLogin ? tCred('SIGNING_IN') : tCred('CREATING_ACCOUNT')}</span>
						) : clientSuccess ? (
							<span className="flex items-center justify-center gap-2">
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{tCred('REDIRECTING')}</span>
							</span>
						) : state.success && !clientMode ? (
							<span className="flex items-center justify-center gap-2">
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{isLogin ? tCred('SIGNED_IN') : tCred('ACCOUNT_CREATED')}</span>
							</span>
						) : (
							<span className="flex items-center justify-center gap-2">
								<span>{isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}</span>
								<svg
									className="w-4 h-4 transition-transform group-hover:translate-x-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 7l5 5m0 0l-5 5m5-5H6"
									/>
								</svg>
							</span>
						)}
					</Button>
				</form>
			)}

			{children}

			{auth.credentials && !hideSwitchButton && (
				<div className="text-center mt-5 pt-4 border-t border-gray-100 dark:border-white/6">
					<p className="text-gray-500 dark:text-gray-400 text-xs mb-2">
						{isLogin ? tCred('NEW_TO_PLATFORM') : tCred('ALREADY_HAVE_ACCOUNT')}
					</p>
					<Button
						as={Link}
						className={cn(
							'text-theme-primary hover:text-theme-primary/80 text-xs font-medium',
							'hover:bg-theme-primary/5 px-3 py-1.5! rounded-md transition-colors duration-150',
							'border border-theme-primary/20 hover:border-theme-primary/35'
						)}
						href={isLogin ? '/auth/register' : '/auth/signin'}
						variant="flat"
					>
						{isLogin ? (
							<span className="flex items-center gap-2">
								<span>{tCred('CREATE_ACCOUNT_BUTTON')}</span>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
									/>
								</svg>
							</span>
						) : (
							<span className="flex items-center gap-2">
								<span>{tCred('SIGN_IN_BUTTON')}</span>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
									/>
								</svg>
							</span>
						)}
					</Button>
				</div>
			)}
		</div>
	);
}
