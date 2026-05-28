'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import { STEP_INDICATOR_CLASSES, STEP_DEFINITIONS } from '../validation/form-validators';
import type { StepDefinition } from '../validation/form-validators';

interface StepIndicatorProps {
	currentStep: number;
	onStepClick: (stepId: number) => void;
	completedFields?: Set<string>;
}

export function StepIndicator({ currentStep, onStepClick, completedFields }: StepIndicatorProps) {
	const t = useTranslations();
	const { categoriesEnabled } = useCategoriesEnabled();
	const { tagsEnabled } = useTagsEnabled();
	const steps: StepDefinition[] = STEP_DEFINITIONS;

	return (
		<div className={STEP_INDICATOR_CLASSES.wrapper}>
			{steps.map((step, index) => {
				const isActive = currentStep === step.id;
				const isAccessible = currentStep >= step.id;

				// Fields that count toward this step's progress. Drop fields
				// that aren't applicable for this instance (Categories / Tags
				// can be disabled in settings) so the bar can still reach 100%.
				const trackFields = ((step.progressFields && step.progressFields.length > 0)
					? step.progressFields
					: step.fields
				).filter((f) =>
					(f !== 'category' || categoriesEnabled) && (f !== 'tags' || tagsEnabled)
				);

				const totalFields = trackFields.length;
				const filledFields = trackFields.filter((f) => completedFields?.has(f)).length;
				const isPast = currentStep > step.id;

				// The step is "completed" only when every applicable tracked
				// field is filled (not merely the navigation gate), so the
				// indicator reflects real progress instead of jumping to 100%
				// as soon as the first couple of inputs are entered.
				const isCompleted = isPast || (totalFields > 0 && filledFields === totalFields);

				// fill % for the connector that follows this step — proportional
				// to how many tracked fields are filled.
				let connectorFill = 0;
				if (isPast) {
					connectorFill = 100;
				} else if (totalFields > 0) {
					connectorFill = Math.round((filledFields / totalFields) * 100);
				}

				return (
					<div key={step.id} className="flex items-start flex-1 last:flex-none">
						{/* Step circle + label */}
						<div className={STEP_INDICATOR_CLASSES.stepContainer}>
							<button
								onClick={() => isAccessible && onStepClick(step.id)}
								disabled={!isAccessible}
								type="button"
								className={cn(
									STEP_INDICATOR_CLASSES.button.base,
									isCompleted || isActive
										? STEP_INDICATOR_CLASSES.button.active
										: isAccessible
										? STEP_INDICATOR_CLASSES.button.accessible
										: STEP_INDICATOR_CLASSES.button.inaccessible
								)}
							>
								{isCompleted ? (
									<Check className="w-3.5 h-3.5 text-white" />
								) : (
									<span className="text-xs font-semibold tabular-nums">{step.id}</span>
								)}
							</button>
							<span
								className={cn(
									STEP_INDICATOR_CLASSES.label.base,
									isActive && STEP_INDICATOR_CLASSES.label.active,
									isCompleted && STEP_INDICATOR_CLASSES.label.completed,
									!isActive && !isCompleted && STEP_INDICATOR_CLASSES.label.default
								)}
							>
								{t(step.titleKey)}
							</span>
						</div>

						{/* Thin animated connector between steps */}
						{index < steps.length - 1 && (
							<div className={cn(STEP_INDICATOR_CLASSES.connector.base, STEP_INDICATOR_CLASSES.connector.default, 'relative')}>
								{/* Fill bar */}
								<div
									className="absolute inset-0 h-full bg-theme-primary-500 origin-left transform-gpu transition-transform duration-500 ease-out"
									style={{ transform: `scaleX(${connectorFill / 100})` }}
								/>
								{/* Flowing dots on the active connector */}
								{isActive && [0, 1, 2].map((i) => (
									<div
										key={i}
										className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-theme-primary-400 shadow-sm shadow-theme-primary-500/50 animate-dot-flow"
										style={{ animationDelay: `${i * 0.6}s` }}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
