'use client';

import Image from 'next/image';
import { useActionState, useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Trash2, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { deleteAccount } from '@/app/[locale]/auth/actions';
import type { ActionState } from '@/lib/auth/middleware';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

const CLIENT_PASSWORD_MIN_LENGTH = 8;

const LOSS_KEYS = ['LOSS_ITEM_1', 'LOSS_ITEM_2', 'LOSS_ITEM_3', 'LOSS_ITEM_4', 'LOSS_ITEM_5'] as const;

type FormValues = { emailConfirm: string; password: string };

export function DeleteAccountCard() {
	const t = useTranslations('settings.DANGER_ZONE_PAGE.DELETE_ACCOUNT');
	const tPage = useTranslations('settings.DANGER_ZONE_PAGE');
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<section
				role="region"
				aria-labelledby="danger-delete-account-title"
				className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#111111] shadow-sm overflow-hidden"
			>
				{/* Red rail at the top to visually flag the action surface */}
				<div className="h-1 bg-gradient-to-r from-red-500/80 via-red-500 to-red-600" aria-hidden="true" />

				<div className="p-5 sm:p-6 space-y-5">
					{/* Header */}
					<div className="flex items-start gap-3">
						<div className="shrink-0 w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
							<Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<h2
									id="danger-delete-account-title"
									className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
								>
									{t('TITLE')}
								</h2>
								<span className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-200 dark:ring-red-900/50">
									<ShieldAlert className="w-2.5 h-2.5" aria-hidden="true" />
									{tPage('IRREVERSIBLE_BADGE')}
								</span>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
								{t('DESCRIPTION')}
							</p>
						</div>
					</div>

					{/* What you'll lose */}
					<div className="rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50/60 dark:bg-white/[0.02] p-4">
						<p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2.5">
							{t('LOSS_TITLE')}
						</p>
						<ul className="space-y-1.5">
							{LOSS_KEYS.map((key) => (
								<li
									key={key}
									className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"
								>
									<span
										className="mt-1.5 w-1 h-1 rounded-full bg-red-500/80 shrink-0"
										aria-hidden="true"
									/>
									<span className="leading-relaxed">{t(key)}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Footer with destructive CTA */}
					<div className="flex justify-end">
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => setIsModalOpen(true)}
							className="gap-1.5"
							aria-haspopup="dialog"
						>
							<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
							{t('CTA')}
						</Button>
					</div>
				</div>
			</section>

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

	const { user } = useCurrentUser();
	const userEmail = user?.email ?? '';
	const userName = user?.name ?? '';
	const userImage = user?.image ?? null;
	const initials =
		userName
			?.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '?';

	const emailRequired = tErrors('EMAIL_REQUIRED');
	const emailMismatch = tErrors('EMAIL_MISMATCH');
	const passwordRequired = tErrors('PASSWORD_REQUIRED');
	const passwordTooShort = tErrors('PASSWORD_TOO_SHORT');

	// Zod schema is rebuilt per render so the email-match check follows
	// whichever userEmail is current. Cheap; the form only mounts on open.
	const schema = z.object({
		emailConfirm: z
			.string()
			.min(1, emailRequired)
			.refine((value) => value.trim().toLowerCase() === userEmail.toLowerCase(), {
				message: emailMismatch
			}),
		password: z.string().min(1, passwordRequired).min(CLIENT_PASSWORD_MIN_LENGTH, passwordTooShort)
	});

	const {
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors }
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		mode: 'onChange',
		defaultValues: { emailConfirm: '', password: '' }
	});

	const watchedEmail = watch('emailConfirm');
	const watchedPassword = watch('password');
	const emailMatches = watchedEmail.trim().toLowerCase() === userEmail.toLowerCase();
	const passwordReady = watchedPassword.length >= CLIENT_PASSWORD_MIN_LENGTH;
	const ready = Boolean(userEmail) && emailMatches && passwordReady;

	const [state, formAction, isPending] = useActionState<ActionState, FormData>(deleteAccount, {});
	const [showPassword, setShowPassword] = useState(false);
	const emailInputId = useId();
	const passwordInputId = useId();
	const emailErrorId = useId();
	const passwordErrorId = useId();

	// Reset on each open so a closed/reopened modal is always blank.
	useEffect(() => {
		if (isOpen) {
			reset();
			setShowPassword(false);
		}
	}, [isOpen, reset]);

	useEffect(() => {
		if (state?.error) {
			toast.error(state.error);
		}
	}, [state]);

	const onValid = (data: FormValues) => {
		if (!ready) return;
		const fd = new FormData();
		fd.set('password', data.password);
		formAction(fd);
	};

	const titleId = useId();
	const subtitleId = useId();

	return (
		<Modal
			isOpen={isOpen}
			onClose={isPending ? () => {} : onClose}
			isDismissable={!isPending}
			size="lg"
			backdrop="blur"
			hideCloseButton={false}
			showHeaderBorder={false}
			customHeader={
				<div className="flex items-start gap-3 px-6 py-5 border-b border-gray-200 dark:border-white/8 bg-red-50/40 dark:bg-red-950/15">
					<div className="shrink-0 w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
						<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
					</div>
					<div className="min-w-0 flex-1">
						<h2
							id={titleId}
							className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
						>
							{tModal('TITLE')}
						</h2>
						<p id={subtitleId} className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
							{tModal('SUBTITLE')}
						</p>
					</div>
				</div>
			}
		>
			<div className="p-6 space-y-5">
				{/* Identity panel — shows exactly which account is being deleted */}
				<section
					aria-label={tModal('ACCOUNT_HEADING')}
					className="rounded-xl border border-red-200/70 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/15 p-4"
				>
					<p className="text-[10px] font-semibold uppercase tracking-widest text-red-700/80 dark:text-red-300/80 mb-2.5">
						{tModal('ACCOUNT_HEADING')}
					</p>
					<div className="flex items-center gap-3">
						<div className="relative w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white dark:ring-white/10">
							{userImage ? (
								<Image src={userImage} alt={userName || userEmail} fill className="object-cover" />
							) : (
								<span className="text-sm font-semibold text-red-700 dark:text-red-300">{initials}</span>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
								{userName || userEmail || '—'}
							</p>
							{userEmail ? (
								<p className="text-xs text-gray-600 dark:text-gray-400 truncate font-mono">
									{userEmail}
								</p>
							) : null}
						</div>
					</div>
					<p className="text-xs text-red-800/90 dark:text-red-200/90 mt-3 leading-relaxed">
						{tModal('ACCOUNT_WARNING')}
					</p>
				</section>

				{/* Confirmation form */}
				<form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
					<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
						{tModal('CONFIRMATION_HEADING')}
					</p>

					{/* Email type-to-confirm */}
					<div className="space-y-1.5">
						<label
							htmlFor={emailInputId}
							className="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{tModal('EMAIL_LABEL')}
						</label>
						<input
							{...register('emailConfirm')}
							id={emailInputId}
							type="text"
							inputMode="email"
							autoComplete="off"
							autoCapitalize="off"
							autoCorrect="off"
							spellCheck={false}
							placeholder={tModal('EMAIL_PLACEHOLDER')}
							disabled={isPending || !userEmail}
							aria-invalid={errors.emailConfirm ? 'true' : 'false'}
							aria-describedby={errors.emailConfirm ? emailErrorId : undefined}
							className={cn(
								'block w-full py-2.5 px-3 border rounded-lg shadow-xs font-mono text-sm',
								'placeholder-gray-400 dark:placeholder-gray-500',
								'focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500',
								'text-gray-900 dark:text-gray-100 transition-colors',
								'disabled:opacity-60 disabled:cursor-not-allowed',
								errors.emailConfirm
									? 'border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-950/20'
									: emailMatches && watchedEmail.length > 0
										? 'border-emerald-300 dark:border-emerald-700/50 bg-white dark:bg-white/5'
										: 'border-gray-300 dark:border-white/8 bg-white dark:bg-white/5'
							)}
						/>
						{errors.emailConfirm ? (
							<p id={emailErrorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
								{errors.emailConfirm.message}
							</p>
						) : userEmail ? (
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{tModal('EMAIL_HELPER', { email: userEmail })}
							</p>
						) : null}
					</div>

					{/* Password */}
					<div className="space-y-1.5">
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
								aria-describedby={errors.password ? passwordErrorId : undefined}
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
							<p id={passwordErrorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
								{errors.password.message}
							</p>
						) : null}
					</div>

					{/* Footer */}
					<div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/6 -mx-6 px-6 -mb-6 pb-6 bg-gray-50/50 dark:bg-white/[0.02]">
						<Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
							{tModal('CANCEL_CTA')}
						</Button>
						<Button
							type="submit"
							variant="destructive"
							size="sm"
							disabled={isPending || !ready}
							className="gap-1.5"
						>
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
