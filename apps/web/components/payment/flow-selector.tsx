"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PaymentFlow } from "@/lib/payment/types/payment";
import { PAYMENT_FLOWS } from "@/lib/config/payment-flows";
import {
  CreditCard,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Save,
  Shield,
  Zap,
  Star,
  TrendingUp,
  Info,
  AlertCircle,
  ChevronRight,
  Play,
  Pause
} from "lucide-react";

interface PaymentFlowSelectorProps {
  selectedFlow: PaymentFlow;
  onFlowSelect: (flow: PaymentFlow) => void;
  className?: string;
  showComparison?: boolean;
  showCurrentSelection?: boolean;
  compact?: boolean;
  animated?: boolean;
}

const iconMap = {
  CreditCard,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Save,
  Shield,
  Zap,
  Star,
  TrendingUp,
  Info,
  AlertCircle,
  ChevronRight,
  Play,
  Pause
};

export function PaymentFlowSelector({
  selectedFlow,
  onFlowSelect,
  className,
  showComparison = true,
  showCurrentSelection = true,
  compact = false,
  animated = true
}: PaymentFlowSelectorProps) {
  const [hoveredFlow, setHoveredFlow] = useState<PaymentFlow | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const selectedConfig = useMemo(() => 
    PAYMENT_FLOWS.find(flow => flow.id === selectedFlow), 
    [selectedFlow]
  );

  const handleFlowSelect = async (flow: PaymentFlow) => {
    if (isSelecting) return;
    
    setIsSelecting(true);
    
    // Simulate selection delay for better UX
    await new Promise(resolve => setTimeout(resolve, 150));
    
    onFlowSelect(flow);
    setIsSelecting(false);
  };

  if (compact) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Simplified Compact Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-theme-primary-800 border border-slate-200 dark:border-theme-primary-700 shadow-xs mb-3">
            <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Smart Selection
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Choose Payment Flow
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select how you want to handle payment
          </p>
        </div>

        {/* Enhanced Compact Flow Cards */}
        <div className="grid grid-cols-1 gap-3">
          {PAYMENT_FLOWS.map((flow) => {
            const IconComponent = iconMap[flow.icon as keyof typeof iconMap];
            const isSelected = selectedFlow === flow.id;
            const isHovered = hoveredFlow === flow.id;

            return (
              <Card
                key={flow.id}
                className={cn(
                  "relative cursor-pointer transition-all duration-200 p-4 border group",
                  isSelected
                    ? "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 shadow-md"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs",
                  animated && "hover:scale-[1.01]",
                  isSelecting && "pointer-events-none opacity-75"
                )}
                onClick={() => handleFlowSelect(flow.id)}
                onMouseEnter={() => setHoveredFlow(flow.id)}
                onMouseLeave={() => setHoveredFlow(null)}
              >
                {/* Simplified Background */}
                {animated && isHovered && (
                  <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 opacity-10" />
                )}

                {/* Simplified Badge */}
                {flow.badge && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 rounded-md text-xs font-medium bg-slate-600 text-white shadow-xs">
                    {flow.badge}
                  </div>
                )}

                {/* Simplified Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -left-1 w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center shadow-xs">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Simplified Content */}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-linear-to-r from-slate-600 to-slate-800 shadow-xs">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                      {flow.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {flow.description}
                    </p>
                  </div>

                  <Button
                    variant={isSelected ? "default" : "outline-solid"}
                    size="sm"
                    className={cn(
                      "transition-all duration-200",
                      isSelected && "bg-slate-600 hover:bg-slate-700"
                    )}
                    disabled={isSelecting}
                  >
                    {isSelecting && isSelected ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Selecting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isSelected ? "Selected" : "Select"}
                        {!isSelected && <ChevronRight className="w-3 h-3" />}
                      </div>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Simplified Compact Comparison */}
        {showComparison && (
          <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h5 className="font-semibold text-slate-900 dark:text-white text-sm">
                Quick Comparison
              </h5>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <h6 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-600" />
                  Pay First
                </h6>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 text-slate-500" />
                    Immediate publication
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 text-slate-500" />
                    No review delays
                  </li>
                  <li className="flex items-center gap-1 text-slate-500">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Payment upfront
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h6 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-600" />
                  Pay Later
                </h6>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 text-slate-500" />
                    No upfront cost
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 text-slate-500" />
                    Review first
                  </li>
                  <li className="flex items-center gap-1 text-slate-500">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Pay after approval
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Simplified Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs mb-4">
          <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Choose Your Payment Flow
          </span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          How would you like to proceed?
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Select the payment flow that works best for you.
        </p>
      </div>

      {/* Simplified Flow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {PAYMENT_FLOWS.map((flow) => {
          const IconComponent = iconMap[flow.icon as keyof typeof iconMap];
          const isSelected = selectedFlow === flow.id;
          const isHovered = hoveredFlow === flow.id;

          return (
            <Card
              key={flow.id}
              className={cn(
                "relative cursor-pointer transition-all duration-200 p-5 border group",
                isSelected
                  ? "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 shadow-md"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs",
                animated && "hover:scale-[1.01]",
                isSelecting && "pointer-events-none opacity-75"
              )}
              onClick={() => handleFlowSelect(flow.id)}
              onMouseEnter={() => setHoveredFlow(flow.id)}
              onMouseLeave={() => setHoveredFlow(null)}
            >
              {/* Simplified Background */}
              {animated && isHovered && (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 opacity-10" />
              )}

              {/* Simplified Badge */}
              {flow.badge && (
                <div className="absolute -top-3 -right-3 px-3 py-1 rounded-md text-xs font-medium bg-slate-600 text-white shadow-xs">
                  {flow.badge}
                </div>
              )}

              {/* Simplified Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center shadow-xs">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Simplified Header */}
              <div className="flex items-start gap-3 mb-4 relative z-10">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-linear-to-r from-slate-600 to-slate-800 shadow-xs">
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {flow.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {flow.subtitle}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {flow.description}
                  </p>
                </div>
              </div>

              {/* Simplified Features */}
              <div className="space-y-2 mb-4 relative z-10">
                {flow.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Simplified Selection Button */}
              <Button
                variant={isSelected ? "default" : "outline-solid"}
                className={cn(
                  "w-full h-10 transition-all duration-200",
                  isSelected && "bg-slate-600 hover:bg-slate-700",
                  isSelecting && "pointer-events-none"
                )}
                disabled={isSelecting}
              >
                {isSelecting && isSelected ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Selecting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Selected
                      </>
                    ) : (
                      <>
                        Select This Flow
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </div>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Simplified Flow Comparison */}
      {showComparison && (
        <div className="max-w-3xl mx-auto">
          <Card className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Quick Comparison
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose the option that best fits your needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  Pay First
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-slate-500" />
                    <span>Immediate publication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-slate-500" />
                    <span>No review delays</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>Payment required upfront</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  Pay Later
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-slate-500" />
                    <span>No upfront cost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-slate-500" />
                    <span>Review before payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>Payment after approval</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Simplified Current Selection Info */}
      {showCurrentSelection && selectedConfig && (
        <div className="text-center">
          <div className="inline-flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-600">
              {selectedFlow === PaymentFlow.PAY_AT_START ? (
                <CreditCard className="w-3 h-3 text-white" />
              ) : (
                <Clock className="w-3 h-3 text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedConfig.title} Selected
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {selectedConfig.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 