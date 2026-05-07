'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
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

// Native Button component
const NativeButton = ({ 
	children, 
	onClick, 
	disabled, 
	variant = 'default', 
	size = 'default',
	className = ''
}: { 
	children: React.ReactNode; 
	onClick?: () => void; 
	disabled?: boolean; 
	variant?: 'default' | 'outline' | 'ghost';
	size?: 'default' | 'sm';
	className?: string;
}) => {
	const baseClasses = [
		'inline-flex',
		'items-center',
		'justify-center',
		'gap-2',
		'font-medium',
		'transition-colors',
		'focus:outline-none',
		'focus:ring-2',
		'focus:ring-blue-500',
		'focus:ring-offset-2',
		'disabled:opacity-50',
		'disabled:cursor-not-allowed',
		'rounded-lg'
	].join(' ');

	const variantClasses = {
		default: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
		outline: 'border border-gray-300 dark:border-white/10 bg-white dark:bg-white/6 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300',
		ghost: 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
	};

	const sizeClasses = {
		default: 'px-4 py-2 text-sm',
		sm: 'px-3 py-1.5 text-xs'
	};

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
		>
			{children}
		</button>
	);
};

// Native Input component
const NativeInput = ({
	id,
	value,
	onChange,
	placeholder,
	disabled,
	className = ''
}: {
	id?: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}) => {
	return (
		<input
			id={id}
			type="text"
			value={value}
			onChange={onChange}
			disabled={disabled}
			placeholder={placeholder}
			className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/6 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400 dark:placeholder:text-gray-500 ${className}`}
		/>
	);
};

// Native Label component
const NativeLabel = ({ children, htmlFor, className = '' }: { children: React.ReactNode; htmlFor?: string; className?: string }) => {
	return (
		<label htmlFor={htmlFor} className={`text-xs font-medium text-gray-700 dark:text-gray-300 ${className}`}>
			{children}
		</label>
	);
};

export function CustomNavigationManager({ type, items, onUpdate, disabled = false }: CustomNavigationManagerProps) {
	const t = useTranslations('admin.ADMIN_SETTINGS_PAGE');
	const tFooter = useTranslations('footer');

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
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

	// Drag and drop handlers
	const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
		if (disabled || isSaving) return;
		e.dataTransfer.setData('text/plain', index.toString());
		e.dataTransfer.effectAllowed = 'move';
		// Add drag image style
		const target = e.target as HTMLElement;
		target.classList.add('opacity-50');
	};

	const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
		const target = e.target as HTMLElement;
		target.classList.remove('opacity-50');
		setDragOverIndex(null);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
		e.preventDefault();
		if (disabled || isSaving) return;
		e.dataTransfer.dropEffect = 'move';
		setDragOverIndex(index);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setDragOverIndex(null);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
		e.preventDefault();
		if (disabled || isSaving) return;

		const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
		if (isNaN(dragIndex) || dragIndex === dropIndex) {
			setDragOverIndex(null);
			return;
		}

		const newItems = [...localItems];
		const [draggedItem] = newItems.splice(dragIndex, 1);
		newItems.splice(dropIndex, 0, draggedItem);
		setLocalItems(newItems);
		setDragOverIndex(null);
	};

	const handleSave = async () => {
		// Validate items
		for (let i = 0; i < localItems.length; i++) {
			const item = localItems[i];
			if (!item.label || !item.path) {
				toast.error(t('CUSTOM_NAV_INCOMPLETE_ITEM', { number: i + 1 }));
				return;
			}
		}

		setIsSaving(true);
		try {
			// Strip IDs before saving (onUpdate expects CustomNavigationItem[])
			const itemsToSave: CustomNavigationItem[] = localItems.map(({ id: _id, ...item }) => item);
			await onUpdate(itemsToSave);
			toast.success(type === 'header' ? t('CUSTOM_NAV_HEADER_SAVE_SUCCESS') : t('CUSTOM_NAV_FOOTER_SAVE_SUCCESS'));
		} catch (error) {
			console.error('Error saving navigation:', error);
			toast.error(t('CUSTOM_NAV_SAVE_ERROR'));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
						{type === 'header' ? t('CUSTOM_NAV_HEADER_TITLE') : t('CUSTOM_NAV_FOOTER_TITLE')}
					</h4>
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
						{type === 'header' ? t('CUSTOM_NAV_HEADER_DESC') : t('CUSTOM_NAV_FOOTER_DESC')}
					</p>
					{type === 'header' && (
						<div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-600 dark:text-gray-400 border border-blue-200 dark:border-blue-800">
							<strong>{t('CUSTOM_NAV_EXAMPLES')}</strong> {t('CUSTOM_NAV_HEADER_EXAMPLES')}
						</div>
					)}
					{type === 'footer' && (
						<div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-600 dark:text-gray-400 border border-blue-200 dark:border-blue-800">
							<strong>{t('CUSTOM_NAV_EXAMPLES')}</strong> {t('CUSTOM_NAV_FOOTER_EXAMPLES')}
						</div>
					)}
				</div>
				<NativeButton
					onClick={addItem}
					size="sm"
					variant="outline"
					disabled={disabled || isSaving}
				>
					<Plus className="w-4 h-4" />
					{t('CUSTOM_NAV_ADD_LINK')}
				</NativeButton>
			</div>

			{localItems.length === 0 ? (
				<div className="text-center py-8 px-4 bg-gray-50 dark:bg-white/3 rounded-lg border border-dashed border-gray-300 dark:border-white/6">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{t('CUSTOM_NAV_EMPTY')}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{localItems.map((item, index) => {
						const canMoveUp = index > 0;
						const canMoveDown = index < localItems.length - 1;
						const isDragOver = dragOverIndex === index;

						return (
							<div
								key={item.id}
								draggable={!disabled && !isSaving}
								onDragStart={(e) => handleDragStart(e, index)}
								onDragEnd={handleDragEnd}
								onDragOver={(e) => handleDragOver(e, index)}
								onDragLeave={handleDragLeave}
								onDrop={(e) => handleDrop(e, index)}
								className={`
									p-4 bg-white dark:bg-white/5 rounded-lg border 
									${isDragOver 
										? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
										: 'border-gray-200 dark:border-white/6'
									}
									transition-all duration-200 cursor-grab active:cursor-grabbing
									hover:shadow-md
								`}
							>
								<div className="flex items-start gap-3">
									{/* Drag handle indicator */}
									<div 
										className="mt-2 text-gray-400 cursor-grab active:cursor-grabbing"
										aria-hidden="true"
									>
										<GripVertical className="w-5 h-5" />
									</div>

									{/* Move buttons */}
									<div className="flex flex-col gap-1 mt-2">
										<button
											type="button"
											onClick={() => moveItem(item.id, 'up')}
											disabled={disabled || isSaving || !canMoveUp}
											className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											title={t('CUSTOM_NAV_MOVE_UP')}
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
											className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											title={t('CUSTOM_NAV_MOVE_DOWN')}
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
											<NativeLabel htmlFor={`label-${item.id}`}>
												{t('CUSTOM_NAV_LABEL')} <span className="text-red-500">*</span>
											</NativeLabel>
											<NativeInput
												id={`label-${item.id}`}
												value={item.label}
												onChange={(e) => updateItem(item.id, 'label', e.target.value)}
												placeholder={
													type === 'header'
														? t('CUSTOM_NAV_HEADER_LABEL_PLACEHOLDER')
														: t('CUSTOM_NAV_FOOTER_LABEL_PLACEHOLDER')
												}
												disabled={disabled || isSaving}
											/>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{type === 'header' ? (
													<>
														<strong>{t('CUSTOM_NAV_PLAIN_TEXT')}</strong> {t('CUSTOM_NAV_HEADER_LABEL_PLAIN_VALUES')} |{' '}
														<strong>{t('CUSTOM_NAV_TRANSLATION_KEY')}</strong> {t('CUSTOM_NAV_HEADER_LABEL_KEY_VALUES')}
													</>
												) : (
													<>
														<strong>{t('CUSTOM_NAV_PLAIN_TEXT')}</strong> {t('CUSTOM_NAV_FOOTER_LABEL_PLAIN_VALUES')} |{' '}
														<strong>{t('CUSTOM_NAV_TRANSLATION_KEY')}</strong> {tFooter('PRIVACY_POLICY')}, {tFooter('TERMS_OF_SERVICE')}
													</>
												)}
											</p>
										</div>

										<div className="space-y-2">
											<NativeLabel htmlFor={`path-${item.id}`}>
												{t('CUSTOM_NAV_PATH')} <span className="text-red-500">*</span>
											</NativeLabel>
											<div className="relative">
												<NativeInput
													id={`path-${item.id}`}
													value={item.path}
													onChange={(e) => updateItem(item.id, 'path', e.target.value)}
													placeholder={
														type === 'header'
															? t('CUSTOM_NAV_HEADER_PATH_PLACEHOLDER')
															: t('CUSTOM_NAV_FOOTER_PATH_PLACEHOLDER')
													}
													disabled={disabled || isSaving}
													className="pr-8"
												/>
												{isExternalUrl(item.path) && (
													<ExternalLink className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
												)}
											</div>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												<strong>{t('CUSTOM_NAV_PATH_HINT_INTERNAL')}</strong> {t('CUSTOM_NAV_PATH_HINT_INTERNAL_VALUES')} |{' '}
												<strong>{t('CUSTOM_NAV_PATH_HINT_MARKDOWN')}</strong> {t('CUSTOM_NAV_PATH_HINT_MARKDOWN_VALUES')} |{' '}
												<strong>{t('CUSTOM_NAV_PATH_HINT_EXTERNAL')}</strong> {t('CUSTOM_NAV_PATH_HINT_EXTERNAL_VALUES')}
											</p>
										</div>
									</div>

									{/* Remove button */}
									<NativeButton
										onClick={() => removeItem(item.id)}
										size="sm"
										variant="ghost"
										disabled={disabled || isSaving}
										className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										<Trash2 className="w-4 h-4" />
									</NativeButton>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{localItems.length > 0 && (
				<div className="flex justify-end pt-2">
					<NativeButton
						onClick={handleSave}
						disabled={disabled || isSaving}
						className="min-w-[120px]"
					>
						{isSaving ? t('CUSTOM_NAV_SAVING') : t('CUSTOM_NAV_SAVE')}
					</NativeButton>
				</div>
			)}
		</div>
	);
}
