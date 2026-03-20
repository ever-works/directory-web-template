'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Checkbox } from '@heroui/react';
import { Search, Save, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { UniversalPagination } from '@/components/universal-pagination';
import { useAdminItems } from '@/hooks/use-admin-items';
import { Button } from '@/components/ui/button';

interface AssignItemsModalProps {
	isOpen: boolean;
	onClose: () => void;
	collectionName: string;
	initialSelected: string[]; // Array of item slugs
	onSave: (itemSlugs: string[]) => Promise<void>;
}

export function AssignItemsModal({ isOpen, onClose, collectionName: _collectionName, initialSelected, onSave }: AssignItemsModalProps) {
	const t = useTranslations('common');
	const tListing = useTranslations('listing');
	const PageSize = 50;
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelected));
	const [saving, setSaving] = useState(false);
	const listRef = useRef<HTMLDivElement | null>(null);

	const { items, total, totalPages, isLoading, isSubmitting, refetch } = useAdminItems({
		page,
		limit: PageSize,
		search
	});

	useEffect(() => {
		if (isOpen) {
			setSelectedIds(new Set(initialSelected));
		}
	}, [initialSelected, isOpen]);

	// Refetch when modal opens - React Query already refetches automatically when page/search change
	// (they're part of the query key in useAdminItems)
	useEffect(() => {
		if (isOpen) {
			refetch();
		}
	}, [isOpen, refetch]);

	const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

	const toggleSelection = (slug: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) {
				next.delete(slug);
			} else {
				next.add(slug);
			}
			return next;
		});
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			await onSave(Array.from(selectedIds));
			onClose();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to save items';
			toast.error(message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="3xl">
			<ModalContent>
				<ModalHeader>
					<div className="flex w-full items-center justify-between">
						<div>
							<h3 className="text-lg font-semibold">{t('ASSIGN_ITEMS')}</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">{t('SELECT_ITEMS_DESCRIPTION')}</p>
						</div>
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
							{t('SELECTED_COUNT', { count: selectedCount })}
						</span>
					</div>
				</ModalHeader>

				<ModalBody>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
							<Input
								placeholder={t('SEARCH_ITEMS')}
								startContent={<Search size={16} />}
								value={search}
								onChange={(e) => {
									setPage(1);
									setSearch(e.target.value);
								}}
								className="sm:w-80"
							/>
							<div className="text-sm text-gray-600 dark:text-gray-400">
								{tListing('FILTER_STATUS', { filtered: items.length, total })}
							</div>
						</div>

						<div
							ref={listRef}
							className="border border-gray-200 dark:border-white/6 rounded-lg divide-y divide-gray-100 dark:divide-white/6 max-h-[420px] overflow-auto"
						>
							{isLoading ? (
								<div className="p-6 text-center text-sm text-gray-500">{t('LOADING_ITEMS')}</div>
							) : items.length === 0 ? (
								<div className="p-6 text-center text-sm text-gray-500">{t('NO_ITEMS_FOUND')}</div>
							) : (
								items.map((item) => (
									<label
										key={item.slug}
										className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors"
									>
										<Checkbox
											isSelected={selectedIds.has(item.slug)}
											onValueChange={() => toggleSelection(item.slug)}
										/>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium text-gray-900 dark:text-white truncate">
													{item.name}
												</span>
												<span className="text-xs text-gray-500">{item.status}</span>
											</div>
											<p className="text-xs text-gray-500 truncate">{item.slug}</p>
										</div>
									</label>
								))
							)}
						</div>

						{totalPages > 1 && (
							<div className="pt-2">
								<UniversalPagination
									page={page}
									totalPages={totalPages}
									onPageChange={(next) => {
										setPage(next);
										const target = listRef.current;
										if (target) {
											target.scrollTo({ top: 0, behavior: 'smooth' });
										}
									}}
								/>
							</div>
						)}
					</div>
				</ModalBody>

				<ModalFooter>
					<div className="flex w-full justify-end gap-3">
						<Button
							variant="outline"
							onClick={onClose}
							className="flex items-center gap-2"
							disabled={saving || isSubmitting}
						>
							<X className="h-4 w-4" />
							{t('CANCEL')}
						</Button>
						<Button
							color="primary"
							onClick={handleSave}
							className="flex items-center gap-2 bg-theme-primary text-white"
							disabled={saving || isSubmitting}
							isLoading={saving || isSubmitting}
						>
							<Save className="h-4 w-4" />
							{t('SAVE_CHANGES')}
						</Button>
					</div>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
