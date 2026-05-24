'use client';

import { cn } from '@/lib/utils';
import { Check, X, Plus, Sparkles, Link2, Globe } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { FormData } from '../validation/form-validators';
import { FORM_FIELD_CLASSES } from '../validation/form-validators';

interface InputLinkProps {
	formData: FormData;
	animatingLinkId: string | null;
	focusedField: string | null;
	setFocusedField: (field: string | null) => void;
	completedFields: Set<string>;
	handleLinkChange: (id: string, field: 'label' | 'url', value: string) => void;
	getIconComponent: () => React.ComponentType<{ className?: string }>;
	t: (key: string, values?: Record<string, unknown>) => string;
	addLink: () => void;
	removeLink: (id: string) => void;
	onExtract?: (url: string) => void;
	isExtracting?: boolean;
}

export function LinkInput({
	formData,
	animatingLinkId,
	focusedField,
	setFocusedField,
	completedFields,
	handleLinkChange,
	t,
	addLink,
	removeLink,
	onExtract,
	isExtracting
}: InputLinkProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<label className={FORM_FIELD_CLASSES.label}>
					{t('directory.DETAILS_FORM.PRODUCT_LINK')} *
				</label>
				<span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/8">
					{formData.links.length} {t('directory.DETAILS_FORM.LINKS_ADDED')}
				</span>
			</div>

			<div className="space-y-2">
				{formData.links.map((link) => {
					const isAnimating = animatingLinkId === link.id;
					const isMain = link.type === 'main';

					return (
						<div
							key={link.id}
							className={cn(
								'rounded-lg border transition-all duration-200',
								isMain
									? 'border-gray-300 dark:border-white/12 bg-gray-50/50 dark:bg-white/4'
									: 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/3',
								isAnimating && 'animate-pulse'
							)}
						>
							{/* Link label row */}
							<div className="flex items-center gap-2 px-3 pt-3 pb-2">
								<div className="shrink-0 w-7 h-7 rounded-md bg-gray-100 dark:bg-white/8 flex items-center justify-center">
									{isMain
										? <Globe className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
										: <Link2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
									}
								</div>
								<input
									type="text"
									value={link.label}
									onChange={(e) => handleLinkChange(link.id, 'label', e.target.value)}
									placeholder={
										isMain
											? t('directory.DETAILS_FORM.MAIN_WEBSITE_LABEL')
											: t('directory.DETAILS_FORM.LINK_LABEL_PLACEHOLDER')
									}
									className="flex-1 h-7 px-2 text-xs bg-transparent border-0 outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-white/25"
								/>
								{isMain && (
									<span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md">
										{t('directory.DETAILS_FORM.PRIMARY_BADGE')}
									</span>
								)}
								{!isMain && (
									<button
										type="button"
										onClick={() => removeLink(link.id)}
										aria-label={t('directory.DETAILS_FORM.REMOVE_LINK')}
										className="shrink-0 w-6 h-6 rounded-md text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors duration-150"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>

							{/* URL row */}
							<div className="px-3 pb-3">
								<div className="relative">
									<input
										type="url"
										value={link.url}
										onChange={(e) => handleLinkChange(link.id, 'url', e.target.value)}
										onFocus={() => setFocusedField(`link-${link.id}`)}
										onBlur={() => setFocusedField(null)}
										placeholder={
											isMain
												? t('directory.DETAILS_FORM.MAIN_WEBSITE_PLACEHOLDER')
												: t('directory.DETAILS_FORM.ADDITIONAL_LINK_PLACEHOLDER')
										}
										pattern="^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)$"
										required={isMain}
										className={cn(
											'w-full h-9 px-3 text-sm rounded-lg border outline-none transition-all duration-150',
											'bg-white dark:bg-white/5 text-gray-900 dark:text-white',
											'placeholder:text-gray-400 dark:placeholder:text-white/25',
											isMain && onExtract ? 'pr-28' : 'pr-10',
											focusedField === `link-${link.id}`
												? 'border-gray-400 dark:border-white/30 ring-1 ring-gray-300/50 dark:ring-white/10'
												: isMain && completedFields.has('link')
												? 'border-green-400 dark:border-green-500 bg-green-50/40 dark:bg-green-900/10'
												: 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/15'
										)}
									/>

									{/* Right actions — vertically centred against the input (h-9) */}
									<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
										{isMain && onExtract && link.url && link.url.match(/^https?:\/\//) && (
											<button
												type="button"
												onClick={() => onExtract(link.url)}
												disabled={isExtracting}
												className={cn(
													'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all duration-150',
													isExtracting
														? 'bg-gray-100 text-gray-400 cursor-wait dark:bg-white/5 dark:text-gray-500'
														: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/8 dark:text-gray-300 dark:hover:bg-white/12 border border-gray-200 dark:border-white/10'
												)}
											>
												{isExtracting ? (
													<>
														<LoadingSpinner size="sm" className="border-gray-400 dark:border-white/[0.12]" />
														<span>{t('directory.DETAILS_FORM.EXTRACTING')}</span>
													</>
												) : (
													<>
														<Sparkles className="w-3 h-3" />
														<span>{t('directory.DETAILS_FORM.EXTRACT')}</span>
													</>
												)}
											</button>
										)}
										{isMain && completedFields.has('link') && !isExtracting && (
											<div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-500/30">
												<Check className="h-3 w-3 text-white" />
											</div>
										)}
										{link.url && !link.url.match(/^https?:\/\//) && (
											<div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 cursor-default">
												<span className="text-white text-[10px] font-bold leading-none">!</span>
												<span className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[200px] rounded-md bg-gray-900 dark:bg-white px-2.5 py-1.5 text-[11px] leading-snug text-white dark:text-gray-900 shadow-sm z-20 whitespace-normal">
													URL must start with https:// or http://
													<span className="absolute top-full right-2.5 border-4 border-transparent border-t-gray-900 dark:border-t-white" />
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Add link */}
			<button
				type="button"
				onClick={addLink}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/20 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-150"
			>
				<Plus className="w-3.5 h-3.5" />
				{t('directory.DETAILS_FORM.ADD_MORE_LINKS')}
			</button>
		</div>
	);
}
