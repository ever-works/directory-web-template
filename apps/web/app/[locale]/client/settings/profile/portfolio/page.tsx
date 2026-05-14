'use client';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { FiBriefcase, FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiStar, FiExternalLink, FiX } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';

interface PortfolioProject {
	id: string;
	title: string;
	description: string;
	imageUrl: string;
	externalUrl: string;
	tags: string[];
	isFeatured: boolean;
}

interface PortfolioListResponse {
	projects: Array<{
		id: string;
		title: string;
		description: string;
		imageUrl: string;
		externalUrl: string;
		tags: string[] | null;
		isFeatured: boolean | null;
	}>;
}

interface PortfolioMutationResponse {
	project: PortfolioListResponse['projects'][number];
}

const normalize = (raw: PortfolioListResponse['projects'][number]): PortfolioProject => ({
	id: raw.id,
	title: raw.title,
	description: raw.description,
	imageUrl: raw.imageUrl,
	externalUrl: raw.externalUrl,
	tags: raw.tags ?? [],
	isFeatured: !!raw.isFeatured
});

const INPUT_CLASS =
	'w-full h-9 px-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150';

const LABEL_CLASS = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5';

function ProjectsSkeleton() {
	return (
		<div className="space-y-3 animate-pulse">
			{[1, 2].map((i) => (
				<div
					key={i}
					className="flex items-start gap-3 p-3 border border-neutral-100 dark:border-white/6 rounded-lg"
				>
					<div className="w-14 h-14 rounded-lg bg-neutral-200 dark:bg-white/10 shrink-0" />
					<div className="flex-1 space-y-2 pt-1">
						<div className="h-3.5 w-36 rounded bg-neutral-200 dark:bg-white/10" />
						<div className="h-3 w-56 rounded bg-neutral-200 dark:bg-white/10" />
						<div className="flex gap-1.5">
							<div className="h-5 w-14 rounded-full bg-neutral-200 dark:bg-white/10" />
							<div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-white/10" />
						</div>
					</div>
					<div className="flex gap-1 shrink-0">
						<div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-white/10" />
						<div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-white/10" />
					</div>
				</div>
			))}
		</div>
	);
}

export default function PortfolioPage() {
	const t = useTranslations('settings.PORTFOLIO_PAGE');
	const [projects, setProjects] = useState<PortfolioProject[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const [title, setTitle] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [description, setDescription] = useState('');
	const [externalUrl, setExternalUrl] = useState('');
	const [tags, setTags] = useState('');
	const [isFeatured, setIsFeatured] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});

	const isValidUrl = (url: string) => {
		try { new URL(url); return true; } catch { return false; }
	};

	const validate = () => {
		const e: { [key: string]: string } = {};
		if (!title.trim()) e.title = t('VALIDATION.TITLE_REQUIRED');
		if (!imageUrl.trim()) e.imageUrl = t('VALIDATION.IMAGE_URL_REQUIRED');
		else if (!isValidUrl(imageUrl.trim())) e.imageUrl = t('VALIDATION.IMAGE_URL_INVALID');
		if (!description.trim()) e.description = t('VALIDATION.DESCRIPTION_REQUIRED');
		if (!externalUrl.trim()) e.externalUrl = t('VALIDATION.PROJECT_URL_REQUIRED');
		else if (!isValidUrl(externalUrl.trim())) e.externalUrl = t('VALIDATION.PROJECT_URL_INVALID');
		return e;
	};

	const resetForm = () => {
		setTitle('');
		setImageUrl('');
		setDescription('');
		setExternalUrl('');
		setTags('');
		setIsFeatured(false);
		setErrors({});
		setEditingProjectId(null);
	};

	useEffect(() => {
		let cancelled = false;
		async function load() {
			const response = await serverClient.get<PortfolioListResponse>('/api/user/profile/portfolio');
			if (cancelled) return;
			if (!apiUtils.isSuccess(response) || !response.data) { setIsLoading(false); return; }
			setProjects(response.data.projects.map(normalize));
			setIsLoading(false);
		}
		void load();
		return () => { cancelled = true; };
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const validationErrors = validate();
		setErrors(validationErrors);
		if (Object.keys(validationErrors).length > 0) return;

		const payload = {
			title: title.trim(),
			imageUrl: imageUrl.trim(),
			description: description.trim(),
			externalUrl: externalUrl.trim(),
			tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
			isFeatured
		};

		setIsSaving(true);
		try {
			if (editingProjectId) {
				const response = await serverClient.patch<PortfolioMutationResponse>(
					`/api/user/profile/portfolio/${editingProjectId}`,
					payload
				);
				if (!apiUtils.isSuccess(response) || !response.data) {
					toast.error(apiUtils.getErrorMessage(response) || 'Failed to update project');
					return;
				}
				const updated = normalize(response.data.project);
				setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
				toast.success('Project updated');
			} else {
				const response = await serverClient.post<PortfolioMutationResponse>(
					'/api/user/profile/portfolio',
					payload
				);
				if (!apiUtils.isSuccess(response) || !response.data) {
					toast.error(apiUtils.getErrorMessage(response) || 'Failed to create project');
					return;
				}
				const created = normalize(response.data.project);
				setProjects((prev) => [created, ...prev]);
				toast.success(t('SUCCESS.PROJECT_ADDED'));
			}
			resetForm();
		} finally {
			setIsSaving(false);
		}
	};

	const handleEditProject = (project: PortfolioProject) => {
		setEditingProjectId(project.id);
		setTitle(project.title);
		setImageUrl(project.imageUrl);
		setDescription(project.description);
		setExternalUrl(project.externalUrl);
		setTags(project.tags.join(', '));
		setIsFeatured(project.isFeatured);
		setErrors({});
	};

	const handleDeleteProject = async (projectId: string) => {
		const response = await serverClient.delete<{ success: true }>(`/api/user/profile/portfolio/${projectId}`);
		if (!apiUtils.isSuccess(response)) {
			toast.error(apiUtils.getErrorMessage(response) || 'Failed to delete project');
			return;
		}
		setProjects((prev) => prev.filter((p) => p.id !== projectId));
		if (editingProjectId === projectId) resetForm();
		setConfirmDeleteId(null);
		toast.success('Project deleted');
	};

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Page header */}
					<div className="space-y-2">
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors duration-150"
						>
							<FiArrowLeft className="w-3.5 h-3.5" />
							{t('BACK_TO_SETTINGS')}
						</Link>
						<div>
							<h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
								{t('TITLE')}
							</h1>
							<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
								{t('DESCRIPTION')}
							</p>
						</div>
					</div>

					{/* Main card */}
					<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6">
						{/* ── Form section ── */}
						<form onSubmit={handleSubmit} noValidate>
							<div className="p-6 space-y-4">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide flex items-center gap-2">
										{editingProjectId ? (
											<>
												<FiEdit2 className="w-3.5 h-3.5 text-theme-primary-500" />
												Edit Project
											</>
										) : (
											<>
												<FiPlus className="w-3.5 h-3.5 text-theme-primary-500" />
												{t('ADD_NEW_PROJECT')}
											</>
										)}
									</p>
									{editingProjectId && (
										<button
											type="button"
											onClick={resetForm}
											className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all"
											title="Cancel edit"
										>
											<FiX className="w-3.5 h-3.5" />
										</button>
									)}
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label htmlFor="title" className={LABEL_CLASS}>
											{t('FORM.PROJECT_TITLE')}
										</label>
										<input
											id="title"
											name="title"
											placeholder={t('FORM.PROJECT_TITLE_PLACEHOLDER')}
											className={INPUT_CLASS + (errors.title ? ' border-red-400 focus:border-red-400 focus:ring-red-400/20' : '')}
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											aria-invalid={!!errors.title}
											aria-describedby="title-error"
										/>
										{errors.title && (
											<p className="text-red-500 text-xs mt-1" id="title-error">{errors.title}</p>
										)}
									</div>

									<div>
										<label htmlFor="imageUrl" className={LABEL_CLASS}>
											{t('FORM.IMAGE_URL')}
										</label>
										<input
											id="imageUrl"
											name="imageUrl"
											type="url"
											placeholder={t('FORM.IMAGE_URL_PLACEHOLDER')}
											className={INPUT_CLASS + (errors.imageUrl ? ' border-red-400 focus:border-red-400 focus:ring-red-400/20' : '')}
											value={imageUrl}
											onChange={(e) => setImageUrl(e.target.value)}
											aria-invalid={!!errors.imageUrl}
											aria-describedby="imageUrl-error"
										/>
										{errors.imageUrl && (
											<p className="text-red-500 text-xs mt-1" id="imageUrl-error">{errors.imageUrl}</p>
										)}
									</div>
								</div>

								<div>
									<label htmlFor="description" className={LABEL_CLASS}>
										{t('FORM.DESCRIPTION')}
									</label>
									<textarea
										id="description"
										name="description"
										rows={3}
										placeholder={t('FORM.DESCRIPTION_PLACEHOLDER')}
										className={'w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-neutral-300 dark:hover:border-white/15 resize-none transition-all duration-150' + (errors.description ? ' border-red-400 focus:border-red-400 focus:ring-red-400/20' : '')}
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										aria-invalid={!!errors.description}
										aria-describedby="description-error"
									/>
									{errors.description && (
										<p className="text-red-500 text-xs mt-1" id="description-error">{errors.description}</p>
									)}
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label htmlFor="externalUrl" className={LABEL_CLASS}>
											{t('FORM.PROJECT_URL')}
										</label>
										<input
											id="externalUrl"
											name="externalUrl"
											type="url"
											placeholder={t('FORM.PROJECT_URL_PLACEHOLDER')}
											className={INPUT_CLASS + (errors.externalUrl ? ' border-red-400 focus:border-red-400 focus:ring-red-400/20' : '')}
											value={externalUrl}
											onChange={(e) => setExternalUrl(e.target.value)}
											aria-invalid={!!errors.externalUrl}
											aria-describedby="externalUrl-error"
										/>
										{errors.externalUrl && (
											<p className="text-red-500 text-xs mt-1" id="externalUrl-error">{errors.externalUrl}</p>
										)}
									</div>

									<div>
										<label htmlFor="tags" className={LABEL_CLASS}>
											{t('FORM.TAGS')}
										</label>
										<input
											id="tags"
											name="tags"
											placeholder={t('FORM.TAGS_PLACEHOLDER')}
											className={INPUT_CLASS}
											value={tags}
											onChange={(e) => setTags(e.target.value)}
										/>
										<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
											Comma-separated, e.g. React, TypeScript
										</p>
									</div>
								</div>

								<label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
									<div className="relative">
										<input
											type="checkbox"
											name="isFeatured"
											className="sr-only peer"
											checked={isFeatured}
											onChange={(e) => setIsFeatured(e.target.checked)}
										/>
										<div className="w-9 h-5 rounded-full bg-neutral-200 dark:bg-white/15 peer-checked:bg-theme-primary-500 transition-colors duration-200" />
										<div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4" />
									</div>
									<span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
										{t('FORM.FEATURED_PROJECT')}
									</span>
									<FiStar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
								</label>
							</div>

							<div className="px-6 py-4 flex items-center justify-end gap-3 bg-neutral-50 dark:bg-white/2 rounded-b-none">
								{editingProjectId && (
									<button
										type="button"
										onClick={resetForm}
										disabled={isSaving}
										className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-150 disabled:opacity-50"
									>
										Cancel
									</button>
								)}
								<Button
									type="submit"
									disabled={isSaving}
									className="px-4 py-2 text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg transition-colors duration-150 disabled:opacity-60"
								>
									{isSaving
										? 'Saving…'
										: editingProjectId
										? 'Save changes'
										: t('FORM.ADD_PROJECT')}
								</Button>
							</div>
						</form>

						{/* ── Projects list section ── */}
						<div className="p-6 space-y-4">
							<div className="flex items-center justify-between">
								<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide flex items-center gap-2">
									<FiBriefcase className="w-3.5 h-3.5 text-theme-primary-500" />
									{t('YOUR_PROJECTS')}
								</p>
								{!isLoading && projects.length > 0 && (
									<span className="text-xs text-neutral-400 dark:text-neutral-500">
										{projects.length} {projects.length === 1 ? 'project' : 'projects'}
									</span>
								)}
							</div>

							{isLoading ? (
								<ProjectsSkeleton />
							) : projects.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 rounded-lg border border-dashed border-neutral-200 dark:border-white/10 text-center gap-2">
									<FiBriefcase className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
									<p className="text-sm text-neutral-500 dark:text-neutral-400">No portfolio projects yet.</p>
									<p className="text-xs text-neutral-400 dark:text-neutral-500">Add your first project using the form above.</p>
								</div>
							) : (
								<div className="space-y-2">
									{projects.map((project) => (
										<PortfolioItem
											key={project.id}
											project={project}
											isEditing={editingProjectId === project.id}
											confirmingDelete={confirmDeleteId === project.id}
											onEdit={() => handleEditProject(project)}
											onDeleteRequest={() => setConfirmDeleteId(project.id)}
											onDeleteConfirm={() => handleDeleteProject(project.id)}
											onDeleteCancel={() => setConfirmDeleteId(null)}
										/>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}

interface PortfolioItemProps {
	project: PortfolioProject;
	isEditing: boolean;
	confirmingDelete: boolean;
	onEdit: () => void;
	onDeleteRequest: () => void;
	onDeleteConfirm: () => void;
	onDeleteCancel: () => void;
}

function PortfolioItem({
	project,
	isEditing,
	confirmingDelete,
	onEdit,
	onDeleteRequest,
	onDeleteConfirm,
	onDeleteCancel
}: PortfolioItemProps) {
	const t = useTranslations('settings.PORTFOLIO_PAGE');

	return (
		<div
			className={`flex items-start gap-3 p-3 border rounded-lg transition-all duration-150 ${
				isEditing
					? 'border-theme-primary-200 dark:border-theme-primary-500/30 bg-theme-primary-50/40 dark:bg-theme-primary-500/5'
					: 'border-neutral-100 dark:border-white/6 hover:border-neutral-200 dark:hover:border-white/10 hover:bg-neutral-50/60 dark:hover:bg-white/3'
			}`}
		>
			<div className="shrink-0">
				<ProjectImage imageUrl={project.imageUrl} title={project.title} />
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-start gap-1.5 mb-0.5">
					<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
						{project.title}
					</h3>
					{project.isFeatured && (
						<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full text-xs font-medium shrink-0">
							<FiStar className="w-2.5 h-2.5" />
							{t('PROJECT_ITEM.FEATURED')}
						</span>
					)}
				</div>
				<p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2">
					{project.description}
				</p>
				{project.tags.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{project.tags.map((tag) => (
							<span
								key={tag}
								className="inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-white/6 text-neutral-600 dark:text-neutral-300 rounded-full text-xs"
							>
								{tag}
							</span>
						))}
					</div>
				)}

				{confirmingDelete && (
					<div className="mt-2.5 flex items-center gap-2">
						<span className="text-xs text-neutral-600 dark:text-neutral-300">
							{t('DELETE_CONFIRM', { title: project.title })}
						</span>
						<button
							type="button"
							onClick={onDeleteConfirm}
							className="px-2.5 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={onDeleteCancel}
							className="px-2.5 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors"
						>
							Cancel
						</button>
					</div>
				)}
			</div>

			<div className="flex items-center gap-1 shrink-0 mt-0.5">
				<a
					href={project.externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all"
					title={t('PROJECT_ITEM.VIEW_PROJECT')}
				>
					<FiExternalLink className="w-3.5 h-3.5" />
				</a>
				<button
					type="button"
					onClick={onEdit}
					className={`p-1.5 rounded-lg transition-all ${
						isEditing
							? 'text-theme-primary-600 dark:text-theme-primary-400 bg-theme-primary-50 dark:bg-theme-primary-500/15'
							: 'text-neutral-400 dark:text-neutral-500 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:bg-neutral-100 dark:hover:bg-white/8'
					}`}
					title={t('PROJECT_ITEM.EDIT_PROJECT')}
				>
					<FiEdit2 className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onClick={onDeleteRequest}
					className="p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
					title={t('PROJECT_ITEM.DELETE_PROJECT')}
				>
					<FiTrash2 className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
}

function ProjectImage({ imageUrl, title }: { imageUrl: string; title: string }) {
	const [imgSrc, setImgSrc] = useState(imageUrl);
	return (
		<Image
			src={imgSrc}
			alt={title}
			width={56}
			height={56}
			className="w-14 h-14 object-cover rounded-lg bg-neutral-100 dark:bg-white/5"
			onError={() => setImgSrc('/images/placeholder-project.jpg')}
			unoptimized
		/>
	);
}
