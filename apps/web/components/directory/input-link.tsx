import { cn } from '@/lib/utils';
import { Check, X, Plus } from 'lucide-react';
import { FormData } from './type';

interface InputLinkProps {
	formData: FormData;
	setFormData: React.Dispatch<React.SetStateAction<FormData>>;
	animatingLinkId: string | null;
	setAnimatingLinkId: (id: string | null) => void;
	focusedField: string | null;
	setFocusedField: (field: string | null) => void;
	completedFields: Set<string>;
	handleLinkChange: (id: string, field: 'label' | 'url', value: string) => void;
	getIconComponent: () => React.ComponentType<{ className?: string }>;
	t: (key: any) => string;
	addLink: () => void;
	removeLink: (id: string) => void;
}

function InputLink({
	formData,
	animatingLinkId,
	focusedField,
	setFocusedField,
	completedFields,
	handleLinkChange,
	getIconComponent,
	t,
	addLink,
	removeLink
}: InputLinkProps) {
	return (
		<div>
			{/* Product Links */}
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
						{t('directory.DETAILS_FORM.PRODUCT_LINK')} *
					</label>
					<div className="text-xs text-gray-500 dark:text-gray-400">
						{formData.links.length} {t('directory.DETAILS_FORM.LINKS_ADDED')}
					</div>
				</div>

				{/* Links Container */}
				<div className="space-y-4">
					{formData.links.map((link, index) => {
						const IconComponent = getIconComponent();
						const isAnimating = animatingLinkId === link.id;
						const isMain = link.type === 'main';

						return (
							<div
								key={index}
								className={cn(
									'group relative overflow-hidden rounded-2xl border-2',
									isMain
										? 'border-theme-primary-200 dark:border-theme-primary-800 bg-blue-50/30 dark:bg-blue-900/10'
										: 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50',
									isAnimating && 'animate-pulse',
									'hover:border-blue-300 dark:hover:border-theme-primary-600'
								)}
							>
								{/* Link Type Badge */}
								{isMain && (
									<div className="absolute top-3 right-3 z-10">
										<div className="px-2 py-1 text-xs font-semibold bg-theme-primary-500 text-white rounded-full">
											{t('directory.DETAILS_FORM.PRIMARY_BADGE')}
										</div>
									</div>
								)}

								<div className="p-4 space-y-3">
									{/* Link Label Row */}
									<div className="flex items-center gap-3">
										<div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center group-hover:from-theme-primary-100 group-hover:to-theme-primary-200 dark:group-hover:from-theme-primary-900 dark:group-hover:to-theme-primary-800 transition-all duration-300">
											<IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400" />
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
												className="w-full h-10 px-3 text-sm font-medium bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 focus:ring-2 focus:ring-theme-primary-20 transition-all duration-200"
											/>
										</div>

										{!isMain && (
											<button
												type="button"
												onClick={() => removeLink(link.id)}
												className="shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center"
											>
												<X className="w-4 h-4" />
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
												'w-full h-12 px-4 pr-12 text-base bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl transition-all duration-300 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400',
												focusedField === `link-${link.id}` &&
													'border-theme-primary-500 dark:border-theme-primary-400 ring-4 ring-theme-primary-20 scale-[1.01]',
												completedFields.has('mainLink') &&
													'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20',
												'focus:border-theme-primary-500 dark:focus:border-theme-primary-400 focus:ring-4 focus:ring-theme-primary-20'
											)}
										/>

										{/* Validation Icon */}
										<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
											{isMain && completedFields.has('mainLink') && (
												<div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
													<Check className="h-3 w-3 text-white" />
												</div>
											)}
											{link.url && !link.url.match(/^https?:\/\//) && (
												<div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
													<span className="text-white text-xs">!</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Hover Effect Gradient */}
								<div className="absolute inset-0 bg-linear-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
							</div>
						);
					})}
				</div>

				{/* Add Link Section */}
				<div className="pt-4">
					<button
						type="button"
						onClick={addLink}
						className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-theme-primary-600 hover:text-theme-primary-700 transition-colors rounded-lg border border-dashed border-theme-primary-300 hover:bg-theme-primary-20 capitalize dark:hover:text-white"
					>
						<Plus className="w-4 h-4" />
						{t('directory.DETAILS_FORM.ADD_MORE_LINKS')}
					</button>
				</div>
			</div>
		</div>
	);
}

export default InputLink;
