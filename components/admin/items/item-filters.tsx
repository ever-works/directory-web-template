"use client";

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Filter, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ItemFiltersProps {
	statusFilter: string;
	categoriesFilter: string[];
	tagsFilter: string[];
	onStatusChange: (status: string) => void;
	onCategoriesChange: (categories: string[]) => void;
	onTagsChange: (tags: string[]) => void;
	onClearAll: () => void;
	categories: Array<{ id: string; name: string }>;
	tags: Array<{ id: string; name: string }>;
	itemCounts: {
		draft: number;
		pending: number;
		approved: number;
		rejected: number;
	};
	activeFilterCount: number;
}

// Status tab style
const STATUS_TAB = cn(
	'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
	'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
);

const STATUS_TAB_ACTIVE = cn(
	'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
	'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
);

export function ItemFilters({
	statusFilter,
	categoriesFilter,
	tagsFilter,
	onStatusChange,
	onCategoriesChange,
	onTagsChange,
	onClearAll: _onClearAll,
	categories,
	tags,
	itemCounts,
	activeFilterCount: _activeFilterCount,
}: ItemFiltersProps) {
	const t = useTranslations('admin.ADMIN_ITEMS_PAGE');
	const [categorySearch, setCategorySearch] = useState('');
	const [tagSearch, setTagSearch] = useState('');

	const totalCount = itemCounts.draft + itemCounts.pending + itemCounts.approved + itemCounts.rejected;
	const hasAdvancedFilters = categoriesFilter.length > 0 || tagsFilter.length > 0;
	const advancedFilterCount = categoriesFilter.length + tagsFilter.length;

	// Filter categories by search
	const filteredCategories = categories.filter(cat =>
		cat.name.toLowerCase().includes(categorySearch.toLowerCase())
	);

	// Filter tags by search
	const filteredTags = tags.filter(tag =>
		tag.name.toLowerCase().includes(tagSearch.toLowerCase())
	);

	// Toggle category selection
	const toggleCategory = (categoryId: string) => {
		if (categoriesFilter.includes(categoryId)) {
			onCategoriesChange(categoriesFilter.filter(c => c !== categoryId));
		} else {
			onCategoriesChange([...categoriesFilter, categoryId]);
		}
	};

	// Toggle tag selection
	const toggleTag = (tagId: string) => {
		if (tagsFilter.includes(tagId)) {
			onTagsChange(tagsFilter.filter(t => t !== tagId));
		} else {
			onTagsChange([...tagsFilter, tagId]);
		}
	};

	// Clear advanced filters only (categories + tags)
	const clearAdvancedFilters = () => {
		onCategoriesChange([]);
		onTagsChange([]);
		setCategorySearch('');
		setTagSearch('');
	};

	return (
		<div className="flex items-center gap-3">
			{/* Status Tabs */}
			<div className="flex items-center gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg p-0.5">
				<button
					onClick={() => onStatusChange('')}
					className={!statusFilter ? STATUS_TAB_ACTIVE : STATUS_TAB}
				>
					{t('STATUS_ALL')}
					<span className="ml-1.5 text-xs text-gray-400">{totalCount}</span>
				</button>
				<button
					onClick={() => onStatusChange('approved')}
					className={statusFilter === 'approved' ? STATUS_TAB_ACTIVE : STATUS_TAB}
				>
					{t('STATUS_APPROVED')}
					<span className="ml-1.5 text-xs text-gray-400">{itemCounts.approved}</span>
				</button>
				<button
					onClick={() => onStatusChange('pending')}
					className={statusFilter === 'pending' ? STATUS_TAB_ACTIVE : STATUS_TAB}
				>
					{t('STATUS_PENDING')}
					<span className="ml-1.5 text-xs text-gray-400">{itemCounts.pending}</span>
				</button>
				<button
					onClick={() => onStatusChange('draft')}
					className={statusFilter === 'draft' ? STATUS_TAB_ACTIVE : STATUS_TAB}
				>
					{t('STATUS_DRAFT')}
					<span className="ml-1.5 text-xs text-gray-400">{itemCounts.draft}</span>
				</button>
				<button
					onClick={() => onStatusChange('rejected')}
					className={statusFilter === 'rejected' ? STATUS_TAB_ACTIVE : STATUS_TAB}
				>
					{t('STATUS_REJECTED')}
					<span className="ml-1.5 text-xs text-gray-400">{itemCounts.rejected}</span>
				</button>
			</div>

			{/* Filter Button */}
			<Popover.Root>
				<Popover.Trigger asChild>
					<button className={cn(
						'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md',
						'border border-gray-200 dark:border-gray-700',
						'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
						'transition-colors cursor-pointer',
						hasAdvancedFilters && 'bg-gray-50 dark:bg-gray-800'
					)}>
						<Filter className="w-3.5 h-3.5" />
						<span>{t('FILTERS')}</span>
						{advancedFilterCount > 0 && (
							<span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-full bg-theme-primary text-white">
								{advancedFilterCount}
							</span>
						)}
					</button>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content
						className={cn(
							'w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl',
							'border border-gray-200 dark:border-gray-700 z-50',
							'animate-in fade-in-0 zoom-in-95'
						)}
						sideOffset={8}
						align="end"
					>
						{/* Category Section */}
						<div className="p-3 border-b border-gray-100 dark:border-gray-800">
							<label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('CATEGORY_LABEL')}
							</label>
							{/* Search */}
							<div className="relative mt-2">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
								<input
									type="text"
									placeholder={t('FILTER_SEARCH_PLACEHOLDER')}
									value={categorySearch}
									onChange={(e) => setCategorySearch(e.target.value)}
									className={cn(
										'w-full pl-7 pr-2 py-1.5 text-sm rounded-md',
										'border border-gray-200 dark:border-gray-700',
										'bg-white dark:bg-gray-800',
										'text-gray-900 dark:text-white placeholder-gray-400',
										'focus:outline-none focus:border-gray-300 dark:focus:border-gray-600'
									)}
								/>
							</div>
							{/* Category List */}
							<div className="mt-2 space-y-0.5 max-h-36 overflow-y-auto">
								{filteredCategories.map((category) => {
									const isSelected = categoriesFilter.includes(category.id);
									return (
										<label key={category.id} className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
											<input
												type="checkbox"
												checked={isSelected}
												onChange={() => toggleCategory(category.id)}
												className="w-3.5 h-3.5 rounded text-theme-primary border-gray-300 focus:ring-theme-primary"
											/>
											<span className={cn('text-sm', isSelected ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400')}>
												{category.name}
											</span>
										</label>
									);
								})}
								{filteredCategories.length === 0 && categorySearch && (
									<p className="text-xs text-gray-400 px-1 py-2">{t('NO_RESULTS')}</p>
								)}
								{filteredCategories.length === 0 && !categorySearch && (
									<p className="text-xs text-gray-400 px-1 py-2">{t('NO_CATEGORIES_AVAILABLE')}</p>
								)}
							</div>
						</div>

						{/* Tags Section */}
						<div className="p-3">
							<label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('TAGS_LABEL')}
							</label>
							{/* Search */}
							<div className="relative mt-2">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
								<input
									type="text"
									placeholder={t('FILTER_SEARCH_PLACEHOLDER')}
									value={tagSearch}
									onChange={(e) => setTagSearch(e.target.value)}
									className={cn(
										'w-full pl-7 pr-2 py-1.5 text-sm rounded-md',
										'border border-gray-200 dark:border-gray-700',
										'bg-white dark:bg-gray-800',
										'text-gray-900 dark:text-white placeholder-gray-400',
										'focus:outline-none focus:border-gray-300 dark:focus:border-gray-600'
									)}
								/>
							</div>
							{/* Tags List */}
							<div className="mt-2 space-y-0.5 max-h-44 overflow-y-auto">
								{filteredTags.length === 0 && tagSearch ? (
									<p className="text-xs text-gray-400 px-1 py-2">{t('NO_RESULTS')}</p>
								) : filteredTags.length === 0 ? (
									<p className="text-xs text-gray-400 px-1 py-2">{t('NO_TAGS_AVAILABLE')}</p>
								) : (
									filteredTags.map((tag) => {
										const isSelected = tagsFilter.includes(tag.id);
										return (
											<label key={tag.id} className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleTag(tag.id)}
													className="w-3.5 h-3.5 rounded text-theme-primary border-gray-300 focus:ring-theme-primary"
												/>
												<span className={cn('text-sm', isSelected ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400')}>
													{tag.name}
												</span>
											</label>
										);
									})
								)}
							</div>
						</div>

						{/* Clear Button */}
						{hasAdvancedFilters && (
							<div className="px-3 pb-3">
								<button
									onClick={clearAdvancedFilters}
									className={cn(
										'flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-xs font-medium rounded-md',
										'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
										'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
										'transition-colors'
									)}
								>
									<X className="w-3.5 h-3.5" />
									<span>{t('CLEAR_ALL')}</span>
								</button>
							</div>
						)}
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		</div>
	);
}
