'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiEdit2, FiX } from 'react-icons/fi';
import { toast } from 'sonner';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';

/** Profile fields the server's PATCH /api/user/profile route accepts as text/url. */
export type InlineEditableField =
	| 'displayName'
	| 'jobTitle'
	| 'company'
	| 'location'
	| 'website'
	| 'bio'
	| 'interests';

interface InlineEditFieldProps {
	field: InlineEditableField;
	value: string;
	placeholder?: string;
	multiline?: boolean;
	canEdit: boolean;
	maxLength?: number;
	className?: string;
	displayClassName?: string;
	inputClassName?: string;
	type?: 'text' | 'url';
	emptyLabel?: string;
	onSaved?: (value: string) => void;
}

/**
 * Inline-editable text field bound to PATCH /api/user/profile.
 *
 * - Hover (or focus) reveals a pencil icon when `canEdit` is true.
 * - Click switches to an input; Enter saves (single-line), Escape cancels,
 *   blur cancels unless the explicit save button was clicked.
 * - On save: optimistic local state, PATCH, rollback on error.
 */
export function InlineEditField({
	field,
	value,
	placeholder,
	multiline = false,
	canEdit,
	maxLength,
	className,
	displayClassName,
	inputClassName,
	type = 'text',
	emptyLabel,
	onSaved
}: InlineEditFieldProps) {
	const [current, setCurrent] = useState(value);
	const [draft, setDraft] = useState(value);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
	// Suppress the cancel-on-blur if the user clicked the save button.
	const saveClickedRef = useRef(false);

	useEffect(() => {
		setCurrent(value);
		setDraft(value);
	}, [value]);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			// Select all when single-line, place cursor at end for textarea.
			if (multiline) {
				const len = inputRef.current.value.length;
				(inputRef.current as HTMLTextAreaElement).setSelectionRange(len, len);
			} else {
				(inputRef.current as HTMLInputElement).select();
			}
		}
	}, [editing, multiline]);

	const startEdit = () => {
		if (!canEdit || saving) return;
		setDraft(current);
		setEditing(true);
	};

	const cancelEdit = () => {
		setDraft(current);
		setEditing(false);
	};

	const commit = async () => {
		const trimmed = draft.trim();
		if (trimmed === current) {
			setEditing(false);
			return;
		}

		setSaving(true);
		const previous = current;
		setCurrent(trimmed);
		setEditing(false);

		try {
			const response = await serverClient.patch(`/api/user/profile`, { [field]: trimmed });
			if (!apiUtils.isSuccess(response)) {
				setCurrent(previous);
				toast.error(apiUtils.getErrorMessage(response) || `Failed to update ${field}`);
				return;
			}
			onSaved?.(trimmed);
		} catch (error) {
			setCurrent(previous);
			console.error(`Error saving ${field}:`, error);
			toast.error(`Failed to update ${field}`);
		} finally {
			setSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		} else if (e.key === 'Enter' && !multiline) {
			e.preventDefault();
			void commit();
		}
	};

	const handleBlur = () => {
		// If the save button was clicked, commit handles it. Otherwise treat blur as cancel.
		setTimeout(() => {
			if (saveClickedRef.current) {
				saveClickedRef.current = false;
				return;
			}
			if (editing) cancelEdit();
		}, 0);
	};

	if (editing) {
		const sharedClass =
			inputClassName ??
			'w-full bg-white dark:bg-white/5 border-2 border-theme-primary-400 dark:border-theme-primary-500 rounded-md px-2 py-1 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-theme-primary-400 dark:focus:ring-theme-primary-500';
		return (
			<span className={`inline-flex items-start gap-2 w-full ${className ?? ''}`}>
				{multiline ? (
					<textarea
						ref={(el) => {
							inputRef.current = el;
						}}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						maxLength={maxLength}
						rows={3}
						className={sharedClass}
					/>
				) : (
					<input
						ref={(el) => {
							inputRef.current = el;
						}}
						type={type}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						maxLength={maxLength}
						className={sharedClass}
					/>
				)}
				<button
					type="button"
					onMouseDown={() => {
						saveClickedRef.current = true;
					}}
					onClick={commit}
					disabled={saving}
					aria-label="Save"
					className="shrink-0 p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
				>
					<FiCheck className="w-4 h-4" />
				</button>
				<button
					type="button"
					onMouseDown={() => {
						saveClickedRef.current = true;
					}}
					onClick={cancelEdit}
					aria-label="Cancel"
					className="shrink-0 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					<FiX className="w-4 h-4" />
				</button>
			</span>
		);
	}

	const display = current || (emptyLabel ?? placeholder ?? '');
	const isEmpty = !current;

	return (
		<span className={`group inline-flex items-start gap-2 ${className ?? ''}`}>
			<span
				className={`${displayClassName ?? ''} ${isEmpty ? 'italic text-gray-400 dark:text-gray-500' : ''} ${
					canEdit ? 'cursor-pointer' : ''
				}`}
				onClick={canEdit ? startEdit : undefined}
			>
				{display}
			</span>
			{canEdit && (
				<button
					type="button"
					onClick={startEdit}
					aria-label={`Edit ${field}`}
					className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 p-1 text-gray-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400"
				>
					<FiEdit2 className="w-3.5 h-3.5" />
				</button>
			)}
		</span>
	);
}
