'use client';
import Image from 'next/image';
import { FiEdit2, FiMapPin, FiBriefcase, FiGlobe, FiGithub, FiLinkedin, FiTwitter, FiUser } from 'react-icons/fi';
import { Card } from '@/components/ui/card';
import type { Profile } from '@/lib/types/profile';
import { useState, useEffect } from 'react';

interface ProfileHeaderProps {
	profile: Profile;
	isOwnProfile?: boolean;
}

export function ProfileHeader({ profile, isOwnProfile = false }: ProfileHeaderProps) {
	const [imageError, setImageError] = useState(false);

	// Reset imageError when avatar URL changes so new avatars can render
	useEffect(() => {
		setImageError(false);
	}, [profile.avatar]);

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
				{/* Overlay for readability */}
				<div className="absolute inset-0 bg-black/20 dark:bg-black/30 z-10" />
			</div>

			{/* Avatar - Overlapping the cover */}
			<div className="absolute left-1/2 md:left-12 top-6 md:top-10 transform -translate-x-1/2 md:translate-x-0 z-20">
				<div className="relative">
					<div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-xl bg-white dark:bg-white/[0.03]">
						{!imageError && profile.avatar ? (
							<Image
								src={profile.avatar}
								alt={`${profile.displayName}'s avatar`}
								width={112}
								height={112}
								className="w-full h-full object-cover"
								priority
								onError={() => {
									setImageError(true);
								}}
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/[0.05]">
								<FiUser className="w-8 h-8 text-gray-400" />
							</div>
						)}
					</div>
					{isOwnProfile && (
						<button
							className="absolute bottom-2 right-2 bg-white dark:bg-white/[0.05] rounded-full p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors border border-gray-200 dark:border-white/[0.06]"
							aria-label="Edit profile"
							title="Edit profile"
						>
							<FiEdit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						</button>
					)}
				</div>
			</div>

			{/* Profile Info Card */}
			<Card className="relative z-30 mt-8 md:mt-4 mx-auto max-w-4xl px-6 py-8 md:px-12 md:py-10 shadow-lg border-0">
				<div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
					{/* Spacer for avatar on desktop */}
					<div className="hidden md:block md:w-0 md:h-0 shrink-0" />
					{/* Profile Info */}
					<div className="flex-1 min-w-0 w-full">
						<div className="space-y-4">
							{/* Name and Title */}
							<div>
								<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
									{profile.displayName}
								</h1>
								<p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
									{profile.jobTitle}
								</p>
							</div>

							{/* Bio */}
							<p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-2xl">
								{profile.bio}
							</p>

							{/* Location and Company */}
							<div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
								{profile.location && (
									<div className="flex items-center gap-2">
										<FiMapPin className="w-4 h-4" />
										<span>{profile.location}</span>
									</div>
								)}
								{profile.company && (
									<div className="flex items-center gap-2">
										<FiBriefcase className="w-4 h-4" />
										<span>{profile.company}</span>
									</div>
								)}
								{profile.website && (
									<a
										href={profile.website}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
									>
										<FiGlobe className="w-4 h-4" />
										<span>Website</span>
									</a>
								)}
							</div>

							{/* Social Links */}
							{profile.socialLinks.length > 0 && (
								<div className="flex items-center gap-4 pt-2 flex-wrap">
									{profile.socialLinks.map(
										(link: { platform: string; url: string; displayName: string }) => (
											<a
												key={link.platform}
												href={link.url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-white/[0.04] backdrop-blur-xs rounded-lg hover:bg-white dark:hover:bg-white/[0.06] transition-all duration-200 shadow-xs hover:shadow-md"
											>
												{getSocialIcon(link.platform)}
												<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
													{link.displayName}
												</span>
											</a>
										)
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}
