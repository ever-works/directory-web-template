'use client';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { FiUser, FiMapPin, FiBriefcase, FiGlobe, FiArrowLeft, FiUpload, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '@/hooks/use-current-user';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';

const SKILL_CATEGORIES = ['Frontend', 'Backend', 'Tools & Frameworks', 'Other'] as const;
type SkillCategory = (typeof SKILL_CATEGORIES)[number];

interface Skill {
	name: string;
	category: SkillCategory;
	proficiency: number;
}

interface SavedProfile {
	displayName: string;
	username: string;
	bio: string;
	jobTitle: string;
	company: string;
	location: string;
	website: string;
	interests: string;
	skills: Skill[];
	avatar: string;
}

const DEFAULT_SKILLS: Skill[] = [{ name: '', category: 'Frontend', proficiency: 80 }];

const INPUT_CLASS =
	'w-full h-9 px-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150';

const LABEL_CLASS = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5';

function SkillsEditor({
	initialSkills = [],
	onChange
}: {
	initialSkills?: Skill[];
	onChange: (skills: Skill[]) => void;
}) {
	const t = useTranslations('profile');
	const [skills, setSkills] = useState<Skill[]>(
		initialSkills.length > 0 ? initialSkills : [{ name: '', category: 'Frontend', proficiency: 80 }]
	);
	const [errors, setErrors] = useState<Record<number, string>>({});

	const handleSkillChange = (idx: number, field: keyof Skill, value: string | number) => {
		if (field === 'name' && errors[idx]) {
			setErrors((prev) => ({ ...prev, [idx]: '' }));
		}
		setSkills((prev) => {
			const updated = prev.map((skill, i) =>
				i === idx ? ({ ...skill, [field]: value } as Skill) : skill
			);
			onChange(updated);
			return updated;
		});
	};

	const validateSkill = (idx: number, skillName: string) => {
		if (!skillName.trim()) {
			setErrors((prev) => ({ ...prev, [idx]: t('SKILL_NAME_REQUIRED') }));
			return false;
		}
		if (skillName.length < 2) {
			setErrors((prev) => ({ ...prev, [idx]: t('SKILL_NAME_MIN_LENGTH') }));
			return false;
		}
		return true;
	};

	const addSkill = () => {
		setSkills((prev) => {
			const updated: Skill[] = [...prev, { name: '', category: 'Frontend', proficiency: 70 }];
			onChange(updated);
			return updated;
		});
	};

	const removeSkill = (idx: number) => {
		if (skills.length <= 1) return;
		setSkills((prev) => {
			const updated = prev.filter((_, i) => i !== idx);
			onChange(updated);
			return updated;
		});
		setErrors((prev) => {
			const n = { ...prev };
			delete n[idx];
			return n;
		});
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className={LABEL_CLASS + ' mb-0'}>{t('SKILLS')}</p>
				<span className="text-xs text-neutral-400 dark:text-neutral-500">{skills.length} added</span>
			</div>

			<div className="space-y-2">
				{skills.map((skill, idx) => (
					<div
						key={idx}
						className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center p-3 bg-neutral-50 dark:bg-white/3 rounded-lg border border-neutral-200 dark:border-white/8"
					>
						{/* Skill name */}
						<div className="min-w-0">
							<input
								type="text"
								placeholder={t('SKILL_NAME_PLACEHOLDER')}
								value={skill.name}
								onChange={(e) => handleSkillChange(idx, 'name', e.target.value)}
								onBlur={() => validateSkill(idx, skill.name)}
								className={INPUT_CLASS + (errors[idx] ? ' border-red-400 focus:border-red-400 focus:ring-red-400/20' : '')}
							/>
							{errors[idx] && (
								<p className="text-red-500 text-xs mt-1">{errors[idx]}</p>
							)}
						</div>

						{/* Category */}
						<select
							value={skill.category}
							onChange={(e) => handleSkillChange(idx, 'category', e.target.value)}
							className="h-9 px-2.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 transition-all duration-150 cursor-pointer"
						>
							{SKILL_CATEGORIES.map((cat) => (
								<option key={cat} value={cat}>{cat}</option>
							))}
						</select>

						{/* Proficiency */}
						<div className="flex items-center gap-2 w-36">
							<div className="flex-1 relative">
								<input
									type="range"
									min={0}
									max={100}
									step={5}
									value={skill.proficiency}
									onChange={(e) => handleSkillChange(idx, 'proficiency', Number(e.target.value))}
									className="w-full h-1.5 appearance-none rounded-full bg-neutral-200 dark:bg-white/10 cursor-pointer accent-theme-primary-600"
								/>
							</div>
							<span className="w-9 text-right text-xs font-medium text-neutral-600 dark:text-neutral-300 tabular-nums shrink-0">
								{skill.proficiency}%
							</span>
						</div>

						{/* Remove */}
						<button
							type="button"
							onClick={() => removeSkill(idx)}
							disabled={skills.length === 1}
							className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
							title={t('REMOVE_SKILL')}
						>
							<FiTrash2 className="w-3.5 h-3.5" />
						</button>
					</div>
				))}
			</div>

			<button
				type="button"
				onClick={addSkill}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-dashed border-neutral-300 dark:border-white/15 rounded-lg hover:border-theme-primary-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-all duration-150"
			>
				<FiPlus className="w-3.5 h-3.5" />
				{t('ADD_SKILL')}
			</button>
		</div>
	);
}

const createProfileSchema = (t: any) =>
	z.object({
		displayName: z.string().min(1, t('DISPLAY_NAME_REQUIRED')).max(100),
		username: z.string().min(3, t('USERNAME_MIN_LENGTH')).max(50),
		bio: z.string().max(500, t('BIO_MAX_LENGTH')),
		location: z.string().max(100),
		company: z.string().max(100),
		jobTitle: z.string().max(100),
		website: z.string().url(t('INVALID_URL')).or(z.literal('')),
		interests: z.string().max(200),
		skills: z
			.array(
				z.object({
					name: z.string().min(1, t('SKILL_NAME_REQUIRED')),
					category: z.enum(['Frontend', 'Backend', 'Tools & Frameworks', 'Other']),
					proficiency: z.number().min(0).max(100)
				})
			)
			.optional()
	});

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

export default function BasicInfoPage() {
	const t = useTranslations('profile');
	const { isLoading: isUserLoading } = useCurrentUser();
	const queryClient = useQueryClient();
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
	const [isLoadingProfile, setIsLoadingProfile] = useState(true);
	const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
	const [initialDisplayName, setInitialDisplayName] = useState<string>('');
	const [profileUsername, setProfileUsername] = useState<string>('');

	const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
			if (!allowedTypes.includes(file.type)) {
				toast.error(t('INVALID_IMAGE_FILE'));
				return;
			}
			if (file.size > 2 * 1024 * 1024) {
				toast.error(t('FILE_SIZE_TOO_LARGE'));
				return;
			}
			const reader = new FileReader();
			reader.onload = (e) => setAvatarPreview(e.target?.result as string);
			reader.onerror = () => {
				toast.error(t('ERROR_READING_FILE'));
				setAvatarPreview(null);
			};
			reader.readAsDataURL(file);
		}
	};

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting }
	} = useForm<ProfileFormData>({
		resolver: zodResolver(createProfileSchema(t)),
		defaultValues: {
			displayName: '',
			username: '',
			bio: '',
			location: '',
			company: '',
			jobTitle: '',
			website: '',
			interests: ''
		}
	});

	useEffect(() => {
		let cancelled = false;
		async function load() {
			const response = await serverClient.get<SavedProfile>('/api/user/profile');
			if (cancelled) return;
			if (!apiUtils.isSuccess(response) || !response.data) {
				setIsLoadingProfile(false);
				return;
			}
			const profile = response.data;
			reset({
				displayName: profile.displayName,
				username: profile.username,
				bio: profile.bio,
				location: profile.location,
				company: profile.company,
				jobTitle: profile.jobTitle,
				website: profile.website,
				interests: profile.interests
			});
			setInitialDisplayName(profile.displayName ?? '');
			setProfileUsername(profile.username ?? '');
			if (profile.skills?.length) setSkills(profile.skills);
			if (profile.avatar) {
				setAvatarPreview(profile.avatar);
				setInitialAvatar(profile.avatar);
			} else {
				setInitialAvatar(null);
			}
			setIsLoadingProfile(false);
		}
		void load();
		return () => { cancelled = true; };
	}, [reset]);

	const onSubmit = async (data: ProfileFormData) => {
		try {
			const validSkills = (data.skills ?? skills).filter((s) => s.name.trim().length > 0);
			const payload = {
				displayName: data.displayName,
				username: data.username,
				bio: data.bio,
				jobTitle: data.jobTitle,
				company: data.company,
				location: data.location,
				website: data.website,
				interests: data.interests,
				skills: validSkills,
				...(avatarPreview ? { avatar: avatarPreview } : {})
			};

			const response = await serverClient.patch<SavedProfile>('/api/user/profile', payload);
			if (!apiUtils.isSuccess(response)) {
				toast.error(apiUtils.getErrorMessage(response) || t('ERROR_UPDATING_PROFILE'));
				return;
			}
			const avatarChanged = avatarPreview !== initialAvatar;
			const displayNameChanged = (data.displayName ?? '') !== initialDisplayName;
			if (avatarChanged || displayNameChanged) {
				if (avatarChanged) setInitialAvatar(avatarPreview);
				if (displayNameChanged) setInitialDisplayName(data.displayName ?? '');
				await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
			}
			toast.success(t('PROFILE_UPDATED'));
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error(t('ERROR_UPDATING_PROFILE'));
		}
	};

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Page header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Link
								href={profileUsername ? `/client/profile/${profileUsername}` : '/client/profile'}
								className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors duration-150"
							>
								<FiArrowLeft className="w-3.5 h-3.5" />
								{t('BACK_TO_PROFILE')}
							</Link>
						</div>
					</div>

					<div>
						<h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
							{t('BASIC_INFO_TITLE')}
						</h1>
						<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
							{t('BASIC_INFO_DESCRIPTION')}
						</p>
					</div>

					{/* Form card */}
					<form
						className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6"
						onSubmit={handleSubmit(onSubmit)}
					>
						{/* Avatar section */}
						<div className="p-6">
							<p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-4">
								Profile photo
							</p>
							<div className="flex items-center gap-4">
								<div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 dark:bg-white/8 shrink-0 flex items-center justify-center ring-1 ring-neutral-200 dark:ring-white/10">
									{avatarPreview ? (
										<Image
											src={avatarPreview}
											alt="Avatar preview"
											fill
											unoptimized
											sizes="64px"
											className="object-cover"
											priority
										/>
									) : (
										<FiUser className="w-7 h-7 text-neutral-400" />
									)}
								</div>
								<div className="space-y-1">
									<label
										htmlFor="avatar"
										className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg cursor-pointer transition-colors duration-150"
									>
										<FiUpload className="w-3.5 h-3.5" />
										{t('UPLOAD_AVATAR')}
										<input
											id="avatar"
											name="avatar"
											type="file"
											accept="image/*"
											className="hidden"
											onChange={handleAvatarChange}
										/>
									</label>
									<p className="text-xs text-neutral-400 dark:text-neutral-500">
										{t('AVATAR_FILE_TYPES')}
									</p>
								</div>
							</div>
						</div>

						{/* Identity */}
						<div className="p-6 space-y-4">
							<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
								Identity
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label htmlFor="displayName" className={LABEL_CLASS}>
										{t('DISPLAY_NAME')}
									</label>
									<input
										id="displayName"
										type="text"
										placeholder={t('DISPLAY_NAME_PLACEHOLDER')}
										className={INPUT_CLASS}
										{...register('displayName')}
									/>
									{errors.displayName && (
										<p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>
									)}
									<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
										{t('DISPLAY_NAME_HELP')}
									</p>
								</div>
								<div>
									<label htmlFor="username" className={LABEL_CLASS}>
										{t('USERNAME')}
									</label>
									<input
										id="username"
										type="text"
										placeholder={t('USERNAME_PLACEHOLDER')}
										className={INPUT_CLASS}
										{...register('username')}
									/>
									{errors.username && (
										<p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
									)}
									<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
										{t('USERNAME_HELP')}
									</p>
								</div>
							</div>

							<div>
								<label htmlFor="bio" className={LABEL_CLASS}>
									{t('BIO')}
								</label>
								<textarea
									id="bio"
									rows={3}
									placeholder={t('BIO_PLACEHOLDER')}
									className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-neutral-300 dark:hover:border-white/15 resize-none transition-all duration-150"
									{...register('bio')}
								/>
								{errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>}
								<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{t('BIO_HELP')}</p>
							</div>

							<div>
								<label htmlFor="interests" className={LABEL_CLASS}>
									{t('INTERESTS')}
								</label>
								<input
									id="interests"
									type="text"
									placeholder={t('INTERESTS_PLACEHOLDER')}
									className={INPUT_CLASS}
									{...register('interests')}
								/>
								{errors.interests && (
									<p className="text-red-500 text-xs mt-1">{errors.interests.message}</p>
								)}
								<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
									{t('INTERESTS_HELP')}
								</p>
							</div>
						</div>

						{/* Skills */}
						<div className="p-6">
							<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-4">
								Skills
							</p>
							<SkillsEditor initialSkills={skills} onChange={setSkills} />
						</div>

						{/* Professional info */}
						<div className="p-6 space-y-4">
							<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
								Professional info
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label htmlFor="jobTitle" className={LABEL_CLASS}>
										{t('JOB_TITLE')}
									</label>
									<input
										id="jobTitle"
										type="text"
										placeholder={t('JOB_TITLE_PLACEHOLDER')}
										className={INPUT_CLASS}
										{...register('jobTitle')}
									/>
									{errors.jobTitle && (
										<p className="text-red-500 text-xs mt-1">{errors.jobTitle.message}</p>
									)}
								</div>
								<div>
									<label
										htmlFor="company"
										className={LABEL_CLASS + ' flex items-center gap-1'}
									>
										<FiBriefcase className="w-3 h-3" />
										{t('COMPANY')}
									</label>
									<input
										id="company"
										type="text"
										placeholder={t('COMPANY_PLACEHOLDER')}
										className={INPUT_CLASS}
										{...register('company')}
									/>
									{errors.company && (
										<p className="text-red-500 text-xs mt-1">{errors.company.message}</p>
									)}
								</div>
								<div>
									<label
										htmlFor="location"
										className={LABEL_CLASS + ' flex items-center gap-1'}
									>
										<FiMapPin className="w-3 h-3" />
										{t('LOCATION')}
									</label>
									<input
										id="location"
										type="text"
										placeholder={t('LOCATION_PLACEHOLDER')}
										className={INPUT_CLASS}
										{...register('location')}
									/>
									{errors.location && (
										<p className="text-red-500 text-xs mt-1">{errors.location.message}</p>
									)}
								</div>
								<div>
									<label
										htmlFor="website"
										className={LABEL_CLASS + ' flex items-center gap-1'}
									>
										<FiGlobe className="w-3 h-3" />
										{t('WEBSITE')}
									</label>
									<input
										id="website"
										type="url"
										placeholder={t('WEBSITE_PLACEHOLDER')}
										className={INPUT_CLASS}
										{...register('website')}
									/>
									{errors.website && (
										<p className="text-red-500 text-xs mt-1">{errors.website.message}</p>
									)}
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="px-6 py-4 flex items-center justify-end gap-3 bg-neutral-50 dark:bg-white/2 rounded-b-xl">
							<Link
								href={profileUsername ? `/client/profile/${profileUsername}` : '/client/profile'}
								className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-150"
							>
								{t('CANCEL')}
							</Link>
							<Button
								type="submit"
								disabled={isSubmitting || isUserLoading || isLoadingProfile}
								className="px-4 py-2 text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg transition-colors duration-150 disabled:opacity-60"
							>
								{isSubmitting || isLoadingProfile ? t('SAVING') : t('SAVE_CHANGES')}
							</Button>
						</div>
					</form>
				</div>
			</Container>
		</div>
	);
}
