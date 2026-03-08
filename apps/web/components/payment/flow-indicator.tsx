"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PaymentFlow } from "@/lib/payment/types/payment";
import { PAYMENT_FLOWS } from "@/lib/config/payment-flows";
import {
  CreditCard,
  Clock,
  ChevronDown,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Crown,
  TrendingUp,
  Users,
  Globe,
  Star,
  Info,
  AlertCircle,
  Loader2
} from "lucide-react";

interface PaymentFlowIndicatorProps {
  selectedFlow: PaymentFlow;
  onFlowChange?: () => void;
  showChangeButton?: boolean;
  compact?: boolean;
  animated?: boolean;
  className?: string;
  variant?: 'default' | 'premium' | 'minimal';
  showFeatures?: boolean;
  showStatus?: boolean;
  loading?: boolean;
  disabled?: boolean;
  tooltip?: boolean;
  interactive?: boolean;
  theme?: 'auto' | 'light' | 'dark';
}

interface FlowTheme {
  gradient: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  shadowColor: string;
}

const iconMap = {
  CreditCard,
  Clock,
  ChevronDown,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Crown,
  TrendingUp,
  Users,
  Globe,
  Star,
  Info,
  AlertCircle,
  Loader2
};

export function PaymentFlowIndicator({
  selectedFlow,
  onFlowChange,
  showChangeButton = false,
  compact = false,
  animated = true,
  className,
  variant = 'default',
  showFeatures = true,
  showStatus = true,
  loading = false,
  disabled = false,
  interactive = true
}: PaymentFlowIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration to prevent SSR/client mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);


  const flowConfig = useMemo(() => 
    PAYMENT_FLOWS.find(flow => flow.id === selectedFlow), 
    [selectedFlow]
  );

  const IconComponent = useMemo(() => 
    iconMap[flowConfig?.icon as keyof typeof iconMap], 
    [flowConfig?.icon]
  );

  // Simplified theme configuration - clean and consistent
  const flowTheme = useMemo((): FlowTheme => {
    // Use a single, clean color scheme for all variants
    return {
      gradient: "from-theme-primary-600 to-theme-primary-800",
      bgColor: "bg-white dark:bg-slate-800",
      borderColor: "border-slate-200 dark:border-slate-700",
      textColor: "text-slate-900 dark:text-white",
      accentColor: "text-slate-600 dark:text-slate-400",
      shadowColor: "shadow-slate-500/10"
    };
  }, []);

  // Event handlers with debouncing
  const handleMouseEnter = useCallback(() => {
    if (!disabled && interactive) {
      setIsHovered(true);
    }
  }, [disabled, interactive]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!disabled && interactive) {
      setIsPressed(true);
    }
  }, [disabled, interactive]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleFocus = useCallback(() => {
    if (!disabled && interactive) {
      setIsFocused(true);
    }
  }, [disabled, interactive]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && onFlowChange && interactive) {
      onFlowChange();
    }
  }, [disabled, onFlowChange, interactive]);

  // Loading state effect
  useEffect(() => {
    if (loading) {
      setIsHovered(false);
      setIsPressed(false);
      setIsFocused(false);
    }
  }, [loading]);

  // Show loading state during SSR to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className={cn(
        "flex items-center justify-center p-4 rounded-lg border border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-800",
        "shadow-xs",
        className
      )}>
        <div className="w-5 h-5 rounded-full bg-slate-400 animate-pulse" />
        <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">Loading...</span>
      </div>
    );
  }

  if (!flowConfig || !IconComponent) {
    return (
      <div className={cn(
        "flex items-center justify-center p-4 rounded-lg border border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-800",
        "shadow-xs",
        className
      )}>
        <AlertCircle className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">Invalid flow configuration</span>
      </div>
    );
  }

  // Compact variant
  if (compact) {
    return (
      
        <div className={cn("inline-flex items-center gap-2", className)}>
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200",
              "shadow-xs",
              flowTheme.bgColor,
              flowTheme.borderColor,
              interactive && !disabled && "cursor-pointer hover:shadow-md",
              animated && interactive && !disabled && "hover:scale-105",
              isPressed && "scale-95",
              isFocused && "ring-2 ring-slate-500 ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onFocus={handleFocus}
            onBlur={handleBlur}
            tabIndex={interactive && !disabled ? 0 : undefined}
            role={interactive ? "button" : undefined}
            aria-label={`Current payment flow: ${flowConfig.title}`}
            aria-disabled={disabled}
          >
            <div className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200",
              `bg-linear-to-r ${flowTheme.gradient}`,
              loading && "animate-spin"
            )}>
              {loading ? (
                <Loader2 className="w-3 h-3 text-white" />
              ) : (
                <IconComponent className="w-3 h-3 text-white" />
              )}
            </div>

            <span className={cn(
              "text-sm font-medium transition-colors duration-200",
              flowTheme.textColor
            )}>
              {flowConfig.title}
            </span>

            {showChangeButton && interactive && !disabled && (
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform duration-200",
                flowTheme.accentColor,
                isHovered && "rotate-180"
              )} />
            )}
          </div>
        </div>
    );
  }

  // Full variant
  return (
   
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-300 group",
          flowTheme.bgColor,
          flowTheme.borderColor,
          interactive && !disabled && "cursor-pointer",
          animated && interactive && !disabled && "hover:scale-[1.02] hover:shadow-lg",
          isPressed && "scale-[0.98]",
          isFocused && "ring-2 ring-theme-primary-500 ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={interactive && !disabled ? 0 : undefined}
        role={interactive ? "button" : undefined}
        aria-label={`Current payment flow: ${flowConfig.title}`}
        aria-disabled={disabled}
      >
        {/* Animated Background Pattern */}
        {animated && (
          <div className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-500",
            isHovered && "opacity-10",
            `bg-linear-to-r ${flowTheme.gradient}`
          )} />
        )}

        {/* Premium Badge */}
        {variant === 'premium' && (
          <div className="absolute top-3 left-3 z-20">
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded-md shadow-xs">
              <Crown className="w-3 h-3" />
              PREMIUM
            </span>
          </div>
        )}

      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 bg-primary-600! rounded-lg flex items-center justify-center shadow-xs transition-all duration-200",
              `bg-linear-to-r ${flowTheme.gradient}`,
              loading && "animate-spin"
            )}>
              {loading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <IconComponent className="w-5 h-5 text-white" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  "text-lg font-semibold transition-colors duration-200",
                  flowTheme.textColor
                )}>
                  {flowConfig.title}
                </h3>

                {flowConfig.badge && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-theme-primary-600 text-white rounded-md">
                    {flowConfig.badge}
                  </span>
                )}
              </div>

              <p className={cn(
                "text-sm transition-colors duration-200",
                flowTheme.accentColor
              )}>
                {flowConfig.description}
              </p>
            </div>
          </div>

          {showChangeButton && interactive && !disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFlowChange?.();
              }}
              className={cn(
                "transition-all duration-200 border-theme-primary-600",
                // flowTheme.accentColor
              )}
              disabled={loading}
            >
              <span>Change</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Enhanced Features */}
        {showFeatures && flowConfig.features && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-2">
              {flowConfig.features.slice(0, 4).map((feature, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-all duration-200",
                    flowTheme.accentColor
                  )}
                >
                  <CheckCircle className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {showStatus && (
          <div className="absolute top-3 right-3 z-20">
            <div className={cn(
              "w-2 h-2 rounded-full",
              `bg-linear-to-r ${flowTheme.gradient}`
            )} />
          </div>
        )}
      </div>

      {/* Simple Hover Effect */}
      {animated && isHovered && interactive && !disabled && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 opacity-10 pointer-events-none" />
      )}

      {/* Focus Ring */}
      {isFocused && interactive && !disabled && (
        <div className="absolute inset-0 ring-2 ring-slate-500 ring-offset-2 rounded-lg pointer-events-none" />
      )}
      </Card>
  );
}

// Specialized variants for different use cases
export function PaymentFlowIndicatorPremium(props: Omit<PaymentFlowIndicatorProps, 'variant'>) {
  return <PaymentFlowIndicator {...props} variant="premium" />;
}

export function PaymentFlowIndicatorMinimal(props: Omit<PaymentFlowIndicatorProps, 'variant'>) {
  return <PaymentFlowIndicator {...props} variant="minimal" />;
}

export function PaymentFlowIndicatorCompact(props: Omit<PaymentFlowIndicatorProps, 'compact'>) {
  return <PaymentFlowIndicator {...props} compact={true} />;
}

export function PaymentFlowIndicatorStatic(props: Omit<PaymentFlowIndicatorProps, 'interactive'>) {
  return <PaymentFlowIndicator {...props} interactive={false} />;
} 