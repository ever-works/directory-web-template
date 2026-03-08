import { PaymentFlowConfig, PaymentFlow } from "@/lib/payment/types/payment";

export const PAYMENT_FLOWS: PaymentFlowConfig[] = [
  {
    id: PaymentFlow.PAY_AT_START,
    title: "Pay First",
    subtitle: "Instant Publication",
    description: "Pay upfront and get published immediately",
    icon: "CreditCard",
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-50 to-pink-50",
    borderColor: "border-purple-200",
    darkBgColor: "dark:from-purple-900/20 dark:to-pink-900/20",
    darkBorderColor: "dark:border-purple-800",
    features: [
      "Immediate payment required",
      "Instant publication",
      "No review delays",
      "Guaranteed listing"
    ],
    benefits: [
      { icon: "Zap", text: "Fastest way to get listed", color: "text-purple-600" },
      { icon: "Star", text: "Priority placement", color: "text-purple-600" },
      { icon: "Shield", text: "Guaranteed approval", color: "text-purple-600" }
    ],
    badge: "Popular"
  },
  {
    id: PaymentFlow.PAY_AT_END,
    title: "Pay Later",
    subtitle: "Review First",
    description: "Submit details first, pay after approval",
    icon: "Clock",
    color: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-200",
    darkBgColor: "dark:from-blue-900/20 dark:to-cyan-900/20",
    darkBorderColor: "dark:border-blue-800",
    features: [
      "Submit without payment",
      "Review before payment",
      "Pay only if approved",
      "Save your work"
    ],
    benefits: [
      { icon: "Save", text: "No upfront cost", color: "text-blue-600" },
      { icon: "TrendingUp", text: "Higher conversion", color: "text-blue-600" },
      { icon: "Shield", text: "Risk-free submission", color: "text-blue-600" }
    ],
    badge: "Recommended",
    isDefault: true
  }
];

export const getDefaultPaymentFlow = (): PaymentFlow => {
  const defaultFlow = PAYMENT_FLOWS.find(flow => flow.isDefault);
  return defaultFlow?.id || PaymentFlow.PAY_AT_END;
};

export const getPaymentFlowConfig = (flowId: PaymentFlow): PaymentFlowConfig => {
  const config = PAYMENT_FLOWS.find(flow => flow.id === flowId);
  if (!config) {
    throw new Error(`Payment flow configuration not found for: ${flowId}`);
  }
  return config;
}; 