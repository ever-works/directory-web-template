'use client';

import { useEffect, useRef } from 'react';
import { useActionState } from 'react';
import { subscribeToNewsletter } from '@/app/[locale]/newsletter/actions';
import { toast } from 'sonner';
import { ActionState } from '@/lib/auth/middleware';

// Extended type that includes newsletter-specific properties
type NewsletterActionState = ActionState & { success?: boolean };

export function Newsletter({ t }: { t: any }) {
	const [state, formAction, pending] = useActionState<NewsletterActionState, FormData>(subscribeToNewsletter, {});
	const prevStateRef = useRef<NewsletterActionState | null>(null);

	// Show toast on success - fire when state object changes and has success
	useEffect(() => {
		if (state.success && state !== prevStateRef.current) {
			toast.success(t('footer.SUBSCRIPTION_SUCCESS'));
		}
		prevStateRef.current = state;
	}, [state, t]);

	return (
		<div className="space-y-3 sm:space-y-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
			<h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
				{t('footer.STAY_UPDATED')}
			</h4>
			<p className="text-sm text-gray-600 dark:text-gray-400">{t('footer.NEWSLETTER_DESCRIPTION')}</p>
			<form action={formAction} className="space-y-3">
				<div className="flex flex-col sm:flex-row gap-2">
					<input
						type="email"
						name="email"
						placeholder={t('footer.ENTER_EMAIL')}
						disabled={pending}
						className="flex-1 px-4 py-3 rounded-xl border border-gray-200/60 bg-white dark:bg-gray-800/50 backdrop-blur-lg dark:border-gray-700/40 focus:border-theme-primary dark:focus:border-theme-primary/30 focus:outline-hidden transition-all duration-300 text-sm placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
						required
					/>
					<button
						type="submit"
						disabled={pending}
						className="mt-2 sm:mt-0 w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-theme-primary-500 via-purple-500 to-purple-600 bg-[length:200%_200%] bg-left hover:bg-right
             transition-[background-position] duration-500 ease-in-out text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{pending ? t('footer.SUBMITTING') : t('footer.SUBSCRIBE')}
					</button>
				</div>
				{state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
			</form>
		</div>
	);
}
