'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { isExternalUrl } from '@/lib/utils/custom-navigation';
import type { CustomNavigationItem } from '@/lib/content';

interface CustomNavigationManagerProps {
	type: 'header' | 'footer';
	items: CustomNavigationItem[];
	onUpdate: (items: CustomNavigationItem[]) => Promise<void>;
	disabled?: boolean;
}

// Internal type with unique ID for React keys
interface NavigationItemWithId extends CustomNavigationItem {
	id: string;
}

export function CustomNavigationManager({ type, items, onUpdate, disabled = false }: CustomNavigationManagerProps) {
	// Generate unique IDs for items - use ref to maintain stable function reference
	const generateId = useRef(() => `nav-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`).current;

	// Convert items to internal format with IDs
	const itemsWithIds = useCallback(
		(itemsToConvert: CustomNavigationItem[]): NavigationItemWithId[] =>
			itemsToConvert.map((item) => ({ ...item, id: generateId() })),
		// generateId is stable via useRef, no need to include in dependencies
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	const [localItems, setLocalItems] = useState<NavigationItemWithId[]>(() => itemsWithIds(items));
	const [isSaving, setIsSaving] = useState(false);

	// Sync localItems with items prop when it changes (after save or external update)
	useEffect(() => {
		setLocalItems(itemsWithIds(items));
	}, [items, itemsWithIds]);

	const addItem = () => {
		setLocalItems([
			...localItems,
			{
				id: generateId(),
				label: '',
				path: ''
			}
		]);
	};

	const removeItem = (id: string) => {
		setLocalItems(localItems.filter((item) => item.id !== id));
	};

	const updateItem = (id: string, field: 'label' | 'path', value: string) => {
		setLocalItems(localItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
	};

	const moveItem = (id: string, direction: 'up' | 'down') => {
		const index = localItems.findIndex((item) => item.id === id);
		if (index === -1) return;

		if ((direction === 'up' && index === 0) || (direction === 'down' && index === localItems.length - 1)) {
			return;
		}

		const newItems = [...localItems];
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
		setLocalItems(newItems);
	};

	const handleSave = async () => {
		// Validate items
		for (let i = 0; i < localItems.length; i++) {
			const item = localItems[i];
			if (!item.label || !item.path) {
				toast.error(`Item ${i + 1} is incomplete. Please fill both label and path.`);
				return;
			}
		}

		setIsSaving(true);
		try {
			// Strip IDs before saving (onUpdate expects CustomNavigationItem[])
			const itemsToSave: CustomNavigationItem[] = localItems.map(({ id: _id, ...item }) => item);
			await onUpdate(itemsToSave);
			toast.success(`${type === 'header' ? 'Header' : 'Footer'} navigation updated successfully`);
		} catch (error) {
			console.error('Error saving navigation:', error);
			toast.error('Failed to save navigation. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{type === 'header' ? 'Header Links' : 'Footer Links'}
					</h4>
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
						{type === 'header'
							? 'Add custom links to the main navigation menu'
							: 'Add custom links to the footer section'}
					</p>
					{type === 'header' && (
						<div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-600 dark:text-gray-400 border border-blue-200 dark:border-blue-800">
							<strong>Examples:</strong> About → /about | Documentation → /pages/docs | Blog →
							https://blog.example.com
						</div>
					)}
					{type === 'footer' && (
						<div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-600 dark:text-gray-400 border border-blue-200 dark:border-blue-800">
							<strong>Examples:</strong> Privacy Policy → /pages/privacy-policy | Terms →
							/pages/terms-of-service | GitHub → https://github.com/example
						</div>
					)}
				</div>
				<Button
					type="button"
					onClick={addItem}
					size="sm"
					variant="outline"
					disabled={disabled || isSaving}
					className="flex items-center gap-2"
				>
					<Plus className="w-4 h-4" />
					Add Link
				</Button>
			</div>

			{localItems.length === 0 ? (
				<div className="text-center py-8 px-4 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-dashed border-gray-300 dark:border-white/[0.06]">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						No custom links configured. Click "Add Link" to get started.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{localItems.map((item, index) => {
						const canMoveUp = index > 0;
						const canMoveDown = index < localItems.length - 1;

						return (
							<div
								key={item.id}
								className="p-4 bg-white dark:bg-white/[0.05] rounded-lg border border-gray-200 dark:border-white/[0.06] space-y-3"
							>
								<div className="flex items-start gap-3">
									{/* Decorative drag handle indicator */}
									<div className="mt-2 text-gray-400" aria-hidden="true">
										<GripVertical className="w-5 h-5" />
									</div>

									{/* Move buttons */}
									<div className="flex flex-col gap-1 mt-2">
										<button
											type="button"
											onClick={() => moveItem(item.id, 'up')}
											disabled={disabled || isSaving || !canMoveUp}
											className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
											title="Move up"
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 15l7-7 7 7"
												/>
											</svg>
										</button>
										<button
											type="button"
											onClick={() => moveItem(item.id, 'down')}
											disabled={disabled || isSaving || !canMoveDown}
											className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
											title="Move down"
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M19 9l-7 7-7-7"
												/>
											</svg>
										</button>
									</div>

									{/* Form fields */}
									<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
										<div className="space-y-2">
											<Label htmlFor={`label-${item.id}`} className="text-xs font-medium">
												Label <span className="text-red-500">*</span>
											</Label>
											<Input
												id={`label-${item.id}`}
												value={item.label}
												onChange={(e) => updateItem(item.id, 'label', e.target.value)}
												placeholder={
													type === 'header'
														? 'About, Documentation, NAV_ABOUT, footer.HELP'
														: 'Privacy Policy, footer.TERMS_OF_SERVICE, footer.PRIVACY_POLICY'
												}
												disabled={disabled || isSaving}
												className="text-sm"
											/>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{type === 'header' ? (
													<>
														<strong>Plain text:</strong> About, Documentation, Blog |{' '}
														<strong>Translation key:</strong> NAV_ABOUT, footer.HELP,
														common.DOCS
													</>
												) : (
													<>
														<strong>Plain text:</strong> Privacy Policy, Terms |{' '}
														<strong>Translation key:</strong> footer.PRIVACY_POLICY,
														footer.TERMS_OF_SERVICE
													</>
												)}
											</p>
										</div>

										<div className="space-y-2">
											<Label htmlFor={`path-${item.id}`} className="text-xs font-medium">
												Path / URL <span className="text-red-500">*</span>
											</Label>
											<div className="relative">
												<Input
													id={`path-${item.id}`}
													value={item.path}
													onChange={(e) => updateItem(item.id, 'path', e.target.value)}
													placeholder={
														type === 'header'
															? '/about, /pages/docs, https://blog.example.com'
															: '/pages/privacy-policy, /pages/terms-of-service, https://github.com/example'
													}
													disabled={disabled || isSaving}
													className="text-sm pr-8"
												/>
												{isExternalUrl(item.path) && (
													<ExternalLink className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
												)}
											</div>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												<strong>Internal routes:</strong> /about, /contact |{' '}
												<strong>Markdown pages:</strong> /pages/docs, /pages/privacy-policy |{' '}
												<strong>External URLs:</strong> https://example.com
											</p>
										</div>
									</div>

									{/* Remove button */}
									<Button
										type="button"
										onClick={() => removeItem(item.id)}
										size="sm"
										variant="ghost"
										disabled={disabled || isSaving}
										className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{localItems.length > 0 && (
				<div className="flex justify-end pt-2">
					<Button
						type="button"
						onClick={handleSave}
						disabled={disabled || isSaving}
						className="min-w-[120px]"
					>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			)}
		</div>
	);
}
