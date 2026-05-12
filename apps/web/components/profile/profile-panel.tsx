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
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user';
import type { Profile } from '@/lib/types/profile';

interface ProfilePanelProps {
	profile: Profile;
	isOwn: boolean;
	isAuthenticated: boolean;
	initialIsFollowing: boolean;
	verified?: boolean;
}

/**
 * Left-column profile card — replaces the old full-width ProfileHeader.
 *
 * Layout mirrors the reference candidate card: cover banner with avatar
 * overlap and an optional verified pill, then a column with name + role
 * pill, skills, interests, two side-by-side info boxes (Location, Member
 * since), and the action row (Edit profile / Follow + Discover users).
 */
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
			case 'github':
				return <FiGithub className="w-4 h-4" />;
			case 'linkedin':
				return <FiLinkedin className="w-4 h-4" />;
			case 'twitter':
			case 'x':
				return <FiTwitter className="w-4 h-4" />;
			default:
				return <FiGlobe className="w-4 h-4" />;
		}
	};

	return (
		<Card className="overflow-hidden border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm">
			{/* Cover + avatar overlap */}
			<div className="relative">
				<div
					className="h-24 w-full"
					style={{
						background:
							'linear-gradient(120deg, var(--theme-primary, #6366f1), var(--theme-secondary, #a5b4fc) 80%)'
					}}
				/>
				{verified && (
					<span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 text-theme-primary-700 dark:bg-white/10 dark:text-theme-primary-300 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
						<FiCheckCircle className="w-3.5 h-3.5" />
						Verified
					</span>
				)}
				<div className="absolute left-6 -bottom-10">
					<div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-neutral-950 shadow-md bg-white dark:bg-white/5">
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
								<FiUser className="w-8 h-8 text-gray-400" />
							</div>
						)}
					</div>
					{isOwn && (
						<Link
							href="/client/settings/profile/basic-info"
							className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-neutral-950 p-1.5 shadow-md border border-neutral-200 dark:border-white/10 text-theme-primary-600 dark:text-theme-primary-400 hover:bg-neutral-50 dark:hover:bg-white/8 transition-all duration-150"
							aria-label="Change avatar"
							title="Change avatar in settings"
						>
							<FiEdit2 className="w-3 h-3" />
						</Link>
					)}
				</div>
			</div>

			<div className="p-6 pt-14 space-y-5">
				{/* Name + role pill */}
				<div className="space-y-1.5">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
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
						<div className="inline-flex items-center">
							<span className="inline-flex items-center rounded-md bg-theme-primary-50 dark:bg-theme-primary-500/10 text-theme-primary-700 dark:text-theme-primary-300 px-2.5 py-1 text-xs font-medium">
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

				{/* Bio (compact) */}
				{(profile.bio || isOwn) && (
					<div className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
						<InlineEditField
							field="bio"
							value={profile.bio}
							canEdit={isOwn}
							multiline
							maxLength={500}
							placeholder="Tell others about yourself"
							emptyLabel={isOwn ? 'Add a short bio' : 'No bio yet'}
						/>
					</div>
				)}

				{/* Skills */}
				{(profile.skills.length > 0 || isOwn) && (
					<div className="space-y-2">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Skills</h3>
						{profile.skills.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{profile.skills.map((skill) => (
									<ProfileTag key={skill.name} label={skill.name} />
								))}
							</div>
						) : (
							isOwn && (
								<Link
									href="/client/settings/profile/basic-info"
									className="text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
								>
									Add your skills
								</Link>
							)
						)}
					</div>
				)}

				{/* Interests */}
				{(profile.interests.length > 0 || isOwn) && (
					<div className="space-y-2">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Interests</h3>
						{profile.interests.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{profile.interests.map((interest) => (
									<ProfileTag key={interest} label={interest} />
								))}
							</div>
						) : (
							isOwn && (
								<Link
									href="/client/settings/profile/basic-info"
									className="text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
								>
									Add interests
								</Link>
							)
						)}
					</div>
				)}

				{/* Two-up info boxes — Location + Member since */}
				<div className="grid grid-cols-2 gap-2">
					<div className="rounded-lg border border-neutral-200 dark:border-white/8 bg-neutral-50/80 dark:bg-white/3 px-3 py-2 transition-colors duration-150">
						<div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
							<FiMapPin className="w-3 h-3" />
							Location
						</div>
						<div className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">
							{profile.location ? (
								<InlineEditField
									field="location"
									value={profile.location}
									canEdit={isOwn}
									maxLength={100}
									placeholder="Where are you?"
									emptyLabel="Add"
								/>
							) : isOwn ? (
								<InlineEditField
									field="location"
									value={profile.location}
									canEdit
									maxLength={100}
									placeholder="Where are you?"
									emptyLabel="Add"
								/>
							) : (
								<span className="italic text-gray-400 dark:text-gray-500">—</span>
							)}
						</div>
					</div>
					<div className="rounded-lg border border-neutral-200 dark:border-white/8 bg-neutral-50/80 dark:bg-white/3 px-3 py-2 transition-colors duration-150">
						<div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
							<FiCalendar className="w-3 h-3" />
							Member since
						</div>
						<div className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">
							{formatMemberSince(profile.memberSince)}
						</div>
					</div>
					{(profile.company || isOwn) && (
						<div className="rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50/60 dark:bg-white/3 px-3 py-2 col-span-2">
							<div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
								<FiBriefcase className="w-3 h-3" />
								Company
							</div>
							<div className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">
								<InlineEditField
									field="company"
									value={profile.company}
									canEdit={isOwn}
									maxLength={100}
									placeholder="Where do you work?"
									emptyLabel="Add company"
								/>
							</div>
						</div>
					)}
					{(profile.website || isOwn) && (
						<div className="rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50/60 dark:bg-white/3 px-3 py-2 col-span-2">
							<div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
								<FiGlobe className="w-3 h-3" />
								Website
							</div>
							<div className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">
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
								) : (
									<span className="italic text-gray-400 dark:text-gray-500">—</span>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Social links (read-only for now) */}
				{profile.socialLinks.length > 0 && (
					<div className="flex flex-wrap items-center gap-2">
						{profile.socialLinks.map((link) => (
							<a
								key={link.platform}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 hover:border-neutral-300 dark:hover:border-white/15 text-xs text-neutral-700 dark:text-neutral-200 transition-all duration-150"
								title={link.displayName}
							>
								{socialIcon(link.platform)}
								<span className="truncate max-w-[14ch]">{link.displayName}</span>
							</a>
						))}
					</div>
				)}

				{/* Actions */}
				<div className="flex flex-wrap items-center gap-2 pt-2">
					{isOwn ? (
						<Link
							href="/client/settings/profile/basic-info"
							className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-theme-primary-600 hover:bg-theme-primary-700 text-white transition-all duration-150 w-full"
						>
							<FiEdit2 className="w-4 h-4" />
							Edit profile
						</Link>
					) : (
						<div className="flex-1">
							<FollowButton
								username={profile.username}
								initialIsFollowing={initialIsFollowing}
								isAuthenticated={isAuthenticated}
							/>
						</div>
					)}
					{isAuthenticated && (
						<Link
							href="/client/users"
							className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150"
						>
							<FiUsers className="w-4 h-4" />
							Discover
						</Link>
					)}
				</div>
			</div>
		</Card>
	);
}
