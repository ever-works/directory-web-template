"use client";

import { useState, useCallback } from "react";
import { FiCopy, FiCheck, FiPercent, FiDollarSign, FiTruck, FiClock, FiExternalLink } from "react-icons/fi";
import { PromoCode } from "@/lib/content";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";

interface PromoCodeProps {
  promoCode: PromoCode;
  className?: string;
  variant?: "default" | "compact" | "featured";
  showDescription?: boolean;
  showTerms?: boolean;
  onCodeCopied?: (code: string) => void;
}

export function PromoCodeComponent({
  promoCode,
  className,
  variant = "default",
  showDescription = true,
  showTerms = true,
  onCodeCopied,
}: PromoCodeProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations();

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promoCode.code);
      setCopied(true);
      onCodeCopied?.(promoCode.code);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy promo code:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = promoCode.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [promoCode.code, onCodeCopied]);

  const handleRedirect = useCallback(() => {
    if (promoCode.url) {
      window.open(promoCode.url, "_blank", "noopener,noreferrer");
    }
  }, [promoCode.url]);

  const getDiscountIcon = () => {
    switch (promoCode.discount_type) {
      case "percentage":
        return FiPercent;
      case "fixed":
        return FiDollarSign;
      case "free_shipping":
        return FiTruck;
      default:
        return FiPercent;
    }
  };

  const getDiscountText = () => {
    if (!promoCode.discount_value) return "";
    
    switch (promoCode.discount_type) {
      case "percentage":
        return `${promoCode.discount_value}% OFF`;
      case "fixed":
        return `$${promoCode.discount_value} OFF`;
      case "free_shipping":
        return "FREE SHIPPING";
      default:
        return "";
    }
  };

  const isExpired = promoCode.expires_at 
    ? new Date(promoCode.expires_at) < new Date() 
    : false;

  const DiscountIcon = getDiscountIcon();

  if (variant === "compact") {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
        "bg-linear-to-r from-green-50 to-emerald-50 border-green-200",
        "dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-700/50",
        "hover:shadow-md hover:scale-105",
        isExpired && "opacity-50 grayscale",
        className
      )}>
        <DiscountIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
        <button
          onClick={copyToClipboard}
          disabled={isExpired}
          className="font-mono font-bold text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 transition-colors"
        >
          {promoCode.code}
        </button>
        {copied ? (
          <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <FiCopy className="w-4 h-4 text-green-600 dark:text-green-400" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300 transform",
        "bg-linear-to-br from-white via-green-50/30 to-emerald-50/50",
        "dark:from-gray-900 dark:via-green-900/10 dark:to-emerald-900/20",
        "border-green-200/60 dark:border-green-700/40",
        "hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1",
        "group",
        variant === "featured" && "ring-2 ring-green-400/30 shadow-lg",
        isExpired && "opacity-60 grayscale",
        className
      )}

    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-green-400/20 to-transparent rounded-full -translate-y-16 translate-x-16" />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <DiscountIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                  {getDiscountText() || "PROMO CODE"}
                </span>
                {promoCode.expires_at && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <FiClock className="w-3 h-3" />
                    <span>
                      {t("common.EXPIRES")} {new Date(promoCode.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              {showDescription && promoCode.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {promoCode.description}
                </p>
              )}
            </div>
          </div>

          {isExpired && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
              {t("common.EXPIRED")}
            </span>
          )}
        </div>

        {/* Promo Code */}
        <div className="mb-4">
          <div className="flex items-center gap-3 p-4 bg-white/80 dark:bg-gray-800/50 rounded-xl border border-green-200/50 dark:border-green-700/30">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                {t("common.PROMO_CODE")}
              </label>
              <code className="text-lg font-bold font-mono text-gray-900 dark:text-white tracking-wider">
                {promoCode.code}
              </code>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                disabled={isExpired}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                  "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transform hover:scale-105 active:scale-95",
                  copied && "bg-green-700"
                )}
              >
                {copied ? (
                  <>
                    <FiCheck className="w-4 h-4" />
                    <span className="text-sm">{t("common.COPIED")}</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="w-4 h-4" />
                    <span className="text-sm">{t("common.COPY")}</span>
                  </>
                )}
              </button>

              {promoCode.url && (
                <button
                  onClick={handleRedirect}
                  disabled={isExpired}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                    "bg-theme-primary-600 hover:bg-theme-primary-700 text-white shadow-md hover:shadow-lg",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transform hover:scale-105 active:scale-95"
                  )}
                >
                  <FiExternalLink className="w-4 h-4" />
                  <span className="text-sm">{t("common.USE_CODE")}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Terms */}
        {showTerms && promoCode.terms && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <span className="font-medium">{t("common.TERMS")}:</span> {promoCode.terms}
          </div>
        )}
      </div>

      {/* Animated border on hover */}
      <div className={cn(
        "absolute inset-0 rounded-2xl transition-opacity duration-300",
        "bg-linear-to-r from-green-400/20 via-emerald-400/20 to-green-400/20",
        "opacity-0 group-hover:opacity-100",
        "-z-10"
      )} />
    </div>
  );
}
