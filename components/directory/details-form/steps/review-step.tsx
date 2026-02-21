'use client';

import { Eye, Link, Tag, Type, FileText, MapPin, Globe, CheckCircle2 } from 'lucide-react';
import type { FormData } from '../validation/form-validators';

interface ReviewStepProps {
	formData: FormData;
	t: (key: string, values?: Record<string, unknown>) => string;
}

// A single labelled field row with an icon
function ReviewField({
	icon: Icon,
	label,
	children
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 transition-colors">
			<div className="flex-shrink-0 w-9 h-9 rounded-lg bg-theme-primary-500/10 dark:bg-theme-primary-500/20 flex items-center justify-center">
				<Icon className="w-4 h-4 text-theme-primary-500 dark:text-theme-primary-400" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
					{label}
				</p>
				<div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words">
					{children}
				</div>
			</div>
		</div>
	);
}

export function ReviewStep({ formData, t }: ReviewStepProps) {
	const categoryDisplay = (() => {
		if (formData.category && formData.category.toString().trim()) return formData.category;
		const cats = (formData as any).categories as string[] | undefined;
		if (Array.isArray(cats) && cats.length > 0) return cats.join(', ');
		return null;
	})();

	const hasLocation =
		formData.location &&
		(formData.location.is_remote || formData.location.address || formData.location.city);

	const mainLink = formData.links?.find((l) => l.type === 'main')?.url || formData.link;

	return (
		<div className="relative group animate-fade-in-up">
			{/* Subtle theme-matching glow */}
			<div className="absolute inset-0 bg-linear-to-r from-theme-primary-500/10 to-purple-500/10 dark:from-theme-primary-400/20 dark:to-purple-400/20 rounded-3xl blur-2xl dark:opacity-20 opacity-90 transition-opacity duration-500 pointer-events-none" />

			<div className="relative py-8">
				{/* Header */}
				<div className="flex items-center gap-3 mb-8">
					<div className="w-12 h-12 rounded-2xl bg-theme-primary-500 flex items-center justify-center shadow-lg shadow-theme-primary-500/30">
						<Eye className="w-6 h-6 text-white" />
					</div>
					<div>
						<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
							{t('directory.DETAILS_FORM.REVIEW_AND_SUBMIT')}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
							{t('directory.REVIEW.SUMMARY')}
						</p>
					</div>
				</div>

				{/* Completion badge */}
				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 mb-8">
					<CheckCircle2 className="w-4 h-4 text-green-500" />
					<span className="text-xs font-semibold text-green-700 dark:text-green-400">
						{t('directory.REVIEW.TITLE')}
					</span>
				</div>

				{/* Fields grid — 2 columns on md+ */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ReviewField icon={Type} label={t('directory.DETAILS_FORM.PRODUCT_NAME')}>
						{formData.name || (
							<span className="text-gray-400 dark:text-gray-500 italic">
								{t('directory.REVIEW.NOT_PROVIDED')}
							</span>
						)}
					</ReviewField>

					<ReviewField icon={Globe} label={t('directory.DETAILS_FORM.PRODUCT_LINK')}>
						{mainLink ? (
							<a
								href={mainLink}
								target="_blank"
								rel="noopener noreferrer"
								className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline truncate block"
							>
								{mainLink}
							</a>
						) : (
							<span className="text-gray-400 dark:text-gray-500 italic">
								{t('directory.REVIEW.NOT_PROVIDED')}
							</span>
						)}
					</ReviewField>

					{categoryDisplay && (
						<ReviewField icon={Tag} label={t('directory.REVIEW.CATEGORY')}>
							<div className="flex flex-wrap gap-1.5">
								{categoryDisplay.split(', ').map((cat) => (
									<span
										key={cat}
										className="px-2 py-0.5 text-xs font-medium rounded-full bg-theme-primary-100 dark:bg-theme-primary-900/40 text-theme-primary-700 dark:text-theme-primary-300 border border-theme-primary-200 dark:border-theme-primary-700/50 capitalize"
									>
										{cat}
									</span>
								))}
							</div>
						</ReviewField>
					)}

					{formData.tags.length > 0 && (
						<ReviewField icon={Tag} label={t('directory.DETAILS_FORM.TAGS_LABELS')}>
							<div className="flex flex-wrap gap-1.5">
								{formData.tags.map((tag) => (
									<span
										key={tag}
										className="px-2 py-0.5 text-xs font-medium rounded-full bg-theme-primary-500 text-white capitalize"
									>
										{tag}
									</span>
								))}
							</div>
						</ReviewField>
					)}
				</div>

				{/* Full-width fields */}
				<div className="mt-4 space-y-4">
					{formData.description && (
						<ReviewField icon={FileText} label={t('directory.DETAILS_FORM.SHORT_DESCRIPTION')}>
							{formData.description}
						</ReviewField>
					)}

					{formData.introduction && (
						<ReviewField icon={FileText} label={t('directory.DETAILS_FORM.DETAILED_INTRODUCTION')}>
							<div className="">
								<div
									className="prose prose-sm prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:text-sm prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/10 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
									dangerouslySetInnerHTML={{ __html: formData.introduction }}
								/>
							</div>
						</ReviewField>
					)}

					{hasLocation && (
						<ReviewField icon={MapPin} label={t('directory.REVIEW.LOCATION')}>
							{formData.location!.is_remote ? (
								t('directory.REVIEW.REMOTE_SERVICE')
							) : (
								<>
									{formData.location!.address && <p>{formData.location!.address}</p>}
									{(formData.location!.city || formData.location!.country) && (
										<p>
											{[
												formData.location!.city,
												formData.location!.state,
												formData.location!.country
											]
												.filter(Boolean)
												.join(', ')}
										</p>
									)}
								</>
							)}
						</ReviewField>
					)}

					{/* Additional links */}
					{formData.links && formData.links.filter((l) => l.type !== 'main' && l.url.trim()).length > 0 && (
						<ReviewField icon={Link} label={t('directory.DETAILS_FORM.ADD_MORE_LINKS')}>
							<div className="flex flex-wrap gap-2">
								{formData.links
									.filter((l) => l.type !== 'main' && l.url.trim())
									.map((l) => (
										<a
											key={l.id}
											href={l.url}
											target="_blank"
											rel="noopener noreferrer"
											className="px-2 py-0.5 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-theme-primary-600 dark:text-theme-primary-400 hover:border-theme-primary-400 transition-colors"
										>
											{l.label || l.url}
										</a>
									))}
							</div>
						</ReviewField>
					)}
				</div>
			</div>
		</div>
	);
}
