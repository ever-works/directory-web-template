'use client';

import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAVIGATION_CLASSES, STEP_DEFINITIONS } from '../validation/form-validators';

interface FormNavigationProps {
	currentStep: number;
	canProceed: boolean;
	completedRequiredFields: number;
	requiredFieldsCount: number;
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
	onPrevious,
	onNext,
	onBack,
	isSubmitting = false
}: FormNavigationProps) {
	const isLastStep = currentStep === STEP_DEFINITIONS.length;

	const handleNextClick = () => {
		onNext();
		if (typeof window !== 'undefined') {
			// delay scroll so DOM updates/route transitions don't interrupt animation
			setTimeout(() => {
				try {
					window.scrollTo({ top: 0, behavior: 'smooth' });
					// also attempt to scroll document element and body for some browsers
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
			<div className="flex gap-4">
				{currentStep > 1 && (
					<Button
						type="button"
						onClick={onPrevious}
						className={NAVIGATION_CLASSES.button.prev.enabled}
					>
						<div className="flex items-center gap-3">
							<ArrowLeft className="w-5 h-5" />
							<span>Previous</span>
						</div>
					</Button>
				)}

				{currentStep === 1 && (
					<Button
						type="button"
						onClick={onBack}
						className={NAVIGATION_CLASSES.button.next.enabled}
					>
						<div className="flex items-center gap-3">
							<ArrowLeft className="w-5 h-5" />
							<span>Back to Plans</span>
						</div>
					</Button>
				)}
			</div>

			<div className="flex gap-4">
				{!isLastStep ? (
					<Button
						type="button"
						onClick={handleNextClick}
						disabled={!canProceed}
						className={cn(
							!canProceed
								? NAVIGATION_CLASSES.button.next.disabled
								: NAVIGATION_CLASSES.button.next.enabled
						)}
					>
						<div className="flex items-center gap-3">
							<span>Next Step</span>
							<ArrowRight className="w-5 h-5" />
						</div>
					</Button>
				) : (
					<Button
						type="submit"
						disabled={completedRequiredFields < requiredFieldsCount || isSubmitting}
						className={cn(
							completedRequiredFields < requiredFieldsCount || isSubmitting
								? NAVIGATION_CLASSES.button.submit.disabled
								: NAVIGATION_CLASSES.button.submit.enabled
						)}
					>
						<div className="flex items-center gap-3">
							{isSubmitting ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									<span>Submitting...</span>
								</>
							) : (
								<>
									<span>Submit Product</span>
									<Check className="w-5 h-5" />
								</>
							)}
						</div>
					</Button>
				)}
			</div>
		</div>
	);
}
