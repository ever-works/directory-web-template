'use client';

import { useState, useMemo } from 'react';
import { Button, Card, CardBody, Input, Chip } from '@heroui/react';
import { Building2, Search, X, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDebounceValue } from '@/hooks/use-debounced-value';
import { useAdminCompanies } from '@/hooks/use-admin-companies';
import type { Company } from '@/types/company';

export interface CompanySelectorProps {
	/** Currently assigned company (if any) */
	selectedCompany: Company | null;
	/** Loading state for fetching current assignment */
	isLoading?: boolean;
	/** Whether company is being assigned */
	isAssigning?: boolean;
	/** Whether company is being removed */
	isRemoving?: boolean;
	/** Callback when company is selected */
	onSelect: (companyId: string) => void;
	/** Callback when company assignment is removed */
	onRemove: () => void;
	/** Optional className for the container */
	className?: string;
	/** Whether the selector is disabled */
	disabled?: boolean;
}

/**
 * Company Selector Component
 * Provides a searchable dropdown for selecting and managing company assignments
 * Features debounced search and displays currently assigned company
 */
export function CompanySelector({
	selectedCompany,
	isLoading = false,
	isAssigning = false,
	isRemoving = false,
	onSelect,
	onRemove,
	className = '',
	disabled = false,
}: CompanySelectorProps) {
	const t = useTranslations('admin.ITEM_COMPANY');
	const [searchTerm, setSearchTerm] = useState('');
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// Debounced search
	const debouncedSearchTerm = useDebounceValue(searchTerm, 300);
	const isSearching = searchTerm !== debouncedSearchTerm && searchTerm.trim() !== '';

	// Fetch companies with search
	const { companies, isLoading: isLoadingCompanies } = useAdminCompanies({
		params: {
			search: debouncedSearchTerm,
			status: 'active', // Only show active companies
			limit: 10,
			sortBy: 'name',
			sortOrder: 'asc',
		},
		enabled: isDropdownOpen,
	});

	// Filter out currently selected company from results
	const availableCompanies = useMemo(() => {
		if (!selectedCompany) return companies;
		return companies.filter((c) => c.id !== selectedCompany.id);
	}, [companies, selectedCompany]);

	const handleSelect = (companyId: string) => {
		onSelect(companyId);
		setIsDropdownOpen(false);
		setSearchTerm('');
	};

	const handleRemove = () => {
		onRemove();
		setIsDropdownOpen(false);
	};

	const isOperating = isAssigning || isRemoving;
	const showSpinner = isSearching || isLoadingCompanies;

	return (
		<div className={`relative ${className}`}>
			<Card className="border-0 shadow-lg">
				<CardBody className="p-6">
					<div className="space-y-4">
						{/* Header */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<Building2 className="w-5 h-5 text-gray-400" />
								<span className="font-medium text-gray-900 dark:text-white">{t('TITLE')}</span>
							</div>
							{selectedCompany && (
								<Button
									size="sm"
									variant="light"
									color="danger"
									onPress={handleRemove}
									isDisabled={disabled || isOperating}
									isLoading={isRemoving}
									startContent={!isRemoving ? <X className="w-4 h-4" /> : undefined}
								>
									{t('REMOVE')}
								</Button>
							)}
						</div>

						{/* Current Assignment Display */}
						{isLoading ? (
							<div className="flex items-center justify-center py-4">
								<Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
							</div>
						) : selectedCompany ? (
							<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center space-x-2 mb-2">
											<p className="font-medium text-gray-900 dark:text-white">{selectedCompany.name}</p>
											<Chip size="sm" color="success" variant="flat">
												{t('ASSIGNED')}
											</Chip>
										</div>
										{selectedCompany.website && (
											/^https?:\/\//i.test(selectedCompany.website) ? (
												<a
													href={selectedCompany.website}
													target="_blank"
													rel="noopener noreferrer nofollow"
													className="text-sm text-theme-primary hover:underline"
												>
													{selectedCompany.website}
												</a>
											) : (
												<span className="text-sm text-gray-500 dark:text-gray-400">
													{selectedCompany.website}
												</span>
											)
										)}
										{selectedCompany.domain && (
											<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
												{t('DOMAIN')}: {selectedCompany.domain}
											</p>
										)}
									</div>
								</div>
							</div>
						) : (
							<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t('NO_COMPANY')}</p>
							</div>
						)}

						{/* Search & Selection */}
						<div className="space-y-2">
							<Input
								placeholder={t('SEARCH_PLACEHOLDER')}
								value={searchTerm}
								onValueChange={setSearchTerm}
								onFocus={() => setIsDropdownOpen(true)}
								startContent={<Search className="w-4 h-4 text-gray-400" />}
								endContent={
									showSpinner ? (
										<div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
									) : undefined
								}
								isClearable
								onClear={() => setSearchTerm('')}
								isDisabled={disabled || isOperating}
								classNames={{
									input: 'text-sm',
									inputWrapper: 'h-12',
								}}
							/>

							{/* Dropdown Results */}
							{isDropdownOpen && (
								<Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto shadow-xl">
									<CardBody className="p-0">
										{availableCompanies.length === 0 ? (
											<div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
												{searchTerm ? t('NO_RESULTS') : t('NO_COMPANIES')}
											</div>
										) : (
											<div className="divide-y divide-gray-100 dark:divide-gray-800">
												{availableCompanies.map((company) => (
													<button
														key={company.id}
														type="button"
														onClick={() => handleSelect(company.id)}
														disabled={isOperating}
														className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													>
														<div className="flex items-center justify-between">
															<div className="flex-1">
																<p className="font-medium text-gray-900 dark:text-white text-sm">
																	{company.name}
																</p>
																{company.website && (
																	<p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
																		{company.website}
																	</p>
																)}
															</div>
															{selectedCompany?.id === company.id && (
																<Check className="w-4 h-4 text-theme-primary" />
															)}
														</div>
													</button>
												))}
											</div>
										)}
									</CardBody>
								</Card>
							)}
						</div>

						{/* Helper Text */}
						<p className="text-xs text-gray-500 dark:text-gray-400">{t('HELPER_TEXT')}</p>
					</div>
				</CardBody>
			</Card>

			{/* Backdrop to close dropdown */}
			{isDropdownOpen && (
				<div
					role="button"
					tabIndex={0}
					aria-label={t('CLOSE_DROPDOWN')}
					className="fixed inset-0 z-40"
					onClick={() => {
						setIsDropdownOpen(false);
						setSearchTerm('');
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
							e.preventDefault();
							setIsDropdownOpen(false);
							setSearchTerm('');
						}
					}}
				/>
			)}
		</div>
	);
}
