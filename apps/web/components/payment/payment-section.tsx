"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Lock,
  Check,
  Shield,
  Sparkles,
  ArrowLeft,
  Star,
  Globe,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentPlan } from "@/lib/constants";

interface PaymentSectionProps {
  selectedPlan: PaymentPlan | null;
  onComplete: () => void;
  onBack: () => void;
}

export function PaymentSection({
  selectedPlan,
  onComplete,
  onBack,
}: PaymentSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedFields, setCompletedFields] = useState<Set<string>>(
    new Set()
  );
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  // Auto-format card number
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = matches?.[0] || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  // Auto-format expiry date
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "cardNumber") {
      formattedValue = formatCardNumber(value);
    } else if (name === "expiry") {
      formattedValue = formatExpiry(value);
    }

    setPaymentInfo((prev) => ({ ...prev, [name]: formattedValue }));

    // Track completed fields
    if (formattedValue.trim()) {
      setCompletedFields((prev) => new Set([...prev, name]));
    } else {
      setCompletedFields((prev) => {
        const newSet = new Set([...prev]);
        newSet.delete(name);
        return newSet;
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Here, you would integrate the Stripe API call
      console.log("Processing payment for", getPlanName());
      console.log("Card details:", paymentInfo);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Payment successful
      onComplete();
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlanPrice = () => {
    switch (selectedPlan) {
      case PaymentPlan.STANDARD:
        return "$10";
      case PaymentPlan.PREMIUM:
        return "$20";
      default:
        return "$0";
    }
  };

  const getPlanName = () => {
    switch (selectedPlan) {
      case PaymentPlan.STANDARD:
        return "Standard Plan";
      case  PaymentPlan.PREMIUM:
        return "Premium Plan";
      default:
        return "Free Plan";
    }
  };

  const getBrandFromCardNumber = (number: string) => {
    const firstDigit = number.replace(/\s/g, "")[0];
    switch (firstDigit) {
      case "4":
        return "visa";
      case "5":
        return "mastercard";
      case "3":
        return "amex";
      default:
        return "generic";
    }
  };

  const progressPercentage = (completedFields.size / 4) * 100;

  return (
    <div>
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs matching listing.tsx */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-linear-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-linear-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-600/20 dark:to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-linear-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-600/20 dark:to-cyan-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        {/* Additional floating elements for depth */}
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-linear-to-r from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/30 dark:to-orange-400/30 rounded-full blur-lg animate-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-linear-to-r from-green-500/15 to-blue-500/15 dark:from-green-400/25 dark:to-blue-400/25 rounded-full blur-xl animate-float-slower"></div>
      </div>

      <div className="relative z-10 px-6 py-12">
        {/* Enhanced Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xs border border-gray-200/50 dark:border-gray-700/50 mb-6 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-linear-to-r from-theme-primary-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Step 2 of 3 · Payment Details
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-linear-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Complete Your Order
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Secure checkout with enterprise-grade encryption and fraud
            protection
          </p>
        </div>

        {/* Enhanced Progress Section */}
        <div
          className="mb-12 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-linear-to-r from-theme-primary-500 to-purple-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Form Completion
                </span>
              </div>
              <span className="text-sm font-bold text-theme-primary-600 dark:text-theme-primary-400">
                {completedFields.size}/4 fields completed
              </span>
            </div>

            <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="h-full bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 rounded-full transition-all duration-700 ease-out shadow-lg"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-12">
          {/* Main Payment Form - Enhanced */}
          <div className="xl:col-span-2 space-y-8">
            {/* Payment Summary Card - Redesigned */}
            <div
              className="relative group animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-400/30 dark:to-purple-400/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-r from-theme-primary-500 to-purple-500 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Payment Summary
                  </h3>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center p-6 bg-linear-to-r from-gray-50/80 to-blue-50/80 dark:from-gray-900/40 dark:to-blue-900/40 rounded-2xl border border-gray-200/30 dark:border-gray-700/30">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-linear-to-r from-theme-primary-500 to-purple-500 flex items-center justify-center">
                        <Star className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {getPlanName()}
                        </h4>
                        {selectedPlan === PaymentPlan.PREMIUM ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Billed weekly • Premium features
                          </p>
                        ) : selectedPlan === PaymentPlan.STANDARD ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            One-time payment • Pro features
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Free forever • Basic features
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold bg-linear-to-r from-theme-primary-600 to-purple-600 dark:from-theme-primary-400 dark:to-purple-400 bg-clip-text text-transparent">
                        {getPlanPrice()}
                      </div>
                      {selectedPlan === PaymentPlan.PREMIUM && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          per week
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200/50 dark:border-green-700/30">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 dark:bg-green-400/30 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-green-800 dark:text-green-300 mb-1">
                          Enterprise Security
                        </h5>
                        <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                          Your payment is protected by 256-bit SSL encryption,
                          PCI DSS Level 1 compliance, and processed securely
                          through Stripe.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form - Enhanced */}
            <div className="space-y-8">
              <div
                className="relative group animate-fade-in-up"
                style={{ animationDelay: "0.3s" }}
              >
                <div className="absolute inset-0 bg-linear-to-r from-purple-500/20 to-pink-500/20 dark:from-purple-400/30 dark:to-pink-400/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Payment Information
                    </h3>
                  </div>

                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/30">
                    <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                      To list your product in our directory, there is a one-time
                      fee of {getPlanPrice()}. This helps us maintain the
                      quality of listings and support the platform.
                    </p>
                  </div>

                  <div className="grid gap-8">
                    {/* Card Name */}
                    <div className="space-y-3">
                      <label
                        htmlFor="cardName"
                        className="block text-sm font-bold text-gray-700 dark:text-gray-300"
                      >
                        Name on card
                      </label>
                      <div className="relative">
                        <input
                          id="cardName"
                          name="cardName"
                          type="text"
                          placeholder="John Smith"
                          value={paymentInfo.cardName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField("cardName")}
                          onBlur={() => setFocusedField(null)}
                          required
                          className={cn(
                            "w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400",
                            focusedField === "cardName" &&
                              "scale-[1.02] shadow-xl ring-4 ring-blue-500/20",
                            completedFields.has("cardName") &&
                              "border-green-500/70 bg-green-50/40 dark:bg-green-900/20 ring-2 ring-green-500/20"
                          )}
                        />
                        {completedFields.has("cardName") && (
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Number */}
                    <div className="space-y-3">
                      <label
                        htmlFor="cardNumber"
                        className="block text-sm font-bold text-gray-700 dark:text-gray-300"
                      >
                        Card number
                      </label>
                      <div className="relative">
                        <input
                          id="cardNumber"
                          name="cardNumber"
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={paymentInfo.cardNumber}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField("cardNumber")}
                          onBlur={() => setFocusedField(null)}
                          required
                          maxLength={19}
                          className={cn(
                            "w-full h-14 px-6 pr-20 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400",
                            focusedField === "cardNumber" &&
                              "scale-[1.02] shadow-xl ring-4 ring-blue-500/20",
                            completedFields.has("cardNumber") &&
                              "border-green-500/70 bg-green-50/40 dark:bg-green-900/20 ring-2 ring-green-500/20"
                          )}
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
                          {completedFields.has("cardNumber") && (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "w-10 h-6 rounded-sm flex items-center justify-center transition-colors duration-300",
                              getBrandFromCardNumber(paymentInfo.cardNumber) ===
                                "visa"
                                ? "bg-blue-600 text-white"
                                : getBrandFromCardNumber(
                                      paymentInfo.cardNumber
                                    ) === "mastercard"
                                  ? "bg-red-600 text-white"
                                  : getBrandFromCardNumber(
                                        paymentInfo.cardNumber
                                      ) === "amex"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <CreditCard className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expiry and CVC - Enhanced Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label
                          htmlFor="expiry"
                          className="block text-sm font-bold text-gray-700 dark:text-gray-300"
                        >
                          Expiry date
                        </label>
                        <div className="relative">
                          <input
                            id="expiry"
                            name="expiry"
                            type="text"
                            placeholder="MM/YY"
                            value={paymentInfo.expiry}
                            onChange={handleInputChange}
                            onFocus={() => setFocusedField("expiry")}
                            onBlur={() => setFocusedField(null)}
                            required
                            maxLength={5}
                            className={cn(
                              "w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400",
                              focusedField === "expiry" &&
                                "scale-[1.02] shadow-xl ring-4 ring-blue-500/20",
                              completedFields.has("expiry") &&
                                "border-green-500/70 bg-green-50/40 dark:bg-green-900/20 ring-2 ring-green-500/20"
                            )}
                          />
                          {completedFields.has("expiry") && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label
                          htmlFor="cvc"
                          className="block text-sm font-bold text-gray-700 dark:text-gray-300"
                        >
                          CVC
                        </label>
                        <div className="relative">
                          <input
                            id="cvc"
                            name="cvc"
                            type="text"
                            placeholder="123"
                            value={paymentInfo.cvc}
                            onChange={handleInputChange}
                            onFocus={() => setFocusedField("cvc")}
                            onBlur={() => setFocusedField(null)}
                            required
                            maxLength={4}
                            className={cn(
                              "w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400",
                              focusedField === "cvc" &&
                                "scale-[1.02] shadow-xl ring-4 ring-blue-500/20",
                              completedFields.has("cvc") &&
                                "border-green-500/70 bg-green-50/40 dark:bg-green-900/20 ring-2 ring-green-500/20"
                            )}
                          />
                          {completedFields.has("cvc") && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div
                className="flex flex-col sm:flex-row justify-between gap-6 pt-8 animate-fade-in-up"
                style={{ animationDelay: "0.4s" }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="h-14 px-8 rounded-2xl border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl text-lg font-semibold"
                >
                  <ArrowLeft className="w-5 h-5 mr-3" />
                  Back
                </Button>

                <Button
                  type="button"
                  disabled={isProcessing || completedFields.size < 4}
                  onClick={handlePaymentSubmit}
                  className={cn(
                    "h-14 px-12 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl min-w-[200px]",
                    isProcessing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-linear-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 text-white hover:shadow-blue-500/30"
                  )}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5" />
                      Pay {getPlanPrice()} Now
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Security Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      Security & Trust
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        icon: Shield,
                        title: "Bank-Level Security",
                        desc: "256-bit SSL encryption protects all data",
                        color: "text-blue-500 dark:text-blue-400",
                      },
                      {
                        icon: Lock,
                        title: "PCI DSS Compliant",
                        desc: "Level 1 certification for payment security",
                        color: "text-green-500 dark:text-green-400",
                      },
                      {
                        icon: Zap,
                        title: "Instant Processing",
                        desc: "Powered by Stripe's secure infrastructure",
                        color: "text-purple-500 dark:text-purple-400",
                      },
                      {
                        icon: Globe,
                        title: "Global Coverage",
                        desc: "Trusted by millions of businesses worldwide",
                        color: "text-cyan-500 dark:text-cyan-400",
                      },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="group p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 border border-gray-200/30 dark:border-gray-700/30"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              item.color.includes("blue")
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : item.color.includes("green")
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : item.color.includes("purple")
                                    ? "bg-purple-100 dark:bg-purple-900/30"
                                    : "bg-cyan-100 dark:bg-cyan-900/30"
                            )}
                          >
                            <item.icon className={cn("w-5 h-5", item.color)} />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">
                              {item.title}
                            </h5>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Lock className="w-3 h-3" />
                        <span>Secure payment processing by Stripe</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
