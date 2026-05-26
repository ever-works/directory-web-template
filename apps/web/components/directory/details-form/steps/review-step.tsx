'use client';

import { Link, Tag, Type, FileText, MapPin, Globe, CheckCircle2 } from 'lucide-react';
import { STEP_CARD_CLASSES } from '../validation/form-validators';
import type { FormData } from '../validation/form-validators';

interface ReviewStepProps {
	formData: FormData;
	t: (key: string, values?: Record<string, unknown>) => string;
}

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
		<div className="flex gap-3 p-3.5 rounded-lg bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/6">
			<div className="shrink-0 w-8 h-8 rounded-md bg-theme-primary-500/8 dark:bg-theme-primary-500/15 flex items-center justify-center">
				<Icon className="w-3.5 h-3.5 text-theme-primary-500 dark:text-theme-primary-400" />
			</div>
			<div className="min-w-0 flex-1 pt-0.5">
				<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
					{label}
				</p>
				<div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed wrap-break-word">
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
		<div className={STEP_CARD_CLASSES.wrapper}>
			<div className={STEP_CARD_CLASSES.content}>
				{/* Header */}
				<div className={STEP_CARD_CLASSES.header.wrapper}>
					<div>
						<h3 className={STEP_CARD_CLASSES.header.title}>
							{t('directory.DETAILS_FORM.REVIEW_AND_SUBMIT')}
						</h3>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
							{t('directory.REVIEW.SUMMARY')}
						</p>
					</div>
				</div>

				{/* Completion badge */}
				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 mb-5">
					<CheckCircle2 className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
					<span className="text-xs font-medium text-green-700 dark:text-green-400">
						{t('directory.REVIEW.TITLE')}
					</span>
				</div>

				{/* 2-column grid for compact fields */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<ReviewField icon={Type} label={t('directory.DETAILS_FORM.PRODUCT_NAME')}>
						{formData.name || (
							<span className="text-gray-400 dark:text-gray-500 italic text-xs">
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
							<span className="text-gray-400 dark:text-gray-500 italic text-xs">
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
										className="px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 capitalize"
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
										className="px-2 py-0.5 text-xs font-medium rounded-full bg-theme-primary-50 dark:bg-theme-primary-900/30 text-theme-primary-700 dark:text-theme-primary-300 border border-theme-primary-200 dark:border-theme-primary-700/40 capitalize"
									>
										{tag}
									</span>
								))}
							</div>
						</ReviewField>
					)}
				</div>

				{/* Full-width fields */}
				<div className="mt-3 space-y-3">
					{formData.description && (
						<ReviewField icon={FileText} label={t('directory.DETAILS_FORM.SHORT_DESCRIPTION')}>
							{formData.description}
						</ReviewField>
					)}

					{formData.introduction && (
						<ReviewField icon={FileText} label={t('directory.DETAILS_FORM.DETAILED_INTRODUCTION')}>
							<div
								className="prose prose-sm prose-gray dark:prose-invert max-w-none prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:text-xs prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-strong:font-semibold"
								dangerouslySetInnerHTML={{ __html: formData.introduction }}
							/>
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
											className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-theme-primary-600 dark:text-theme-primary-400 hover:border-theme-primary-400 transition-colors"
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
