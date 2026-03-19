'use client';

import { Check, Type, CreditCard, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEP_INDICATOR_CLASSES, STEP_DEFINITIONS } from '../validation/form-validators';
import type { StepDefinition } from '../validation/form-validators';

interface StepIndicatorProps {
	currentStep: number;
	onStepClick: (stepId: number) => void;
	completedFields?: Set<string>;
}

const STEP_ICONS = {
	1: Type,
	2: CreditCard,
	3: Eye
};

export function StepIndicator({ currentStep, onStepClick, completedFields }: StepIndicatorProps) {
	const steps: StepDefinition[] = STEP_DEFINITIONS.map((step) => ({
		...step,
		icon: STEP_ICONS[step.id as keyof typeof STEP_ICONS]
	}));

	return (
		<div className={STEP_INDICATOR_CLASSES.wrapper}>
			{steps.map((step, index) => {
				const IconComponent = step.icon || Type;
				const isActive = currentStep === step.id;
				const isAccessible = currentStep >= step.id;

				// Use progressFields (all trackable) for connector fill; fields gates navigation
				const trackFields = (step.progressFields && step.progressFields.length > 0)
					? step.progressFields
					: step.fields;

				const totalFields = trackFields.length;
				const filledFields = totalFields > 0
					? trackFields.filter((f) => completedFields?.has(f)).length
					: 0;

				// Step is "completed" when all required (navigation) fields are filled
				const navFields = step.fields;
				const stepCompletedFromFields = navFields.length > 0
					? navFields.every((f) => completedFields?.has(f))
					: false;
				const isCompleted = stepCompletedFromFields || currentStep > step.id;

				// fill % for the connector that follows this step
				let connectorFill = 0;
				if (stepCompletedFromFields || currentStep > step.id) {
					connectorFill = 100;
				} else if (totalFields > 0) {
					connectorFill = Math.round((filledFields / totalFields) * 100);
				}



				return (
					<div key={step.id} className="flex items-center flex-1 last:flex-none">
						{/* Step circle + label */}
						<div className={STEP_INDICATOR_CLASSES.stepContainer}>
							<button
								onClick={() => isAccessible && onStepClick(step.id)}
								disabled={!isAccessible}
								type="button"
								className={cn(
									STEP_INDICATOR_CLASSES.button.base,
									isActive && STEP_INDICATOR_CLASSES.button.active,
									isCompleted
										? STEP_INDICATOR_CLASSES.button.completed
										: isActive
										? 'bg-theme-primary-500 text-white shadow-lg shadow-theme-primary-500/30'
										: isAccessible
										? STEP_INDICATOR_CLASSES.button.accessible
										: STEP_INDICATOR_CLASSES.button.inaccessible
								)}
							>
								{isCompleted ? (
									<Check className="w-5 h-5 text-white" />
								) : (
									<IconComponent
										className={cn(
											'w-5 h-5',
											isActive ? 'text-white' : isAccessible ? 'text-theme-primary-500' : 'text-gray-400'
										)}
									/>
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
								{step.title}
							</span>
						</div>

						{/* Animated fill connector between steps */}
						{index < steps.length - 1 && (
							<div className="relative flex-1 mx-4 h-1.5 bg-gray-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
								<div
									className="absolute inset-0 left-0 rounded-full bg-theme-primary-500 origin-left transform-gpu transition-transform duration-500 ease-out"
									style={{ transform: `scaleX(${connectorFill / 100})` }}
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
