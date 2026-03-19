"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";

interface MonetizationMethod {
  id: string;
  title: string;
  icon: string;
  description: string;
  revenue: string;
  setupTime: string;
  difficulty: "Easy" | "Medium" | "Hard";
  color: string;
  gradient: string;
  features: string[];
  pros: string[];
  cons: string[];
}

export function MonetizationSection() {
  const t = useTranslations('help');
  const [activeMethod, setActiveMethod] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

const monetizationMethods: MonetizationMethod[] = [
  {
      id: "affiliation",
      title: t('MONETIZATION_AFFILIATION_TITLE'),
      icon: "🤝",
      description: t('MONETIZATION_AFFILIATION_DESC'),
      revenue: "$2K - $8K/month",
      setupTime: "30 minutes",
      difficulty: "Easy",
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
      features: [
        "Commission tracking system",
        "Affiliate dashboard",
        "Automated payouts",
        "Performance analytics"
      ],
      pros: [
        "Passive income potential",
        "Low maintenance required",
        "Scalable revenue model",
        "No inventory needed"
      ],
      cons: [
        "Dependent on partner performance",
        "Commission rates vary",
        "Requires quality content"
      ]
  },
  {
      id: "paid-submissions",
      title: t('MONETIZATION_PAID_SUBMISSION_TITLE'),
      icon: "💎",
      description: t('MONETIZATION_PAID_SUBMISSION_DESC'),
      revenue: "$5K - $15K/month",
      setupTime: "2 hours",
      difficulty: "Medium",
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500 to-pink-500",
      features: [
        "Premium listing tiers",
        "Payment processing",
        "Content verification",
        "Priority placement"
      ],
      pros: [
        "High revenue potential",
        "Direct user payments",
        "Quality content control",
        "Predictable income"
      ],
      cons: [
        "Requires user base",
        "Content moderation needed",
        "Payment processing fees"
      ]
  },
  {
      id: "sponsored-ads",
      title: t('MONETIZATION_SPONSORED_ADS_TITLE'),
    icon: "🎯",
      description: t('MONETIZATION_SPONSORED_ADS_DESC'),
      revenue: "$3K - $12K/month",
      setupTime: "1 hour",
      difficulty: "Easy",
      color: "text-green-600 dark:text-green-400",
      gradient: "from-green-500 to-emerald-500",
      features: [
        "Ad management system",
        "Targeting options",
        "Performance tracking",
        "Automated optimization"
      ],
      pros: [
        "High CPM potential",
        "Automated revenue",
        "Scalable model",
        "Low operational cost"
      ],
      cons: [
        "Traffic dependent",
        "Ad blocker impact",
        "User experience balance"
      ]
    }
  ];

  const stats = [
    { label: t("STAT_AVERAGE_REVENUE"), value: "$8.5K", change: "+23%", period: t("STAT_MONTHLY") },
    { label: t("STAT_ACTIVE_USERS"), value: "12.5K", change: "+15%", period: t("STAT_MONTHLY") },
    { label: t("STAT_CONVERSION_RATE"), value: "4.2%", change: "+8%", period: t("STAT_MONTHLY") },
    { label: t("STAT_PLATFORM_GROWTH"), value: "156%", change: "+34%", period: t("STAT_YEARLY") }
];

  return (
    <section className="py-20 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-300 text-sm font-medium mb-6">
            <span>💰</span>
            {t('MONETIZATION_BADGE')}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
            {t('MONETIZATION_SECTION_TITLE')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
            {t('MONETIZATION_SECTION_SUBTITLE')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {stat.label}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                    {stat.change}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    {stat.period}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Monetization Methods */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {monetizationMethods.map((method, index) => (
            <div
              key={method.id}
              className={`relative group cursor-pointer transition-all duration-300 ${
                activeMethod === index ? 'transform scale-105' : 'hover:transform hover:scale-102'
              }`}
              onClick={() => setActiveMethod(index)}
            >
              {/* Method Card */}
              <div className={`relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-2xl p-8 border-2 transition-all duration-300 h-full ${
                activeMethod === index
                  ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 rounded-full bg-linear-to-r ${method.gradient} flex items-center justify-center text-white text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {method.icon}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${method.color}`}>
                    {method.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {method.description}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{t("REVENUE_POTENTIAL")}:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{method.revenue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{t("SETUP_TIME")}:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{method.setupTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{t("DIFFICULTY")}:</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      method.difficulty === "Easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                      method.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}>
                      {method.difficulty}
                    </span>
                  </div>
                </div>

                {/* Active Indicator */}
                {activeMethod === index && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed View */}
        <div className="mb-16">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-slate-100 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-linear-to-r ${monetizationMethods[activeMethod].gradient} flex items-center justify-center text-white`}>
                    {monetizationMethods[activeMethod].icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {monetizationMethods[activeMethod].title} - Detailed Analysis
                  </h3>
                </div>
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  {showDetails ? t("HIDE_DETAILS") : t("SHOW_DETAILS")}
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Features */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-blue-600">✨</span>
                    {t("KEY_FEATURES")}
                  </h4>
                  <div className="space-y-2">
                    {monetizationMethods[activeMethod].features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pros & Cons */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      {t("PROS")}
                    </h4>
                    <div className="space-y-2">
                      {monetizationMethods[activeMethod].pros.map((pro, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {pro}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="text-red-600">⚠️</span>
                      {t("CONS")}
                    </h4>
                    <div className="space-y-2">
                      {monetizationMethods[activeMethod].cons.map((con, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          {con}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {showDetails && (
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Implementation Steps</h5>
                      <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <li>1. Configure payment gateway</li>
                        <li>2. Set up tracking system</li>
                        <li>3. Create user dashboard</li>
                        <li>4. Launch beta testing</li>
                      </ol>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Required Tools</h5>
                      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Stripe integration</li>
                        <li>• Analytics platform</li>
                        <li>• Content management</li>
                        <li>• User authentication</li>
                      </ul>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Success Metrics</h5>
                      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Monthly recurring revenue</li>
                        <li>• User conversion rate</li>
                        <li>• Average transaction value</li>
                        <li>• Customer lifetime value</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
              </div>
              </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-linear-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl p-8 border border-green-200 dark:border-green-800">
            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
              {t("START_MONETIZING_TODAY")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
              {t("START_MONETIZING_DESC")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-linear-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                {t("GET_STARTED_NOW")}
              </Button>
              <Button variant="outline" className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-8 py-3 rounded-xl transition-all duration-300">
                {t("VIEW_CASE_STUDIES")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
