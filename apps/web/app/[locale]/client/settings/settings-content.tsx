'use client';

import { Container } from '@/components/ui/container';
import { FiUser, FiDroplet, FiBriefcase, FiFileText, FiArrowRight, FiCreditCard, FiMapPin, FiSettings } from 'react-icons/fi';
import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface SettingsCardProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	href: string;
}

function SettingsCard({ title, description, icon, href }: SettingsCardProps) {
	return (
		<Link
			href={href}
			className="flex items-center gap-3 px-4 py-3.5 group hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors duration-150"
		>
			<div className="shrink-0 w-8 h-8 bg-theme-primary-50 dark:bg-theme-primary-900/30 rounded-lg flex items-center justify-center group-hover:bg-theme-primary-100 dark:group-hover:bg-theme-primary-800/40 transition-colors duration-150">
				{icon}
			</div>
			<div className="flex-1 min-w-0">
				<h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-theme-primary-700 dark:group-hover:text-theme-primary-300 transition-colors">
					{title}
				</h3>
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{description}</p>
			</div>
			<FiArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-theme-primary-400 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
		</Link>
	);
}

interface SettingsSectionProps {
	label: string;
	children: React.ReactNode;
}

function SettingsSection({ label, children }: SettingsSectionProps) {
	return (
		<div className="space-y-2">
			<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-0.5">
				{label}
			</p>
			<div className="rounded-xl border border-gray-200 dark:border-white/6 bg-white dark:bg-[#111111] shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
				{children}
			</div>
		</div>
	);
}

export function SettingsContent() {
	const t = useTranslations('settings');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="max-w-xl mx-auto py-8 space-y-7">
					{/* Page Header */}
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-900/40 rounded-xl flex items-center justify-center">
							<FiSettings className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<div>
							<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('PROFILE_SETTINGS')}
							</h1>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
								Manage your profile, security and billing
							</p>
						</div>
					</div>

					{/* Profile */}
					<SettingsSection label="Profile">
						<SettingsCard
							title={t('SETTINGS_CARDS.BASIC_INFO.TITLE')}
							description={t('SETTINGS_CARDS.BASIC_INFO.DESCRIPTION')}
							icon={<FiUser className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/settings/profile/basic-info"
						/>
						<SettingsCard
							title={t('SETTINGS_CARDS.LOCATION.TITLE')}
							description={t('SETTINGS_CARDS.LOCATION.DESCRIPTION')}
							icon={<FiMapPin className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/settings/profile/location"
						/>
						<SettingsCard
							title={t('SETTINGS_CARDS.PORTFOLIO.TITLE')}
							description={t('SETTINGS_CARDS.PORTFOLIO.DESCRIPTION')}
							icon={<FiBriefcase className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/settings/profile/portfolio"
						/>
					</SettingsSection>

					{/* Appearance */}
					<SettingsSection label="Appearance">
						<SettingsCard
							title={t('SETTINGS_CARDS.THEME_COLORS.TITLE')}
							description={t('SETTINGS_CARDS.THEME_COLORS.DESCRIPTION')}
							icon={<FiDroplet className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/settings/profile/theme-colors"
						/>
					</SettingsSection>

					{/* Security */}
					<SettingsSection label="Security">
						<SettingsCard
							title={t('SETTINGS_CARDS.SECURITY.TITLE')}
							description={t('SETTINGS_CARDS.SECURITY.DESCRIPTION')}
							icon={<Shield className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/settings/security"
						/>
					</SettingsSection>

					{/* Content & Billing */}
					<SettingsSection label="Content & Billing">
						<SettingsCard
							title={t('SETTINGS_CARDS.SUBMISSIONS.TITLE')}
							description={t('SETTINGS_CARDS.SUBMISSIONS.DESCRIPTION')}
							icon={<FiFileText className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/submissions"
						/>
						<SettingsCard
							title={t('SETTINGS_CARDS.BILLING.TITLE')}
							description={t('SETTINGS_CARDS.BILLING.DESCRIPTION')}
							icon={<FiCreditCard className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/settings/profile/billing"
						/>
					</SettingsSection>
				</div>
			</Container>
		</div>
	);
}
