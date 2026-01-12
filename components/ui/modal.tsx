'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	onOpenChange?: (open: boolean) => void;
	title?: string;
	subtitle?: React.ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
	children: React.ReactNode;
	backdrop?: 'blur' | 'opaque' | 'transparent';
	isDismissable?: boolean;
	hideCloseButton?: boolean;
	className?: string;
	/** Animation duration in ms */
	animationDuration?: number;
	/** Custom header component */
	customHeader?: React.ReactNode;
	/** Whether to show header border */
	showHeaderBorder?: boolean;
}

export function Modal({
	isOpen,
	onClose,
	onOpenChange,
	title,
	subtitle,
	size = 'md',
	children,
	backdrop = 'blur',
	isDismissable = true,
	hideCloseButton = false,
	className = '',
	animationDuration = 200,
	customHeader,
	showHeaderBorder = true
}: ModalProps) {
	const [isRendered, setIsRendered] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);

	// Handle open/close animations
	useEffect(() => {
		if (isOpen) {
			setIsRendered(true);
			// Small delay to trigger animation
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setIsAnimating(true);
				});
			});
			document.body.style.overflow = 'hidden';
		} else {
			setIsAnimating(false);
			const timer = setTimeout(() => {
				setIsRendered(false);
			}, animationDuration);
			document.body.style.overflow = 'unset';
			return () => clearTimeout(timer);
		}

		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, animationDuration]);

	// Handle escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isDismissable && isOpen) {
				onClose();
				onOpenChange?.(false);
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isOpen, isDismissable, onClose, onOpenChange]);

	const handleClose = useCallback(() => {
		onClose();
		onOpenChange?.(false);
	}, [onClose, onOpenChange]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget && isDismissable) {
				handleClose();
			}
		},
		[isDismissable, handleClose]
	);

	if (!isRendered) return null;

	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		'2xl': 'max-w-2xl',
		'3xl': 'max-w-3xl',
		'4xl': 'max-w-4xl',
		'5xl': 'max-w-5xl',
		full: 'max-w-[95vw] w-full'
	};

	const backdropClasses = {
		blur: 'bg-black/50 backdrop-blur-md',
		opaque: 'bg-black/70',
		transparent: 'bg-black/30'
	};

	const modalContent = (
		<div
			className={cn(
				'fixed inset-0 z-50 flex items-center justify-center p-4',
				backdropClasses[backdrop],
				'transition-opacity duration-200',
				isAnimating ? 'opacity-100' : 'opacity-0'
			)}
			onClick={handleBackdropClick}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
		>
			<div
				className={cn(
					'relative w-full max-h-[90vh]',
					sizeClasses[size],
					'bg-white dark:bg-gray-900',
					'rounded-2xl shadow-2xl',
					'border border-gray-200/50 dark:border-gray-700/50',
					'overflow-hidden',
					'transform transition-all duration-200',
					isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4',
					className
				)}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Custom header or default header */}
				{customHeader ||
					((title || !hideCloseButton) && (
						<div
							className={cn(
								'flex flex-col gap-2 px-6 py-4',
								showHeaderBorder && 'border-b border-gray-200 dark:border-gray-700/50',
								'bg-gray-50/50 dark:bg-gray-800/30'
							)}
						>
							<div className="flex items-center justify-between gap-4">
								{title && (
									<h2
										id="modal-title"
										className="text-lg font-semibold text-gray-900 dark:text-white"
									>
										{title}
									</h2>
								)}
								{!hideCloseButton && (
									<button
										type="button"
										onClick={handleClose}
										className={cn(
											'p-2 rounded-lg ml-auto',
											'text-gray-500 dark:text-gray-400',
											'hover:text-gray-700 dark:hover:text-gray-200',
											'hover:bg-gray-100 dark:hover:bg-gray-800',
											'transition-all duration-150',
											'focus:outline-none focus:ring-2 focus:ring-theme-primary/50'
										)}
										aria-label="Close modal"
									>
										<X size={20} />
									</button>
								)}
							</div>
							{subtitle && <div className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</div>}
						</div>
					))}

				{/* Content area */}
				<div className="overflow-y-auto max-h-[calc(90vh-5rem)]">{children}</div>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
}

// Sub-components for flexible composition
export function ModalContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('flex flex-col', className)}>{children}</div>;
}

export function ModalHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				'px-6 py-4 border-b border-gray-200 dark:border-gray-700/50',
				'bg-gray-50/50 dark:bg-gray-800/30',
				className
			)}
		>
			{children}
		</div>
	);
}

export function ModalBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('p-6', className)}>{children}</div>;
}

export function ModalFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				'px-6 py-4 border-t border-gray-200 dark:border-gray-700/50',
				'bg-gray-50/50 dark:bg-gray-800/30',
				'flex items-center justify-end gap-3',
				className
			)}
		>
			{children}
		</div>
	);
}
