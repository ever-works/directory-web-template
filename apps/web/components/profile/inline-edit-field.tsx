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
	const saveClickedRef = useRef(false);

	useEffect(() => {
		setCurrent(value);
		setDraft(value);
	}, [value]);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
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
		setTimeout(() => {
			if (saveClickedRef.current) {
				saveClickedRef.current = false;
				return;
			}
			if (editing) cancelEdit();
		}, 0);
	};

	if (editing) {
		const inputClass =
			inputClassName ??
			'w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/15 rounded-md px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/40 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 transition-all duration-150';
		return (
			<span className={`inline-flex items-start gap-1.5 w-full ${className ?? ''}`}>
				{multiline ? (
					<textarea
						ref={(el) => { inputRef.current = el; }}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						maxLength={maxLength}
						rows={3}
						className={inputClass}
					/>
				) : (
					<input
						ref={(el) => { inputRef.current = el; }}
						type={type}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						maxLength={maxLength}
						className={inputClass}
					/>
				)}
				<span className="flex items-center gap-0.5 shrink-0 mt-0.5">
					<button
						type="button"
						onMouseDown={() => { saveClickedRef.current = true; }}
						onClick={commit}
						disabled={saving}
						aria-label="Save"
						className="p-1.5 rounded-md bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/70 disabled:opacity-50 transition-colors duration-150"
					>
						<FiCheck className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onMouseDown={() => { saveClickedRef.current = true; }}
						onClick={cancelEdit}
						aria-label="Cancel"
						className="p-1.5 rounded-md bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/12 transition-colors duration-150"
					>
						<FiX className="w-3.5 h-3.5" />
					</button>
				</span>
			</span>
		);
	}

	const display = current || (emptyLabel ?? placeholder ?? '');
	const isEmpty = !current;

	return (
		<span className={`group inline-flex items-start gap-1.5 ${className ?? ''}`}>
			<span
				className={`${displayClassName ?? ''} ${isEmpty ? 'italic text-neutral-400 dark:text-neutral-500' : ''} ${canEdit ? 'cursor-pointer' : ''}`}
				onClick={canEdit ? startEdit : undefined}
			>
				{display}
			</span>
			{canEdit && (
				<button
					type="button"
					onClick={startEdit}
					aria-label={`Edit ${field}`}
					className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 p-1 rounded text-neutral-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:bg-neutral-100 dark:hover:bg-white/8"
				>
					<FiEdit2 className="w-3 h-3" />
				</button>
			)}
		</span>
	);
}
