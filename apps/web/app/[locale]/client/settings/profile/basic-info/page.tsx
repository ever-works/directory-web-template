'use client';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { FiUser, FiArrowLeft, FiUpload, FiPlus, FiTrash2, FiX, FiCheck, FiZoomIn, FiEdit2 } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '@/hooks/use-current-user';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';

// ─── Cover presets ────────────────────────────────────────────────────────────

const COVER_PRESETS = [
	{ id: 'default', label: 'Default',  css: '' },
	{ id: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg,#1e1b4b,#3730a3)' },
	{ id: 'ocean',    label: 'Ocean',    css: 'linear-gradient(135deg,#0369a1,#38bdf8)' },
	{ id: 'forest',   label: 'Forest',   css: 'linear-gradient(135deg,#14532d,#4ade80)' },
	{ id: 'sunset',   label: 'Sunset',   css: 'linear-gradient(135deg,#c2410c,#fbbf24)' },
	{ id: 'rose',     label: 'Rose',     css: 'linear-gradient(135deg,#9f1239,#fb7185)' },
	{ id: 'slate',    label: 'Slate',    css: 'linear-gradient(135deg,#334155,#94a3b8)' },
	{ id: 'violet',   label: 'Violet',   css: 'linear-gradient(135deg,#5b21b6,#c4b5fd)' },
	{ id: 'amber',    label: 'Amber',    css: 'linear-gradient(135deg,#92400e,#fcd34d)' },
	{ id: 'teal',     label: 'Teal',     css: 'linear-gradient(135deg,#134e4a,#5eead4)' },
] as const;

type CoverPresetId = (typeof COVER_PRESETS)[number]['id'];

function getCoverBackground(id: string) {
	const preset = COVER_PRESETS.find((p) => p.id === id);
	return preset?.css || 'linear-gradient(135deg, var(--theme-primary, #6366f1) 0%, var(--theme-secondary, #a5b4fc) 100%)';
}

// ─── Skill types ──────────────────────────────────────────────────────────────

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
	coverColor: string;
}

// ─── Style constants ──────────────────────────────────────────────────────────

const INPUT_CLASS =
	'w-full h-9 px-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150';

const LABEL_CLASS = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5';
const HELP_CLASS = 'text-xs text-neutral-400 dark:text-neutral-500 mt-1';

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm animate-pulse divide-y divide-neutral-100 dark:divide-white/6">
			<div className="p-6 flex items-center gap-4">
				<div className="w-16 h-16 rounded-xl bg-neutral-200 dark:bg-white/10 shrink-0" />
				<div className="space-y-2">
					<div className="h-7 w-28 rounded-lg bg-neutral-200 dark:bg-white/10" />
					<div className="h-3.5 w-40 rounded bg-neutral-200 dark:bg-white/10" />
				</div>
			</div>
			<div className="p-6 space-y-3">
				<div className="h-3 w-20 rounded bg-neutral-200 dark:bg-white/10" />
				<div className="h-16 rounded-lg bg-neutral-200 dark:bg-white/10" />
			</div>
			<div className="p-6 space-y-4">
				<div className="h-3 w-12 rounded bg-neutral-200 dark:bg-white/10" />
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{[1, 2].map((i) => (
						<div key={i} className="space-y-1.5">
							<div className="h-3 w-24 rounded bg-neutral-200 dark:bg-white/10" />
							<div className="h-9 rounded-lg bg-neutral-200 dark:bg-white/10" />
						</div>
					))}
				</div>
				<div className="space-y-1.5">
					<div className="h-3 w-8 rounded bg-neutral-200 dark:bg-white/10" />
					<div className="h-20 rounded-lg bg-neutral-200 dark:bg-white/10" />
				</div>
			</div>
			<div className="p-6 space-y-3">
				<div className="h-3 w-10 rounded bg-neutral-200 dark:bg-white/10" />
				<div className="h-18 rounded-lg bg-neutral-200 dark:bg-white/10" />
			</div>
			<div className="p-6 space-y-4">
				<div className="h-3 w-28 rounded bg-neutral-200 dark:bg-white/10" />
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-1.5">
							<div className="h-3 w-20 rounded bg-neutral-200 dark:bg-white/10" />
							<div className="h-9 rounded-lg bg-neutral-200 dark:bg-white/10" />
						</div>
					))}
				</div>
			</div>
			<div className="px-6 py-4 flex items-center justify-end gap-3 bg-neutral-50 dark:bg-white/2 rounded-b-xl">
				<div className="h-9 w-16 rounded-lg bg-neutral-200 dark:bg-white/10" />
				<div className="h-9 w-28 rounded-lg bg-neutral-200 dark:bg-white/10" />
			</div>
		</div>
	);
}

// ─── Image crop modal ─────────────────────────────────────────────────────────

const VIEWPORT = 320;
const CROP_D   = 220;

function ImageCropModal({
	src,
	onClose,
	onApply
}: {
	src: string;
	onClose: () => void;
	onApply: (dataUrl: string) => void;
}) {
	const t = useTranslations('profile');
	const imgRef  = useRef<HTMLImageElement>(null);
	const [loaded, setLoaded] = useState(false);
	const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [dragging, setDragging] = useState(false);
	const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

	const handleImgLoad = () => {
		const img = imgRef.current!;
		setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
		setLoaded(true);
	};

	// base scale: at zoom=1, shorter side fills the crop circle
	const baseScale = CROP_D / Math.min(naturalSize.w, naturalSize.h);
	const displayScale = baseScale * zoom;

	const onMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		setDragging(true);
		dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
	};
	const onMouseMove = (e: React.MouseEvent) => {
		if (!dragging) return;
		const dx = e.clientX - dragOrigin.current.mx;
		const dy = e.clientY - dragOrigin.current.my;
		setPan({ x: dragOrigin.current.px + dx, y: dragOrigin.current.py + dy });
	};
	const onMouseUp = () => setDragging(false);

	const onTouchStart = (e: React.TouchEvent) => {
		const t = e.touches[0];
		dragOrigin.current = { mx: t.clientX, my: t.clientY, px: pan.x, py: pan.y };
		setDragging(true);
	};
	const onTouchMove = (e: React.TouchEvent) => {
		if (!dragging) return;
		const touch = e.touches[0];
		const dx = touch.clientX - dragOrigin.current.mx;
		const dy = touch.clientY - dragOrigin.current.my;
		setPan({ x: dragOrigin.current.px + dx, y: dragOrigin.current.py + dy });
	};

	const onWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		setZoom((z) => Math.min(3, Math.max(1, z - e.deltaY * 0.003)));
	};

	const handleApply = () => {
		const img = imgRef.current!;
		const OUTPUT = 256;
		const canvas = document.createElement('canvas');
		canvas.width  = OUTPUT;
		canvas.height = OUTPUT;
		const ctx = canvas.getContext('2d')!;

		// Image centre in viewport coords
		const imgLeft = VIEWPORT / 2 + pan.x - naturalSize.w * displayScale / 2;
		const imgTop  = VIEWPORT / 2 + pan.y - naturalSize.h * displayScale / 2;

		// Crop square top-left in viewport coords
		const cropLeft = (VIEWPORT - CROP_D) / 2;
		const cropTop  = (VIEWPORT - CROP_D) / 2;

		// Source region in natural image pixels
		const srcX    = (cropLeft - imgLeft) / displayScale;
		const srcY    = (cropTop  - imgTop)  / displayScale;
		const srcSize = CROP_D / displayScale;

		// Draw circular clip
		ctx.beginPath();
		ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
		ctx.clip();
		ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);

		onApply(canvas.toDataURL('image/jpeg', 0.92));
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
			onMouseUp={onMouseUp}
			onMouseLeave={onMouseUp}
		>
			<div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/8">
					<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
						{t('ADJUST_PHOTO')}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all"
					>
						<FiX className="w-4 h-4" />
					</button>
				</div>

				{/* Viewport */}
				<div className="px-5 pt-5">
					<div
						className="relative mx-auto overflow-hidden rounded-xl bg-neutral-900 select-none"
						style={{ width: VIEWPORT, height: VIEWPORT, cursor: dragging ? 'grabbing' : 'grab' }}
						onMouseDown={onMouseDown}
						onMouseMove={onMouseMove}
						onTouchStart={onTouchStart}
						onTouchMove={onTouchMove}
						onTouchEnd={() => setDragging(false)}
						onWheel={onWheel}
					>
						{/* Actual image */}
						<img
							ref={imgRef}
							src={src}
							alt=""
							onLoad={handleImgLoad}
							draggable={false}
							style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${displayScale})`,
								transformOrigin: 'center',
								pointerEvents: 'none',
								opacity: loaded ? 1 : 0,
								transition: 'opacity 0.15s',
							}}
						/>

						{/* Circular crop overlay */}
						<svg
							className="absolute inset-0 pointer-events-none"
							width={VIEWPORT}
							height={VIEWPORT}
						>
							<defs>
								<mask id="crop-mask">
									<rect width={VIEWPORT} height={VIEWPORT} fill="white" />
									<circle
										cx={VIEWPORT / 2}
										cy={VIEWPORT / 2}
										r={CROP_D / 2}
										fill="black"
									/>
								</mask>
							</defs>
							<rect
								width={VIEWPORT}
								height={VIEWPORT}
								fill="rgba(0,0,0,0.55)"
								mask="url(#crop-mask)"
							/>
							<circle
								cx={VIEWPORT / 2}
								cy={VIEWPORT / 2}
								r={CROP_D / 2}
								fill="none"
								stroke="white"
								strokeWidth="2"
							/>
						</svg>
					</div>

					{/* Hint */}
					<p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-2 mb-1">
						{t('DRAG_TO_REPOSITION')}
					</p>
				</div>

				{/* Zoom slider */}
				<div className="px-5 pb-2 flex items-center gap-3 mt-1">
					<FiZoomIn className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
					<input
						type="range"
						min={1}
						max={3}
						step={0.01}
						value={zoom}
						onChange={(e) => setZoom(Number(e.target.value))}
						className="flex-1 h-1.5 appearance-none rounded-full bg-neutral-200 dark:bg-white/10 accent-theme-primary-600 cursor-pointer"
					/>
					<span className="text-xs tabular-nums text-neutral-500 w-8 text-right">
						{zoom.toFixed(1)}×
					</span>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-100 dark:border-white/8">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
					>
						{t('CANCEL')}
					</button>
					<button
						type="button"
						onClick={handleApply}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg transition-colors"
					>
						<FiCheck className="w-3.5 h-3.5" />
						{t('APPLY')}
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Skills editor ────────────────────────────────────────────────────────────

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
		if (field === 'name' && errors[idx]) setErrors((prev) => ({ ...prev, [idx]: '' }));
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

	const addSkill = () =>
		setSkills((prev) => {
			const updated: Skill[] = [...prev, { name: '', category: 'Frontend', proficiency: 70 }];
			onChange(updated);
			return updated;
		});

	const removeSkill = (idx: number) => {
		if (skills.length <= 1) return;
		setSkills((prev) => {
			const updated = prev.filter((_, i) => i !== idx);
			onChange(updated);
			return updated;
		});
		setErrors((prev) => { const n = { ...prev }; delete n[idx]; return n; });
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{t('SKILLS')}</p>
				<span className="text-xs text-neutral-400 dark:text-neutral-500">
					{t('SKILLS_COUNT', { count: skills.length })}
				</span>
			</div>

			<div className="space-y-2">
				{skills.map((skill, idx) => (
					<div
						key={idx}
						className="p-3 bg-neutral-50 dark:bg-white/3 rounded-lg border border-neutral-200 dark:border-white/8 space-y-2.5"
					>
						<div className="flex gap-2">
							<div className="min-w-0 flex-1">
								<input
									type="text"
									placeholder={t('SKILL_NAME_PLACEHOLDER')}
									value={skill.name}
									onChange={(e) => handleSkillChange(idx, 'name', e.target.value)}
									onBlur={() => validateSkill(idx, skill.name)}
									className={INPUT_CLASS + (errors[idx] ? ' border-red-400 focus:border-red-400 focus:ring-red-400/20' : '')}
								/>
								{errors[idx] && <p className="text-red-500 text-xs mt-1">{errors[idx]}</p>}
							</div>
							<button
								type="button"
								onClick={() => removeSkill(idx)}
								disabled={skills.length === 1}
								className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 self-start mt-0.5 shrink-0"
								title={t('REMOVE_SKILL')}
							>
								<FiTrash2 className="w-3.5 h-3.5" />
							</button>
						</div>
						<div className="flex items-center gap-3">
							<select
								value={skill.category}
								onChange={(e) => handleSkillChange(idx, 'category', e.target.value)}
								className="h-9 px-2.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 transition-all duration-150 cursor-pointer shrink-0"
							>
								{SKILL_CATEGORIES.map((cat) => (
									<option key={cat} value={cat}>{cat}</option>
								))}
							</select>
							<div className="flex items-center gap-2 flex-1">
								<input
									type="range"
									min={0}
									max={100}
									step={5}
									value={skill.proficiency}
									onChange={(e) => handleSkillChange(idx, 'proficiency', Number(e.target.value))}
									className="flex-1 h-1.5 appearance-none rounded-full bg-neutral-200 dark:bg-white/10 cursor-pointer accent-theme-primary-600"
								/>
								<span className="w-9 text-right text-xs font-medium text-neutral-600 dark:text-neutral-300 tabular-nums shrink-0">
									{skill.proficiency}%
								</span>
							</div>
						</div>
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

// ─── Zod schema ───────────────────────────────────────────────────────────────

const createProfileSchema = (t: ReturnType<typeof useTranslations<'profile'>>) =>
	z.object({
		displayName: z.string().min(1, t('DISPLAY_NAME_REQUIRED')).max(100),
		username:    z.string().min(3, t('USERNAME_MIN_LENGTH')).max(50),
		bio:         z.string().max(500, t('BIO_MAX_LENGTH')),
		location:    z.string().max(100),
		company:     z.string().max(100),
		jobTitle:    z.string().max(100),
		website:     z.union([z.literal(''), z.string().url({ message: t('INVALID_URL') })]),
		interests:   z.string().max(200),
		skills: z
			.array(
				z.object({
					name:        z.string().min(1, t('SKILL_NAME_REQUIRED')),
					category:    z.enum(['Frontend', 'Backend', 'Tools & Frameworks', 'Other']),
					proficiency: z.number().min(0).max(100)
				})
			)
			.optional()
	});

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BasicInfoPage() {
	const t = useTranslations('profile');
	const { isLoading: isUserLoading } = useCurrentUser();
	const queryClient = useQueryClient();

	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [skills, setSkills]               = useState<Skill[]>([]);
	const [coverColor, setCoverColor]       = useState<string>('default');
	const [isLoadingProfile, setIsLoadingProfile] = useState(true);
	const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
	const [initialDisplayName, setInitialDisplayName] = useState('');
	const [profileUsername, setProfileUsername] = useState('');

	// Image crop modal state
	const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
	const [showCropper, setShowCropper] = useState(false);

	// ── Avatar file input ──────────────────────────────────────────────────────
	const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		// Reset input so same file can be re-selected after cancel
		event.target.value = '';
		if (!file) return;

		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			toast.error(t('INVALID_IMAGE_FILE'));
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toast.error(t('FILE_SIZE_TOO_LARGE'));
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			setRawImageSrc(e.target?.result as string);
			setShowCropper(true);
		};
		reader.onerror = () => toast.error(t('ERROR_READING_FILE'));
		reader.readAsDataURL(file);
	};

	// ── Form ───────────────────────────────────────────────────────────────────
	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors, isSubmitting }
	} = useForm<ProfileFormData>({
		resolver: zodResolver(createProfileSchema(t)),
		defaultValues: {
			displayName: '',
			username:    '',
			bio:         '',
			location:    '',
			company:     '',
			jobTitle:    '',
			website:     '',
			interests:   ''
		}
	});

	const bioValue = watch('bio', '');

	// ── Load profile ───────────────────────────────────────────────────────────
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
				username:    profile.username,
				bio:         profile.bio,
				location:    profile.location,
				company:     profile.company,
				jobTitle:    profile.jobTitle,
				website:     profile.website,
				interests:   profile.interests
			});
			setInitialDisplayName(profile.displayName ?? '');
			setProfileUsername(profile.username ?? '');
			if (profile.skills?.length) setSkills(profile.skills);
			if (profile.coverColor) setCoverColor(profile.coverColor);
			if (profile.avatar) {
				setAvatarPreview(profile.avatar);
				setInitialAvatar(profile.avatar);
			}
			setIsLoadingProfile(false);
		}
		void load();
		return () => { cancelled = true; };
	}, [reset]);

	// ── Submit ─────────────────────────────────────────────────────────────────
	const onSubmit = async (data: ProfileFormData) => {
		try {
			const validSkills = (data.skills ?? skills).filter((s) => s.name.trim().length > 0);
			const payload = {
				displayName: data.displayName,
				username:    data.username,
				bio:         data.bio,
				jobTitle:    data.jobTitle,
				company:     data.company,
				location:    data.location,
				website:     data.website,
				interests:   data.interests,
				skills:      validSkills,
				coverColor:  coverColor === 'default' ? null : coverColor,
				...(avatarPreview ? { avatar: avatarPreview } : {})
			};

			const response = await serverClient.patch<SavedProfile>('/api/user/profile', payload);
			if (!apiUtils.isSuccess(response)) {
				toast.error(apiUtils.getErrorMessage(response) || t('ERROR_UPDATING_PROFILE'));
				return;
			}

			const avatarChanged      = avatarPreview !== initialAvatar;
			const displayNameChanged = (data.displayName ?? '') !== initialDisplayName;
			if (avatarChanged || displayNameChanged) {
				if (avatarChanged)      setInitialAvatar(avatarPreview);
				if (displayNameChanged) setInitialDisplayName(data.displayName ?? '');
				await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
			}
			toast.success(t('PROFILE_UPDATED'));
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error(t('ERROR_UPDATING_PROFILE'));
		}
	};

	// ── Render ─────────────────────────────────────────────────────────────────
	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
			{showCropper && rawImageSrc && (
				<ImageCropModal
					src={rawImageSrc}
					onClose={() => setShowCropper(false)}
					onApply={(dataUrl) => {
						setAvatarPreview(dataUrl);
						setShowCropper(false);
					}}
				/>
			)}

			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Page header */}
					<div className="space-y-2">
						<Link
							href={profileUsername ? `/client/profile/${profileUsername}` : '/client/profile'}
							className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors duration-150"
						>
							<FiArrowLeft className="w-3.5 h-3.5" />
							{t('BACK_TO_PROFILE')}
						</Link>
						<div>
							<h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
								{t('BASIC_INFO_TITLE')}
							</h1>
							<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
								{t('BASIC_INFO_DESCRIPTION')}
							</p>
						</div>
					</div>

					{isLoadingProfile ? (
						<ProfileSkeleton />
					) : (
						<form
							className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6"
							onSubmit={handleSubmit(onSubmit)}
						>
							{/* ── Profile Photo ── */}
							<div className="p-6 space-y-4">
								<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
									{t('PROFILE_PHOTO')}
								</p>

								{/* Mini profile preview card — cover fills the full card */}
								<div
									className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-white/10 h-36 transition-all duration-300"
									style={{ background: getCoverBackground(coverColor) }}
								>
									{/* Noise texture */}
									<div
										className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
										style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
									/>

									{/* Avatar + upload anchored to bottom */}
									<div className="absolute bottom-0 inset-x-0 px-4 pb-3 flex items-end gap-4">
										<div className="relative z-10 w-16 h-16 rounded-xl overflow-hidden bg-white/10 shrink-0 flex items-center justify-center ring-2 ring-white/40">
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
												<FiUser className="w-7 h-7 text-white/70" />
											)}
											{avatarPreview && (
												<label
													htmlFor="avatar"
													className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-xl"
													title={t('UPLOAD_AVATAR')}
												>
													<FiEdit2 className="w-5 h-5 text-white" />
												</label>
											)}
										</div>
										<div className="pb-1 space-y-1">
											<label
												htmlFor="avatar"
												className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/25 rounded-lg cursor-pointer transition-all duration-150"
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
											<p className="text-xs text-white/60">{t('AVATAR_FILE_TYPES')}</p>
										</div>
									</div>
								</div>

								{/* Cover color swatches */}
								<div className="space-y-2">
									<p className={LABEL_CLASS}>{t('COVER_STYLE')}</p>
									<div className="flex flex-wrap gap-2">
										{COVER_PRESETS.map((preset) => (
											<button
												key={preset.id}
												type="button"
												onClick={() => setCoverColor(preset.id)}
												title={preset.label}
												className={`relative w-10 h-6 rounded-md overflow-hidden ring-2 transition-all duration-150 ${
													coverColor === preset.id
														? 'ring-theme-primary-500 scale-110 shadow-md'
														: 'ring-neutral-200 dark:ring-white/10 hover:ring-neutral-400 dark:hover:ring-white/30'
												}`}
												style={{
													background: preset.css || 'linear-gradient(135deg, var(--theme-primary, #6366f1) 0%, var(--theme-secondary, #a5b4fc) 100%)'
												}}
											>
												{coverColor === preset.id && (
													<span className="absolute inset-0 flex items-center justify-center">
														<FiCheck className="w-3 h-3 text-white drop-shadow" />
													</span>
												)}
											</button>
										))}
									</div>
								</div>
							</div>

							{/* ── Identity ── */}
							<div className="p-6 space-y-4">
								<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
									{t('IDENTITY_SECTION')}
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
										<p className={HELP_CLASS}>{t('DISPLAY_NAME_HELP')}</p>
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
										<p className={HELP_CLASS}>{t('USERNAME_HELP')}</p>
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
									<div className="flex items-center justify-between mt-1">
										<p className="text-xs text-neutral-400 dark:text-neutral-500">{t('BIO_HELP')}</p>
										<span
											className={`text-xs tabular-nums ${
												bioValue.length >= 500
													? 'text-red-500 font-medium'
													: bioValue.length > 450
													? 'text-amber-500'
													: 'text-neutral-400 dark:text-neutral-500'
											}`}
										>
											{bioValue.length}/500
										</span>
									</div>
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
									<p className={HELP_CLASS}>{t('INTERESTS_HELP')}</p>
								</div>
							</div>

							{/* ── Skills ── */}
							<div className="p-6">
								<SkillsEditor initialSkills={skills} onChange={setSkills} />
							</div>

							{/* ── Professional info ── */}
							<div className="p-6 space-y-4">
								<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
									{t('PROFESSIONAL_INFO_SECTION')}
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
										<p className={HELP_CLASS}>{t('JOB_TITLE_HELP')}</p>
									</div>
									<div>
										<label htmlFor="company" className={LABEL_CLASS}>
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
										<p className={HELP_CLASS}>{t('COMPANY_HELP')}</p>
									</div>
									<div>
										<label htmlFor="location" className={LABEL_CLASS}>
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
										<p className={HELP_CLASS}>{t('LOCATION_HELP')}</p>
									</div>
									<div>
										<label htmlFor="website" className={LABEL_CLASS}>
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
										<p className={HELP_CLASS}>{t('WEBSITE_HELP')}</p>
									</div>
								</div>
							</div>

							{/* ── Actions ── */}
							<div className="px-6 py-4 flex items-center justify-end gap-3 bg-neutral-50 dark:bg-white/2 rounded-b-xl">
								<Link
									href={profileUsername ? `/client/profile/${profileUsername}` : '/client/profile'}
									className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-150"
								>
									{t('CANCEL')}
								</Link>
								<Button
									type="submit"
									disabled={isSubmitting || isUserLoading}
									className="px-4 py-2 text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg transition-colors duration-150 disabled:opacity-60"
								>
									{isSubmitting ? t('SAVING') : t('SAVE_CHANGES')}
								</Button>
							</div>
						</form>
					)}
				</div>
			</Container>
		</div>
	);
}
