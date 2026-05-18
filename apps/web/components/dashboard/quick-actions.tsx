'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Plus, FileText, CreditCard, Settings } from 'lucide-react';

interface QuickAction {
	labelKey: string;
	descKey: string;
	href: string;
	icon: React.ElementType;
	accent: string;
}

export function QuickActions() {
	const t = useTranslations('client.dashboard.QUICK_ACTIONS');
	const locale = useLocale();

	const actions: QuickAction[] = [
		{
			labelKey: 'NEW_SUBMISSION',
			descKey: 'NEW_SUBMISSION_DESC',
			href: `/${locale}/submit`,
			icon: Plus,
			accent: 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900',
		},
		{
			labelKey: 'MY_SUBMISSIONS',
			descKey: 'MY_SUBMISSIONS_DESC',
			href: `/${locale}/client/submissions`,
			icon: FileText,
			accent: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
		},
		{
			labelKey: 'BILLING',
			descKey: 'BILLING_DESC',
			href: `/${locale}/client/settings/profile/billing`,
			icon: CreditCard,
			accent: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
		},
		{
			labelKey: 'SETTINGS',
			descKey: 'SETTINGS_DESC',
			href: `/${locale}/client/settings`,
			icon: Settings,
			accent: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
		},
	];

	return (
		<section aria-label={t('SECTION_LABEL')} className="mb-6">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{actions.map(({ labelKey, descKey, href, icon: Icon, accent }) => (
					<Link
						key={labelKey}
						href={href}
						className="group flex flex-col gap-3 p-4 bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 hover:border-neutral-300 dark:hover:border-white/16 hover:shadow-sm transition-all duration-150"
					>
						<div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
							<Icon className="h-4 w-4" aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<p className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
								{t(labelKey)}
							</p>
							<p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
								{t(descKey)}
							</p>
						</div>
					</Link>
				))}
			</div>
		</section>
	);
}
