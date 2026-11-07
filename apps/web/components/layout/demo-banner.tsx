'use client';

import { useTranslations } from 'next-intl';
import { usePublicPaymentConfig } from '@/hooks/use-public-payment-config';

/** Where the banner sends a visitor of the demo: the Ever Works sign-up page, to build a directory of their own. */
export const DEMO_SIGN_UP_URL = 'https://app.ever.works/register';

/**
 * The strip above the header of a demo deployment (`NEXT_PUBLIC_DEMO=true`, as demo.ever.works), the same notice
 * demo.gauzy.co and demo.ever.team show: this is a demo, and a link to sign up for real.
 *
 * The flag is the RUNTIME one, from `usePublicPaymentConfig()` (`GET /api/payment/public-config`): platform-deployed
 * Works share one image built without per-Work env, so the bundle's `process.env.NEXT_PUBLIC_DEMO` cannot tell a demo
 * from a customer's directory. Every directory without the flag (all customer sites) renders nothing.
 */
export function DemoBanner() {
	const t = useTranslations('common');
	const { config } = usePublicPaymentConfig();

	if (!config.demo) {
		return null;
	}

	return (
		<div
			role="note"
			data-testid="demo-banner"
			className="flex w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 border-b border-theme-primary/20 bg-theme-primary/10 px-4 py-1.5 text-center text-xs leading-snug text-gray-600 dark:text-gray-300"
		>
			<span>{t('DEMO_BANNER_TEXT')}</span>
			<a
				href={DEMO_SIGN_UP_URL}
				className="rounded-sm font-semibold text-theme-primary-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 dark:text-theme-primary-400"
			>
				{t('DEMO_BANNER_SIGN_UP')}
			</a>
		</div>
	);
}
