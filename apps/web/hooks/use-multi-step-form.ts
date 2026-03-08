"use client";

import { useState, useCallback } from 'react';

export interface UseMultiStepFormOptions {
  totalSteps: number;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
}

export interface UseMultiStepFormReturn {
  currentStep: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  completedSteps: Set<number>;
  progress: number;
  goToNext: () => boolean;
  goToPrevious: () => boolean;
  goToStep: (step: number) => boolean;
  markStepAsCompleted: (step: number) => void;
  markStepAsIncomplete: (step: number) => void;
  reset: () => void;
}

export function useMultiStepForm({
  totalSteps,
  initialStep = 1,
  onStepChange,
  onComplete
}: UseMultiStepFormOptions): UseMultiStepFormReturn {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const progress = (currentStep / totalSteps) * 100;

  const goToStep = useCallback((step: number): boolean => {
    if (step < 1 || step > totalSteps) {
      return false;
    }

    setCurrentStep(step);
    onStepChange?.(step);
    return true;
  }, [totalSteps, onStepChange]);

  const goToNext = useCallback((): boolean => {
    if (isLastStep) {
      onComplete?.();
      return false;
    }

    return goToStep(currentStep + 1);
  }, [currentStep, isLastStep, goToStep, onComplete]);

  const goToPrevious = useCallback((): boolean => {
    if (isFirstStep) {
      return false;
    }

    return goToStep(currentStep - 1);
  }, [currentStep, isFirstStep, goToStep]);

  const markStepAsCompleted = useCallback((step: number) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  }, []);

  const markStepAsIncomplete = useCallback((step: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(step);
      return newSet;
    });
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(initialStep);
    setCompletedSteps(new Set());
  }, [initialStep]);

  return {
    currentStep,
    isFirstStep,
    isLastStep,
    completedSteps,
    progress,
    goToNext,
    goToPrevious,
    goToStep,
    markStepAsCompleted,
    markStepAsIncomplete,
    reset
  };
}