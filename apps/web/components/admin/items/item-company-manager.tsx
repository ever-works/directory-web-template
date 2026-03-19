'use client';

import { CompanySelector } from '@/components/admin/companies/company-selector';
import { useItemCompany } from '@/hooks/use-item-company';

export interface ItemCompanyManagerProps {
	/** The slug of the item to manage */
	itemSlug: string;
	/** Optional className for the container */
	className?: string;
}

/**
 * Item Company Manager Component
 * Manages company assignment for a specific item
 * Integrates CompanySelector with useItemCompany hook
 */
export function ItemCompanyManager({ itemSlug, className = '' }: ItemCompanyManagerProps) {
	const { company, isLoading, isAssigning, isRemoving, assignCompany, removeCompany } = useItemCompany({
		itemSlug,
		enabled: !!itemSlug,
	});

	return (
		<CompanySelector
			selectedCompany={company}
			isLoading={isLoading}
			isAssigning={isAssigning}
			isRemoving={isRemoving}
			onSelect={assignCompany}
			onRemove={removeCompany}
			className={className}
		/>
	);
}
