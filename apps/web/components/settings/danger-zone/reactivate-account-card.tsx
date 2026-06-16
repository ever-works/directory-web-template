'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { reactivateAccount } from '@/app/[locale]/auth/actions';
import type { ActionState } from '@/lib/auth/middleware';
import { Button } from '@/components/ui/button';

export function ReactivateAccountCard() {
	const t = useTranslations('settings.DANGER_ZONE_PAGE.REACTIVATE_ACCOUNT');
	const router = useRouter();

	const [state, formAction, isPending] = useActionState<ActionState, FormData>(reactivateAccount, {});

	useEffect(() => {
		if (state?.error) {
			toast.error(state.error);
		}
	}, [state]);

	useEffect(() => {
		if (!state?.success) return;
		toast.success(t('SUCCESS_TOAST'));
		router.refresh();
	}, [state, router, t]);

	const handleReactivate = () => {
		const fd = new FormData();
		formAction(fd);
	};

	return (
		<section
			role="region"
			aria-labelledby="danger-reactivate-account-title"
			className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm overflow-hidden"
		>
			{/* Status banner */}
			<div className="px-6 py-3 sm:px-7 bg-amber-100/60 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40">
				<p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
					{t('STATUS_BADGE')}
				</p>
			</div>

			{/* Header */}
			<div className="p-6 sm:p-7">
				<div className="flex items-start gap-4">
					<div className="shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center ring-1 ring-inset ring-amber-300/60 dark:ring-amber-700/30">
						<PlayCircle className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" aria-hidden="true" />
					</div>
					<div className="min-w-0 flex-1 space-y-1">
						<h2
							id="danger-reactivate-account-title"
							className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
						>
							{t('TITLE')}
						</h2>
						<p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-prose">
							{t('DESCRIPTION')}
						</p>
					</div>
				</div>

				{/* What reactivation restores */}
				<div className="mt-6 sm:ml-14 space-y-3">
					<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
						{t('RESTORE_TITLE')}
					</p>
					<ul className="space-y-2">
						{(['RESTORE_1', 'RESTORE_2', 'RESTORE_3'] as const).map((key) => (
							<li key={key} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
								<span className="mt-0.5 w-3 h-3 shrink-0 text-emerald-500" aria-hidden="true">✓</span>
								<span className="leading-relaxed">{t(key)}</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* Footer */}
			<div className="px-6 py-3.5 sm:px-7 border-t border-amber-200 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-950/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
				<p className="text-[11px] text-gray-500 dark:text-gray-400">{t('CTA_HELPER')}</p>
				<Button
					type="button"
					size="sm"
					onClick={handleReactivate}
					disabled={isPending}
					className="gap-1.5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700 transition-all duration-150 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111111]"
				>
					{isPending ? (
						<>
							<Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
							{t('REACTIVATING')}
						</>
					) : (
						<>
							<PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
							{t('CTA')}
						</>
					)}
				</Button>
			</div>
		</section>
	);
}
