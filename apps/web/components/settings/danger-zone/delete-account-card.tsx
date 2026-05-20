'use client';

import Image from 'next/image';
import { useActionState, useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Trash2, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
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
				className="group rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md"
			>
				{/* Header */}
				<div className="p-6 sm:p-7">
					<div className="flex items-start gap-4">
						<div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center ring-1 ring-inset ring-gray-200/60 dark:ring-white/[0.06]">
							<Trash2 className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" aria-hidden="true" />
						</div>
						<div className="min-w-0 flex-1 space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<h2
									id="danger-delete-account-title"
									className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
								>
									{t('TITLE')}
								</h2>
								<span className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
									{tPage('IRREVERSIBLE_BADGE')}
								</span>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-prose">
								{t('DESCRIPTION')}
							</p>
						</div>
					</div>

					{/* What will be removed */}
					<div className="mt-6 sm:ml-14">
						<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
							{t('LOSS_TITLE')}
						</p>
						<ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
							{LOSS_KEYS.map((key) => (
								<li
									key={key}
									className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300"
								>
									<X
										className="w-3 h-3 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0"
										aria-hidden="true"
									/>
									<span className="leading-relaxed">{t(key)}</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-3.5 sm:px-7 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.015] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
					<p className="text-[11px] text-gray-500 dark:text-gray-400">{t('CTA_HELPER')}</p>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={() => setIsModalOpen(true)}
						className="gap-1.5 w-full sm:w-auto transition-all duration-150 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111111]"
						aria-haspopup="dialog"
					>
						<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
						{t('CTA')}
					</Button>
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
	const emailFilled = watchedEmail.length > 0;
	const emailMatches = watchedEmail.trim().toLowerCase() === userEmail.toLowerCase();
	const passwordReady = watchedPassword.length >= CLIENT_PASSWORD_MIN_LENGTH;
	const ready = Boolean(userEmail) && emailMatches && passwordReady;

	const [state, formAction, isPending] = useActionState<ActionState, FormData>(deleteAccount, {});
	const [showPassword, setShowPassword] = useState(false);
	const titleId = useId();
	const subtitleId = useId();
	const emailInputId = useId();
	const passwordInputId = useId();
	const emailErrorId = useId();
	const passwordErrorId = useId();

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

	return (
		<Modal
			isOpen={isOpen}
			onClose={isPending ? () => {} : onClose}
			isDismissable={!isPending}
			size="lg"
			backdrop="blur"
			showHeaderBorder={false}
			customHeader={
				<div className="flex items-start gap-3 px-6 py-5 border-b border-gray-200 dark:border-white/8">
					<div
						className="shrink-0 w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center"
						aria-hidden="true"
					>
						<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
					</div>
					<div className="min-w-0 flex-1">
						<h2
							id={titleId}
							className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
						>
							{tModal('TITLE')}
						</h2>
						<p id={subtitleId} className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
							{tModal('SUBTITLE')}
						</p>
					</div>
				</div>
			}
		>
			<div className="p-6 space-y-6">
				{/* Identity panel — neutral surface so it reads as "context", not "alarm" */}
				<section aria-label={tModal('ACCOUNT_HEADING')} className="space-y-2.5">
					<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
						{tModal('ACCOUNT_HEADING')}
					</p>
					<div className="rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50/50 dark:bg-white/[0.02] p-4 flex items-center gap-3">
						<div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white dark:ring-white/10">
							{userImage ? (
								<Image
									src={userImage}
									alt={userName || userEmail}
									fill
									sizes="40px"
									className="object-cover"
								/>
							) : (
								<span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
									{initials}
								</span>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
								{userName || userEmail || '—'}
							</p>
							{userEmail ? (
								<p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
									{userEmail}
								</p>
							) : null}
						</div>
					</div>
					<p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
						{tModal('ACCOUNT_WARNING')}
					</p>
				</section>

				{/* Confirmation form */}
				<form onSubmit={handleSubmit(onValid)} noValidate className="space-y-5">
					<div className="space-y-2.5">
						<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
							{tModal('CONFIRMATION_HEADING')}
						</p>

						{/* Email confirm */}
						<div className="space-y-1.5">
							<label
								htmlFor={emailInputId}
								className="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								{tModal('EMAIL_LABEL')}
							</label>
							<div className="relative">
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
										'block w-full py-2.5 px-3 pr-9 border rounded-lg shadow-xs font-mono text-sm',
										'placeholder-gray-400 dark:placeholder-gray-500',
										'text-gray-900 dark:text-gray-100',
										'transition-colors duration-150',
										'focus:outline-none focus:ring-2 focus:ring-offset-0',
										'disabled:opacity-60 disabled:cursor-not-allowed',
										errors.emailConfirm
											? 'border-red-300 dark:border-red-700/60 bg-red-50/40 dark:bg-red-950/20 focus:ring-red-500/50 focus:border-red-400'
											: emailMatches && emailFilled
												? 'border-emerald-300 dark:border-emerald-700/50 bg-white dark:bg-white/5 focus:ring-emerald-500/40 focus:border-emerald-400'
												: 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-gray-400/40 focus:border-gray-400'
									)}
								/>
								{emailFilled && emailMatches ? (
									<Check
										className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 transition-opacity duration-150"
										aria-hidden="true"
									/>
								) : null}
							</div>
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
						<div className="space-y-1.5 pt-1">
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
										'text-gray-900 dark:text-gray-100',
										'transition-colors duration-150',
										'focus:outline-none focus:ring-2 focus:ring-offset-0',
										'disabled:opacity-60 disabled:cursor-not-allowed',
										errors.password
											? 'border-red-300 dark:border-red-700/60 bg-red-50/40 dark:bg-red-950/20 focus:ring-red-500/50 focus:border-red-400'
											: 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-gray-400/40 focus:border-gray-400'
									)}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150 focus:outline-none focus-visible:text-gray-600"
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
					</div>

					{/* Sticky footer */}
					<div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t border-gray-100 dark:border-white/[0.06] -mx-6 px-6 -mb-6 pb-6 bg-gray-50/40 dark:bg-white/[0.015]">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onClose}
							disabled={isPending}
							className="transition-colors duration-150"
						>
							{tModal('CANCEL_CTA')}
						</Button>
						<Button
							type="submit"
							variant="destructive"
							size="sm"
							disabled={isPending || !ready}
							className="gap-1.5 transition-all duration-150 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0a0a0a] disabled:opacity-50"
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
