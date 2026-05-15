import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { FiShield, FiArrowLeft } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { ChangePasswordForm } from '@/components/settings/security';
import { SecurityOverview } from '@/components/settings/security/security-overview';

export default async function SecuritySettingsPage() {
	const t = await getTranslations('settings.SECURITY_PAGE');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Back link */}
					<div>
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-3.5 h-3.5" />
							{t('BACK_TO_SETTINGS')}
						</Link>
					</div>

					{/* Page Header */}
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-900/40 rounded-xl flex items-center justify-center">
							<FiShield className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<div>
							<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('CHANGE_PASSWORD.TITLE')}
							</h1>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
								{t('CHANGE_PASSWORD.DESCRIPTION')}
							</p>
						</div>
					</div>

					{/* Two-column layout: form on the left, security overview on the right */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
						<div className="lg:col-span-2">
							<ChangePasswordForm />
						</div>

						<div className="space-y-4">
							<SecurityOverview />

							{/* Security Tips */}
							<Card className="border border-theme-primary-200/60 dark:border-theme-primary-800/50 bg-theme-primary-50/40 dark:bg-theme-primary-900/10">
								<CardContent className="p-5">
									<h3 className="text-sm font-semibold text-theme-primary-900 dark:text-theme-primary-100 mb-3 flex items-center gap-2">
										<FiShield className="w-4 h-4 text-theme-primary-500 shrink-0" />
										{t('SECURITY_TIPS.TITLE')}
									</h3>
									<ul className="space-y-2.5">
										{([1, 2, 3, 4] as const).map((n) => (
											<li key={n} className="flex items-start gap-2">
												<span className="w-1 h-1 bg-theme-primary-400 rounded-full mt-1.5 shrink-0" />
												<span className="text-xs text-theme-primary-800 dark:text-theme-primary-200 leading-relaxed">
													{t(`SECURITY_TIPS.TIP_${n}`)}
												</span>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}
