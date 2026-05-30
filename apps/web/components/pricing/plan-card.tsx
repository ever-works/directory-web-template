"use client";

import { ReactNode, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { Check, X, Info } from "lucide-react";
import { PaymentPlan, PaymentFlow } from "@/lib/constants";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/types";

export type PlanFeature = {
  readonly included: boolean;
  readonly text: string;
};

interface PlanCardProps {
  readonly plan?: PaymentPlan;
  readonly title: string;
  readonly description?: string;
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

const PLAN_TYPES = {
  FREE: "FREE",
  STANDARD: "STANDARD",
  PREMIUM: "PREMIUM",
} as const;

export function PlanCard({
  plan,
  title,
  description,
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
  const { track } = useAnalytics();
  const t = useTranslations("pricing");
  const tBilling = useTranslations("billing");

  const upperTitle = title.toUpperCase();
  const isPaidPlan =
    upperTitle === PLAN_TYPES.STANDARD || upperTitle === PLAN_TYPES.PREMIUM;
  const isHighlight = isPopular || upperTitle === PLAN_TYPES.STANDARD;

  const paymentFlowOptions = useMemo(
    () => [
      { value: PaymentFlow.PAY_AT_START, label: t("PAY_NOW") },
      { value: PaymentFlow.PAY_AT_END, label: t("PAY_LATER") },
    ],
    [t]
  );

  const cardStyles = useMemo(
    () =>
      cn(
        "relative flex flex-col rounded-2xl border transition-colors duration-300",
        "p-6 sm:p-7",
        isHighlight
          ? "border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/[0.04]"
          : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.015] hover:border-gray-300 dark:hover:border-white/15",
        isSelected && "ring-1 ring-theme-primary-500/40 dark:ring-white/20",
        className
      ),
    [isHighlight, isSelected, className]
  );

  const buttonStyles = useMemo(
    () =>
      cn(
        "w-full h-11 rounded-full font-medium text-sm transition-colors cursor-pointer",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        isHighlight
          ? "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]",
        isLoading && "animate-pulse"
      ),
    [isHighlight, isLoading]
  );

  const handleAction = useCallback(() => {
    track(AnalyticsEvent.PLAN_SELECTED, {
      plan_id: plan || title,
      payment_flow: selectedFlow,
      price: price,
    });
    if (actionHref) {
      router.push(actionHref);
    }
  }, [actionHref, router, plan, title, selectedFlow, price, track]);

  const handleFlowChange = useCallback(
    (value: string) => {
      if (value !== selectedFlow) {
        onFlowChange?.(value as PaymentFlow);
      }
    },
    [onFlowChange, selectedFlow]
  );

  const handleOpenModal = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onOpenModal?.();
    },
    [onOpenModal]
  );

  return (
    <article className={cardStyles}>
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {title.toLowerCase()}
            </h3>
            {isHighlight && (
              <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-200">
                {t("MOST_POPULAR")}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-snug">
              {description}
            </p>
          )}
        </div>
        {isPaidPlan && onFlowChange && (
          <div className="shrink-0 flex items-center gap-1.5">
            <ToggleGroup
              options={paymentFlowOptions}
              value={selectedFlow}
              onValueChange={handleFlowChange}
              size="sm"
              variant="default"
              className="h-8 cursor-pointer"
            />
            {onOpenModal && (
              <button
                onClick={handleOpenModal}
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                aria-label={t("LEARN_MORE_PAYMENT_OPTIONS")}
                type="button"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </header>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          {price}
        </span>
        {priceUnit && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {priceUnit}
          </span>
        )}
      </div>

      {children && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {children}
        </div>
      )}

      <ul className="mt-6 space-y-3 flex-1">
        {features.map((feature, index) => (
          <li
            key={`feature-${index}`}
            className="flex items-start gap-3 text-sm"
          >
            <span className="shrink-0 mt-0.5">
              {feature.included ? (
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />
              ) : (
                <X className="w-4 h-4 text-gray-400 dark:text-gray-600" strokeWidth={2.5} />
              )}
            </span>
            <span
              className={cn(
                "leading-relaxed",
                feature.included
                  ? "text-gray-700 dark:text-gray-300"
                  : "text-gray-400 dark:text-gray-600 line-through"
              )}
              title={feature.text}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <footer className="mt-8">
        <Button
          size="default"
          disabled={isLoading}
          className={buttonStyles}
          onClick={isButton ? handleAction : onClick}
        >
          {isLoading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              <span>{tBilling("PROCESSING")}</span>
            </span>
          ) : (
            <span>{actionText}</span>
          )}
        </Button>
      </footer>
    </article>
  );
}
