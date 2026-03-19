'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextValue {
	confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const resolverRef = useRef<((value: boolean) => void) | null>(null);

	const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
		return new Promise((resolve) => {
			setOptions(options);
			setIsOpen(true);
			resolverRef.current = resolve;
		});
	}, []);

	const handleConfirm = useCallback(() => {
		if (resolverRef.current) {
			resolverRef.current(true);
		}
		setIsOpen(false);
		setOptions(null);
		resolverRef.current = null;
	}, []);

	const handleCancel = useCallback(() => {
		if (resolverRef.current) {
			resolverRef.current(false);
		}
		setIsOpen(false);
		setOptions(null);
		resolverRef.current = null;
	}, []);

	const getVariantStyles = () => {
		switch (options?.variant) {
			case 'danger':
				return {
					iconBg: 'bg-red-100 dark:bg-red-900/20',
					iconColor: 'text-red-600 dark:text-red-400',
					buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
				};
			case 'warning':
				return {
					iconBg: 'bg-orange-100 dark:bg-orange-900/20',
					iconColor: 'text-orange-600 dark:text-orange-400',
					buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white'
				};
			default:
				return {
					iconBg: 'bg-blue-100 dark:bg-blue-900/20',
					iconColor: 'text-blue-600 dark:text-blue-400',
					buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
				};
		}
	};

	const variantStyles = getVariantStyles();

	return (
		<ConfirmContext.Provider value={{ confirm }}>
			{children}

			{isOpen && options && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 p-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
						<div className="flex items-start gap-4">
							<div className={`shrink-0 w-10 h-10 rounded-full ${variantStyles.iconBg} flex items-center justify-center`}>
								<AlertTriangle className={`w-5 h-5 ${variantStyles.iconColor}`} />
							</div>
							<div className="flex-1">
								{options.title && (
									<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
										{options.title}
									</h3>
								)}
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{options.message}
								</p>
							</div>
							<button
								type="button"
								onClick={handleCancel}
								className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="flex gap-3 mt-6 justify-end">
							<Button
								variant="outline"
								onClick={handleCancel}
							>
								{options.cancelText || 'Cancel'}
							</Button>
							<Button
								onClick={handleConfirm}
								className={variantStyles.buttonClass}
							>
								{options.confirmText || 'Confirm'}
							</Button>
						</div>
					</div>
				</div>
			)}
		</ConfirmContext.Provider>
	);
}

export function useConfirm() {
	const context = useContext(ConfirmContext);
	if (!context) {
		throw new Error('useConfirm must be used within a ConfirmProvider');
	}
	return context;
}

