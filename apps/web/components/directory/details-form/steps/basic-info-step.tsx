'use client';

import { useId, useState, useEffect, useRef } from 'react';
import { FileText, Star, Plus, ChevronUp, ChevronDown, Search, X, Video } from 'lucide-react';
import { cn, getVideoEmbedUrl } from '@/lib/utils';
import { useUrlExtraction } from '@/hooks/use-url-extraction';
import type { Editor } from '@tiptap/react';
import { EditorContent, Toolbar, ToolbarContent, useEditorToolbar } from '@/lib/editor';
import { LinkInput } from '../components/link-input';
import type { Category, Tag as TagType } from '@/lib/content';
import type { FormData } from '../validation/form-validators';
import { LocationFields } from '@/components/directory/location-fields';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import {
	STEP_CARD_CLASSES,
	FORM_FIELD_CLASSES,
	TAG_CLASSES,
	VIDEO_PREVIEW_CLASSES,
	MAX_DESCRIPTION_LENGTH,
	DEFAULT_TAGS_TO_SHOW,
	isValidVideoUrl
} from '../validation/form-validators';

interface BasicInfoStepProps {
	formData: FormData;
	animatingLinkId: string | null;
	focusedField: string | null;
	setFocusedField: (field: string | null) => void;
	completedFields: Set<string>;
	handleLinkChange: (id: string, field: 'label' | 'url', value: string) => void;
	handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
	handleTagToggle: (tagId: string) => void;
	getIconComponent: () => React.ComponentType<{ className?: string }>;
	categories?: Category[];
	tags?: TagType[];
	editor: Editor | null;
	t: (key: string, values?: Record<string, unknown>) => string;
	addLink: () => void;
	removeLink: (id: string) => void;
	setFormData?: React.Dispatch<React.SetStateAction<FormData>>;
}

export function BasicInfoStep({
	formData,
	animatingLinkId,
	focusedField,
	setFocusedField,
	completedFields,
	handleLinkChange,
	handleInputChange,
	handleTagToggle,
	getIconComponent,
	categories,
	tags,
	editor,
	t,
	addLink,
	removeLink,
	setFormData
}: BasicInfoStepProps) {
	const { categoriesEnabled } = useCategoriesEnabled();
	const { tagsEnabled } = useTagsEnabled();
	const { extractFromUrl, isLoading: isExtracting } = useUrlExtraction();
	const [showAllTags, setShowAllTags] = useState(false);
	const [tagsToShow] = useState(DEFAULT_TAGS_TO_SHOW + 6);

	const [selectedCategories, setSelectedCategories] = useState<string[]>(
		Array.isArray(formData.categories) ? formData.categories : []
	);

	const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setSelectedCategories(Array.isArray(formData.categories) ? formData.categories : []);
	}, [formData.categories]);
	const [categorySearch, setCategorySearch] = useState('');
	const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
	const [categoryDropdownDirection, setCategoryDropdownDirection] = useState<'down' | 'up'>('down');
	const { toolbarRef } = useEditorToolbar(editor);
	const categoryDropdownId = useId();

	const toggleCategory = (categoryId: string) => {
		setSelectedCategories((prev) => {
			const newSelected = prev.includes(categoryId)
				? prev.filter((id) => id !== categoryId)
				: [...prev, categoryId];

			if (setFormData) {
				setFormData((formPrev) => ({
					...formPrev,
					// `formData.category` (singular string|null) is the
					// canonical field the form validator and submit handler
					// read — pin it to the FIRST selected id (or null when
					// the user clears the selection). We also keep
					// `categories` (plural) in sync for any consumer that
					// reads the full multi-select picker state.
					category: newSelected[0] ?? null,
					categories: newSelected
				}));
			}

			return newSelected;
		});
	};

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				categoryMenuOpen &&
				categoryDropdownRef.current &&
				!categoryDropdownRef.current.contains(event.target as Node)
			) {
				setCategoryMenuOpen(false);
				setCategorySearch('');
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [categoryMenuOpen]);

	// Close dropdown on Escape
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (categoryMenuOpen && event.key === 'Escape') {
				setCategoryMenuOpen(false);
				setCategorySearch('');
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [categoryMenuOpen]);

	const handleExtraction = async (url: string) => {
		if (!setFormData) return;

		const data = await extractFromUrl(url);
		if (data) {
			setFormData((prev) => ({
				...prev,
				name: data.name || prev.name,
				description: data.description ? data.description.substring(0, MAX_DESCRIPTION_LENGTH) : prev.description
			}));

			// If we have an editor instance and description, we might want to update introduction too if empty
			// But for now let's just update the basic fields
		}
	};

	return (
		<div className={STEP_CARD_CLASSES.wrapper}>
			<div className={STEP_CARD_CLASSES.background} />
			<div className={STEP_CARD_CLASSES.content}>
				<div className={STEP_CARD_CLASSES.header.wrapper}>
					<h3 className={STEP_CARD_CLASSES.header.title}>{t('directory.DETAILS_FORM.BASIC_INFORMATION')}</h3>
				</div>

				<div className="space-y-6">
					<LinkInput
						formData={formData}
						animatingLinkId={animatingLinkId}
						focusedField={focusedField}
						setFocusedField={setFocusedField}
						completedFields={completedFields}
						handleLinkChange={handleLinkChange}
						getIconComponent={getIconComponent}
						t={t}
						addLink={addLink}
						removeLink={removeLink}
						onExtract={handleExtraction}
						isExtracting={isExtracting}
					/>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="flex flex-col gap-6">
					{/* Product Name */}
					<div className="space-y-3">
						<label htmlFor="name" className={FORM_FIELD_CLASSES.label}>
							{t('directory.DETAILS_FORM.PRODUCT_NAME')} *
						</label>
						<div className="relative">
							<input
								id="name"
								name="name"
								type="text"
								value={formData.name}
								onChange={handleInputChange}
								onFocus={() => setFocusedField('name')}
								onBlur={() => setFocusedField(null)}
								placeholder={t('directory.DETAILS_FORM.PRODUCT_NAME_PLACEHOLDER')}
								required
								className={cn(
									FORM_FIELD_CLASSES.input.base,
									focusedField === 'name' && FORM_FIELD_CLASSES.input.focused
								)}
							/>
						</div>
					</div>

					{/* Category - Only show if categories enabled */}
					{categoriesEnabled && (
						<div className="space-y-3">
							<label htmlFor="categories" className={FORM_FIELD_CLASSES.label}>
								{t('directory.DETAILS_FORM.CATEGORIES')} *
							</label>
							<div className="relative" ref={categoryDropdownRef}>
								<button
									id="categories"
									type="button"
									role="combobox"
									className={cn(
										'inline-flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-700 dark:text-white transition-all duration-150 focus:outline-none hover:border-gray-300 dark:hover:border-white/15',
										categoryMenuOpen && 'ring-1 ring-theme-primary-500/40 border-theme-primary-400 dark:border-theme-primary-500',
										focusedField === 'categories' && 'border-theme-primary-400 dark:border-theme-primary-500'
									)}
									aria-label={t('directory.DETAILS_FORM.CATEGORIES')}
									aria-expanded={categoryMenuOpen}
									aria-controls={categoryDropdownId}
									aria-haspopup="listbox"
									onClick={e => {
										setCategoryMenuOpen((open) => !open);
										setFocusedField('categories');
										// Determine if dropdown should open up or down
										const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
										const spaceBelow = window.innerHeight - rect.bottom;
										const spaceAbove = rect.top;
										// 320px is the dropdown max height (80 * 4)
										if (spaceBelow < 320 && spaceAbove > spaceBelow) {
											setCategoryDropdownDirection('up');
										} else {
											setCategoryDropdownDirection('down');
										}
									}}
									onBlur={() => setFocusedField(null)}
									disabled={!categories || categories.length === 0}
								>
									<span className="truncate text-left flex flex-wrap gap-1 items-center min-h-[1.2rem] w-[94%]">
										{selectedCategories.length > 0
											? selectedCategories
												.map((catId) => {
													const cat = categories?.find((c) => c.id === catId);
													if (!cat) return null;
													return (
														<span
															key={catId}
															className="inline-flex items-center gap-0.5 rounded-md bg-theme-primary-500 text-white px-2 py-0.5 text-xs font-medium"
														>
															{cat.name}
															<button
																type="button"
																aria-label={t('directory.DETAILS_FORM.REMOVE_CATEGORY', { name: cat.name })}
																className="cursor-pointer rounded-sm hover:bg-white/20 focus:outline-none"
																onClick={e => {
																	e.stopPropagation();
																	toggleCategory(catId);
																}}
															>
																<X className="w-3 h-3 text-white" />
															</button>
														</span>
													);
												})
											: (
												<span className="text-gray-400 dark:text-white/30 text-sm">
													{t('directory.DETAILS_FORM.CATEGORY_PLACEHOLDER')}
												</span>
											)}
									</span>
									<ChevronDown
										className={cn(
											'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0',
											categoryMenuOpen && 'rotate-180'
										)}
									/>
								</button>
								{categoryMenuOpen && (
									<div
										id={categoryDropdownId}
										className={cn(
											'absolute z-50 w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col',
											categoryDropdownDirection === 'down' ? 'mt-1.5' : 'bottom-full mb-1.5'
										)}
										role="listbox"
									>
										<div className="sticky top-0 z-20 bg-inherit">
											<div className="relative">
												<input
													type="text"
													value={categorySearch}
													onChange={(e) => setCategorySearch(e.target.value)}
													placeholder={t('directory.DETAILS_FORM.SEARCH_CATEGORIES_PLACEHOLDER')}
													className="w-full pl-10 pr-3 py-2 text-sm border-b border-gray-100 dark:border-white/8 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none"
												/>
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
													<Search className="w-4 h-4" />
												</span>
											</div>
										</div>
										<div className="overflow-y-auto min-h-20 p-1.5 flex flex-wrap gap-2 items-start scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1 overscroll-contain mx-auto"
											style={{ maxHeight: '20rem', width: '100%' }}>
											{(() => {
												const filteredCategories = categories?.filter((cat) =>
													cat.name.toLowerCase().includes(categorySearch.toLowerCase())
												) ?? [];

												return filteredCategories.length > 0 ? (
													filteredCategories.map((category) => (
													<div
														key={category.id}
														className={cn(
															'flex cursor-pointer items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors duration-150',
															selectedCategories.includes(category.id) && 'bg-theme-primary-500 dark:bg-theme-primary-600 text-white border-theme-primary-500 dark:border-theme-primary-600'
														)}
														role="option"
														aria-selected={selectedCategories.includes(category.id)}
														tabIndex={-1}
														onClick={() => toggleCategory(category.id)}
														onKeyDown={(event) => {
															if (event.key === 'Enter' || event.key === ' ') {
																event.preventDefault();
																toggleCategory(category.id);
															}
														}}
													>
														<span
															className={cn('font-medium truncate text-xs')}
														>
															{category.name}
														</span>
														{/* {selectedCategories.includes(category.id) && (
															<Check className="h-4 w-4 text-theme-primary-500 dark:text-theme-primary-400" />
														)} */}
													</div>
												))) : (
												<div
													className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500"
													role="status"
													aria-live="polite"
													aria-atomic="true"
												>
													{t('directory.DETAILS_FORM.NO_CATEGORIES_FOUND')}
												</div>
												);
											})()}
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Video URL */}
					<div className="space-y-2">
						<label htmlFor="video_url" className={FORM_FIELD_CLASSES.label}>
							{t('directory.DETAILS_FORM.VIDEO_URL_LABEL')}
						</label>
						<div className="relative">
							<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
								<Video className="w-4 h-4 text-gray-400 dark:text-gray-500" />
							</div>
							<input
								id="video_url"
								name="video_url"
								type="url"
								value={formData.video_url || ''}
								onChange={handleInputChange}
								placeholder="https://www.youtube.com/watch?v=..."
								className={cn(FORM_FIELD_CLASSES.input.base, 'pl-9')}
							/>
						</div>
						<p className="text-[11px] text-gray-400 dark:text-gray-500">
							YouTube &amp; Vimeo supported
						</p>
						{/* Video Preview - only for whitelisted hosts */}
						{formData.video_url && isValidVideoUrl(formData.video_url) && (
							<div className={VIDEO_PREVIEW_CLASSES.container}>
								<div className={VIDEO_PREVIEW_CLASSES.wrapper}>
									<iframe
										src={getVideoEmbedUrl(formData.video_url)}
										title={t('directory.DETAILS_FORM.VIDEO_PREVIEW')}
										style={{ border: 0 }}
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowFullScreen
										className={VIDEO_PREVIEW_CLASSES.iframe}
									></iframe>
								</div>
							</div>
						)}
					</div>
					</div>
					
					<div className="flex flex-col gap-4">
					{/* Tags - Only show if tags enabled */}
					{tagsEnabled && (
						<div className="space-y-3">
							<div>
								<label className={FORM_FIELD_CLASSES.label}>
									{t('directory.DETAILS_FORM.TAGS_LABELS')}
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{t('directory.DETAILS_FORM.TAGS_DESCRIPTION')}
								</p>
							</div>

						<div className={cn(TAG_CLASSES.container, 'max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1 overscroll-contain mx-auto')}
								style={{scrollbarWidth: 'thin' }}>
								{tags?.slice(0, showAllTags ? undefined : tagsToShow).map((tag) => (
									<button
										key={tag.id}
										type="button"
										onClick={() => handleTagToggle(tag.id)}
										className={cn(
											TAG_CLASSES.button.base,
											formData.tags.includes(tag.id)
												? TAG_CLASSES.button.selected
												: TAG_CLASSES.button.unselected
										)}
									>
										{tag.name}
									</button>
								))}

								{tags && tags.length > tagsToShow && !showAllTags && (
									<button
										type="button"
										onClick={() => setShowAllTags(true)}
										className={TAG_CLASSES.showMore}
									>
										<Plus className="w-4 h-4" />
										{t('common.SHOW_MORE', { count: tags.length - tagsToShow })}
									</button>
								)}

								{showAllTags && tags && tags.length > tagsToShow && (
									<button
										type="button"
										onClick={() => setShowAllTags(false)}
										className={TAG_CLASSES.showMore}
									>
										<ChevronUp className="w-4 h-4" />
										{t('common.SHOW_LESS')}
									</button>
								)}
							</div>

							{formData.tags.length > 0 && (
								<div className={TAG_CLASSES.selectedSummary.container}>
									<div className={TAG_CLASSES.selectedSummary.header}>
										<Star className={TAG_CLASSES.selectedSummary.icon} />
										<span className={TAG_CLASSES.selectedSummary.label}>
											{t('directory.DETAILS_FORM.SELECTED_TAGS', {
												count: formData.tags.length
											})}
										</span>
									</div>
									<div className={TAG_CLASSES.selectedSummary.tags}>
										{formData.tags.map((tagId) => {
											const tag = tags?.find((t) => t.id === tagId);
											return (
												<span key={tagId} className={TAG_CLASSES.selectedSummary.tag}>
													{tag?.name || tagId}
												</span>
											);
										})}
									</div>
								</div>
							)}
						</div>
					)}
					</div>
					</div>

					{/* Short Description */}
					<div className="space-y-3">
						<label htmlFor="description" className={FORM_FIELD_CLASSES.label}>
							{t('directory.DETAILS_FORM.SHORT_DESCRIPTION')} *
						</label>
						<div className="relative">
							<textarea
								id="description"
								name="description"
								value={formData.description}
								onChange={handleInputChange}
								onFocus={() => setFocusedField('description')}
								onBlur={() => setFocusedField(null)}
								placeholder={t('directory.DETAILS_FORM.SHORT_DESCRIPTION_PLACEHOLDER')}
								maxLength={MAX_DESCRIPTION_LENGTH}
								required
								rows={3}
								className={cn(
									FORM_FIELD_CLASSES.textarea.base,
									focusedField === 'description' && FORM_FIELD_CLASSES.textarea.focused
								)}
							/>
							<div className="absolute bottom-4 right-6 text-xs text-gray-500 dark:text-gray-400">
								{formData.description.length}/{MAX_DESCRIPTION_LENGTH}
							</div>
						</div>
					</div>

					{/* Detailed Introduction */}
					<div className="space-y-3">
						<label htmlFor="introduction" className={FORM_FIELD_CLASSES.label}>
							{t('directory.DETAILS_FORM.DETAILED_INTRODUCTION')}
						</label>
						<div className="relative">
							{editor && (
								<EditorContent
									className={cn(
										FORM_FIELD_CLASSES.textarea.base,
										focusedField === 'introduction' && FORM_FIELD_CLASSES.textarea.focused,
										'[&_.ProseMirror]:min-h-[5rem] [&_.ProseMirror]:break-words [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:overflow-wrap-[anywhere]'
									)}
									toolbar={
										<Toolbar
											className="bg-white/75 dark:bg-[#141414]/75 backdrop-blur-md"
											ref={toolbarRef}
										>
											<ToolbarContent editor={editor} />
										</Toolbar>
									}
									editor={editor}
									role="presentation"
									placeholder={t('directory.DETAILS_FORM.DETAILED_INTRODUCTION_PLACEHOLDER')}
								/>
							)}
						</div>

						<p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
							<FileText className="w-3 h-3" />
							{t('directory.DETAILS_FORM.MARKDOWN_SUPPORT')}
						</p>
					</div>

					{/* Location Fields - shown when location is enabled in settings */}
					{setFormData && (
						<LocationFields
							location={formData.location}
							onLocationChange={(location) => {
								setFormData((prev) => ({ ...prev, location }));
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
