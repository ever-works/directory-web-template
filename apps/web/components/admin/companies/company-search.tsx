'use client';

import { AdminSearchBar } from '@/components/admin/shared/admin-search-bar';
import { useTranslations } from 'next-intl';

interface CompanySearchProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	isSearching?: boolean;
}

/**
 * Company Search Component
 * Wrapper around AdminSearchBar for the companies page
 */
export function CompanySearch({ searchTerm, onSearchChange, isSearching }: CompanySearchProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	return (
		<div className="mb-6">
			<AdminSearchBar
				value={searchTerm}
				onChange={onSearchChange}
				isSearching={isSearching}
				placeholder={t('SEARCH_PLACEHOLDER')}
			/>
		</div>
	);
}
