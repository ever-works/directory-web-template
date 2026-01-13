'use client';
import UniversalPagination from '@/components/universal-pagination';

interface CollectionsPaginationProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function CollectionsPagination({ page, totalPages, onPageChange }: CollectionsPaginationProps) {
	if (totalPages <= 1) {
		return null;
	}

	return (
		<footer className="flex items-center justify-center py-6 bg-linear-to-t from-white dark:from-gray-900 to-transparent">
			<UniversalPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
		</footer>
	);
}
