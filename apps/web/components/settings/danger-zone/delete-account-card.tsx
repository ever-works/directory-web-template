'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { deleteAccount } from '@/app/[locale]/auth/actions';
import type { ActionState } from '@/lib/auth/middleware';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CLIENT_PASSWORD_MIN_LENGTH = 8;

type FormValues = { password: string };

export function DeleteAccountCard() {
	const t = useTranslations('settings.DANGER_ZONE_PAGE.DELETE_ACCOUNT');
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-[#111111] shadow-sm overflow-hidden">
				<div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
					<div className="flex items-start gap-3 min-w-0">
						<div className="shrink-0 w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
							<Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('TITLE')}
							</h3>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
								{t('DESCRIPTION')}
							</p>
						</div>
					</div>
					<div className="sm:shrink-0">
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => setIsModalOpen(true)}
							className="gap-1.5 w-full sm:w-auto"
							aria-haspopup="dialog"
						>
							<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
							{t('CTA')}
						</Button>
					</div>
				</div>
			</div>

			<DeleteAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
		</>
	);
}

interface DeleteAccountModalProps {
	isOpen: boolean;
	onClose: () => void;
}

function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
	const tModal = useTranslations('settings.DANGER_ZONE_PAGE.DELETE_ACCOUNT.CONFIRM_MODAL');
	const tErrors = useTranslations('settings.DANGER_ZONE_PAGE.DELETE_ACCOUNT.ERRORS');

	const passwordRequired = tErrors('PASSWORD_REQUIRED');
	const passwordTooShort = tErrors('PASSWORD_TOO_SHORT');

	const schema = z.object({
		password: z.string().min(1, passwordRequired).min(CLIENT_PASSWORD_MIN_LENGTH, passwordTooShort)
	});

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors }
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		mode: 'onSubmit',
		defaultValues: { password: '' }
	});

	const [state, formAction, isPending] = useActionState<ActionState, FormData>(deleteAccount, {});
	const [showPassword, setShowPassword] = useState(false);
	const passwordInputId = useId();
	const errorMsgId = useId();

	// Reset local form state whenever the modal opens
	useEffect(() => {
		if (isOpen) {
			reset();
			setShowPassword(false);
		}
	}, [isOpen, reset]);

	// Surface server-side errors via toast
	useEffect(() => {
		if (state?.error) {
			toast.error(state.error);
		}
	}, [state]);

	const onValid = (data: FormValues) => {
		const fd = new FormData();
		fd.set('password', data.password);
		formAction(fd);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={isPending ? () => {} : onClose}
			isDismissable={!isPending}
			title={tModal('TITLE')}
			size="md"
			backdrop="blur"
		>
			<div className="p-6 space-y-5">
				<div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-4">
					<AlertTriangle
						className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
						aria-hidden="true"
					/>
					<p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">{tModal('WARNING')}</p>
				</div>

				<form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
					<div className="space-y-2">
						<label
							htmlFor={passwordInputId}
							className="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{tModal('PASSWORD_LABEL')}
						</label>
						<div className="relative">
							<input
								{...register('password')}
								id={passwordInputId}
								type={showPassword ? 'text' : 'password'}
								placeholder={tModal('PASSWORD_PLACEHOLDER')}
								autoComplete="current-password"
								disabled={isPending}
								aria-invalid={errors.password ? 'true' : 'false'}
								aria-describedby={errors.password ? errorMsgId : undefined}
								className={cn(
									'block w-full pr-10 py-2.5 px-3 border rounded-lg shadow-xs',
									'placeholder-gray-400 dark:placeholder-gray-500',
									'focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500',
									'text-gray-900 dark:text-gray-100 transition-colors',
									'disabled:opacity-60 disabled:cursor-not-allowed',
									errors.password
										? 'border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-950/20'
										: 'border-gray-300 dark:border-white/8 bg-white dark:bg-white/5'
								)}
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
								aria-label={tModal('PASSWORD_LABEL')}
								tabIndex={0}
							>
								{showPassword ? (
									<EyeOff className="h-4 w-4" aria-hidden="true" />
								) : (
									<Eye className="h-4 w-4" aria-hidden="true" />
								)}
							</button>
						</div>
						{errors.password ? (
							<p id={errorMsgId} role="alert" className="text-xs text-red-600 dark:text-red-400">
								{errors.password.message}
							</p>
						) : null}
					</div>

					<div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
						<Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
							{tModal('CANCEL_CTA')}
						</Button>
						<Button type="submit" variant="destructive" size="sm" disabled={isPending} className="gap-1.5">
							{isPending ? (
								<>
									<Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
									{tModal('DELETING')}
								</>
							) : (
								<>
									<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
									{tModal('CONFIRM_CTA')}
								</>
							)}
						</Button>
					</div>
				</form>
			</div>
		</Modal>
	);
}
