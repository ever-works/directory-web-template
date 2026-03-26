import { Pagination, cn } from '@heroui/react';

interface UniversalPaginationProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	className?: string;
}

export function UniversalPagination({ page, totalPages, onPageChange, className = '' }: UniversalPaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div className={cn('flex flex-col items-center gap-3 mt-6 mb-8 px-2 w-full', className)}>
			{/* Page info - small */}
			<div className="text-center">
				<p className="text-xs text-gray-500 dark:text-gray-400">
					Page <span className="font-medium text-theme-primary dark:text-theme-primary">{page}</span> of{' '}
					<span className="font-medium text-theme-primary dark:text-theme-primary">{totalPages}</span>
				</p>
			</div>

			{/* Modern compact pagination */}
			<Pagination
				showControls
				total={totalPages}
				page={page}
				onChange={onPageChange}
				radius="sm"
				size="sm"
				classNames={{
					wrapper: 'gap-1',
					item: cn(
						'w-7 h-7 text-xs font-medium transition-colors',
						'bg-transparent hover:bg-gray-100 dark:hover:bg-white/10',
						'text-gray-700 dark:text-gray-300',
						'border border-gray-200 dark:border-white/10',
						'data-[active=true]:bg-theme-primary data-[active=true]:text-white data-[active=true]:border-theme-primary',
						'data-[active=true]:hover:bg-theme-primary/90',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					),
					cursor: cn(
						'w-7 h-7 text-xs font-medium', // Same dimensions as regular items
						'bg-theme-primary! text-white',
						'border border-theme-primary',
						'shadow-none'
					),
					prev: cn(
						'w-7 h-7 text-xs font-medium transition-colors',
						'bg-transparent hover:bg-gray-100 dark:hover:bg-white/10',
						'text-gray-600 dark:text-gray-400',
						'border border-gray-200 dark:border-white/10',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					),
					next: cn(
						'w-7 h-7 text-xs font-medium transition-colors',
						'bg-transparent hover:bg-gray-100 dark:hover:bg-white/10',
						'text-gray-600 dark:text-gray-400',
						'border border-gray-200 dark:border-white/10',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					)
				}}
			/>
		</div>
	);
}

export default UniversalPagination;
