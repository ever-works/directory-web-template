'use client';

import { cn } from '@/lib/utils';
import { Check, X, Plus, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { FormData } from '../validation/form-validators';

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
	getIconComponent,
	t,
	addLink,
	removeLink,
	onExtract,
	isExtracting
}: InputLinkProps) {
	return (
		<div>
			{/* Product Links */}
			<div className="space-y-5">
				<div className="flex items-center justify-between">
					<span className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
						{t('directory.DETAILS_FORM.PRODUCT_LINK')} *
					</span>
					<span className="text-xs font-medium px-2.5 py-1 rounded-full bg-theme-primary-50 dark:bg-theme-primary-900/20 text-theme-primary-600 dark:text-theme-primary-400 border border-theme-primary-200/60 dark:border-theme-primary-700/40">
						{formData.links.length} {t('directory.DETAILS_FORM.LINKS_ADDED')}
					</span>
				</div>

				{/* Links Container */}
				<div className="space-y-3">
					{formData.links.map((link) => {
						const IconComponent = getIconComponent();
						const isAnimating = animatingLinkId === link.id;
						const isMain = link.type === 'main';

						return (
							<div
								key={link.id}
								className={cn(
									'group relative overflow-hidden rounded-xl border transition-all duration-200',
									isMain
										? 'border-theme-primary-200 dark:border-theme-primary-800/70 bg-theme-primary-50/40 dark:bg-theme-primary-900/10 shadow-sm'
										: 'border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/60',
									isAnimating && 'animate-pulse',
									'hover:border-theme-primary-300 dark:hover:border-theme-primary-700 hover:shadow-sm'
								)}
							>
								{/* Primary badge */}
								{isMain && (
									<div className="absolute top-3 right-3 z-10">
										<span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide bg-theme-primary-500 text-white rounded-full shadow-sm shadow-theme-primary-500/30">
											{t('directory.DETAILS_FORM.PRIMARY_BADGE')}
										</span>
									</div>
								)}

								<div className="p-4 space-y-3">
									{/* Link Label Row */}
									<div className="flex items-center gap-3">
										<div className="shrink-0 w-9 h-9 rounded-lg bg-theme-primary-500/10 dark:bg-theme-primary-500/20 flex items-center justify-center">
											<IconComponent className="w-4 h-4 text-theme-primary-500 dark:text-theme-primary-400" />
										</div>

										<div className="flex-1">
											<input
												type="text"
												value={link.label}
												onChange={(e) => handleLinkChange(link.id, 'label', e.target.value)}
												placeholder={
													isMain
														? t('directory.DETAILS_FORM.MAIN_WEBSITE_LABEL')
														: t('directory.DETAILS_FORM.LINK_LABEL_PLACEHOLDER')
												}
												className="w-full h-9 px-3 text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 focus:ring-1 focus:ring-theme-primary-500/30 transition-all duration-200"
											/>
										</div>

										{!isMain && (
											<button
												type="button"
												onClick={() => removeLink(link.id)}
												aria-label={t('directory.DETAILS_FORM.REMOVE_LINK')}
												className="shrink-0 w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center"
											>
												<X className="w-3.5 h-3.5" />
											</button>
										)}
									</div>

									{/* URL Input */}
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
												'w-full h-10 px-4 pr-12 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500',
												isMain && onExtract && 'pr-28',
												focusedField === `link-${link.id}` &&
													'border-theme-primary-500 dark:border-theme-primary-400 ring-1 ring-theme-primary-500/30',
										isMain && completedFields.has('link') &&
													'border-green-500 dark:border-green-400 bg-green-50/40 dark:bg-green-900/10',
												'hover:border-gray-300 dark:hover:border-gray-600'
											)}
										/>

										{/* Validation / Action Icons */}
										<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
											{isMain && onExtract && link.url && link.url.match(/^https?:\/\//) && (
												<button
													type="button"
													onClick={() => onExtract(link.url)}
													disabled={isExtracting}
													className={cn(
														'px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer',
														isExtracting
															? 'bg-gray-100 text-gray-400 cursor-wait dark:bg-gray-800 dark:text-gray-500'
															: 'bg-theme-primary-50 text-theme-primary-600 hover:bg-theme-primary-100 dark:bg-theme-primary-900/30 dark:text-theme-primary-400 dark:hover:bg-theme-primary-900/50 border border-theme-primary-200/60 dark:border-theme-primary-700/40'
													)}
												>
													{isExtracting ? (
														<>
															<LoadingSpinner size="sm" className="border-gray-400 dark:border-gray-500" />
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
												<div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
													<span className="text-white text-[10px] font-bold">!</span>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Add Link */}
				<div className="pt-1">
					<button
						type="button"
						onClick={addLink}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-dashed border-theme-primary-300 dark:border-theme-primary-700/50 text-theme-primary-600 dark:text-theme-primary-400 bg-theme-primary-50/50 dark:bg-theme-primary-900/10 hover:bg-theme-primary-100/60 dark:hover:bg-theme-primary-900/20 hover:border-theme-primary-400 dark:hover:border-theme-primary-600 transition-all duration-200"
					>
						<Plus className="w-4 h-4" />
						{t('directory.DETAILS_FORM.ADD_MORE_LINKS')}
					</button>
				</div>
			</div>
		</div>
	);
}
