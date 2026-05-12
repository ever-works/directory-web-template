'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
	FiBriefcase,
	FiCalendar,
	FiCheckCircle,
	FiEdit2,
	FiGithub,
	FiGlobe,
	FiLinkedin,
	FiMapPin,
	FiTwitter,
	FiUser,
	FiUsers
} from 'react-icons/fi';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { ProfileTag } from './profile-tag';
import { InlineEditField } from './inline-edit-field';
import { FollowButton } from './follow-button';
import { ProfileSettingsMenu } from './profile-settings-menu';
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user';
import type { Profile } from '@/lib/types/profile';

interface ProfilePanelProps {
	profile: Profile;
	isOwn: boolean;
	isAuthenticated: boolean;
	initialIsFollowing: boolean;
	verified?: boolean;
}

/** Completeness score based on filled fields (owner-only UI). */
function useCompleteness(profile: Profile) {
	const checks: [boolean, number][] = [
		[!!profile.displayName, 10],
		[!!profile.bio, 15],
		[!!profile.avatar, 15],
		[!!profile.location, 10],
		[!!profile.jobTitle, 10],
		[!!profile.company, 5],
		[!!profile.website, 10],
		[profile.skills.length > 0, 15],
		[profile.interests.length > 0, 5],
		[profile.portfolio.length > 0, 5],
	];
	return checks.reduce((sum, [has, weight]) => sum + (has ? weight : 0), 0);
}

export function ProfilePanel({
	profile,
	isOwn,
	isAuthenticated,
	initialIsFollowing,
	verified
}: ProfilePanelProps) {
	const [imageError, setImageError] = useState(false);
	const queryClient = useQueryClient();
	const completeness = useCompleteness(profile);

	useEffect(() => {
		setImageError(false);
	}, [profile.avatar]);

	const refreshCurrentUser = () => {
		if (!isOwn) return;
		void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
	};

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

	const MAX_SKILLS_SHOWN = 6;
	const visibleSkills = profile.skills.slice(0, MAX_SKILLS_SHOWN);
	const extraSkillCount = profile.skills.length - MAX_SKILLS_SHOWN;

	return (
		<Card className="overflow-hidden border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm">
			{/* Cover */}
			<div
				className="relative h-28 w-full"
				style={{ background: 'linear-gradient(135deg, var(--theme-primary, #6366f1) 0%, var(--theme-secondary, #a5b4fc) 100%)' }}
			>
				{/* Subtle noise overlay */}
				<div className="absolute inset-0 opacity-20 mix-blend-overlay"
					style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
				/>
				{verified && (
					<span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-white/12 text-theme-primary-700 dark:text-theme-primary-200 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm border border-white/20">
						<FiCheckCircle className="w-3 h-3" />
						Verified
					</span>
				)}
			</div>

			{/* Avatar row — overlaps cover */}
			<div className="px-5 -mt-12 mb-1 flex items-end justify-between">
				<div className="relative">
					<div className="relative h-24 w-24 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-neutral-950 shadow-lg bg-neutral-100 dark:bg-neutral-800">
						{!imageError && profile.avatar ? (
							<Image
								src={profile.avatar}
								alt={`${profile.displayName}'s avatar`}
								fill
								sizes="96px"
								className="object-cover"
								priority
								unoptimized={profile.avatar.startsWith('data:image/')}
								onError={() => setImageError(true)}
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
								<FiUser className="w-9 h-9 text-neutral-400" />
							</div>
						)}
					</div>
					{isOwn && (
						<Link
							href="/client/settings/profile/basic-info"
							className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-neutral-950 p-1.5 shadow-md border border-neutral-200 dark:border-white/10 text-theme-primary-600 dark:text-theme-primary-400 hover:scale-110 hover:bg-theme-primary-50 dark:hover:bg-theme-primary-500/10 transition-all duration-150"
							aria-label="Change avatar"
						>
							<FiEdit2 className="w-3 h-3" />
						</Link>
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
						<h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
							<InlineEditField
								field="displayName"
								value={profile.displayName}
								canEdit={isOwn}
								maxLength={100}
								placeholder="Your name"
								emptyLabel="Add your name"
								displayClassName="break-words"
								onSaved={refreshCurrentUser}
							/>
						</h1>
						{verified && (
							<FiCheckCircle className="w-4 h-4 text-theme-primary-500 shrink-0" aria-label="Verified" />
						)}
					</div>
					<p className="text-sm text-neutral-500 dark:text-neutral-400">@{profile.username}</p>
					{(profile.jobTitle || isOwn) && (
						<div className="inline-flex items-center mt-1">
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-primary-50 dark:bg-theme-primary-500/12 text-theme-primary-700 dark:text-theme-primary-300 text-xs font-medium border border-theme-primary-100 dark:border-theme-primary-500/20">
								<InlineEditField
									field="jobTitle"
									value={profile.jobTitle}
									canEdit={isOwn}
									maxLength={100}
									placeholder="Your role"
									emptyLabel="Add role"
								/>
							</span>
						</div>
					)}
				</div>

				{/* Bio */}
				{(profile.bio || isOwn) && (
					<p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
						<InlineEditField
							field="bio"
							value={profile.bio}
							canEdit={isOwn}
							multiline
							maxLength={500}
							placeholder="Tell others about yourself"
							emptyLabel={isOwn ? 'Add a short bio' : 'No bio yet'}
						/>
					</p>
				)}

				{/* Info list */}
				<div className="space-y-1.5">
					{(profile.location || isOwn) && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 min-w-0">
							<FiMapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							<span className="truncate">
								<InlineEditField field="location" value={profile.location} canEdit={isOwn} maxLength={100} placeholder="Location" emptyLabel="Add location" />
							</span>
						</div>
					)}
					{(profile.company || isOwn) && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 min-w-0">
							<FiBriefcase className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							<span className="truncate">
								<InlineEditField field="company" value={profile.company} canEdit={isOwn} maxLength={100} placeholder="Company" emptyLabel="Add company" />
							</span>
						</div>
					)}
					{(profile.website || isOwn) && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 min-w-0">
							<FiGlobe className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							{isOwn ? (
								<span className="truncate">
									<InlineEditField field="website" value={profile.website} canEdit type="url" maxLength={200} placeholder="https://your.site" emptyLabel="Add website" />
								</span>
							) : profile.website ? (
								<a href={profile.website} target="_blank" rel="noopener noreferrer"
									className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline truncate transition-colors duration-150">
									{profile.website.replace(/^https?:\/\//, '')}
								</a>
							) : null}
						</div>
					)}
					<div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-500">
						<FiCalendar className="w-3.5 h-3.5 shrink-0" />
						<span>Joined {formatMemberSince(profile.memberSince)}</span>
					</div>
				</div>

				{/* Profile completeness — owner only, hidden when complete */}
				{isOwn && completeness < 100 && (
					<div className="rounded-lg bg-theme-primary-50/70 dark:bg-theme-primary-500/8 border border-theme-primary-100 dark:border-theme-primary-500/20 px-3 py-2.5 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
								Profile {completeness}% complete
							</span>
							<Link
								href="/client/settings/profile/basic-info"
								className="text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline font-medium transition-colors duration-150"
							>
								Complete →
							</Link>
						</div>
						<div className="h-1.5 w-full bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
							<div
								className="h-full rounded-full bg-linear-to-r from-theme-primary-500 to-theme-primary-400 transition-all duration-700 ease-out"
								style={{ width: `${completeness}%` }}
							/>
						</div>
					</div>
				)}

				{/* Tech stack */}
				{(profile.skills.length > 0 || isOwn) && (
					<div className="space-y-2">
						<p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
							Tech Stack
						</p>
						{profile.skills.length > 0 ? (
							<div className="flex flex-wrap gap-1">
								{visibleSkills.map((skill) => (
									<ProfileTag key={skill.name} label={skill.name} />
								))}
								{extraSkillCount > 0 && (
									<Link
										href="/client/settings/profile/basic-info"
										className="inline-flex items-center px-2.5 py-1 rounded-full border border-dashed border-neutral-300 dark:border-white/12 text-xs text-neutral-500 dark:text-neutral-400 hover:border-theme-primary-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-all duration-150"
									>
										+{extraSkillCount} more
									</Link>
								)}
							</div>
						) : isOwn ? (
							<Link href="/client/settings/profile/basic-info" className="text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline">
								Add your tech stack →
							</Link>
						) : null}
					</div>
				)}

				{/* Social links — icon only */}
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
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98]"
					>
						<FiEdit2 className="w-3.5 h-3.5" />
						Edit profile
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
								title="Discover users"
								aria-label="Discover users"
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
