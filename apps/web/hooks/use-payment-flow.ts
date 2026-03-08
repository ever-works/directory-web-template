import { useState, useCallback, useMemo, useEffect } from "react";
import { PaymentFlow, SubmissionStatus } from "@/lib/payment/types/payment";
import { getPaymentFlowConfig } from "@/lib/config/payment-flows";
import { usePaymentFlowStorage } from "./use-local-storage";

interface UsePaymentFlowOptions {
  initialFlow?: PaymentFlow;
  enableAnimations?: boolean;
  autoSave?: boolean;
}

interface UsePaymentFlowReturn {
  // State
  selectedFlow: PaymentFlow;
  flowConfig: ReturnType<typeof getPaymentFlowConfig>;
  submissionStatus: SubmissionStatus;
  isAnimating: boolean;
  isSelecting: boolean;
  
  // Actions
  setSelectedFlow: (flow: PaymentFlow) => void;
  selectFlow: (flow: PaymentFlow) => Promise<void>;
  resetFlow: () => void;
  
  // Computed
  isPayAtStart: boolean;
  isPayAtEnd: boolean;
  shouldShowPaymentStep: boolean;
  activeSteps: number[];
  canProceed: boolean;
  
  // Animation helpers
  triggerAnimation: () => void;
  getAnimationDelay: (index: number) => number;
}

export function usePaymentFlow(options: UsePaymentFlowOptions = {}): UsePaymentFlowReturn {
  const {
    initialFlow = PaymentFlow.PAY_AT_END,
    enableAnimations = true,
    autoSave = true
  } = options;

  // Use the secure localStorage hook
  const [storedFlow, setStoredFlow] = usePaymentFlowStorage();
  
  // Initialize selectedFlow with a consistent default for SSR
  const [selectedFlow, setSelectedFlowState] = useState<PaymentFlow>(initialFlow);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration - only use stored value after client-side hydration
  useEffect(() => {
    setIsHydrated(true);
    if (autoSave && storedFlow) {
      setSelectedFlowState(storedFlow);
    }
  }, [autoSave, storedFlow]);

  const [isAnimating, setIsAnimating] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>(SubmissionStatus.DRAFT);

  // Get flow configuration
  const flowConfig = useMemo(() => 
    getPaymentFlowConfig(selectedFlow), 
    [selectedFlow]
  );

  // Computed values
  const isPayAtStart = useMemo(() => 
    selectedFlow === PaymentFlow.PAY_AT_START, 
    [selectedFlow]
  );

  const isPayAtEnd = useMemo(() => 
    selectedFlow === PaymentFlow.PAY_AT_END, 
    [selectedFlow]
  );

  const shouldShowPaymentStep = useMemo(() => {
    if (isPayAtStart) {
      return submissionStatus === SubmissionStatus.DRAFT || 
             submissionStatus === SubmissionStatus.PENDING_PAYMENT;
    }
    return submissionStatus === SubmissionStatus.PAID;
  }, [isPayAtStart, submissionStatus]);

  const activeSteps = useMemo(() => {
    const steps = [1, 2]; // Choose flow and details always active
    
    if (isPayAtStart) {
      steps.push(3); // Payment step for pay at start
    }
    
    steps.push(4); // Review step
    
    if (isPayAtEnd) {
      steps.push(5); // Payment step for pay at end
    }
    
    return steps;
  }, [isPayAtStart, isPayAtEnd]);

  const canProceed = useMemo(() => {
    switch (submissionStatus) {
      case SubmissionStatus.DRAFT:
        return true;
      case SubmissionStatus.PENDING_PAYMENT:
        return isPayAtStart || isPayAtEnd;
      case SubmissionStatus.PAID:
        return isPayAtStart;
      case SubmissionStatus.PUBLISHED:
        return isPayAtEnd;
      case SubmissionStatus.REJECTED:
        return false;
      default:
        return false;
    }
  }, [submissionStatus, isPayAtStart, isPayAtEnd]);

  // Actions
  const setSelectedFlow = useCallback((flow: PaymentFlow) => {
    setSelectedFlowState(flow);
    
    // Auto-save to localStorage if enabled and hydrated
    if (autoSave && isHydrated) {
      setStoredFlow(flow);
    }
  }, [autoSave, setStoredFlow, isHydrated]);

  const selectFlow = useCallback(async (flow: PaymentFlow) => {
    if (isSelecting) return;
    
    setIsSelecting(true);
    
    // Simulate selection delay for better UX
    if (enableAnimations) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    setSelectedFlow(flow);
    
    // Reset submission status when flow changes
    setSubmissionStatus(SubmissionStatus.DRAFT);
    
    setIsSelecting(false);
  }, [isSelecting, enableAnimations, setSelectedFlow]);

  const resetFlow = useCallback(() => {
    setSelectedFlowState(initialFlow);
    setSubmissionStatus(SubmissionStatus.DRAFT);
    setIsAnimating(false);
    setIsSelecting(false);
    
    // Reset localStorage if autoSave is enabled and hydrated
    if (autoSave && isHydrated) {
      setStoredFlow(initialFlow);
    }
  }, [initialFlow, autoSave, setStoredFlow, isHydrated]);

  // Animation helpers
  const triggerAnimation = useCallback(() => {
    if (!enableAnimations) return;
    
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  }, [enableAnimations]);

  const getAnimationDelay = useCallback((index: number) => {
    if (!enableAnimations) return 0;
    return index * 100; // 100ms delay per item
  }, [enableAnimations]);

  return {
    // State
    selectedFlow,
    flowConfig,
    submissionStatus,
    isAnimating,
    isSelecting,
    
    // Actions
    setSelectedFlow,
    selectFlow,
    resetFlow,
    
    // Computed
    isPayAtStart,
    isPayAtEnd,
    shouldShowPaymentStep,
    activeSteps,
    canProceed,
    
    // Animation helpers
    triggerAnimation,
    getAnimationDelay
  };
} 