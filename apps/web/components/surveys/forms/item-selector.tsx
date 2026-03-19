'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Package, Search, ChevronDown, X } from 'lucide-react';
import Image from 'next/image';
import { Logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';

const logger = Logger.create('ItemSelector');

interface Item {
	id: string;
	name: string;
	slug: string;
	icon_url?: string | null;
}

interface ItemSelectorProps {
	selectedItemId?: string;
	onItemSelect: (itemId: string) => void;
	disabled?: boolean;
	required?: boolean;
	label?: string;
	placeholder?: string;
}

export function ItemSelector({
	selectedItemId,
	onItemSelect,
	disabled = false,
	required = false,
	label,
	placeholder
}: ItemSelectorProps) {
	const tCommon = useTranslations('common');
	const [items, setItems] = useState<Item[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const controller = new AbortController();
		fetchItems(controller.signal);
		return () => controller.abort();
	}, []);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
				setSearchQuery('');
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	// Focus search input when dropdown opens
	useEffect(() => {
		if (isOpen && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [isOpen]);

	const fetchItems = async (signal?: AbortSignal) => {
		try {
			setIsLoading(true);
			const response = await fetch('/api/admin/items?limit=100&status=approved', { signal });

			if (!response.ok) {
				throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			if (data.success && data.items) {
				setItems(data.items);
			}
		} catch (error) {
			// Ignore intentional aborts
			if ((error as any)?.name === 'AbortError')
				return;
			logger.error('Error fetching items', error);
		} finally {
			if (!signal?.aborted) setIsLoading(false);
		}
	};

	const filteredItems = items.filter(item =>
		item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		item.id.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const selectedItem = items.find(item => item.id === selectedItemId);

	const handleSelectItem = (itemId: string) => {
		onItemSelect(itemId);
		setIsOpen(false);
		setSearchQuery('');
	};

	const handleClearSelection = (e: React.MouseEvent) => {
		e.stopPropagation();
		onItemSelect('');
	};

	return (
		<div className="w-full">
			<label htmlFor="item-selector-search" className="block text-sm font-medium mb-2">
				{label} {required && <span className="text-red-500">*</span>}
			</label>

			<div className="relative" ref={dropdownRef}>
				{/* Combobox Trigger Button */}
				<button
					type="button"
					onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
					disabled={disabled || isLoading}
					className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2 text-left"
				>
					{isLoading ? (
						<span className="text-gray-500 dark:text-gray-400"> {tCommon('LOADING_ITEMS')}</span>
					) : selectedItem ? (
						<div className="flex items-center gap-2 flex-1 min-w-0">
							{selectedItem.icon_url ? (
								<Image
									src={selectedItem.icon_url}
									alt={selectedItem.name}
									className="rounded-sm object-cover shrink-0"
									width={24}
									height={24}
								/>
							) : (
								<div className="w-6 h-6 rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
									<Package className="w-3 h-3 text-gray-400" aria-hidden="true" focusable="false" />
								</div>
							)}
							<span className="font-medium text-gray-900 dark:text-white truncate">{selectedItem.name}</span>
						</div>
					) : (
						<span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
					)}

					<div className="flex items-center gap-1 shrink-0">
						{selectedItem && !disabled && (
							<button
								type="button"
								onClick={handleClearSelection}
								aria-label="Clear selection"
								className="absolute right-9 top-2.5 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 z-10"
							>
								<X className="w-4 h-4 text-gray-400" aria-hidden="true" focusable="false" />
							</button>
						)}
						<ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} aria-hidden="true" focusable="false" />
					</div>
				</button>

				{/* Dropdown */}
				{isOpen && !isLoading && (
					<div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
						{/* Search Input */}
						<div className="p-2 border-b border-gray-200 dark:border-gray-700">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" focusable="false" />
								<input
									id="item-selector-search"
									ref={searchInputRef}
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder={tCommon('SEARCH_ITEMS')}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
								/>
							</div>
						</div>

						{/* Items List */}
						<div className="max-h-64 overflow-y-auto">
							{filteredItems.length === 0 ? (
								<div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
									<Package className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" focusable="false" />
									<p className="text-sm"> {tCommon('NO_ITEMS_FOUND')}</p>
									{searchQuery && (
										<p className="text-xs mt-1"> {tCommon('TRY_DIFFERENT_SEARCH')}</p>
									)}
								</div>
							) : (
								<div className="divide-y divide-gray-200 dark:divide-gray-700">
									{filteredItems.map((item) => (
										<button
											key={item.id}
											type="button"
											onClick={() => handleSelectItem(item.id)}
											className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedItemId === item.id
												? 'bg-blue-50 dark:bg-blue-900/20'
												: ''
												}`}
										>
											<div className="flex items-center gap-3">
												{item.icon_url ? (
													<Image
														src={item.icon_url}
														alt={item.name}
														className="rounded-sm object-cover shrink-0"
														width={24}
														height={24}
													/>
												) : (
													<div className="w-8 h-8 rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
														<Package className="w-4 h-4 text-gray-400" aria-hidden="true" focusable="false" />
													</div>
												)}
												<div className="flex-1 min-w-0">
													<p className={`font-medium truncate ${selectedItemId === item.id
														? 'text-blue-600 dark:text-blue-400'
														: 'text-gray-900 dark:text-white'
														}`}>
														{item.name}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
														{tCommon('ID_LABEL')}: {item.id}
													</p>
												</div>
												{selectedItemId === item.id && (
													<div className="shrink-0">
														<div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
															<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
																<title>Selected</title>
																<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
															</svg>
														</div>
													</div>
												)}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

