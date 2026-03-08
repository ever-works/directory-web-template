"use client";

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface StepIndicatorStep {
  id: string;
  title: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  currentStep: number;
  completedSteps: Set<number>;
  className?: string;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  className,
  onStepClick
}: StepIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
            }}
          />
        </div>

        {/* Step Circles */}
        <div className="flex justify-between relative">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = completedSteps.has(stepNumber);
            const isCurrent = stepNumber === currentStep;
            const isClickable = onStepClick && (isCompleted || stepNumber <= currentStep);

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center group",
                  isClickable && "cursor-pointer"
                )}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                aria-label={isClickable ? `Go to ${step.title}` : undefined}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => isClickable && onStepClick(stepNumber)}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onStepClick(stepNumber);
                  }
                }}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-200",
                    {
                      "bg-blue-600 border-blue-600 text-white": isCompleted,
                      "bg-white dark:bg-gray-800 border-blue-600 text-blue-600": isCurrent && !isCompleted,
                      "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500": !isCurrent && !isCompleted,
                      "group-hover:border-blue-500 group-hover:text-blue-500": isClickable && !isCompleted && !isCurrent
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Step Info */}
                <div className="mt-2 text-center max-w-24">
                  <div
                    className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      {
                        "text-blue-600": isCurrent || isCompleted,
                        "text-gray-900 dark:text-gray-100": !isCurrent && !isCompleted,
                        "group-hover:text-blue-600": isClickable
                      }
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div
                      className={cn(
                        "text-xs mt-1 transition-colors duration-200",
                        {
                          "text-blue-500": isCurrent || isCompleted,
                          "text-gray-500 dark:text-gray-400": !isCurrent && !isCompleted,
                          "group-hover:text-blue-500": isClickable
                        }
                      )}
                    >
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}