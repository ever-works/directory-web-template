'use client';

import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiUser, FiMapPin, FiBriefcase, FiGlobe, FiArrowLeft, FiUpload, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const SKILL_CATEGORIES = ['Frontend', 'Backend', 'Tools & Frameworks', 'Other'];

interface Skill {
	name: string;
	category: string;
	proficiency: number;
}

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
		// Clear error when user starts typing
		if (field === 'name' && errors[idx]) {
			setErrors((prev) => ({ ...prev, [idx]: '' }));
		}
		setSkills((prev) => {
			const updatedSkills = prev.map((skill, i) => (i === idx ? { ...skill, [field]: value } : skill));
			onChange(updatedSkills);
			return updatedSkills;
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
			const updatedSkills = [...prev, { name: '', category: 'Frontend', proficiency: 70 }];
			onChange(updatedSkills);
			return updatedSkills;
		});
	};

	const removeSkill = (idx: number) => {
		if (skills.length > 1) {
			setSkills((prev) => {
				const updatedSkills = prev.filter((_, i) => i !== idx);
				onChange(updatedSkills);
				return updatedSkills;
			});
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[idx];
				return newErrors;
			});
		}
	};

	return (
		<div className="space-y-4">
			<label className="block font-semibold text-gray-800 dark:text-gray-100 mb-1">{t('SKILLS')}</label>
			<div className="space-y-4">
				{skills.map((skill, idx) => (
					<div
						key={idx}
						className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
					>
						<input
							type="text"
							placeholder={t('SKILL_NAME_PLACEHOLDER')}
							value={skill.name}
							onChange={(e) => handleSkillChange(idx, 'name', e.target.value)}
							onBlur={() => validateSkill(idx, skill.name)}
							className="w-full md:w-1/3 h-12 px-4 text-base bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-400"
						/>
						{errors[idx] && <p className="text-red-500 text-sm mt-1">{errors[idx]}</p>}
						<select
							value={skill.category}
							onChange={(e) => handleSkillChange(idx, 'category', e.target.value)}
							className="w-full md:w-1/4 h-12 px-4 text-base bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 outline-hidden text-gray-900 dark:text-white"
						>
							{SKILL_CATEGORIES.map((cat) => (
								<option key={cat} value={cat}>
									{cat}
								</option>
							))}
						</select>
						<div className="flex items-center gap-2 w-full md:w-1/4">
							<input
								type="range"
								min={0}
								max={100}
								value={skill.proficiency}
								onChange={(e) => handleSkillChange(idx, 'proficiency', Number(e.target.value))}
								className="w-full"
							/>
							<span className="w-10 text-right text-sm text-gray-700 dark:text-gray-300">
								{skill.proficiency}%
							</span>
						</div>
						<button
							type="button"
							onClick={() => removeSkill(idx)}
							className="p-2 rounded-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
							title={t('REMOVE_SKILL')}
							disabled={skills.length === 1}
						>
							<FiTrash2 className="w-4 h-4" />
						</button>
					</div>
				))}
			</div>
			<Button type="button" variant="outline" className="flex items-center gap-2 mt-2" onClick={addSkill}>
				<FiPlus className="w-4 h-4" />
				{t('ADD_SKILL')}
			</Button>
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
	// Bypass auth for testing
	const session = { user: { name: 'John Doe', email: 'john@example.com' } };
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

	// Skills state for integration
	const [skills, setSkills] = useState<Skill[]>([{ name: '', category: 'Frontend', proficiency: 80 }]);

	const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// Validate file type
			const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
			if (!allowedTypes.includes(file.type)) {
				alert(t('INVALID_IMAGE_FILE'));
				return;
			}
			// Validate file size (2MB limit)
			if (file.size > 2 * 1024 * 1024) {
				alert(t('FILE_SIZE_TOO_LARGE'));
				return;
			}
			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				setAvatarPreview(e.target?.result as string);
			};
			reader.onerror = () => {
				alert(t('ERROR_READING_FILE'));
				setAvatarPreview(null);
			};
			reader.readAsDataURL(file);
		}
	};

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting }
	} = useForm<ProfileFormData>({
		resolver: zodResolver(createProfileSchema(t))
	});

	const onSubmit = async (data: ProfileFormData) => {
		try {
			// Merge skills into form data
			const formDataWithSkills = { ...data, skills };
			// Implement API call to save profile data
			// await updateProfile(formDataWithSkills);
			// Show success message
			alert(`${t('PROFILE_UPDATED')} (demo mode): ${JSON.stringify(formDataWithSkills)}`);
		} catch (error) {
			console.error('Error updating profile:', error);
			// Show error message
			alert(t('ERROR_UPDATING_PROFILE'));
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<Container maxWidth="7xl" padding="default">
				<div className="space-y-8 py-8">
					{/* Header */}
					<div className="flex items-center gap-4">
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-4 h-4" />
							{t('BACK_TO_SETTINGS')}
						</Link>
					</div>

					<div className="text-center space-y-4">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/40 rounded-2xl mb-4">
							<FiUser className="w-8 h-8 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
							{t('BASIC_INFO_TITLE')}
						</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
							{t('BASIC_INFO_DESCRIPTION')}
						</p>
					</div>

					{/* Form */}
					<Card className="border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg max-w-3xl mx-auto">
						<CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
							<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<FiUser className="w-5 h-5 text-theme-primary-500" />
								{t('PERSONAL_INFORMATION')}
							</CardTitle>
							<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
								{t('PERSONAL_INFO_DESCRIPTION')}
							</p>
						</CardHeader>
						<CardContent>
							<form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
								{/* Avatar Upload */}
								<div className="flex flex-col items-center gap-4">
									<div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
										{avatarPreview ? (
											<Image
												src={avatarPreview}
												alt="Avatar preview"
												className="w-full h-full object-cover"
												fill
												unoptimized
												sizes="96px"
												priority
											/>
										) : (
											<FiUser className="w-12 h-12 text-gray-400" />
										)}
									</div>
									<label
										htmlFor="avatar"
										className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg cursor-pointer transition-colors"
									>
										<FiUpload className="w-4 h-4" />
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
									<p className="text-xs text-gray-500 dark:text-gray-400">{t('AVATAR_FILE_TYPES')}</p>
								</div>

								{/* Name & Username */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
									<div className="space-y-4">
										<label
											htmlFor="displayName"
											className="block font-semibold text-gray-800 dark:text-gray-100 mb-1"
										>
											{t('DISPLAY_NAME')}
										</label>
										<input
											id="displayName"
											type="text"
											placeholder={t('DISPLAY_NAME_PLACEHOLDER')}
											className="w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:theme-primary:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
											{...register('displayName')}
											defaultValue={session.user?.name || ''}
										/>
										{errors.displayName && (
											<p className="text-red-500 text-sm mt-1">{errors.displayName.message}</p>
										)}
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{t('DISPLAY_NAME_HELP')}
										</p>
									</div>
									<div className="space-y-4">
										<label
											htmlFor="username"
											className="block font-semibold text-gray-800 dark:text-gray-100 mb-1"
										>
											{t('USERNAME')}
										</label>
										<input
											id="username"
											type="text"
											defaultValue={session.user?.name?.toLowerCase().replace(/\s+/g, '') || ''}
											placeholder={t('USERNAME_PLACEHOLDER')}
											className="w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:theme-primary:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
											{...register('username')}
										/>
										{errors.username && (
											<p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
										)}
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{t('USERNAME_HELP')}
										</p>
									</div>
								</div>

								{/* Bio */}
								<div className="space-y-4">
									<label
										htmlFor="bio"
										className="block font-semibold text-gray-800 dark:text-gray-100 mb-1"
									>
										{t('BIO')}
									</label>
									<textarea
										id="bio"
										rows={4}
										placeholder={t('BIO_PLACEHOLDER')}
										className="w-full px-6 py-4 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 hover:border-gray-300 dark:hover:border-gray-500 resize-none outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
										{...register('bio')}
										defaultValue="Full-stack developer passionate about creating amazing web experiences. I love working with React, TypeScript, and modern web technologies."
									/>
									{errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>}
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('BIO_HELP')}</p>
								</div>

								{/* Advanced Skills Editor */}
								<SkillsEditor initialSkills={skills} onChange={setSkills} />

								{/* Interests */}
								<div className="space-y-4">
									<label
										htmlFor="interests"
										className="block font-semibold text-gray-800 dark:text-gray-100 mb-1"
									>
										{t('INTERESTS')}
									</label>
									<input
										id="interests"
										type="text"
										placeholder={t('INTERESTS_PLACEHOLDER')}
										className="w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:theme-primary:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
										{...register('interests')}
									/>
									{errors.interests && (
										<p className="text-red-500 text-sm mt-1">{errors.interests.message}</p>
									)}
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{t('INTERESTS_HELP')}
									</p>
								</div>

								{/* Divider */}
								<div className="border-t border-gray-100 dark:border-gray-800" />

								{/* Location, Company, Job Title, Website */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
									<div className="space-y-4">
										<label
											htmlFor="location"
											className="font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1"
										>
											<FiMapPin className="w-4 h-4" />
											{t('LOCATION')}
										</label>
										<input
											id="location"
											type="text"
											placeholder={t('LOCATION_PLACEHOLDER')}
											className="w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:theme-primary:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
											{...register('location')}
											defaultValue="" // TODO: Use real user data from session or database
										/>
										{errors.location && (
											<p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
										)}
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{t('LOCATION_HELP')}
										</p>
									</div>
									<div className="space-y-4">
										<label
											htmlFor="company"
											className="font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1"
										>
											<FiBriefcase className="w-4 h-4" />
											{t('COMPANY')}
										</label>
										<input
											id="company"
											type="text"
											placeholder={t('COMPANY_PLACEHOLDER')}
											className="w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:theme-primary:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
											{...register('company')}
											defaultValue="" // TODO: Use real user data from session or database
										/>
										{errors.company && (
											<p className="text-red-500 text-sm mt-1">{errors.company.message}</p>
										)}
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{t('COMPANY_HELP')}
										</p>
									</div>
									<div className="space-y-4">
										<label
											htmlFor="jobTitle"
											className="block font-semibold text-gray-800 dark:text-gray-100 mb-1"
										>
											{t('JOB_TITLE')}
										</label>
										<input
											id="jobTitle"
											type="text"
											placeholder={t('JOB_TITLE_PLACEHOLDER')}
											className="w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:theme-primary:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
											{...register('jobTitle')}
											defaultValue="" // TODO: Use real user data from session or database
										/>
										{errors.jobTitle && (
											<p className="text-red-500 text-sm mt-1">{errors.jobTitle.message}</p>
										)}
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{t('JOB_TITLE_HELP')}
										</p>
									</div>
									<div className="space-y-4">
										<label
											htmlFor="website"
											className="font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1"
										>
											<FiGlobe className="w-4 h-4" />
											{t('WEBSITE')}
										</label>
										<input
											id="website"
											type="url"
											placeholder={t('WEBSITE_PLACEHOLDER')}
											className="w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:theme-primary:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
											{...register('website')}
											defaultValue="" // TODO: Use real user data from session or database
										/>
										{errors.website && (
											<p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
										)}
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{t('WEBSITE_HELP')}
										</p>
									</div>
								</div>

								{/* Actions */}
								<div className="pt-8 border-t border-gray-100 dark:border-gray-800">
									<div className="flex flex-col md:flex-row justify-end gap-4 mt-4">
										<Link
											href="/client/settings/profile"
											className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-center md:text-left"
										>
											{t('CANCEL')}
										</Link>
										<Button
											type="submit"
											className="inline-flex items-center gap-2 px-6 py-2 text-base font-semibold bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-md transition-colors shadow-md w-full md:w-auto justify-center"
											disabled={isSubmitting}
										>
											{isSubmitting ? t('SAVING') : t('SAVE_CHANGES')}
										</Button>
									</div>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</Container>
		</div>
	);
}
