"use client";

import { ReactNode, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { Check, X, Info } from "lucide-react";
import { PaymentPlan, PaymentFlow } from "@/lib/constants";

export type PlanFeature = {
  readonly included: boolean;
  readonly text: string;
};

interface PlanCardProps {
  readonly plan?: PaymentPlan;
  readonly title: string;
  readonly price: string;
  readonly priceUnit?: string;
  readonly features: readonly PlanFeature[];
  readonly isPopular?: boolean;
  readonly isSelected: boolean;
  readonly onSelect?: (plan: PaymentPlan) => void;
  readonly actionText: string;
  readonly actionVariant?: "default" | "outline-solid";
  readonly actionHref?: string;
  readonly children?: ReactNode;
  readonly isButton?: boolean;
  readonly onClick?: () => void;
  readonly isLoading?: boolean;
  readonly className?: string;
  readonly selectedFlow?: PaymentFlow;
  readonly onFlowChange?: (flow: PaymentFlow) => void;
  readonly onOpenModal?: () => void;
}

// Constants for modern design based on reference image
const PLAN_TYPES = {
  FREE: 'FREE',
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM'
} as const;

const PAYMENT_FLOW_OPTIONS = [
  { value: PaymentFlow.PAY_AT_START, label: "Pay Now" },
  { value: PaymentFlow.PAY_AT_END, label: "Pay Later" },
];

const getButtonStyles = (title: string, isPopular: boolean) => {
  const upperTitle = title.toUpperCase();

  if (upperTitle === PLAN_TYPES.STANDARD || isPopular) {
    return "bg-linear-to-r from-theme-primary-500 to-theme-primary-600 hover:from-theme-primary-600 hover:to-theme-primary-500 text-white border-0 shadow-lg h-12 text-sm font-medium rounded-lg cursor-pointer";
  }

  if (upperTitle === PLAN_TYPES.PREMIUM) {
    return "bg-transparent border border-gray-300 dark:border-white/[0.12] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/6 hover:border-gray-400 dark:hover:border-white/[0.2] h-12 text-sm font-medium rounded-lg cursor-pointer";
  }

  return "bg-transparent border border-gray-300 dark:border-white/[0.12] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/6 hover:border-gray-400 dark:hover:border-white/[0.2] h-12 text-sm font-medium rounded-lg cursor-pointer";
};

const getPriceColor = (title: string, isPopular: boolean) => {
  const upperTitle = title.toUpperCase();

  if (upperTitle === PLAN_TYPES.STANDARD || isPopular) {
    return "text-theme-primary-500";
  }

  if (upperTitle === PLAN_TYPES.PREMIUM) {
    return "text-black dark:text-white"; // Orange for "Custom"
  }

  return "text-black dark:text-white";
};

const getCardStyles = (title: string, isPopular: boolean) => {
  const upperTitle = title.toUpperCase();

  if (upperTitle === PLAN_TYPES.STANDARD || isPopular) {
  return [
    // Base styling
    "border-theme-primary-200/60 dark:border-white/8 shadow-xl",
    "bg-white dark:bg-white/3",
    "scale-105 z-10",
    "max-w-[380px] min-h-[672px]",

    // Required for pseudo-elements
    "relative",

    // ──────────────────────────────────────────
    // 1. Top-right gradient overlay (::after)
    //    Light: very faint tint; Dark: richer
    // ──────────────────────────────────────────
    "after:absolute after:inset-0 after:rounded-xl after:pointer-events-none",
    "after:bg-gradient-to-tr after:from-transparent after:via-theme-primary-500/5 after:to-theme-primary-500/10 dark:after:via-theme-primary-900/20 dark:after:to-theme-primary-800/50",
    "after:z-[1]",

    // ──────────────────────────────────────────
    // 2. Top + right gradient border (::before)
    //    Light: muted 40% opacity; Dark: vivid
    // ──────────────────────────────────────────
    "before:absolute before:inset-0 before:rounded-xl before:pointer-events-none",
    "before:bg-[linear-gradient(to_right,transparent_10%,rgb(var(--theme-primary-400)/0.45),rgb(var(--theme-primary-400)/0.45)_90%),linear-gradient(to_bottom,transparent_10%,rgb(var(--theme-primary-400)/0.45),rgb(var(--theme-primary-400)/0.45)_90%)]",
    "dark:before:bg-[linear-gradient(to_right,transparent_10%,rgb(var(--theme-primary-400)),rgb(var(--theme-primary-400))_90%),linear-gradient(to_bottom,transparent_10%,rgb(var(--theme-primary-400)),rgb(var(--theme-primary-400))_90%)]",
    "before:bg-[length:100%_2px,2px_100%]",
    "before:bg-[position:0_0,100%_0]",
    "before:bg-no-repeat",
    "before:z-[2]",
  ];
}

  return [
    "border-gray-200/70 dark:border-white/6 shadow-lg dark:shadow-xl",
    "bg-white dark:bg-white/3",
    "max-w-[380px] min-h-[674px]" // Standard height for FREE and PREMIUM
  ];
};

export function PlanCard({
  title,
  price,
  priceUnit,
  features,
  isPopular = false,
  isSelected,
  actionText,
  actionHref,
  children,
  isButton = true,
  isLoading = false,
  onClick,
  className,
  selectedFlow = PaymentFlow.PAY_AT_END,
  onFlowChange,
  onOpenModal,
}: PlanCardProps) {
  const router = useRouter();
  
  const isPaidPlan = title.toUpperCase() === PLAN_TYPES.STANDARD || title.toUpperCase() === PLAN_TYPES.PREMIUM;

  const cardStyles = useMemo(() => cn(
    "relative flex flex-col pt-8",
    "w-full rounded-xl border",
    (title.toUpperCase() === 'STANDARD' || isPopular) ? "mt-6" : "mt-2",

    ...getCardStyles(title, isPopular),
    isSelected && "",

    className
  ), [title, isPopular, isSelected, className]);

  const buttonStyles = useMemo(() => cn(
    "w-full rounded-xl transition-all duration-300 shadow-lg",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "font-semibold tracking-wide transition duration-700 ease-in-out cursor-pointer",
    getButtonStyles(title, isPopular),
    isLoading && "animate-pulse"
  ), [title, isPopular, isLoading]);



  const handleAction = useCallback(() => {
    if (actionHref) {
      router.push(actionHref);
    }
  }, [actionHref, router]);

  const handleFlowChange = useCallback((value: string) => {
    if (value !== selectedFlow) {
      onFlowChange?.(value as PaymentFlow);
    }
  }, [onFlowChange, selectedFlow]);

  const handleOpenModal = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenModal?.();
  }, [onOpenModal]);

  return (
    <article className={cardStyles}>
      {(title.toUpperCase() === 'STANDARD' || isPopular) && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-theme-primary-700 text-white px-4 py-1 rounded-full text-sm font-normal shadow-xl whitespace-nowrap">
            Most Popular
          </div>
        </div>
      )}

      <header className="relative z-[3] flex flex-col items-start text-left px-6 pt-6 pb-4 shrink-0 max-h-[180px] border-b border-dashed border-gray-300 dark:border-white/8">
      <div className="flex items-center justify-between w-full mb-4 gap-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {isPaidPlan && onFlowChange && (
            <div className="flex items-center gap-2 shrink-0">
              <ToggleGroup
                options={PAYMENT_FLOW_OPTIONS}
                value={selectedFlow}
                onValueChange={handleFlowChange}
                size="sm"
                variant="default"
                className="shrink-0 h-8 cursor-pointer"
              />
              {onOpenModal && (
                <button
                  onClick={handleOpenModal}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors shrink-0 cursor-pointer"
                  aria-label="Learn more about payment options"
                  type="button"
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-center items-baseline gap-1 mb-2">
          <span className={cn(
            "text-4xl font-bold leading-none",
            getPriceColor(title, isPopular)
          )}>
            {price}
          </span>
          {priceUnit && (
            <span className="text-gray-500 dark:text-gray-400 text-sm font-normal ml-1">
              {priceUnit}
            </span>
          )}
        </div>
        {children && (
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
            {children}
          </div>
        )}
      </header>

      {/* Features Section - Style exactly like reference image */}
      <section className="relative z-[3] flex-1 px-6 py-4">
        <div className="space-y-3 h-full flex flex-col justify-start">
          {features.map((feature, index) => (
            <div
              key={`feature-${index}`}
              className="flex items-start gap-3 group"
            >
              <div className="shrink-0 mt-0.5">
                {feature.included ? (
                  <Check className="w-4 h-4 text-green-500 dark:text-green-400 stroke-[2.5]" />
                ) : (
                  <X className="w-4 h-4 text-red-500 dark:text-red-400 stroke-[2.5]" />
                )}
              </div>

              <span
                className={cn(
                  "text-sm leading-relaxed flex-1 transition-colors duration-200",
                  feature.included
                    ? "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                    : "text-gray-500 dark:text-gray-500 line-through opacity-50"
                )}
                title={feature.text}
              >
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Action Button Section - Style exactly like reference image */}
      <footer className="relative z-[3] shrink-0 mt-auto px-6 pb-6">
        <Button
          size="default"
          disabled={isLoading}
          className={buttonStyles}
          onClick={isButton ? handleAction : onClick}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          ) : (
            <span className="text-sm font-medium">
              {actionText}
            </span>
          )}
        </Button>
      </footer>
    </article>
  );
}
