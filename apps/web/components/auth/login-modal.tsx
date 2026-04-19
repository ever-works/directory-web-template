'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LoginContent } from '@/components/auth/login-content';
import { X } from 'lucide-react';

interface LoginModalProps {
	isOpen: boolean;
	onClose: () => void;
	message?: string;
	callbackUrl?: string;
}

export function LoginModal({ isOpen, onClose, message = 'Welcome back', callbackUrl }: LoginModalProps) {
	const [isRendered, setIsRendered] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);

	// Mount/unmount with animation
	useEffect(() => {
		if (isOpen) {
			setIsRendered(true);
			requestAnimationFrame(() => {
				requestAnimationFrame(() => setIsAnimating(true));
			});
			document.body.style.overflow = 'hidden';
		} else {
			setIsAnimating(false);
			const t = setTimeout(() => {
				setIsRendered(false);
				document.body.style.overflow = '';
			}, 250);
			return () => clearTimeout(t);
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen]);

	// Escape key to close
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) onClose();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [isOpen, onClose]);

	const handleBackdrop = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) onClose();
		},
		[onClose]
	);

	if (!isRendered) return null;

	return createPortal(
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md transition-opacity duration-[250ms] ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
			onClick={handleBackdrop}
			role="dialog"
			aria-modal="true"
		>
			<div
				className={`relative w-full max-w-4xl max-h-[95vh] bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/8 overflow-hidden transform transition-all duration-[250ms] ${isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Floating close button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20"
					aria-label="Close"
				>
					<X size={18} />
				</button>

				{/* Scrollable content */}
				<div className="overflow-y-auto max-h-[95vh] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1">
					<LoginContent variant="modal" message={message} type="login" onSuccess={onClose} callbackUrl={callbackUrl} />
				</div>
			</div>
		</div>,
		document.body
	);
}
