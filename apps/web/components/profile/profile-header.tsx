'use client';
import Image from 'next/image';
import { FiEdit2, FiMapPin, FiBriefcase, FiGlobe, FiGithub, FiLinkedin, FiTwitter, FiUser } from 'react-icons/fi';
import { Card } from '@/components/ui/card';
import type { Profile } from '@/lib/types/profile';
import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { InlineEditField } from './inline-edit-field';
import { ProfileStatsStrip, type ProfileStatsData } from './profile-stats-strip';
import { FollowButton } from './follow-button';

interface ProfileHeaderProps {
	profile: Profile;
	isOwn?: boolean;
	isAuthenticated?: boolean;
	stats?: ProfileStatsData;
	initialIsFollowing?: boolean;
}

export function ProfileHeader({
	profile,
	isOwn = false,
	isAuthenticated = false,
	stats,
	initialIsFollowing = false
}: ProfileHeaderProps) {
	const [imageError, setImageError] = useState(false);
	const [liveStats, setLiveStats] = useState<ProfileStatsData | undefined>(stats);

	useEffect(() => {
		setImageError(false);
	}, [profile.avatar]);

	useEffect(() => {
		setLiveStats(stats);
	}, [stats]);

	const getSocialIcon = (platform: string) => {
		switch (platform.toLowerCase()) {
			case 'github':
				return <FiGithub className="w-5 h-5" />;
			case 'linkedin':
				return <FiLinkedin className="w-5 h-5" />;
			case 'twitter':
				return <FiTwitter className="w-5 h-5" />;
			default:
				return <FiGlobe className="w-5 h-5" />;
		}
	};

	return (
		<div className="relative w-full">
			{/* Cover Banner */}
			<div className="relative h-20 md:h-24 w-full overflow-hidden">
				<div
					className="absolute inset-0 z-0"
					style={{
						background: `linear-gradient(120deg, var(--theme-primary, #6366f1), var(--theme-secondary, #a5b4fc) 80%)`
					}}
				/>
				<div className="absolute inset-0 bg-black/20 dark:bg-black/30 z-10" />
			</div>

			{/* Avatar - Overlapping the cover */}
			<div className="absolute left-1/2 md:left-12 top-6 md:top-10 transform -translate-x-1/2 md:translate-x-0 z-20">
				<div className="relative">
					<div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-xl bg-white dark:bg-white/3">
						{!imageError && profile.avatar ? (
							<Image
								src={profile.avatar}
								alt={`${profile.displayName}'s avatar`}
								width={112}
								height={112}
								className="w-full h-full object-cover"
								priority
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/5">
								<FiUser className="w-8 h-8 text-gray-400" />
							</div>
						)}
					</div>
					{isOwn && (
						<Link
							href="/client/settings/profile/basic-info"
							className="absolute bottom-2 right-2 bg-white dark:bg-white/5 rounded-full p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors border border-gray-200 dark:border-white/6"
							aria-label="Change avatar"
							title="Change avatar in settings"
						>
							<FiEdit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						</Link>
					)}
				</div>
			</div>

			{/* Profile Info Card */}
			<Card className="relative z-30 mt-8 md:mt-4 mx-auto max-w-4xl px-6 py-8 md:px-12 md:py-10 shadow-lg border-0">
				<div className="flex flex-col md:flex-row md:items-start md:space-x-8">
					<div className="hidden md:block md:w-0 md:h-0 shrink-0" />
					<div className="flex-1 min-w-0 w-full space-y-4">
						{/* Name + Action row */}
						<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
							<div>
								<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
									<InlineEditField
										field="displayName"
										value={profile.displayName}
										canEdit={isOwn}
										maxLength={100}
										placeholder="Your name"
										emptyLabel="Add your name"
										displayClassName="break-words"
									/>
								</h1>
								<p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
									<InlineEditField
										field="jobTitle"
										value={profile.jobTitle}
										canEdit={isOwn}
										maxLength={100}
										placeholder="Your role"
										emptyLabel="Add your role"
									/>
								</p>
							</div>
							<div className="flex items-center gap-2">
								{isOwn ? (
									<Link
										href="/client/settings/profile/basic-info"
										className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10 transition-colors"
									>
										<FiEdit2 className="w-4 h-4" />
										Edit profile
									</Link>
								) : (
									<FollowButton
										username={profile.username}
										initialIsFollowing={initialIsFollowing}
										isAuthenticated={isAuthenticated}
										onCountsChange={({ followers, following }) =>
											setLiveStats((prev) => (prev ? { ...prev, followers, following } : prev))
										}
									/>
								)}
							</div>
						</div>

						{/* Bio */}
						<div className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-2xl">
							<InlineEditField
								field="bio"
								value={profile.bio}
								canEdit={isOwn}
								multiline
								maxLength={500}
								placeholder="Tell others about yourself"
								emptyLabel={isOwn ? 'Add a bio' : 'No bio yet'}
							/>
						</div>

						{/* Location / Company / Website */}
						<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
							{(profile.location || isOwn) && (
								<div className="flex items-center gap-2">
									<FiMapPin className="w-4 h-4" />
									<InlineEditField
										field="location"
										value={profile.location}
										canEdit={isOwn}
										maxLength={100}
										placeholder="Where are you?"
										emptyLabel="Add location"
									/>
								</div>
							)}
							{(profile.company || isOwn) && (
								<div className="flex items-center gap-2">
									<FiBriefcase className="w-4 h-4" />
									<InlineEditField
										field="company"
										value={profile.company}
										canEdit={isOwn}
										maxLength={100}
										placeholder="Where do you work?"
										emptyLabel="Add company"
									/>
								</div>
							)}
							{isOwn ? (
								<div className="flex items-center gap-2">
									<FiGlobe className="w-4 h-4" />
									<InlineEditField
										field="website"
										value={profile.website}
										canEdit
										type="url"
										maxLength={200}
										placeholder="https://your.site"
										emptyLabel="Add website"
									/>
								</div>
							) : (
								profile.website && (
									<a
										href={profile.website}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
									>
										<FiGlobe className="w-4 h-4" />
										<span>Website</span>
									</a>
								)
							)}
						</div>

						{/* Stats strip */}
						{liveStats && <ProfileStatsStrip stats={liveStats} username={profile.username} />}

						{/* Social Links (read-only for now; managed via settings later) */}
						{profile.socialLinks.length > 0 && (
							<div className="flex items-center gap-4 pt-2 flex-wrap">
								{profile.socialLinks.map((link) => (
									<a
										key={link.platform}
										href={link.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-white/4 backdrop-blur-xs rounded-lg hover:bg-white dark:hover:bg-white/6 transition-all duration-200 shadow-xs hover:shadow-md"
									>
										{getSocialIcon(link.platform)}
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
											{link.displayName}
										</span>
									</a>
								))}
							</div>
						)}
					</div>
				</div>
			</Card>
		</div>
	);
}
