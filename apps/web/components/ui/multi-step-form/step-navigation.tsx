"use client";

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isSubmitting?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  submitLabel?: string;
  cancelLabel?: string;
  stepCounterLabel?: string;
  className?: string;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  isFirstStep,
  isLastStep,
  canGoNext,
  canGoPrevious,
  isSubmitting = false,
  onNext,
  onPrevious,
  onCancel,
  nextLabel = "Next",
  previousLabel = "Previous",
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  stepCounterLabel,
  className
}: StepNavigationProps) {
  const BUTTON_CLASSES = "min-w-24";

  return (
    <div className={cn("flex items-center justify-between mt-8", className)}>
      {/* Left Side - Previous Button or Cancel */}
      <div className="flex items-center gap-3">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious || isSubmitting}
            className={BUTTON_CLASSES}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {previousLabel}
          </Button>
        )}

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {cancelLabel}
          </Button>
        )}
      </div>

      {/* Center - Step Counter */}
      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
        {stepCounterLabel || `Step ${currentStep} of ${totalSteps}`}
      </div>

      {/* Right Side - Next/Submit Button */}
      <div>
        <Button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className={cn(BUTTON_CLASSES, {
            "bg-green-600 hover:bg-green-700": isLastStep && canGoNext
          })}
        >
          {isSubmitting && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}

          {isLastStep ? (
            submitLabel
          ) : (
            <>
              {nextLabel}
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}