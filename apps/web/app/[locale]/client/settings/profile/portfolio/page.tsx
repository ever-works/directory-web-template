'use client';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiBriefcase, FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiStar, FiExternalLink } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { dummyPortfolio } from '@/lib/dummy-data';
import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function PortfolioPage() {
	const t = useTranslations('settings.PORTFOLIO_PAGE');
	const [projects, setProjects] = useState<any[]>(dummyPortfolio);

	const [title, setTitle] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [description, setDescription] = useState('');
	const [externalUrl, setExternalUrl] = useState('');
	const [tags, setTags] = useState('');
	const [isFeatured, setIsFeatured] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const [success, setSuccess] = useState('');

	const validate = () => {
		const newErrors: { [key: string]: string } = {};
		if (!title.trim()) newErrors.title = t('VALIDATION.TITLE_REQUIRED');
		if (!imageUrl.trim()) newErrors.imageUrl = t('VALIDATION.IMAGE_URL_REQUIRED');
		else if (!isValidUrl(imageUrl.trim())) newErrors.imageUrl = t('VALIDATION.IMAGE_URL_INVALID');
		if (!description.trim()) newErrors.description = t('VALIDATION.DESCRIPTION_REQUIRED');
		if (!externalUrl.trim()) newErrors.externalUrl = t('VALIDATION.PROJECT_URL_REQUIRED');
		else if (!isValidUrl(externalUrl.trim())) newErrors.externalUrl = t('VALIDATION.PROJECT_URL_INVALID');
		return newErrors;
	};

	const isValidUrl = (url: string) => {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSuccess('');
		const validationErrors = validate();
		setErrors(validationErrors);
		if (Object.keys(validationErrors).length > 0) return;
		setSuccess(t('SUCCESS.PROJECT_ADDED'));
		setTitle('');
		setImageUrl('');
		setDescription('');
		setExternalUrl('');
		setTags('');
		setIsFeatured(false);
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
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

					<div className="text-center">
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('TITLE')}</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">{t('DESCRIPTION')}</p>
					</div>

					{/* Add New Project */}
					<Card className="border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg">
						<CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
							<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<FiPlus className="w-5 h-5 text-theme-primary-500 shrink-0" />
								{t('ADD_NEW_PROJECT')}
							</CardTitle>
						</CardHeader>
						<CardContent className="p-6">
							<form className="space-y-6" onSubmit={handleSubmit} noValidate>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<label
											htmlFor="title"
											className="text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											{t('FORM.PROJECT_TITLE')}
										</label>
										<input
											id="title"
											name="title"
											placeholder={t('FORM.PROJECT_TITLE_PLACEHOLDER')}
											className="w-full h-14 px-6 text-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											aria-invalid={!!errors.title}
											aria-describedby="title-error"
										/>
										{errors.title && (
											<p className="text-red-600 text-xs mt-1" id="title-error">
												{errors.title}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<label
											htmlFor="imageUrl"
											className="text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											{t('FORM.IMAGE_URL')}
										</label>
										<input
											id="imageUrl"
											name="imageUrl"
											type="url"
											placeholder={t('FORM.IMAGE_URL_PLACEHOLDER')}
											className="w-full h-14 px-6 text-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
											value={imageUrl}
											onChange={(e) => setImageUrl(e.target.value)}
											aria-invalid={!!errors.imageUrl}
											aria-describedby="imageUrl-error"
										/>
										{errors.imageUrl && (
											<p className="text-red-600 text-xs mt-1" id="imageUrl-error">
												{errors.imageUrl}
											</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="description"
										className="text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										{t('FORM.DESCRIPTION')}
									</label>
									<textarea
										id="description"
										name="description"
										rows={3}
										placeholder={t('FORM.DESCRIPTION_PLACEHOLDER')}
										className="w-full px-6 py-4 text-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 hover:border-gray-400 dark:hover:border-gray-500 resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										aria-invalid={!!errors.description}
										aria-describedby="description-error"
									/>
									{errors.description && (
										<p className="text-red-600 text-xs mt-1" id="description-error">
											{errors.description}
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<label
											htmlFor="externalUrl"
											className="text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											{t('FORM.PROJECT_URL')}
										</label>
										<input
											id="externalUrl"
											name="externalUrl"
											type="url"
											placeholder={t('FORM.PROJECT_URL_PLACEHOLDER')}
											className="w-full h-14 px-6 text-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
											value={externalUrl}
											onChange={(e) => setExternalUrl(e.target.value)}
											aria-invalid={!!errors.externalUrl}
											aria-describedby="externalUrl-error"
										/>
										{errors.externalUrl && (
											<p className="text-red-600 text-xs mt-1" id="externalUrl-error">
												{errors.externalUrl}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<label
											htmlFor="tags"
											className="text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											{t('FORM.TAGS')}
										</label>
										<input
											id="tags"
											name="tags"
											placeholder={t('FORM.TAGS_PLACEHOLDER')}
											className="w-full h-14 px-6 text-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
											value={tags}
											onChange={(e) => setTags(e.target.value)}
										/>
									</div>
								</div>

								<div className="flex items-center gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											name="isFeatured"
											className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-theme-primary-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-theme-primary-500 focus:ring-offset-0"
											checked={isFeatured}
											onChange={(e) => setIsFeatured(e.target.checked)}
										/>
										<span className="text-sm text-gray-700 dark:text-gray-300">
											{t('FORM.FEATURED_PROJECT')}
										</span>
									</label>
								</div>

								{success && (
									<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
										<p className="text-green-600 dark:text-green-400 text-sm font-medium">
											{success}
										</p>
									</div>
								)}

								<div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
									<Button
										type="submit"
										className="inline-flex items-center gap-2 bg-theme-primary-600 hover:bg-theme-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:ring-offset-2"
									>
										<FiPlus className="w-4 h-4" />
										{t('FORM.ADD_PROJECT')}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					{/* Existing Projects */}
					<Card className="border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg">
						<CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
							<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<FiBriefcase className="w-5 h-5 text-theme-primary-500 shrink-0" />
								{t('YOUR_PROJECTS')}
							</CardTitle>
						</CardHeader>
						<CardContent className="p-6">
							<div className="space-y-4">
								{projects.map((project) => (
									<PortfolioItem
										key={project.id}
										project={project}
										onEdit={() => alert(`Edit project: ${project.title}`)}
										onDelete={() => {
											if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
												setProjects((prev) => prev.filter((p) => p.id !== project.id));
											}
										}}
									/>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</Container>
		</div>
	);
}

interface PortfolioItemProps {
	project: {
		id: string;
		title: string;
		description: string;
		imageUrl: string;
		externalUrl: string;
		tags: string[];
		isFeatured: boolean;
	};
	onEdit: () => void;
	onDelete: () => void;
}

function PortfolioItem({ project, onEdit, onDelete }: PortfolioItemProps) {
	return (
		<div className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
			<div className="shrink-0">
				<ProjectImage imageUrl={project.imageUrl} title={project.title} />
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.title}</h3>
							{project.isFeatured && (
								<span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded text-xs font-medium">
									<FiStar className="w-3 h-3" />
									Featured
								</span>
							)}
						</div>
						<p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{project.description}</p>
						<div className="flex flex-wrap gap-1">
							{project.tags.map((tag) => (
								<span
									key={tag}
									className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs"
								>
									{tag}
								</span>
							))}
						</div>
					</div>

					<div className="flex items-center gap-2 ml-4">
						<a
							href={project.externalUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 text-gray-400 dark:text-gray-500 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
							title="View project"
						>
							<FiExternalLink className="w-4 h-4" />
						</a>
						<button
							className="p-2 text-gray-400 dark:text-gray-500 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
							title="Edit project"
							onClick={onEdit}
						>
							<FiEdit className="w-4 h-4" />
						</button>
						<button
							className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
							title="Delete project"
							onClick={onDelete}
						>
							<FiTrash2 className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// Helper component for image with error handling
function ProjectImage({ imageUrl, title }: { imageUrl: string; title: string }) {
	const [imgSrc, setImgSrc] = useState(imageUrl);
	return (
		<Image
			src={imgSrc}
			alt={title}
			width={64}
			height={64}
			className="w-16 h-16 object-cover rounded-lg"
			onError={() => setImgSrc('/images/placeholder-project.jpg')}
			unoptimized
		/>
	);
}
