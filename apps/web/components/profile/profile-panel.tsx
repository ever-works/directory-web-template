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

export function ProfilePanel({
	profile,
	isOwn,
	isAuthenticated,
	initialIsFollowing,
	verified
}: ProfilePanelProps) {
	const [imageError, setImageError] = useState(false);
	const queryClient = useQueryClient();

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

	const MAX_SKILLS_SHOWN = 8;
	const visibleSkills = profile.skills.slice(0, MAX_SKILLS_SHOWN);
	const extraSkillCount = profile.skills.length - MAX_SKILLS_SHOWN;

	return (
		<Card className="overflow-hidden border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm">
			{/* Cover banner */}
			<div className="relative h-24 w-full shrink-0"
				style={{ background: 'linear-gradient(120deg, var(--theme-primary, #6366f1), var(--theme-secondary, #a5b4fc) 80%)' }}
			>
				{verified && (
					<span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-white/10 text-theme-primary-700 dark:text-theme-primary-300 px-2 py-0.5 text-xs font-medium shadow-sm backdrop-blur-sm">
						<FiCheckCircle className="w-3 h-3" />
						Verified
					</span>
				)}
			</div>

			{/* Avatar — overlaps cover */}
			<div className="px-5">
				<div className="relative -mt-10 mb-3 w-fit">
					<div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-neutral-950 shadow-md bg-neutral-100 dark:bg-white/5">
						{!imageError && profile.avatar ? (
							<Image
								src={profile.avatar}
								alt={`${profile.displayName}'s avatar`}
								fill
								sizes="80px"
								className="object-cover"
								priority
								unoptimized={profile.avatar.startsWith('data:image/')}
								onError={() => setImageError(true)}
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<FiUser className="w-8 h-8 text-neutral-400" />
							</div>
						)}
					</div>
					{isOwn && (
						<Link
							href="/client/settings/profile/basic-info"
							className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-neutral-950 p-1.5 shadow border border-neutral-200 dark:border-white/10 text-theme-primary-600 dark:text-theme-primary-400 hover:bg-neutral-50 dark:hover:bg-white/8 transition-all duration-150"
							aria-label="Change avatar"
							title="Change avatar in settings"
						>
							<FiEdit2 className="w-3 h-3" />
						</Link>
					)}
				</div>
			</div>

			{/* Body */}
			<div className="px-5 pb-5 space-y-4">
				{/* Name + role */}
				<div>
					<h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
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
					{(profile.jobTitle || isOwn) && (
						<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
							<InlineEditField
								field="jobTitle"
								value={profile.jobTitle}
								canEdit={isOwn}
								maxLength={100}
								placeholder="Your role"
								emptyLabel="Add role"
							/>
						</p>
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
				<div className="space-y-2">
					{(profile.location || isOwn) && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
							<FiMapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							<InlineEditField
								field="location"
								value={profile.location}
								canEdit={isOwn}
								maxLength={100}
								placeholder="Location"
								emptyLabel="Add location"
							/>
						</div>
					)}
					{(profile.company || isOwn) && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
							<FiBriefcase className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							<InlineEditField
								field="company"
								value={profile.company}
								canEdit={isOwn}
								maxLength={100}
								placeholder="Company"
								emptyLabel="Add company"
							/>
						</div>
					)}
					{(profile.website || isOwn) && (
						<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
							<FiGlobe className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
							{isOwn ? (
								<InlineEditField
									field="website"
									value={profile.website}
									canEdit
									type="url"
									maxLength={200}
									placeholder="https://your.site"
									emptyLabel="Add website"
								/>
							) : profile.website ? (
								<a
									href={profile.website}
									target="_blank"
									rel="noopener noreferrer"
									className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline truncate"
								>
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

				{/* Skills */}
				{(profile.skills.length > 0 || isOwn) && (
					<div className="space-y-1.5">
						<p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Skills</p>
						{profile.skills.length > 0 ? (
							<div className="flex flex-wrap gap-1">
								{visibleSkills.map((skill) => (
									<ProfileTag key={skill.name} label={skill.name} />
								))}
								{extraSkillCount > 0 && (
									<Link
										href="/client/settings/profile/basic-info"
										className="inline-flex items-center px-2.5 py-1 rounded-full border border-dashed border-neutral-300 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-400 hover:border-theme-primary-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-all duration-150"
									>
										+{extraSkillCount} more
									</Link>
								)}
							</div>
						) : isOwn ? (
							<Link
								href="/client/settings/profile/basic-info"
								className="text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
							>
								Add your skills →
							</Link>
						) : null}
					</div>
				)}

				{/* Social links — icon only row */}
				{profile.socialLinks.length > 0 && (
					<div className="flex items-center gap-1.5">
						{profile.socialLinks.map((link) => (
							<a
								key={link.platform}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2 rounded-lg border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150"
								title={link.displayName}
								aria-label={link.displayName}
							>
								{socialIcon(link.platform)}
							</a>
						))}
					</div>
				)}

				{/* Divider */}
				<div className="border-t border-neutral-100 dark:border-white/6" />

				{/* Actions */}
				{isOwn ? (
					<div className="flex items-center gap-2">
						<Link
							href="/client/settings/profile/basic-info"
							className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white shadow-sm hover:shadow transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#141414] focus-visible:ring-theme-primary-500"
						>
							<FiEdit2 className="w-3.5 h-3.5" />
							Edit profile
						</Link>
						<ProfileSettingsMenu />
					</div>
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
								className="flex items-center justify-center p-2 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150"
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
