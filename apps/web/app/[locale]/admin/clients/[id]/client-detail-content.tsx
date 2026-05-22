'use client';

import { type ClientProfile } from '@/lib/db/schema';
import { Link } from '@/i18n/navigation';
import {
	ArrowLeft,
	Edit,
	Mail,
	Shield,
	CreditCard,
	Clock,
	User,
	Building2,
	Globe,
	Phone,
	MapPin,
	Languages,
	ExternalLink
} from 'lucide-react';
import { Button, Chip } from '@heroui/react';
import { Container } from '@/components/ui/container';
import {
	ProfilePanel,
	ProfileStatsStrip,
	AboutSection,
	SkillsSection,
	PortfolioSection
} from '@/components/profile';
import { getPlanColor, getStatusColor, toDateTime } from '../utils/client-helpers';
import { useTranslations } from 'next-intl';
import type { Profile, ProfileSkill, PortfolioItem } from '@/lib/types/profile';
import type { ProfileStats } from '@/lib/db/queries/profile-stats.queries';

interface ClientDetailContentProps {
	profile: ClientProfile;
	lastLogin: { timestamp: Date } | null;
	locale: string;
	portfolio: PortfolioItem[];
	stats: ProfileStats;
}

/* ─── helper components ─────────────────────────────────────────────────────── */

function SectionCard({
	icon,
	title,
	children
}: {
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm overflow-hidden">
			<div className="px-5 py-4 border-b border-neutral-100 dark:border-white/6 flex items-center gap-2.5">
				{icon}
				<h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
			</div>
			{children}
		</div>
	);
}

function InfoField({
	icon,
	label,
	value,
	isLink = false
}: {
	icon: React.ReactNode;
	label: string;
	value?: string | null;
	isLink?: boolean;
}) {
	return (
		<div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-white/3 border border-neutral-100 dark:border-white/6 hover:border-neutral-200 dark:hover:border-white/10 transition-colors">
			<div className="flex items-center gap-2 mb-1.5">
				<span className="text-neutral-400 dark:text-neutral-500">{icon}</span>
				<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
					{label}
				</span>
			</div>
			<div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 pl-0.5">
				{isLink && value && value !== '—' ? (
					<a
						href={/^https?:\/\//i.test(value) || value.startsWith('mailto:') ? value : `https://${value}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline inline-flex items-center gap-1"
					>
						{value}
						<ExternalLink className="w-3 h-3" />
					</a>
				) : (
					<span className={!value ? 'text-neutral-400 dark:text-neutral-500' : ''}>{value || '—'}</span>
				)}
			</div>
		</div>
	);
}

/* ─── main component ─────────────────────────────────────────────────────────── */

export function ClientDetailContent({ profile, lastLogin, locale, portfolio, stats }: ClientDetailContentProps) {
	const t = useTranslations('admin.ADMIN_CLIENT_DETAIL_PAGE');
	const tProfile = useTranslations('profile');

	const rawSkills = (profile.skills ?? []) as Array<{ name?: unknown; category?: unknown; proficiency?: unknown }>;
	const skills: ProfileSkill[] = rawSkills
		.filter((s) => typeof s?.name === 'string' && (s.name as string).trim().length > 0)
		.map((s) => ({
			name: String(s.name),
			category: typeof s.category === 'string' ? s.category : 'Other',
			proficiency: typeof s.proficiency === 'number' ? s.proficiency : 0
		}));

	const interests = (profile.interests ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	const profileData: Profile = {
		username: profile.username || 'user',
		displayName: profile.displayName || profile.name || 'User',
		bio: profile.bio || '',
		avatar: profile.avatar || '',
		location: profile.location || '',
		company: profile.company || '',
		jobTitle: profile.jobTitle || '',
		skills,
		interests,
		website: profile.website || '',
		socialLinks: [],
		portfolio,
		themeColor: '#3B82F6',
		coverColor: profile.coverColor || '',
		isPublic: profile.profileVisibility !== 'private',
		memberSince: profile.createdAt?.toISOString().split('T')[0] || '2024-01-01',
		submissions: []
	};

	return (
		<div className="min-h-screen">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="space-y-6">
					{/* Admin navigation header */}
					<div className="flex items-center justify-between gap-3">
						<Link
							href={`/${encodeURIComponent(locale)}/admin/clients`}
							className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
						>
							<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
							{t('BACK_TO_CLIENTS')}
						</Link>
						<Link
							href={`/${encodeURIComponent(locale)}/admin/clients?edit=${encodeURIComponent(profile.id)}`}
							className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md bg-black  text-white dark:bg-white dark:text-black hover:bg-theme-primary-700 transition-colors"
						>
							<Edit className="w-3.5 h-3.5" aria-hidden="true" />
							{t('EDIT_CLIENT')}
						</Link>
					</div>

					{/* 2-column layout */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
						{/* ── Left column ─────────────────────────────── */}
						<aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-6 lg:self-start">
							<ProfilePanel
								profile={profileData}
								isOwn={false}
								isAuthenticated={false}
								initialIsFollowing={false}
								verified={!!profile.emailVerified}
								stats={{
									favorites: stats.favorites,
									portfolio: stats.portfolio,
									followers: stats.followers,
									following: stats.following
								}}
								hideActions
							/>

							{/* ── Security & Account Status ── */}
							<div className="rounded-xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 overflow-hidden">
								{/* Header */}
								<div className="px-4 py-3 border-b border-neutral-100 dark:border-white/6 flex items-center gap-2">
									<div className="p-1 rounded-md bg-theme-primary-50 dark:bg-theme-primary-500/10">
										<Shield
											className="w-3.5 h-3.5 text-theme-primary-600 dark:text-theme-primary-400"
											aria-hidden="true"
										/>
									</div>
									<h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
										{t('SECURITY_STATUS')}
									</h2>
								</div>
								<div className="divide-y divide-neutral-100 dark:divide-white/5">
									<div className="flex items-center justify-between px-4 py-2.5">
										<span className="text-xs text-neutral-500 dark:text-neutral-400">{t('EMAIL_VERIFIED')}</span>
										<Chip size="sm" color={profile.emailVerified ? 'success' : 'danger'} variant="flat">
											{profile.emailVerified ? 'Verified' : 'Unverified'}
										</Chip>
									</div>
									<div className="flex items-center justify-between px-4 py-2.5">
										<span className="text-xs text-neutral-500 dark:text-neutral-400">{t('TWO_FACTOR_AUTH')}</span>
										<Chip size="sm" color={profile.twoFactorEnabled ? 'success' : 'default'} variant="flat">
											{profile.twoFactorEnabled ? t('ENABLED') : t('DISABLED')}
										</Chip>
									</div>
									<div className="flex items-center justify-between px-4 py-2.5">
										<span className="text-xs text-neutral-500 dark:text-neutral-400">Account Status</span>
										<Chip size="sm" color={getStatusColor(profile.status || 'active')} variant="flat">
											{(profile.status || 'active').charAt(0).toUpperCase() +
												(profile.status || 'active').slice(1)}
										</Chip>
									</div>
									<div className="flex items-center justify-between px-4 py-2.5">
										<span className="text-xs text-neutral-500 dark:text-neutral-400">{t('SUBSCRIPTION_PLAN')}</span>
										<Chip size="sm" color={getPlanColor(profile.plan || 'free')} variant="flat">
											{(profile.plan || 'free').charAt(0).toUpperCase() +
												(profile.plan || 'free').slice(1)}
										</Chip>
									</div>
									<div className="flex items-center justify-between px-4 py-2.5">
										<span className="text-xs text-neutral-500 dark:text-neutral-400">{t('SUBMISSIONS')}</span>
										<span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
											{profile.totalSubmissions ?? 0}
										</span>
									</div>
									<div className="flex items-center justify-between px-4 py-2.5">
										<span className="text-xs text-neutral-500 dark:text-neutral-400">{t('LAST_LOGIN')}</span>
										<span className="text-xs text-neutral-700 dark:text-neutral-300">
											{lastLogin ? toDateTime(lastLogin.timestamp, locale) : '—'}
										</span>
									</div>
									<div className="flex items-center justify-between px-4 py-2.5">
										<span className="text-xs text-neutral-500 dark:text-neutral-400">{t('JOINED')}</span>
										<span className="text-xs text-neutral-700 dark:text-neutral-300">
											{toDateTime(profile.createdAt, locale)}
										</span>
									</div>
								</div>
							</div>

							{/* ── Billing & Subscription ── */}
							<SectionCard
								icon={
									<div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-white/8">
										<CreditCard
											className="w-4 h-4 text-neutral-500 dark:text-neutral-400"
											aria-hidden="true"
										/>
									</div>
								}
								title={t('BILLING_PLANS')}
							>
								<div className="p-6 text-center">
									<div className="w-12 h-12 bg-neutral-100 dark:bg-white/8 rounded-2xl flex items-center justify-center mx-auto mb-3">
										<CreditCard
											className="w-6 h-6 text-neutral-500 dark:text-neutral-400"
											aria-hidden="true"
										/>
									</div>
									<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
										{t('NO_BILLING_SETUP')}
									</h3>
									<p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
										Payment and subscription details will appear here once configured.
									</p>
									<Button color="primary" variant="flat" size="sm">
										{t('SET_UP_BILLING')}
									</Button>
								</div>
							</SectionCard>
						</aside>

						{/* ── Right column ─────────────────────────────── */}
						<main className="lg:col-span-8 xl:col-span-9 space-y-6 min-w-0">
							{/* Stats strips */}
							<ProfileStatsStrip
								stats={{
									comments: stats.comments,
									favorites: stats.favorites,
									portfolio: stats.portfolio,
									followers: stats.followers,
									following: stats.following,
									submissions: profile.totalSubmissions ?? 0
								}}
								username={profileData.username}
								variant="headline"
							/>
							<ProfileStatsStrip
								stats={{
									comments: stats.comments,
									favorites: stats.favorites,
									portfolio: stats.portfolio,
									followers: stats.followers,
									following: stats.following,
									submissions: profile.totalSubmissions ?? 0
								}}
								username={profileData.username}
								variant="compact"
							/>

							{/* ── Profile Information ── */}
							<SectionCard
								icon={
									<div className="p-1.5 rounded-lg bg-theme-primary-50 dark:bg-theme-primary-500/10">
										<User
											className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400"
											aria-hidden="true"
										/>
									</div>
								}
								title={t('PROFILE_INFORMATION')}
							>
								<div className="p-5">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<InfoField
											icon={<User className="w-3.5 h-3.5" />}
											label={t('DISPLAY_NAME')}
											value={profile.displayName || '—'}
										/>
										<InfoField
											icon={<User className="w-3.5 h-3.5" />}
											label={t('USERNAME')}
											value={profile.username ? `@${profile.username}` : '—'}
										/>
										<InfoField
											icon={<Building2 className="w-3.5 h-3.5" />}
											label={t('COMPANY')}
											value={profile.company || '—'}
										/>
										<InfoField
											icon={<Building2 className="w-3.5 h-3.5" />}
											label={t('JOB_TITLE')}
											value={profile.jobTitle || '—'}
										/>
										<InfoField
											icon={<Shield className="w-3.5 h-3.5" />}
											label={t('ACCOUNT_TYPE')}
											value={
												(profile.accountType || 'individual').charAt(0).toUpperCase() +
												(profile.accountType || 'individual').slice(1)
											}
										/>
										<InfoField
											icon={<CreditCard className="w-3.5 h-3.5" />}
											label={t('SUBSCRIPTION_PLAN')}
											value={
												(profile.plan || 'free').charAt(0).toUpperCase() +
												(profile.plan || 'free').slice(1)
											}
										/>
									</div>
									{profile.bio && (
										<div className="mt-4 pt-4 border-t border-neutral-100 dark:border-white/6">
											<p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
												{t('BIO')}
											</p>
											<p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed p-3 rounded-xl bg-neutral-50 dark:bg-white/3 border border-neutral-100 dark:border-white/6">
												{profile.bio}
											</p>
										</div>
									)}
								</div>
							</SectionCard>

							{/* ── Contact Details ── */}
							<SectionCard
								icon={
									<div className="p-1.5 rounded-lg bg-theme-primary-50 dark:bg-theme-primary-500/10">
										<Mail
											className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400"
											aria-hidden="true"
										/>
									</div>
								}
								title={t('CONTACT_DETAILS')}
							>
								<div className="p-5">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<InfoField
											icon={<Phone className="w-3.5 h-3.5" />}
											label={t('PHONE')}
											value={profile.phone || '—'}
										/>
										<InfoField
											icon={<Globe className="w-3.5 h-3.5" />}
											label={t('WEBSITE')}
											value={profile.website || '—'}
											isLink={!!profile.website}
										/>
										<InfoField
											icon={<MapPin className="w-3.5 h-3.5" />}
											label={t('LOCATION')}
											value={profile.location || '—'}
										/>
										<InfoField
											icon={<Building2 className="w-3.5 h-3.5" />}
											label={t('INDUSTRY')}
											value={profile.industry || '—'}
										/>
										<InfoField
											icon={<Languages className="w-3.5 h-3.5" />}
											label={t('LANGUAGE')}
											value={profile.language?.toUpperCase() || 'EN'}
										/>
										<InfoField
											icon={<Clock className="w-3.5 h-3.5" />}
											label={t('TIMEZONE')}
											value={profile.timezone || 'UTC'}
										/>
									</div>
								</div>
							</SectionCard>

							{/* ── About (bio + interests) ── */}
							<section aria-labelledby="about-heading" className="space-y-4">
								<h2
									id="about-heading"
									className="text-lg font-semibold text-gray-900 dark:text-gray-100"
								>
									{tProfile('ABOUT_SECTION')}
								</h2>
								<AboutSection profile={profileData} isOwn={false} />
							</section>

							{/* ── Skills ── */}
							<section aria-labelledby="skills-heading" className="space-y-4">
								<h2
									id="skills-heading"
									className="text-lg font-semibold text-gray-900 dark:text-gray-100"
								>
									{tProfile('SKILLS_EXPERTISE_SECTION')}
								</h2>
								<SkillsSection profile={profileData} />
							</section>

							{/* ── Portfolio ── */}
							<section aria-labelledby="portfolio-heading" className="space-y-4">
								<h2
									id="portfolio-heading"
									className="text-lg font-semibold text-gray-900 dark:text-gray-100"
								>
									{tProfile('PORTFOLIO_SECTION')}
								</h2>
								<PortfolioSection profile={profileData} />
							</section>
						</main>
					</div>
				</div>
			</Container>
		</div>
	);
}
