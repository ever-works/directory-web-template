'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	FiBriefcase,
	FiCalendar,
	FiCheckCircle,
	FiGithub,
	FiGlobe,
	FiHeart,
	FiLinkedin,
	FiMapPin,
	FiTwitter,
	FiUser,
	FiUsers
} from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { ProfileTag } from './profile-tag';
import { FollowButton } from './follow-button';
import { ProfileSettingsMenu } from './profile-settings-menu';
import type { Profile } from '@/lib/types/profile';

interface ProfilePanelProps {
	profile: Profile;
	isOwn: boolean;
	isAuthenticated: boolean;
	initialIsFollowing: boolean;
	verified?: boolean;
	stats?: { favorites: number; portfolio: number; followers: number; following: number };
}

const COMPLETENESS_FIELD_KEYS = {
	displayName: 'DISPLAY_NAME',
	bio: 'BIO',
	avatar: 'PROFILE_PHOTO',
	location: 'LOCATION',
	jobTitle: 'JOB_TITLE',
	company: 'COMPANY',
	website: 'WEBSITE',
	skills: 'SKILLS',
	interests: 'INTERESTS',
	portfolio: 'PORTFOLIO_SECTION',
} as const;

type CompletenessFieldKey = keyof typeof COMPLETENESS_FIELD_KEYS;

function useCompleteness(profile: Profile): { score: number; missingKeys: CompletenessFieldKey[] } {
	const checks: [boolean, number, CompletenessFieldKey][] = [
		[!!profile.displayName, 10, 'displayName'],
		[!!profile.bio, 15, 'bio'],
		[!!profile.avatar, 15, 'avatar'],
		[!!profile.location, 10, 'location'],
		[!!profile.jobTitle, 10, 'jobTitle'],
		[!!profile.company, 5, 'company'],
		[!!profile.website, 10, 'website'],
		[profile.skills.length > 0, 15, 'skills'],
		[profile.interests.length > 0, 5, 'interests'],
		[profile.portfolio.length > 0, 5, 'portfolio'],
	];
	const score = checks.reduce((sum, [has, weight]) => sum + (has ? weight : 0), 0);
	const missingKeys = checks
		.filter(([has]) => !has)
		.sort((a, b) => b[1] - a[1])
		.map(([, , key]) => key);
	return { score, missingKeys };
}

const formatCount = (n: number): string => {
	if (n < 1000) return n.toString();
	if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
	return `${(n / 1_000_000).toFixed(1)}M`;
};

export function ProfilePanel({
	profile,
	isOwn,
	isAuthenticated,
	initialIsFollowing,
	verified,
	stats
}: ProfilePanelProps) {
	const t = useTranslations('profile');
	const [imageError, setImageError] = useState(false);
	const { score: completeness, missingKeys } = useCompleteness(profile);

	useEffect(() => {
		setImageError(false);
	}, [profile.avatar]);

	const formatMemberSince = (iso: string) => {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
	};

	const socialIcon = (platform: string) => {
		switch (platform.toLowerCase()) {
			case 'github':   return <FiGithub className="w-4 h-4" />;
			case 'linkedin': return <FiLinkedin className="w-4 h-4" />;
			case 'twitter':
			case 'x':        return <FiTwitter className="w-4 h-4" />;
			default:         return <FiGlobe className="w-4 h-4" />;
		}
	};

	const COVER_PRESETS: Record<string, string> = {
		midnight: 'linear-gradient(135deg,#1e1b4b,#3730a3)',
		ocean:    'linear-gradient(135deg,#0369a1,#38bdf8)',
		forest:   'linear-gradient(135deg,#14532d,#4ade80)',
		sunset:   'linear-gradient(135deg,#c2410c,#fbbf24)',
		rose:     'linear-gradient(135deg,#9f1239,#fb7185)',
		slate:    'linear-gradient(135deg,#334155,#94a3b8)',
		violet:   'linear-gradient(135deg,#5b21b6,#c4b5fd)',
		amber:    'linear-gradient(135deg,#92400e,#fcd34d)',
		teal:     'linear-gradient(135deg,#134e4a,#5eead4)',
	};
	const coverBackground = profile.coverColor && COVER_PRESETS[profile.coverColor]
		? COVER_PRESETS[profile.coverColor]
		: 'linear-gradient(135deg, var(--theme-primary, #6366f1) 0%, var(--theme-secondary, #a5b4fc) 100%)';

	const MAX_SKILLS_SHOWN = 6;
	const visibleSkills = profile.skills.slice(0, MAX_SKILLS_SHOWN);
	const extraSkillCount = profile.skills.length - MAX_SKILLS_SHOWN;

	return (
		<Card className="overflow-hidden border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm">
			{/* Cover */}
			<div
				className="relative h-28 w-full"
				style={{ background: coverBackground }}
			>
				<div
					className="absolute inset-0 opacity-20 mix-blend-overlay"
					style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
				/>
				{verified && (
					<span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-white/12 text-theme-primary-700 dark:text-theme-primary-200 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm border border-white/20">
						<FiCheckCircle className="w-3 h-3" />
						{t('VERIFIED_BADGE')}
					</span>
				)}
			</div>

			{/* Avatar row */}
			<div className="px-5 -mt-12 mb-1 flex items-end justify-between">
				<div className="relative h-24 w-24 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-neutral-950 shadow-lg bg-neutral-100 dark:bg-neutral-800">
					{!imageError && profile.avatar ? (
						<Image
							src={profile.avatar}
							alt={t('AVATAR_ALT', { name: profile.displayName })}
							fill
							sizes="96px"
							className="object-cover"
							priority
							unoptimized={profile.avatar.startsWith('data:image/')}
							onError={() => setImageError(true)}
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<FiUser className="w-9 h-9 text-neutral-400" />
						</div>
					)}
				</div>
				{isOwn && (
					<div className="pb-1">
						<ProfileSettingsMenu />
					</div>
				)}
			</div>

			{/* Body */}
			<div className="px-5 pt-3 pb-5 space-y-4">
				{/* Name + handle + role */}
				<div className="space-y-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						<h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight break-words">
							{profile.displayName}
						</h1>
						{verified && (
							<FiCheckCircle className="w-4 h-4 text-theme-primary-500 shrink-0" aria-label={t('VERIFIED_BADGE')} />
						)}
					</div>
					<p className="text-sm text-neutral-500 dark:text-neutral-400">@{profile.username}</p>
					{profile.jobTitle && (
						<div className="inline-flex items-center mt-1">
							<span className="px-2 py-0.5 rounded-md bg-theme-primary-50 dark:bg-theme-primary-500/12 text-theme-primary-700 dark:text-theme-primary-300 text-xs font-medium border border-theme-primary-100 dark:border-theme-primary-500/20">
								{profile.jobTitle}
							</span>
						</div>
					)}
				</div>

				{/* Bio */}
				{/* {profile.bio && (
					<p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
						{profile.bio}
					</p>
				)} */}

				{/* Followers / Following — LinkedIn-style inline links */}
				{stats && (
					<div className="flex items-center gap-1 text-sm flex-wrap">
						<Link
							href={`/client/profile/${profile.username}/followers`}
							className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors duration-150"
						>
							{formatCount(stats.followers)}
							<span className="text-neutral-500 dark:text-neutral-400">{t('STAT_FOLLOWERS')}</span>
						</Link>
						<span className="text-neutral-300 dark:text-neutral-600 mx-1">·</span>
						<Link
							href={`/client/profile/${profile.username}/following`}
							className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors duration-150"
						>
							{formatCount(stats.following)}
							<span className="text-neutral-500 dark:text-neutral-400">{t('STAT_FOLLOWING')}</span>
						</Link>
					</div>
				)}

				{/* Info list */}
				<div className="space-y-1.5">
					{profile.location && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 min-w-0">
							<FiMapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							<span className="truncate">{profile.location}</span>
						</div>
					)}
					{profile.company && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 min-w-0">
							<FiBriefcase className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							<span className="truncate">{profile.company}</span>
						</div>
					)}
					{profile.website && (
						<div className="flex items-center gap-2 text-sm min-w-0">
							<FiGlobe className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							<a
								href={profile.website}
								target="_blank"
								rel="noopener noreferrer"
								className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline truncate transition-colors duration-150"
							>
								{profile.website.replace(/^https?:\/\//, '')}
							</a>
						</div>
					)}
					<div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-500">
						<FiCalendar className="w-3.5 h-3.5 shrink-0" />
						<span>{t('JOINED_DATE', { date: formatMemberSince(profile.memberSince) })}</span>
					</div>
				</div>

				{/* Profile completeness — owner only */}
				{isOwn && completeness < 100 && (
					<div className="rounded-lg bg-theme-primary-50/70 dark:bg-theme-primary-500/8 border border-theme-primary-100 dark:border-theme-primary-500/20 px-3 py-2.5 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
								{t('PROFILE_COMPLETENESS', { percent: completeness })}
							</span>
							<Link
								href="/client/settings/profile/basic-info"
								className="text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline font-medium transition-colors duration-150"
							>
								{t('COMPLETE_PROFILE_LINK')}
							</Link>
						</div>
						<div className="h-0.5 w-full bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
							<div
								className="h-full rounded-full bg-linear-to-r from-theme-primary-500 to-theme-primary-400 transition-all duration-700 ease-out"
								style={{ width: `${completeness}%` }}
							/>
						</div>
						{missingKeys.length > 0 && (
							<div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
								<span className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0">
									{t('PROFILE_MISSING_TITLE')}
								</span>
								{missingKeys.slice(0, 3).map((key) => (
									<span
										key={key}
										className="text-[11px] text-theme-primary-600 dark:text-theme-primary-400 font-medium"
									>
										{t(COMPLETENESS_FIELD_KEYS[key] as Parameters<typeof t>[0])}
									</span>
								))}
								{missingKeys.length > 3 && (
									<span className="text-[11px] text-neutral-400 dark:text-neutral-500">
										{t('PROFILE_MISSING_MORE', { count: missingKeys.length - 3 })}
									</span>
								)}
							</div>
						)}
					</div>
				)}

				{/* Tech stack */}
				{profile.skills.length > 0 && (
					<div className="space-y-2">
						<p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
							{t('TECH_STACK')}
						</p>
						<div className="flex flex-wrap gap-1">
							{visibleSkills.map((skill) => (
								<ProfileTag key={skill.name} label={skill.name} />
							))}
							{extraSkillCount > 0 && (
								<span className="inline-flex items-center px-2.5 py-1 rounded-full border border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-400">
									{t('MORE_SKILLS', { count: extraSkillCount })}
								</span>
							)}
						</div>
					</div>
				)}

				{/* Social links */}
				{profile.socialLinks.length > 0 && (
					<div className="flex items-center gap-1.5 flex-wrap">
						{profile.socialLinks.map((link) => (
							<a
								key={link.platform}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2 rounded-lg border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:border-theme-primary-300 dark:hover:border-theme-primary-500/40 hover:bg-theme-primary-50 dark:hover:bg-theme-primary-500/10 transition-all duration-150"
								title={link.displayName}
								aria-label={link.displayName}
							>
								{socialIcon(link.platform)}
							</a>
						))}
					</div>
				)}

				<div className="border-t border-neutral-100 dark:border-white/6" />

				{/* Actions */}
				{isOwn ? (
					<Link
						href="/client/settings/profile/basic-info"
						className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-black dark:bg-white text-white dark:text-black shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98]"
					>
						{t('EDIT_PROFILE')}
					</Link>
				) : (
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<FollowButton
								username={profile.username}
								initialIsFollowing={initialIsFollowing}
								isAuthenticated={isAuthenticated}
							/>
						</div>
						{isAuthenticated && (
							<Link
								href="/client/users"
								className="flex items-center justify-center p-2.5 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150"
								title={t('DISCOVER_USERS')}
								aria-label={t('DISCOVER_USERS')}
							>
								<FiUsers className="w-4 h-4" />
							</Link>
						)}
					</div>
				)}
			</div>
		</Card>
	);
}
