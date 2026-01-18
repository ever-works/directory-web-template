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

export function CredentialsForm({
	type,
	children,
	hideSwitchButton = false,
	onSuccess,
	clientMode = false
}: PropsWithChildren<{
	type: 'login' | 'signup';
	hideSwitchButton?: boolean;
	onSuccess?: () => void;
	clientMode?: boolean;
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

					const redirectPath = redirect || state.redirect || '/client/dashboard';
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
		redirect,
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
		} finally {
			setClientPending(false);
		}
	};
	return (
		<div className="max-w-md mx-auto">
			{/* Simple header */}
			<div className="text-center mb-6">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					{isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}
				</h1>
				<p className="text-gray-600 dark:text-gray-400 text-sm">
					{isLogin ? tCred('WELCOME_BACK_MESSAGE') : tCred('CREATE_ACCOUNT_MESSAGE')}
				</p>
			</div>

			{auth.credentials && (
				<form
					{...(clientMode ? { onSubmit: handleClientSubmit } : { action: handleFormAction as any })}
					className="space-y-5 animate-fade-in"
					aria-label={isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}
				>
					{/* Name field (signup only) */}
					{!isLogin && (
						<div className="space-y-2">
							<label
								htmlFor="name"
								className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
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
									className="pl-10 pr-4 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary placeholder:text-gray-400"
									placeholder={t('ENTER_YOUR_FULL_NAME')}
									name="name"
									defaultValue={state?.name}
									required
									autoComplete="name"
									aria-describedby="name-error"
								/>
							</div>
						</div>
					)}

					{authSyncError && (
						<div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
							<div className="shrink-0">
								<div className="w-6 h-6 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
									<svg
										className="w-3 h-3 text-red-600 dark:text-red-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
									{tCred('LOGIN_FAILED')}
								</h4>
								<p className="text-sm text-red-700 dark:text-red-300">{authSyncError}</p>
							</div>
						</div>
					)}

					{/* Email field */}
					<div className="space-y-2">
						<label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
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
								className="pl-10 pr-4 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary placeholder:text-gray-400"
								placeholder={t('ENTER_YOUR_EMAIL')}
								name="email"
								defaultValue={state?.email}
								required
								autoComplete="email"
								aria-describedby="email-error"
							/>
						</div>
					</div>

					{/* Password field */}
					<div className="space-y-2">
						<label
							htmlFor="password"
							className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
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
								className="pl-10 pr-10 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary placeholder:text-gray-400"
								placeholder={t('ENTER_YOUR_PASSWORD')}
								name="password"
								required
								autoComplete={isLogin ? 'current-password' : 'new-password'}
								onFocus={() => setShowPasswordTips(!isLogin)}
								onBlur={() => setShowPasswordTips(false)}
								aria-describedby={!isLogin && showPasswordTips ? 'password-tips' : undefined}
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
								className="mt-3 p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-xl"
							>
								<div className="flex items-start space-x-3">
									<div className="shrink-0 w-6 h-6 bg-theme-primary/10 rounded-full flex items-center justify-center mt-0.5">
										<Lock className="w-3 h-3 text-theme-primary" />
									</div>
									<div className="flex-1">
										<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
											{tCred('SECURITY_REQUIREMENTS')}
										</h4>
										<ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
											<li className="flex items-center space-x-2">
												<div className="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
												<span>{tCred('AT_LEAST_8_CHARS')}</span>
											</li>
											<li className="flex items-center space-x-2">
												<div className="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
												<span>{tCred('UPPERCASE_LOWERCASE')}</span>
											</li>
											<li className="flex items-center space-x-2">
												<div className="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
												<span>{tCred('NUMBER_SPECIAL_CHAR')}</span>
											</li>
										</ul>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Modern error and success messages */}
					{(state?.error || clientError) && (
						<div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
							<div className="shrink-0">
								<div className="w-6 h-6 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
									<svg
										className="w-3 h-3 text-red-600 dark:text-red-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
									{tCred('LOGIN_FAILED')}
								</h4>
								<p className="text-sm text-red-700 dark:text-red-300">
									{getTranslatedErrorMessage(clientError || state?.error)}
								</p>
							</div>
						</div>
					)}

					{/* Server-side success message */}
					{state?.success && !clientMode && (
						<div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
							<div className="shrink-0">
								<div className="w-6 h-6 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
									<svg
										className="w-3 h-3 text-green-600 dark:text-green-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
									{isLogin ? tCred('LOGIN_SUCCESSFUL') : tCred('ACCOUNT_CREATED_SUCCESSFULLY')}
								</h4>
								<p className="text-sm text-green-700 dark:text-green-300">
									{isLogin ? tCred('REDIRECTING') : tCred('WELCOME_SETTING_UP_ACCOUNT')}
								</p>
							</div>
						</div>
					)}

					{/* Client-side success message for admin login */}
					{clientMode && clientSuccess && (
						<div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
							<div className="shrink-0">
								<div className="w-6 h-6 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
									<svg
										className="w-3 h-3 text-green-600 dark:text-green-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
									{tCred('ADMIN_LOGIN_SUCCESSFUL')}
								</h4>
								<p className="text-sm text-green-700 dark:text-green-300">
									{tCred('REDIRECTING_TO_ADMIN')}
								</p>
							</div>
						</div>
					)}

					{/* Forgot password link (login only) */}
					{isLogin && (
						<div className="flex items-center justify-center">
							<Link
								href="/auth/forgot-password"
								className="text-sm font-medium text-theme-primary hover:text-theme-primary/80 transition-colors hover:underline"
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

							{/* Simple error message */}
							{(captchaError || verificationError) && (
								<div className="mt-2 text-sm text-red-600 dark:text-red-400">
									{captchaError || verificationError?.message || 'ReCAPTCHA verification failed'}
								</div>
							)}

							{/* Simple loading indicator */}
							{isVerifying && (
								<div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
									{tCred('VERIFYING')}
								</div>
							)}

							{/* Simple blocking message */}
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
							'w-full h-12 bg-linear-to-r from-theme-primary to-theme-accent text-white font-semibold rounded-xl',
							'hover:from-theme-primary/90 hover:to-theme-accent/90 focus:outline-hidden',
							'focus:ring-4 focus:ring-theme-primary/20 transition-all duration-200',
							'shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed',
							'transform hover:scale-[1.02] active:scale-[0.98]'
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
				<div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
					<p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
						{isLogin ? tCred('NEW_TO_PLATFORM') : tCred('ALREADY_HAVE_ACCOUNT')}
					</p>
					<Button
						as={Link}
						className={cn(
							'text-theme-primary hover:text-theme-primary/80 text-sm font-semibold',
							'hover:bg-theme-primary/5 px-4 py-2 rounded-lg transition-all duration-200',
							'border border-theme-primary/20 hover:border-theme-primary/40'
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
