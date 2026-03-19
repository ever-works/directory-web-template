'use client';

import { type ClientProfile } from '@/lib/db/schema';
import { Link } from '@/i18n/navigation';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import {
	ArrowLeft,
	Mail,
	User,
	Building2,
	Globe,
	Phone,
	MapPin,
	Calendar,
	Shield,
	CreditCard,
	Clock,
	Languages,
	Star,
	ExternalLink,
	Edit
} from 'lucide-react';
import { getPlanColor, getStatusColor, toDateTime } from '../utils/client-helpers';

import { useTranslations } from 'next-intl';

interface ClientDetailContentProps {
	profile: ClientProfile;
	lastLogin: { timestamp: Date } | null;
	locale: string;
}

export function ClientDetailContent({ profile, lastLogin, locale }: ClientDetailContentProps) {
	const t = useTranslations('admin.ADMIN_CLIENT_DETAIL_PAGE');

	return (
		<div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a]">
			{/* Modern Gradient Header */}
			<div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a] border-b border-gray-100 dark:border-white/[0.06] shadow-lg">
				<div className="max-w-7xl mx-auto px-6 py-8">
					<div className="flex items-center justify-between mb-6">
						<Link
							href={`/${encodeURIComponent(locale)}/admin/clients`}
							className="inline-flex items-center px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-white/[0.05] rounded-sm transition-colors"
						>
							<ArrowLeft aria-hidden="true" className="w-4 h-4 mr-1" />
							{t('BACK_TO_CLIENTS')}
						</Link>
						<div className="flex items-center space-x-3">
							<Link
								href={`/${encodeURIComponent(locale)}/admin/clients?edit=${encodeURIComponent(profile.id)}`}
								className="inline-flex items-center px-2 py-1 bg-linear-to-r from-theme-primary to-theme-accent text-white shadow-lg hover:shadow-xl rounded-sm transition-all duration-300"
							>
								<Edit aria-hidden="true" className="w-4 h-4 mr-1" />
								{t('EDIT_CLIENT')}
							</Link>
						</div>
					</div>

					{/* Client Header Card */}
					<div className="bg-white dark:bg-white/[0.05] rounded-2xl shadow-xl border border-gray-100 dark:border-white/[0.06] p-8">
						<div className="flex flex-col lg:flex-row lg:items-start gap-6">
							<div className="flex items-center space-x-6">
								<div className="relative">
									<div className="w-20 h-20 bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
										<span className="text-2xl font-bold text-white">
											{(profile.displayName || profile.username || 'U').charAt(0).toUpperCase()}
										</span>
									</div>
									<div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 border-2 border-white dark:border-white/[0.06] rounded-full flex items-center justify-center">
										<div className="w-2 h-2 bg-white rounded-full"></div>
									</div>
								</div>
								<div className="flex-1">
									<div className="flex items-center space-x-3 mb-2">
										<h1 className="text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
											{profile.displayName || profile.username || 'Unnamed Client'}
										</h1>
										{profile.company && (
											<span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
												{profile.company}
											</span>
										)}
									</div>
									<div className="flex items-center space-x-4 mb-3">
										<span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
											#{profile.id.slice(0, 8)}
										</span>
										<Chip
											size="sm"
											color={getStatusColor(profile.status || 'active')}
											variant="flat"
											className="shadow-xs"
										>
											{(profile.status || 'active').charAt(0).toUpperCase() +
												(profile.status || 'active').slice(1)}
										</Chip>
										<Chip
											size="sm"
											color={getPlanColor(profile.plan || 'free')}
											variant="flat"
											className="shadow-xs"
										>
											{(profile.plan || 'free').charAt(0).toUpperCase() +
												(profile.plan || 'free').slice(1)}
										</Chip>
									</div>
									{profile.jobTitle && (
										<p className="text-gray-600 dark:text-gray-400 mb-2">{profile.jobTitle}</p>
									)}
									<div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
										<div className="flex items-center space-x-2">
											<Calendar aria-hidden="true" className="w-4 h-4" />
											<span>
												{t('JOINED')} {toDateTime(profile.createdAt, locale)}
											</span>
										</div>
										<div className="flex items-center space-x-2">
											<Star aria-hidden="true" className="w-4 h-4" />
											<span>
												{profile.totalSubmissions || 0} {t('SUBMISSIONS')}
											</span>
										</div>
										<div className="flex items-center space-x-2">
											<Clock aria-hidden="true" className="w-4 h-4" />
											<span>
												{t('LAST_LOGIN')}{' '}
												{lastLogin ? toDateTime(lastLogin.timestamp, locale) : 'Never'}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Content Area */}
			<div className="max-w-7xl mx-auto px-6 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-8">
						{/* Profile Information */}
						<Card className="border-0 shadow-xl bg-white/80 dark:bg-white/[0.04] backdrop-blur-xs">
							<CardBody className="p-0">
								<div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-linear-to-r from-gray-50 to-white dark:from-[#0a0a0a] dark:to-[#0a0a0a]">
									<div className="flex items-center space-x-3">
										<User aria-hidden="true" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
										<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
											{t('PROFILE_INFORMATION')}
										</h2>
									</div>
								</div>
								<div className="p-6">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<ModernField
											icon={<User aria-hidden="true" className="w-4 h-4 text-blue-500" />}
											label={t('DISPLAY_NAME')}
											value={profile.displayName || 'Not provided'}
										/>
										<ModernField
											icon={<User aria-hidden="true" className="w-4 h-4 text-green-500" />}
											label={t('USERNAME')}
											value={profile.username ? `@${profile.username}` : 'Not set'}
										/>
										<ModernField
											icon={<Building2 aria-hidden="true" className="w-4 h-4 text-purple-500" />}
											label={t('COMPANY')}
											value={profile.company || 'Not provided'}
										/>
										<ModernField
											icon={<Building2 aria-hidden="true" className="w-4 h-4 text-orange-500" />}
											label={t('JOB_TITLE')}
											value={profile.jobTitle || 'Not provided'}
										/>
										<ModernField
											icon={<Shield aria-hidden="true" className="w-4 h-4 text-indigo-500" />}
											label={t('ACCOUNT_TYPE')}
											value={
												(profile.accountType || 'individual').charAt(0).toUpperCase() +
												(profile.accountType || 'individual').slice(1)
											}
										/>
										<ModernField
											icon={<CreditCard aria-hidden="true" className="w-4 h-4 text-pink-500" />}
											label={t('SUBSCRIPTION_PLAN')}
											value={
												(profile.plan || 'free').charAt(0).toUpperCase() +
												(profile.plan || 'free').slice(1)
											}
										/>
									</div>
									{profile.bio && (
										<div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
											<div className="flex items-center space-x-2 mb-3">
												<User
													aria-hidden="true"
													className="w-4 h-4 text-gray-600 dark:text-gray-400"
												/>
												<span className="text-sm font-medium text-gray-900 dark:text-white">
													{t('BIO')}
												</span>
											</div>
											<div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
												<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
													{profile.bio}
												</p>
											</div>
										</div>
									)}
								</div>
							</CardBody>
						</Card>

						{/* Contact Information */}
						<Card className="border-0 shadow-xl bg-white/80 dark:bg-white/[0.04] backdrop-blur-xs">
							<CardBody className="p-0">
								<div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-linear-to-r from-gray-50 to-white dark:from-[#0a0a0a] dark:to-[#0a0a0a]">
									<div className="flex items-center space-x-3">
										<Mail
											aria-hidden="true"
											className="w-5 h-5 text-green-600 dark:text-green-400"
										/>
										<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
											{t('CONTACT_DETAILS')}
										</h2>
									</div>
								</div>
								<div className="p-6">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<ModernField
											icon={<Phone aria-hidden="true" className="w-4 h-4 text-green-500" />}
											label={t('PHONE')}
											value={profile.phone || 'Not provided'}
										/>
										<ModernField
											icon={<Globe aria-hidden="true" className="w-4 h-4 text-blue-500" />}
											label={t('WEBSITE')}
											value={profile.website || 'Not provided'}
											isLink={!!profile.website}
										/>
										<ModernField
											icon={<MapPin aria-hidden="true" className="w-4 h-4 text-red-500" />}
											label={t('LOCATION')}
											value={profile.location || 'Not provided'}
										/>
										<ModernField
											icon={<Building2 aria-hidden="true" className="w-4 h-4 text-purple-500" />}
											label={t('INDUSTRY')}
											value={profile.industry || 'Not specified'}
										/>
										<ModernField
											icon={<Languages aria-hidden="true" className="w-4 h-4 text-orange-500" />}
											label={t('LANGUAGE')}
											value={profile.language?.toUpperCase() || 'EN'}
										/>
										<ModernField
											icon={<Clock aria-hidden="true" className="w-4 h-4 text-indigo-500" />}
											label={t('TIMEZONE')}
											value={profile.timezone || 'UTC'}
										/>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>

					{/* Sidebar */}
					<div className="space-y-8">
						{/* Account Status */}
						<Card className="border-0 shadow-xl bg-white/80 dark:bg-white/[0.04] backdrop-blur-xs">
							<CardBody className="p-0">
								<div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-linear-to-r from-gray-50 to-white dark:from-[#0a0a0a] dark:to-[#0a0a0a]">
									<div className="flex items-center space-x-3">
										<Shield
											aria-hidden="true"
											className="w-5 h-5 text-purple-600 dark:text-purple-400"
										/>
										<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
											{t('SECURITY_STATUS')}
										</h2>
									</div>
								</div>
								<div className="p-6 space-y-4">
									<div className="flex items-center justify-between p-4 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-100 dark:border-green-800">
										<div className="flex items-center space-x-3">
											<Mail
												aria-hidden="true"
												className="w-5 h-5 text-green-600 dark:text-green-400"
											/>
											<span className="font-medium text-gray-900 dark:text-white">
												{t('EMAIL_VERIFIED')}
											</span>
										</div>
										<Chip
											size="sm"
											color={profile.emailVerified ? 'success' : 'danger'}
											variant="flat"
											className="shadow-xs"
										>
											{profile.emailVerified ? 'Verified' : 'Unverified'}
										</Chip>
									</div>
									<div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
										<div className="flex items-center space-x-3">
											<Shield
												aria-hidden="true"
												className="w-5 h-5 text-blue-600 dark:text-blue-400"
											/>
											<span className="font-medium text-gray-900 dark:text-white">
												{t('TWO_FACTOR_AUTH')}
											</span>
										</div>
										<Chip
											size="sm"
											color={profile.twoFactorEnabled ? 'success' : 'default'}
											variant="flat"
											className="shadow-xs"
										>
											{profile.twoFactorEnabled ? t('ENABLED') : t('DISABLED')}
										</Chip>
									</div>
									<div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
										<div className="text-center">
											<div className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
												<div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
													{profile.totalSubmissions || 0}
												</div>
												<div className="text-sm text-gray-600 dark:text-gray-400">
													{t('SUBMISSIONS')}
												</div>
											</div>
										</div>
									</div>
								</div>
							</CardBody>
						</Card>

						{/* Billing & Subscription */}
						<Card className="border-0 shadow-xl bg-white/80 dark:bg-white/[0.04] backdrop-blur-xs">
							<CardBody className="p-0">
								<div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-linear-to-r from-gray-50 to-white dark:from-[#0a0a0a] dark:to-[#0a0a0a]">
									<div className="flex items-center space-x-3">
										<CreditCard
											aria-hidden="true"
											className="w-5 h-5 text-green-600 dark:text-green-400"
										/>
										<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
											{t('BILLING_PLANS')}
										</h2>
									</div>
								</div>
								<div className="p-6">
									<div className="text-center py-8">
										<div className="w-16 h-16 bg-linear-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
											<CreditCard
												aria-hidden="true"
												className="w-8 h-8 text-green-600 dark:text-green-400"
											/>
										</div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
											{t('NO_BILLING_SETUP')}
										</h3>
										<p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
											Payment and subscription details will appear here once configured.
										</p>
										<Button
											color="primary"
											variant="flat"
											size="sm"
											className="bg-linear-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
										>
											{t('SET_UP_BILLING')}
										</Button>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}

export function ModernField({
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
		<div className="p-4 bg-linear-to-r from-gray-50/50 to-white/50 dark:from-[#0a0a0a]/50 dark:to-[#0a0a0a]/50 rounded-xl border border-gray-100 dark:border-white/[0.06] hover:shadow-md transition-all duration-200">
			<div className="flex items-center space-x-3 mb-2">
				{icon}
				<span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
			</div>
			<div className="text-gray-900 dark:text-white font-medium">
				{isLink && value && value !== 'Not provided' ? (
					<a
						href={/^https?:\/\//i.test(value) || value.startsWith('mailto:') ? value : `https://${value}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
					>
						<span>{value}</span>
						<ExternalLink aria-hidden="true" className="w-3 h-3" />
					</a>
				) : (
					value || '—'
				)}
			</div>
		</div>
	);
}
