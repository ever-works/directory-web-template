'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PauseCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { deactivateAccount } from '@/app/[locale]/auth/actions';
import type { ActionState } from '@/lib/auth/middleware';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_LOCALE } from '@/lib/constants';

const CLIENT_PASSWORD_MIN_LENGTH = 8;

type FormValues = { password: string };

export function DeactivateAccountCard() {
	const t = useTranslations('settings.DANGER_ZONE_PAGE.DEACTIVATE_ACCOUNT');
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<section
				role="region"
				aria-labelledby="danger-deactivate-account-title"
				className="group rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md"
			>
				{/* Header */}
				<div className="p-6 sm:p-7">
					<div className="flex items-start gap-4">
						<div className="shrink-0 w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center ring-1 ring-inset ring-amber-200/60 dark:ring-amber-800/30">
							<PauseCircle className="w-[18px] h-[18px] text-amber-500 dark:text-amber-400" aria-hidden="true" />
						</div>
						<div className="min-w-0 flex-1 space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<h2
									id="danger-deactivate-account-title"
									className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
								>
									{t('TITLE')}
								</h2>
								<span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
									{t('REVERSIBLE_BADGE')}
								</span>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-prose">
								{t('DESCRIPTION')}
							</p>
						</div>
					</div>

					{/* What happens */}
					<div className="mt-6 sm:ml-14 space-y-3">
						<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
							{t('EFFECTS_TITLE')}
						</p>
						<ul className="space-y-2">
							{(['EFFECT_1', 'EFFECT_2', 'EFFECT_3', 'EFFECT_4'] as const).map((key) => (
								<li key={key} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
									<span className="mt-0.5 w-3 h-3 shrink-0 text-amber-400" aria-hidden="true">·</span>
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
						variant="outline"
						size="sm"
						onClick={() => setIsModalOpen(true)}
						className="gap-1.5 w-full sm:w-auto border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all duration-150 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111111]"
						aria-haspopup="dialog"
					>
						<PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
						{t('CTA')}
					</Button>
				</div>
			</section>

			<DeactivateAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
		</>
	);
}

interface DeactivateAccountModalProps {
	isOpen: boolean;
	onClose: () => void;
}

function DeactivateAccountModal({ isOpen, onClose }: DeactivateAccountModalProps) {
	const tModal = useTranslations('settings.DANGER_ZONE_PAGE.DEACTIVATE_ACCOUNT.CONFIRM_MODAL');
	const tErrors = useTranslations('settings.DANGER_ZONE_PAGE.DEACTIVATE_ACCOUNT.ERRORS');
	const locale = useLocale();

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
		mode: 'onChange',
		defaultValues: { password: '' }
	});

	const [state, formAction, isPending] = useActionState<ActionState, FormData>(deactivateAccount, {});
	const [showPassword, setShowPassword] = useState(false);
	const titleId = useId();
	const passwordInputId = useId();
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

	useEffect(() => {
		if (!state?.success || !state.redirect) return;
		const redirectPath = state.redirect as string;
		const shouldPrefixLocale = locale !== DEFAULT_LOCALE && !redirectPath.startsWith(`/${locale}`);
		window.location.href = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;
	}, [state, locale]);

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
			size="lg"
			backdrop="blur"
			showHeaderBorder={false}
			customHeader={
				<div className="flex items-start gap-3 px-6 py-5 border-b border-gray-200 dark:border-white/8">
					<div
						className="shrink-0 w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"
						aria-hidden="true"
					>
						<PauseCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
					</div>
					<div className="min-w-0 flex-1">
						<h2
							id={titleId}
							className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
						>
							{tModal('TITLE')}
						</h2>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
							{tModal('SUBTITLE')}
						</p>
					</div>
				</div>
			}
		>
			<div className="p-6 space-y-6">
				{/* What deactivation means */}
				<section aria-label={tModal('EFFECTS_HEADING')} className="space-y-2.5">
					<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
						{tModal('EFFECTS_HEADING')}
					</p>
					<ul className="space-y-1.5">
						{(['EFFECT_1', 'EFFECT_2', 'EFFECT_3', 'EFFECT_4'] as const).map((key) => (
							<li key={key} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
								<span className="mt-0.5 w-3 h-3 shrink-0 text-amber-400" aria-hidden="true">·</span>
								<span className="leading-relaxed">{tModal(key)}</span>
							</li>
						))}
					</ul>
					<div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
						<p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
							{tModal('REACTIVATION_NOTE')}
						</p>
					</div>
				</section>

				{/* Confirmation form */}
				<form onSubmit={handleSubmit(onValid)} noValidate className="space-y-5">
					<div className="space-y-2.5">
						<p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
							{tModal('CONFIRMATION_HEADING')}
						</p>

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
										'text-gray-900 dark:text-gray-100',
										'transition-colors duration-150',
										'focus:outline-none focus:ring-2 focus:ring-offset-0',
										'disabled:opacity-60 disabled:cursor-not-allowed',
										errors.password
											? 'border-red-300 dark:border-red-700/60 bg-red-50/40 dark:bg-red-950/20 focus:ring-red-500/50 focus:border-red-400'
											: 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-amber-500/30 focus:border-amber-400 dark:focus:border-amber-500'
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
							size="sm"
							disabled={isPending}
							className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600 transition-all duration-150 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0a0a0a] disabled:opacity-50"
						>
							{isPending ? (
								<>
									<Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
									{tModal('DEACTIVATING')}
								</>
							) : (
								<>
									<PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
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
