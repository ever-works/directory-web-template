'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Shield, X, Loader2 } from 'lucide-react';
import { RoleData } from '@/hooks/use-admin-roles';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface DeleteRoleDialogProps {
	role: RoleData;
	isOpen: boolean;
	onConfirm: (hardDelete: boolean) => void;
	onCancel: () => void;
}

export function DeleteRoleDialog({ role, isOpen, onConfirm, onCancel }: DeleteRoleDialogProps) {
	const t = useTranslations('admin.DELETE_ROLE_DIALOG');
	const [isLoading, setIsLoading] = useState(false);
	const dialogRef = useRef<HTMLDivElement>(null);

	const handleConfirm = async () => {
		setIsLoading(true);
		try {
			onConfirm(false);
		} catch (error) {
			console.error('Error deleting role:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => { if (!isLoading) onCancel(); };

	useEffect(() => {
		if (!isOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const id = window.setTimeout(() => dialogRef.current?.focus(), 0);
		return () => { window.clearTimeout(id); document.body.style.overflow = prev; };
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			ref={dialogRef}
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-role-title"
			onKeyDown={(e) => { if (e.key === 'Escape' && !isLoading) handleCancel(); }}
			tabIndex={-1}
		>
			{/* Backdrop */}
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} aria-hidden="true" />

			{/* Dialog */}
			<div className="relative bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/20 w-full max-w-md overflow-hidden">
				{/* Header */}
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
							<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
						</div>
						<h2 id="delete-role-title" className="text-sm font-semibold text-gray-900 dark:text-white">
							{t('TITLE')}
						</h2>
					</div>
					{!isLoading && (
						<button
							type="button"
							onClick={handleCancel}
							aria-label={t('CLOSE_DIALOG')}
							className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{/* Body */}
				<div className="p-5 space-y-4">
					{/* Role Info */}
					<div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/80 dark:bg-white/3 border border-gray-100 dark:border-white/6">
						<div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
							<Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{role.name}</h3>
							{role.description && (
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{role.description}</p>
							)}
							<div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
								<span className="font-mono">ID: {role.id}</span>
								<span>{Array.isArray(role.permissions) ? role.permissions.length : 0} {t('PERMISSIONS')}</span>
								<span className={cn(
									'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ring-1 ring-inset',
									role.isAdmin
										? 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20'
										: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8'
								)}>
									{role.isAdmin ? t('ADMIN_ROLE') : t('CLIENT_ROLE')}
								</span>
							</div>
						</div>
					</div>

					{/* Warning */}
					<div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30">
						<AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
						<div className="text-sm">
							<p className="font-semibold text-yellow-800 dark:text-yellow-200">{t('WARNING_TITLE')}</p>
							<p className="text-yellow-700 dark:text-yellow-400 mt-0.5 text-xs">{t('WARNING_MESSAGE')}</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5">
					<button
						type="button"
						onClick={handleCancel}
						disabled={isLoading}
						aria-label={t('CANCEL_ROLE_DELETION')}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
					>
						<X className="w-3.5 h-3.5" />
						{t('CANCEL')}
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={isLoading}
						aria-label={isLoading ? t('DELETING_ROLE') : t('CONFIRM_ROLE_DELETION')}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 shadow-sm transition-all duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
					>
						{isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
						{isLoading ? t('DELETING') : t('DELETE_ROLE')}
					</button>
				</div>
			</div>
		</div>
	);
}
