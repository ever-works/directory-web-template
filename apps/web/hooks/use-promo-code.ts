"use client";

import { useState, useCallback, useEffect } from "react";
import { PromoCode } from "@/lib/content";

interface UsePromoCodeOptions {
  trackCopies?: boolean;
  trackClicks?: boolean;
  onCodeCopied?: (code: string) => void;
  onCodeUsed?: (code: string) => void;
}

interface PromoCodeStats {
  copies: number;
  clicks: number;
  lastCopied?: Date;
  lastUsed?: Date;
}

interface UsePromoCodeReturn {
  stats: PromoCodeStats;
  copyCode: (code: string) => Promise<boolean>;
  useCode: (code: string, url?: string) => void;
  isExpired: (promoCode: PromoCode) => boolean;
  getDiscountText: (promoCode: PromoCode) => string;
  clearStats: () => void;
}

export function usePromoCode(options: UsePromoCodeOptions = {}): UsePromoCodeReturn {
  const {
    trackCopies = true,
    trackClicks = true,
    onCodeCopied,
    onCodeUsed,
  } = options;

  const [stats, setStats] = useState<PromoCodeStats>({
    copies: 0,
    clicks: 0,
  });

  // Load stats from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStats = localStorage.getItem("promo-code-stats");
      if (savedStats) {
        try {
          const parsed = JSON.parse(savedStats);
          setStats({
            ...parsed,
            lastCopied: parsed.lastCopied ? new Date(parsed.lastCopied) : undefined,
            lastUsed: parsed.lastUsed ? new Date(parsed.lastUsed) : undefined,
          });
        } catch (error) {
          console.warn("Failed to parse promo code stats:", error);
        }
      }
    }
  }, []);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("promo-code-stats", JSON.stringify(stats));
      } catch (error) {
        console.warn("Failed to save promo code stats to localStorage:", error);
      }
    }
  }, [stats]);

  const copyCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(code);
      
      if (trackCopies) {
        setStats(prev => ({
          ...prev,
          copies: prev.copies + 1,
          lastCopied: new Date(),
        }));
      }
      
      onCodeCopied?.(code);
      
      // Track analytics if available
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "promo_code_copied", {
          event_category: "engagement",
          event_label: code,
        });
      }
      
      return true;
    } catch (error) {
      console.error("Failed to copy promo code:", error);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand("copy");
        document.body.removeChild(textArea);
        
        if (result && trackCopies) {
          setStats(prev => ({
            ...prev,
            copies: prev.copies + 1,
            lastCopied: new Date(),
          }));
          onCodeCopied?.(code);
        }
        
        return result;
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
        return false;
      }
    }
  }, [trackCopies, onCodeCopied]);

  const useCode = useCallback((code: string, url?: string) => {
    if (trackClicks) {
      setStats(prev => ({
        ...prev,
        clicks: prev.clicks + 1,
        lastUsed: new Date(),
      }));
    }
    
    onCodeUsed?.(code);
    
    // Track analytics if available
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "promo_code_used", {
        event_category: "conversion",
        event_label: code,
      });
    }
    
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [trackClicks, onCodeUsed]);

  const isExpired = useCallback((promoCode: PromoCode): boolean => {
    if (!promoCode.expires_at) return false;
    return new Date(promoCode.expires_at) < new Date();
  }, []);

  const getDiscountText = useCallback((promoCode: PromoCode): string => {
    if (!promoCode.discount_value) {
      switch (promoCode.discount_type) {
        case "free_shipping":
          return "FREE SHIPPING";
        default:
          return "DISCOUNT";
      }
    }
    
    switch (promoCode.discount_type) {
      case "percentage":
        return `${promoCode.discount_value}% OFF`;
      case "fixed":
        return `$${promoCode.discount_value} OFF`;
      case "free_shipping":
        return "FREE SHIPPING";
      default:
        return `${promoCode.discount_value} OFF`;
    }
  }, []);

  const clearStats = useCallback(() => {
    setStats({
      copies: 0,
      clicks: 0,
    });
    
    if (typeof window !== "undefined") {
      localStorage.removeItem("promo-code-stats");
    }
  }, []);

  return {
    stats,
    copyCode,
    useCode,
    isExpired,
    getDiscountText,
    clearStats,
  };
}

/**
 * Hook for managing multiple promo codes
 */
export function usePromoCodes(promoCodes: PromoCode[]) {
  const promoHook = usePromoCode();
  
  const activePromoCodes = promoCodes.filter(code => !promoHook.isExpired(code));
  const expiredPromoCodes = promoCodes.filter(code => promoHook.isExpired(code));
  
  const getBestDiscount = useCallback(() => {
    if (activePromoCodes.length === 0) return null;
    
    return activePromoCodes.reduce((best, current) => {
      if (!current.discount_value) return best;
      if (!best || !best.discount_value) return current;
      
      // For percentage discounts, higher is better
      if (current.discount_type === "percentage" && best.discount_type === "percentage") {
        return current.discount_value > best.discount_value ? current : best;
      }
      
      // For fixed discounts, higher is better
      if (current.discount_type === "fixed" && best.discount_type === "fixed") {
        return current.discount_value > best.discount_value ? current : best;
      }
      
      // Free shipping is always good
      if (current.discount_type === "free_shipping") return current;
      
      return best;
    });
  }, [activePromoCodes]);

  return {
    ...promoHook,
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes: activePromoCodes.length > 0,
    totalPromoCodes: promoCodes.length,
  };
}
