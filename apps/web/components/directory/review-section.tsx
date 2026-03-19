"use client";

import { Button } from "@/components/ui/button";

import {
  ArrowLeft,
  Send,
  Star,
  Globe,
  Clock,
  Shield,
  Eye,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentPlan } from "@/lib/constants";

interface FormData {
  name: string;
  link: string;
  category: string;
  tags: string[];
  description: string;
  introduction: string;
  [key: string]: any;
}

interface ReviewSectionProps {
  formData: FormData;
  selectedPlan: PaymentPlan | null;
  onSubmit: () => void;
  onBack: () => void;
}

export function ReviewSection({
  formData,
  selectedPlan,
  onSubmit,
  onBack,
}: ReviewSectionProps) {
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
      case PaymentPlan.PREMIUM:
        return "Premium Plan";
      default:
        return "Free Plan";
    }
  };

  const getPlanDescription = () => {
    switch (selectedPlan) {
      case PaymentPlan.STANDARD:
        return "One-time payment • Standard features";
      case PaymentPlan.PREMIUM:
        return "Billed weekly • Premium features";
      default:
        return "Free forever • Basic features";
    }
  };

  const getStatusInfo = () => {
    if (selectedPlan === PaymentPlan.FREE) {
      return {
        status: "Pending Review",
        icon: Clock,
        color: "text-yellow-500 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        description:
          "Your listing will be reviewed by our team within 1-2 business days",
      };
    }
    return {
      status: "Ready to Publish",
      icon: CheckCircle2,
      color: "text-green-500 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      description:
        "Your listing will be published immediately after submission",
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div>
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-linear-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-linear-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-600/20 dark:to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-linear-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-600/20 dark:to-cyan-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        {/* Additional floating elements */}
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-linear-to-r from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/30 dark:to-orange-400/30 rounded-full blur-lg animate-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-linear-to-r from-green-500/15 to-blue-500/15 dark:from-green-400/25 dark:to-blue-400/25 rounded-full blur-xl animate-float-slower"></div>
      </div>

      <div className="relative z-10 py-12">
        {/* Enhanced Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xs border border-gray-200/50 dark:border-gray-700/50 mb-6 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-linear-to-r from-green-500 to-emerald-500 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Step 3 of 3 · Review & Publish
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-linear-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Review Your Submission
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Everything looks great! Review your details and submit your product
            to our directory
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Plan Summary Card */}
          <div
            className="relative group animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute inset-0 bg-linear-to-r from-theme-primary-500/20 to-purple-500/20 dark:from-theme-primary-400/30 dark:to-purple-400/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-r from-theme-primary-500 to-purple-500 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Selected Plan
                </h3>
              </div>

              <div className="flex justify-between items-center p-6 bg-linear-to-r from-gray-50/80 to-theme-primary-50/80 dark:from-gray-900/40 dark:to-theme-primary-900/40 rounded-2xl border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-linear-to-r from-theme-primary-500 to-purple-500 flex items-center justify-center">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      {getPlanName()}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getPlanDescription()}
                    </p>
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
            </div>
          </div>

          {/* Product Details Card */}
          <div
            className="relative group animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="absolute inset-0 bg-linear-to-r from-purple-500/20 to-pink-500/20 dark:from-purple-400/30 dark:to-pink-400/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Product Information
                </h3>
              </div>

              <div className="grid gap-6">
                {/* First Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Product Name
                    </h4>
                    <div className="p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formData.name || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Category
                    </h4>
                    <div className="p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formData.category || "Not selected"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Link */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Product Link
                  </h4>
                  <div className="p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-lg font-semibold text-theme-primary-600 dark:text-theme-primary-400 break-all">
                      {formData.link || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Tags
                  </h4>
                  <div className="p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    {formData.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 text-sm font-medium bg-theme-primary-500 text-white rounded-lg"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-lg text-gray-500 dark:text-gray-400">
                        None selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Description
                  </h4>
                  <div className="p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-lg text-gray-900 dark:text-white leading-relaxed">
                      {formData.description || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Introduction */}
                {formData.introduction && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Detailed Introduction
                    </h4>
                    <div className="p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-lg text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {formData.introduction}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Information Card */}
          <div
            className="relative group animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="absolute inset-0 bg-linear-to-r from-green-500/20 to-emerald-500/20 dark:from-green-400/30 dark:to-emerald-400/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Publication Status
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Current Status
                  </h4>
                  <div className="flex items-center gap-3 p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        statusInfo.bgColor
                      )}
                    >
                      <StatusIcon className={cn("w-5 h-5", statusInfo.color)} />
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {statusInfo.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Processing Time
                  </h4>
                  <div className="flex items-center gap-3 p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="w-10 h-10 rounded-xl bg-theme-primary-100 dark:bg-theme-primary-900/30 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-theme-primary-500 dark:text-theme-primary-400" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedPlan === "free"
                        ? "1-2 Business Days"
                        : "Instant"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "mt-6 p-6 rounded-2xl border",
                  selectedPlan === PaymentPlan.FREE
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200/50 dark:border-yellow-700/30"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200/50 dark:border-green-700/30"
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      selectedPlan ===PaymentPlan.FREE
                        ? "bg-yellow-500/20 dark:bg-yellow-400/30"
                        : "bg-green-500/20 dark:bg-green-400/30"
                    )}
                  >
                    {selectedPlan ===PaymentPlan.FREE ? (
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <h5
                      className={cn(
                        "font-bold mb-1",
                        selectedPlan === PaymentPlan.FREE
                          ? "text-yellow-800 dark:text-yellow-300"
                          : "text-green-800 dark:text-green-300"
                      )}
                    >
                      {selectedPlan === PaymentPlan.FREE
                        ? "Review Process"
                        : "Instant Publishing"}
                    </h5>
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        selectedPlan === "free"
                          ? "text-yellow-700 dark:text-yellow-400"
                          : "text-green-700 dark:text-green-400"
                      )}
                    >
                      {statusInfo.description}
                    </p>
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
              Back to Edit
            </Button>

            <Button
              type="submit"
              className="h-14 px-12 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl min-w-[200px] bg-linear-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white hover:shadow-green-500/30"
            >
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5" />
                <span>Submit Listing</span>
              </div>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
