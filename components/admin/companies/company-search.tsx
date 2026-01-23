'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CompanySearchProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	isSearching?: boolean;
}

const SEARCH_INPUT_CLASSES =
	'w-full pl-12 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400';

/**
 * Company Search Component
 * Standalone search input for admin companies page
 */
export function CompanySearch({ searchTerm, onSearchChange, isSearching }: CompanySearchProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	const handleClearSearch = () => {
		onSearchChange('');
	};

	return (
		<div className="mb-6">
			<div className="relative">
				<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					type="text"
					placeholder={t('SEARCH_PLACEHOLDER')}
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
					aria-label={t('SEARCH_PLACEHOLDER')}
					className={SEARCH_INPUT_CLASSES}
				/>
				{/* Loading spinner or clear button */}
				{isSearching ? (
					<div className="absolute right-4 top-1/2 transform -translate-y-1/2">
						<LoadingSpinner size="sm" />
					</div>
				) : searchTerm ? (
					<button
						type="button"
						onClick={handleClearSearch}
						className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						aria-label={t('CLEAR_SEARCH')}
					>
						<X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
					</button>
				) : null}
			</div>
		</div>
	);
}
