'use client';

import { useState } from 'react';
import { Search, Filter, Calendar, CreditCard, X, RefreshCw, Download } from 'lucide-react';

interface SearchAndFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	onRefresh: () => void;
	isRefreshing: boolean;
	totalResults: number;
	selectedStatuses?: string[];
	onStatusChange?: (statuses: string[]) => void;
	onExport?: () => void;
}

interface FilterOption {
	id: string;
	label: string;
	value: string;
}

const STATUS_OPTIONS: FilterOption[] = [
	{ id: 'paid', label: 'Paid', value: 'paid' },
	{ id: 'pending', label: 'Pending', value: 'pending' },
	{ id: 'failed', label: 'Failed', value: 'failed' },
	{ id: 'draft', label: 'Draft', value: 'draft' }
];

const CARD = 'bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8';
const ICON_TILE = 'p-2 bg-neutral-100 dark:bg-white/8 rounded-lg shrink-0 flex items-center justify-center';
const ICON = 'h-4 w-4 text-neutral-500 dark:text-neutral-400';
const OUTLINE_BTN =
	'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors disabled:opacity-50';

export function SearchAndFilters({
	searchTerm,
	onSearchChange,
	onRefresh,
	isRefreshing,
	totalResults,
	selectedStatuses,
	onStatusChange,
	onExport
}: SearchAndFiltersProps) {
	const [showFilters, setShowFilters] = useState(false);
	const [localFilters, setLocalFilters] = useState<string[]>([]);
	const selectedFilters = selectedStatuses ?? localFilters;

	const setFilters = (next: string[]) => {
		if (onStatusChange) onStatusChange(next);
		else setLocalFilters(next);
	};

	const handleFilterToggle = (value: string) => {
		setFilters(
			selectedFilters.includes(value)
				? selectedFilters.filter((f) => f !== value)
				: [...selectedFilters, value]
		);
	};

	const clearAll = () => {
		setFilters([]);
		onSearchChange('');
	};

	const hasActiveFilters = selectedFilters.length > 0 || searchTerm.length > 0;

	return (
		<div className={`${CARD} p-5`}>
			{/* Header row */}
			<div className="flex items-center gap-3 mb-3">
				<div className={ICON_TILE}>
					<Search className={ICON} />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold text-neutral-900 dark:text-white">Search & Filters</p>
					<p className="text-xs text-neutral-500 dark:text-neutral-400">
						{totalResults} result{totalResults !== 1 ? 's' : ''}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<button
						onClick={() => setShowFilters(!showFilters)}
						className={`${OUTLINE_BTN} ${showFilters ? 'bg-neutral-100 dark:bg-white/8' : ''}`}
					>
						<Filter className="h-3.5 w-3.5" />
						Filters
						{selectedFilters.length > 0 && (
							<span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full">
								{selectedFilters.length}
							</span>
						)}
					</button>
					<button onClick={onRefresh} disabled={isRefreshing} className={OUTLINE_BTN}>
						<RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
						<span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
					</button>
					{onExport && (
						<button
							onClick={onExport}
							disabled={totalResults === 0}
							className={OUTLINE_BTN}
						>
							<Download className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Export</span>
						</button>
					)}
				</div>
			</div>

			{/* Search input */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
				<input
					type="text"
					placeholder="Search by plan, description, status…"
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
					className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-50 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-white/20 transition-colors"
				/>
				{searchTerm && (
					<button
						onClick={() => onSearchChange('')}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			{/* Expandable filter panel */}
			{showFilters && (
				<div className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/[0.06]">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Status chips */}
						<div>
							<div className="flex items-center gap-1.5 mb-2">
								<CreditCard className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
								<span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Payment Status</span>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{STATUS_OPTIONS.map((opt) => {
									const active = selectedFilters.includes(opt.value);
									return (
										<button
											key={opt.id}
											onClick={() => handleFilterToggle(opt.value)}
											className={`inline-flex items-center h-7 px-2.5 text-xs font-medium rounded-md border transition-colors ${
												active
													? 'bg-neutral-900 dark:bg-white border-transparent text-white dark:text-neutral-900'
													: 'bg-white dark:bg-white/4 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6'
											}`}
										>
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Advanced placeholder */}
						<div>
							<div className="flex items-center gap-1.5 mb-2">
								<Calendar className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
								<span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Date Range</span>
							</div>
							<div className="h-7 flex items-center">
								<span className="text-xs text-neutral-400 dark:text-neutral-500">Coming soon</span>
							</div>
						</div>
					</div>

					{/* Active filter chips + clear */}
					{hasActiveFilters && (
						<div className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/[0.06] flex items-center gap-2 flex-wrap">
							{searchTerm && (
								<span className="inline-flex items-center gap-1 h-6 pl-2 pr-1 text-xs bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300 rounded-full border border-neutral-200 dark:border-white/10">
									&quot;{searchTerm}&quot;
									<button onClick={() => onSearchChange('')} className="hover:text-neutral-900 dark:hover:text-white">
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{selectedFilters.map((f) => (
								<span
									key={f}
									className="inline-flex items-center gap-1 h-6 pl-2 pr-1 text-xs bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300 rounded-full border border-neutral-200 dark:border-white/10"
								>
									{f}
									<button onClick={() => handleFilterToggle(f)} className="hover:text-neutral-900 dark:hover:text-white">
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
							<button
								onClick={clearAll}
								className="ml-auto text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
							>
								Clear all
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
