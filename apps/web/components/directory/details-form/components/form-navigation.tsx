'use client';

import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { NAVIGATION_CLASSES, STEP_DEFINITIONS } from '../validation/form-validators';

interface FormNavigationProps {
	currentStep: number;
	canProceed: boolean;
	completedRequiredFields: number;
	requiredFieldsCount: number;
	missingRequiredFields?: string[];
	onPrevious: () => void;
	onNext: () => void;
	onBack: () => void;
	isSubmitting?: boolean;
}

export function FormNavigation({
	currentStep,
	canProceed,
	completedRequiredFields,
	requiredFieldsCount,
	missingRequiredFields = [],
	onPrevious,
	onNext,
	onBack,
	isSubmitting = false
}: FormNavigationProps) {
	const t = useTranslations('common');
	const isLastStep = currentStep === STEP_DEFINITIONS.length;

	const handleNextClick = () => {
		onNext();
		if (typeof window !== 'undefined') {
			setTimeout(() => {
				try {
					window.scrollTo({ top: 0, behavior: 'smooth' });
					document.documentElement?.scrollTo?.({ top: 0, behavior: 'smooth' } as ScrollToOptions);
					document.body?.scrollTo?.({ top: 0, behavior: 'smooth' } as ScrollToOptions);
				} catch (_e) {
					window.scrollTo(0, 0);
				}
			}, 50);
		}
	};

	return (
		<div className={NAVIGATION_CLASSES.container} style={{ animationDelay: '0.5s' }}>
			<div className="flex gap-3">
				{currentStep > 1 && (
					<button
						type="button"
						onClick={onPrevious}
						className={cn(NAVIGATION_CLASSES.button.base, NAVIGATION_CLASSES.button.primary)}
					>
						<ArrowLeft className="w-4 h-4" />
						<span>{t('PREVIOUS')}</span>
					</button>
				)}

				{currentStep === 1 && (
					<button
						type="button"
						onClick={onBack}
						className={cn(NAVIGATION_CLASSES.button.base, NAVIGATION_CLASSES.button.primary)}
					>
						<ArrowLeft className="w-4 h-4" />
						<span>{t('BACK_TO_PLANS')}</span>
					</button>
				)}
			</div>

			<div className="flex gap-3">
				{!isLastStep ? (
					<button
						type="button"
						onClick={handleNextClick}
						disabled={!canProceed}
						className={cn(
							NAVIGATION_CLASSES.button.base,
							!canProceed ? NAVIGATION_CLASSES.button.disabled : NAVIGATION_CLASSES.button.primary
						)}
					>
						<span>{t('NEXT_STEP')}</span>
						<ArrowRight className="w-4 h-4" />
					</button>
				) : (
					<button
						type="submit"
						disabled={completedRequiredFields < requiredFieldsCount || isSubmitting}
						data-missing-required-fields={missingRequiredFields.join(',')}
						data-completed-required={completedRequiredFields}
						data-total-required={requiredFieldsCount}
						className={cn(
							NAVIGATION_CLASSES.button.base,
							completedRequiredFields < requiredFieldsCount || isSubmitting
								? NAVIGATION_CLASSES.button.disabled
								: NAVIGATION_CLASSES.button.submit
						)}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								<span>{t('SUBMITTING')}</span>
							</>
						) : (
							<>
								<span>{t('SUBMIT_PRODUCT')}</span>
								<Check className="w-4 h-4" />
							</>
						)}
					</button>
				)}
			</div>
		</div>
	);
}
