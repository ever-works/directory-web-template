'use client';

import { useFilters } from '@/hooks/use-filters';
import { Search } from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvent } from '@/lib/analytics/types';

export function HomeTwoSearchBar() {
	const { searchTerm, setSearchTerm } = useFilters();
	const { track } = useAnalytics();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchTerm && searchTerm.trim().length >= 3) {
			track(AnalyticsEvent.SEARCH_PERFORMED, {
				query: searchTerm.trim(),
				location: 'home_hero'
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="relative w-full">
			<div className="absolute left-0 top-0 p-2 pointer-events-none">
				<Search className="w-4 h-4 text-gray-400" />
			</div>
			<input
				type="text"
				placeholder="Search any product you need..."
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
				className="pl-8 w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/8 rounded-md  pr-10 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-hidden transition-colors duration-300 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 min-w-96"
			/>

			{searchTerm && (
				<button
					onClick={() => setSearchTerm('')}
					className="absolute right-0 pr-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300"
					type="button"
				>
					×
				</button>
			)}
		</form>
	);
}
