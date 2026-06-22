'use client';

import { useState, useTransition } from 'react';
import { FiMail, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiSend } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { resendVerificationEmailAction } from '@/app/[locale]/auth/actions';

interface EmailVerificationDialogProps {
	labelTrigger: string;
	labelTitle: string;
	labelDesc: string;
	labelSend: string;
	labelSending: string;
	labelCancel: string;
	labelSuccessTitle: string;
	labelSuccessDesc: string;
	labelClose: string;
	labelErrorTitle: string;
	labelTryAgain: string;
}

export function EmailVerificationDialog({
	labelTrigger,
	labelTitle,
	labelDesc,
	labelSend,
	labelSending,
	labelCancel,
	labelSuccessTitle,
	labelSuccessDesc,
	labelClose,
	labelErrorTitle,
	labelTryAgain,
}: EmailVerificationDialogProps) {
	const [open, setOpen] = useState(false);
	const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
	const [isPending, startTransition] = useTransition();

	const handleSend = () => {
		startTransition(async () => {
			const result = await resendVerificationEmailAction();
			setStatus(result.error ? 'error' : 'success');
		});
	};

	const handleClose = () => {
		setOpen(false);
		setTimeout(() => setStatus('idle'), 250);
	};

	return (
		<>
			{/* Trigger */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="group w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-amber-50/70 dark:hover:bg-amber-500/5 transition-colors"
			>
				<span className="shrink-0 w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
					<FiSend className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
				</span>
				<span className="text-xs font-semibold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
					{labelTrigger}
				</span>
			</button>

			<Modal isOpen={open} onClose={handleClose} size="sm" title={status === 'idle' ? labelTitle : undefined} hideCloseButton={false}>
				{status === 'idle' && (
					<>
						<ModalBody className="pt-2">
							<div className="flex flex-col items-center gap-4 text-center py-3">
								<div className="w-14 h-14 rounded-2xl bg-theme-primary-50 dark:bg-theme-primary-500/10 flex items-center justify-center ring-1 ring-theme-primary-100 dark:ring-theme-primary-500/20">
									<FiMail className="w-6 h-6 text-theme-primary-600 dark:text-theme-primary-400" aria-hidden="true" />
								</div>
								<p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs">
									{labelDesc}
								</p>
							</div>
						</ModalBody>
						<ModalFooter>
							<Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
								{labelCancel}
							</Button>
							<Button size="sm" onClick={handleSend} disabled={isPending}>
								{isPending ? (
									<span className="flex items-center gap-1.5">
										<FiRefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
										{labelSending}
									</span>
								) : (
									<span className="flex items-center gap-1.5">
										<FiSend className="w-3.5 h-3.5" aria-hidden="true" />
										{labelSend}
									</span>
								)}
							</Button>
						</ModalFooter>
					</>
				)}

				{status === 'success' && (
					<>
						<ModalBody>
							<div className="flex flex-col items-center gap-4 text-center py-4">
								<div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-100 dark:ring-emerald-500/20">
									<FiCheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
										{labelSuccessTitle}
									</p>
									<p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
										{labelSuccessDesc}
									</p>
								</div>
							</div>
						</ModalBody>
						<ModalFooter>
							<Button size="sm" onClick={handleClose} className="w-full sm:w-auto">
								{labelClose}
							</Button>
						</ModalFooter>
					</>
				)}

				{status === 'error' && (
					<>
						<ModalBody>
							<div className="flex flex-col items-center gap-4 text-center py-4">
								<div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center ring-1 ring-red-100 dark:ring-red-500/20">
									<FiAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
										{labelErrorTitle}
									</p>
									<p className="text-xs text-neutral-500 dark:text-neutral-400">
										{labelTryAgain}
									</p>
								</div>
							</div>
						</ModalBody>
						<ModalFooter>
							<Button variant="outline" size="sm" onClick={handleClose}>
								{labelCancel}
							</Button>
							<Button size="sm" onClick={() => { setStatus('idle'); handleSend(); }}>
								{labelTryAgain}
							</Button>
						</ModalFooter>
					</>
				)}
			</Modal>
		</>
	);
}
