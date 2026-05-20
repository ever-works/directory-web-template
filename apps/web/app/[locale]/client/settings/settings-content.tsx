'use client';

import { Container } from '@/components/ui/container';
import {
	FiUser,
	FiDroplet,
	FiBriefcase,
	FiFileText,
	FiArrowRight,
	FiCreditCard,
	FiMapPin,
	FiSettings
} from 'react-icons/fi';
import { Shield, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import Image from 'next/image';
import { User } from 'next-auth';
import { isDemoMode } from '@/lib/utils';
import SelectLayout from '@/components/ui/select-layout';
import SelectContainerWidth from '@/components/ui/select-container-width';
import SelectPaginationType from '@/components/ui/select-pagination-type';
import SelectDatabaseMode from '@/components/ui/select-database-mode';
import SelectCheckoutProvider from '@/components/ui/select-checkout-provider';
import { DatabaseStatusWarning } from '@/components/ui/database-status-warning';

// ─── User Identity Card ────────────────────────────────────────────────────

function UserIdentityCard({ user, isLoading }: { user: User | undefined; isLoading: boolean }) {
	const initials =
		user?.name
			?.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '?';

	if (isLoading) {
		return (
			<div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/6 bg-white dark:bg-[#111111] shadow-sm animate-pulse">
				<div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/8 shrink-0" />
				<div className="flex-1 space-y-1.5">
					<div className="h-3 w-28 bg-gray-200 dark:bg-white/8 rounded" />
					<div className="h-2.5 w-40 bg-gray-100 dark:bg-white/5 rounded" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/6 bg-white dark:bg-[#111111] shadow-sm">
			<div className="relative w-10 h-10 rounded-full bg-theme-primary-100 dark:bg-theme-primary-900/30 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white dark:ring-white/10">
				{user?.image ? (
					<Image src={user.image} alt={user.name || 'User'} fill className="object-cover" />
				) : (
					<span className="text-sm font-semibold text-theme-primary-600 dark:text-theme-primary-400">
						{initials}
					</span>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
					{user?.name || 'Your Profile'}
				</p>
				{user?.email && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>}
			</div>
			<span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 shrink-0">
				<span className="w-1.5 h-1.5 rounded-full bg-green-400" />
				Active
			</span>
		</div>
	);
}

// ─── Settings Card ─────────────────────────────────────────────────────────

interface SettingsCardProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	href: string;
	isDone?: boolean;
}

function SettingsCard({ title, description, icon, href, isDone }: SettingsCardProps) {
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
			<div className="flex items-center gap-2 shrink-0">
				{isDone !== undefined && (
					<span
						className={`w-1.5 h-1.5 rounded-full transition-colors ${isDone ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`}
						title={isDone ? 'Complete' : 'Incomplete'}
					/>
				)}
				<FiArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-theme-primary-400 group-hover:translate-x-0.5 transition-all duration-150" />
			</div>
		</Link>
	);
}

// ─── Danger Settings Card ──────────────────────────────────────────────────
// Red-accented variant of SettingsCard for irreversible actions. Kept inline
// here (rather than extending SettingsCard with a `tone` prop) so the primary
// card primitive stays single-purpose; extract if a second tone shows up.

interface DangerSettingsCardProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	href: string;
}

function DangerSettingsCard({ title, description, icon, href }: DangerSettingsCardProps) {
	return (
		<Link
			href={href}
			className="flex items-center gap-3 px-4 py-3.5 group hover:bg-red-50/40 dark:hover:bg-red-950/10 transition-colors duration-150"
		>
			<div className="shrink-0 w-8 h-8 bg-red-50 dark:bg-red-950/40 rounded-lg flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors duration-150">
				{icon}
			</div>
			<div className="flex-1 min-w-0">
				<h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
					{title}
				</h3>
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{description}</p>
			</div>
			<FiArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
		</Link>
	);
}

// ─── Settings Section ──────────────────────────────────────────────────────

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

// ─── Preferences Panel ─────────────────────────────────────────────────────
// Section that mounts the same controls the SettingsModal exposes (Spec 029).
// Each block component is self-contained (renders its own card + handles its
// own toast feedback via `sonner`), so the panel only contributes the section
// label and vertical stack.

interface PreferencesPanelProps {
	label: string;
	children: React.ReactNode;
}

function PreferencesPanel({ label, children }: PreferencesPanelProps) {
	return (
		<div className="space-y-2">
			<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-0.5">
				{label}
			</p>
			<div className="space-y-3">{children}</div>
		</div>
	);
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function SettingsContent() {
	const t = useTranslations('settings');
	const { user, isLoading } = useCurrentUser();
	const isDemo = isDemoMode();

	const hasName = Boolean(user?.name);
	const hasImage = Boolean(user?.image);

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="max-w-xl mx-auto py-8 space-y-5">
					{/* Page header label */}
					<div className="flex items-center gap-2 px-0.5">
						<FiSettings className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
						<span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
							{t('PROFILE_SETTINGS')}
						</span>
					</div>

					{/* User identity card */}
					<UserIdentityCard user={user} isLoading={isLoading} />

					{/* Profile */}
					<SettingsSection label="Profile">
						<SettingsCard
							title={t('SETTINGS_CARDS.BASIC_INFO.TITLE')}
							description={t('SETTINGS_CARDS.BASIC_INFO.DESCRIPTION')}
							icon={<FiUser className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />}
							href="/client/settings/profile/basic-info"
							isDone={hasName && hasImage}
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
							icon={
								<FiBriefcase className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
							}
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
							isDone={true}
						/>
					</SettingsSection>

					{/* Preferences — same controls as SettingsModal (Spec 029) */}
					<PreferencesPanel label={t('PREFERENCES')}>
						<SelectLayout />
						<SelectContainerWidth />
						<SelectPaginationType />
						{isDemo && <SelectDatabaseMode />}
						{isDemo && <SelectCheckoutProvider />}
						{isDemo && <DatabaseStatusWarning />}
					</PreferencesPanel>

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
							icon={
								<FiCreditCard className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
							}
							href="/client/settings/profile/billing"
						/>
					</SettingsSection>

					{/* Danger Zone — destructive, irreversible actions */}
					<SettingsSection label={t('DANGER_ZONE_CARD.TITLE')}>
						<DangerSettingsCard
							title={t('DANGER_ZONE_CARD.TITLE')}
							description={t('DANGER_ZONE_CARD.DESCRIPTION')}
							icon={<Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />}
							href="/client/settings/danger-zone"
						/>
					</SettingsSection>
				</div>
			</Container>
		</div>
	);
}
