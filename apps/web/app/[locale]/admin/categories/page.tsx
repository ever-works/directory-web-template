'use client';

import { useState, useCallback } from 'react';
import { Button, Card, CardBody, Chip, useDisclosure } from '@heroui/react';
import { Plus, Edit, Trash2, Eye, EyeOff, FolderTree } from 'lucide-react';
import { CategoryForm } from '@/components/admin/categories/category-form';
import { CategoryData, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types/category';
import { UniversalPagination } from '@/components/universal-pagination';
import { useAdminCategories } from '@/hooks/use-admin-categories';
import { useTranslations } from 'next-intl';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import Link from 'next/link';
import { useNavigation } from '@/components/providers';

export default function AdminCategoriesPage() {
	const t = useTranslations('admin.ADMIN_CATEGORIES_PAGE');
	const { categoriesEnabled } = useCategoriesEnabled();

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [limit] = useState(10);

	// Form state
	const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

	const { isOpen, onOpen, onClose } = useDisclosure();

	// Use the custom hook
	const {
		categories,
		total: totalCategories,
		page,
		totalPages,
		isLoading,
		isSubmitting,
		createCategory,
		updateCategory,
		deleteCategory
	} = useAdminCategories({
		params: {
			page: currentPage,
			limit,
			includeInactive: true,
			sortBy: 'name',
			sortOrder: 'asc'
		}
	});

	// Handlers using the custom hook
	const handleCreate = useCallback(
		async (data: CreateCategoryRequest) => {
			const success = await createCategory(data);
			if (success) {
				onClose();
			}
		},
		[createCategory, onClose]
	);

	const handleUpdate = useCallback(
		async (data: UpdateCategoryRequest) => {
			const success = await updateCategory(data.id, data);
			if (success) {
				onClose();
			}
		},
		[updateCategory, onClose]
	);

	const handleDelete = useCallback(
		async (id: string, hard = false) => {
			const action = hard ? t('PERMANENTLY_DELETE') : t('DEACTIVATE');
			if (!confirm(t('DELETE_CONFIRMATION', { action }))) {
				return;
			}

			await deleteCategory(id, hard);
		},
		[deleteCategory, t]
	);

	// Open create form
	const openCreateForm = () => {
		setSelectedCategory(null);
		setFormMode('create');
		onOpen();
	};

	// Open edit form
	const openEditForm = (category: CategoryData) => {
		setSelectedCategory(category);
		setFormMode('edit');
		onOpen();
	};

	// Handle form submission
	const handleFormSubmit = async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
		if (formMode === 'create') {
			await handleCreate(data as CreateCategoryRequest);
		} else {
			await handleUpdate(data as UpdateCategoryRequest);
		}
	};

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	const { isInitialLoad } = useNavigation();
	const shouldShowSkeleton = isInitialLoad && isLoading;

	if (shouldShowSkeleton) {
		return (
			<div className="p-6 max-w-7xl mx-auto">
				{/* Loading Header */}
				<div className="mb-8">
				<div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-white/6 shadow-lg p-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div className="flex items-center space-x-4">
								<div className="w-12 h-12 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse"></div>
								<div>
									<div className="h-8 w-48 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2"></div>
									<div className="h-4 w-64 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
								</div>
							</div>
							<div className="h-12 w-32 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse"></div>
						</div>
					</div>
				</div>

				{/* Loading Stats */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					{Array.from({ length: 4 }, (_, i) => (
						<Card key={i} className="border-0 shadow-lg">
							<CardBody className="p-6">
								<div className="flex items-center justify-between">
									<div className="flex-1">
										<div className="h-4 w-24 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse mb-2"></div>
										<div className="h-8 w-16 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
									</div>
									<div className="w-12 h-12 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse"></div>
								</div>
							</CardBody>
						</Card>
					))}
				</div>

				{/* Loading Table */}
				<Card className="border-0 shadow-lg">
					<CardBody className="p-0">
						<div className="px-6 py-4 border-b border-gray-100 dark:border-white/6 bg-gray-50/50 dark:bg-white/3">
							<div className="flex items-center justify-between">
								<div className="h-6 w-24 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
								<div className="h-4 w-32 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
							</div>
						</div>
						<div className="divide-y divide-gray-100 dark:divide-white/6">
							{Array.from({ length: 5 }, (_, i) => (
								<div key={i} className="px-6 py-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-4 flex-1">
											<div className="flex items-center space-x-2">
												<div className="w-4 h-4 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
												<div className="w-8 h-6 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
											</div>
											<div className="flex items-center space-x-3">
												<div className="w-4 h-4 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse"></div>
												<div className="w-6 h-6 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
												<div className="flex-1">
													<div className="h-5 w-32 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse mb-1"></div>
													<div className="h-3 w-24 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-4">
											<div className="w-16 h-6 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse"></div>
											<div className="flex space-x-1">
												<div className="w-8 h-8 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
												<div className="w-8 h-8 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardBody>
				</Card>

				{/* Loading indicator with text */}
				<div className="mt-8 text-center">
					<div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
						<div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
						<span className="text-sm font-medium">{t('LOADING_CATEGORIES')}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-7xl mx-auto">
			{/* Warning Banner - Categories Disabled */}
			{!categoriesEnabled && (
				<div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg shadow-md">
					<div className="flex items-start">
						<div className="shrink-0">
							<svg
								className="h-6 w-6 text-yellow-400 dark:text-yellow-500"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<div className="ml-3 flex-1">
							<h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
								{t('WARNING_DISABLED_TITLE')}
							</h3>
							<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
								<p>{t('WARNING_DISABLED_MESSAGE')}</p>
							</div>
							<div className="mt-4">
								<Link
									href="/admin/settings"
									className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
								>
									{t('WARNING_DISABLED_ACTION')}
									<svg
										className="ml-2 -mr-0.5 h-4 w-4"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Enhanced Header */}
			<div className="mb-8">
				<div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-white/6 shadow-lg p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center space-x-4">
							<div className="w-12 h-12 bg-linear-to-br from-theme-primary to-theme-accent rounded-xl flex items-center justify-center shadow-lg">
								<FolderTree className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
									{t('TITLE')}
								</h1>
								<p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-2">
									<span>{t('SUBTITLE')}</span>
									<span className="hidden sm:inline">•</span>
									<span className="text-sm px-2 py-1 bg-theme-primary/10 text-theme-primary rounded-full font-medium">
										{totalCategories} {t('TOTAL')}
									</span>
								</p>
							</div>
						</div>
						<Button
							color="primary"
							size="lg"
							onPress={openCreateForm}
							startContent={<Plus size={18} />}
							className="bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/40 transition-all duration-300 text-white font-medium"
						>
							{t('ADD_CATEGORY')}
						</Button>
					</div>
				</div>
			</div>

			{/* Enhanced Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<Card className="border-0 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
					<CardBody className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
									{t('TOTAL_CATEGORIES')}
								</p>
								<p className="text-3xl font-bold text-blue-700 dark:text-blue-300 group-hover:scale-105 transition-transform">
									{totalCategories}
								</p>
							</div>
							<div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
								<FolderTree className="w-6 h-6 text-white" />
							</div>
						</div>
					</CardBody>
				</Card>

				<Card className="border-0 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
					<CardBody className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
									{t('ACTIVE_CATEGORIES')}
								</p>
								<p className="text-3xl font-bold text-green-700 dark:text-green-300 group-hover:scale-105 transition-transform">
									{categories.filter((category) => !category.isInactive).length}
								</p>
							</div>
							<div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
								<Eye className="w-6 h-6 text-white" />
							</div>
						</div>
					</CardBody>
				</Card>
			</div>

			{/* Categories Table */}
			<Card className="border-0 shadow-lg bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xs">
				<CardBody className="p-0">
					{/* Table Header */}
					<div className="px-6 py-4 border-b border-gray-100 dark:border-white/6 bg-gray-50/50 dark:bg-white/3">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								{t('CATEGORIES_TITLE')}
							</h3>
							<div className="text-sm text-gray-500 dark:text-gray-400">
								{categories.length} of {totalCategories} {t('CATEGORIES_COUNT')}
							</div>
						</div>
					</div>

					{/* Enhanced Table Content */}
					<div className="divide-y divide-gray-100 dark:divide-white/6">
						{categories.map((category) => (
							<div
								key={category.id}
								className="group hover:bg-linear-to-r hover:from-theme-primary/5 hover:to-theme-accent/5 dark:hover:from-theme-primary/10 dark:hover:to-theme-accent/10 transition-all duration-200"
							>
								<div className="px-6 py-4">
									<div className="flex items-center justify-between">
										{/* Left Section: Category Info */}
										<div className="flex items-center space-x-4 flex-1 min-w-0">
											{/* Category Details */}
											<div className="flex items-center space-x-3 flex-1 min-w-0">
												{/* Category Icon */}
												<div className="w-8 h-8 bg-linear-to-br from-theme-primary to-theme-accent rounded-lg flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
													<FolderTree size={16} className="text-white" />
												</div>

												{/* Category Details */}
												<div className="flex-1 min-w-0">
													<div className="flex items-center space-x-2">
														<h4 className="font-medium text-gray-900 dark:text-white group-hover:text-theme-primary transition-colors truncate">
															{category.name}
														</h4>
													</div>
													<div className="flex items-center space-x-4 mt-1">
														<p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
															{t('ID_LABEL')} {category.id}
														</p>
													</div>
												</div>
											</div>
										</div>

										{/* Right Section: Actions */}
										<div className="flex items-center space-x-4">
											{/* Category Status */}
											<div className="hidden sm:block">
												<Chip
													size="sm"
													variant="flat"
													color={category.isInactive ? 'danger' : 'success'}
													startContent={
														<div className="flex items-center">
															{category.isInactive ? (
																<EyeOff size={12} className="mr-1" />
															) : (
																<Eye size={12} className="mr-1" />
															)}
														</div>
													}
													className="transition-all duration-200 group-hover:shadow-md"
												>
													{category.isInactive ? t('INACTIVE') : t('ACTIVE')}
												</Chip>
											</div>

											{/* Action Buttons */}
											<div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
												<Button
													size="sm"
													variant="ghost"
													onPress={() => openEditForm(category)}
													className="h-8 w-8 p-0 hover:bg-theme-primary/10 hover:text-theme-primary"
												>
													<Edit size={14} />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onPress={() => handleDelete(category.id)}
													className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
												>
													<Trash2 size={14} />
												</Button>
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Empty State */}
					{categories.length === 0 && (
						<div className="px-6 py-16 text-center">
							<div className="max-w-sm mx-auto">
								<div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-theme-primary/10 to-theme-accent/10 rounded-full flex items-center justify-center">
									<FolderTree className="w-8 h-8 text-theme-primary opacity-60" />
								</div>
								<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
									{t('NO_CATEGORIES_FOUND')}
								</h3>
								<p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
									{t('NO_CATEGORIES_DESCRIPTION')}
								</p>
								<Button
									color="primary"
									onPress={openCreateForm}
									startContent={<Plus size={16} />}
									className="shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/40 transition-all duration-300"
								>
									{t('CREATE_FIRST_CATEGORY')}
								</Button>
							</div>
						</div>
					)}
				</CardBody>
			</Card>

			{/* Enhanced Pagination and Stats */}
			{totalCategories > 0 && (
				<div className="mt-8 space-y-6">
					{/* Results Info */}
					<div className="bg-linear-to-r from-gray-50 to-white dark:from-[#0a0a0a] dark:to-[#0a0a0a] rounded-xl border border-gray-100 dark:border-white/6 px-6 py-4 shadow-xs">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-theme-primary rounded-full"></div>
								<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
									{t('SHOWING_RANGE', {
										start: (page - 1) * limit + 1,
										end: Math.min(page * limit, totalCategories),
										total: totalCategories
									})}
								</span>
							</div>
							<div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
								<span>{t('PAGE_OF', { current: page, total: totalPages })}</span>
								<span>•</span>
								<span>
									{limit} {t('PER_PAGE')}
								</span>
							</div>
						</div>
					</div>

					{/* Pagination Controls */}
					<div className="flex justify-center">
						<UniversalPagination
							page={page}
							totalPages={totalPages}
							onPageChange={handlePageChange}
							className="shadow-lg"
						/>
					</div>
				</div>
			)}

			{/* Form Modal - Using Reliable CSS Modal */}
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div
						className="fixed inset-0 bg-black bg-opacity-60"
						onClick={() => {
							if (!isSubmitting) {
								onClose();
							}
						}}
					/>
					<div className="relative bg-white dark:bg-white/3 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
						<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/6">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								{formMode === 'create' ? t('CREATE_CATEGORY') : t('EDIT_CATEGORY')}
							</h2>
							{!isSubmitting && (
								<button
									onClick={onClose}
									className="p-1 hover:bg-gray-100 dark:hover:bg-white/6 rounded-sm transition-colors"
								>
									<svg
										className="w-5 h-5 text-gray-500 dark:text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							)}
						</div>
						<div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
							<CategoryForm
								category={selectedCategory || undefined}
								onSubmit={handleFormSubmit}
								onCancel={onClose}
								isLoading={isSubmitting}
								mode={formMode}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
