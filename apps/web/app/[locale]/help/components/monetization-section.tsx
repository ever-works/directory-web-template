"use client";

import { useState, type ComponentType } from "react";
import { useTranslations } from 'next-intl';
import { Link2, Sparkles, Target, AlertTriangle } from "lucide-react";
interface MonetizationMethod {
  id: string;
  title: string;
  Icon: ComponentType<{ className?: string }>;
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
      Icon: Link2,
      description: t('MONETIZATION_AFFILIATION_DESC'),
      revenue: "$2K - $8K/month",
      setupTime: "30 minutes",
      difficulty: "Easy",
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
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
      Icon: Sparkles,
      description: t('MONETIZATION_PAID_SUBMISSION_DESC'),
      revenue: "$5K - $15K/month",
      setupTime: "2 hours",
      difficulty: "Medium",
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
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
      Icon: Target,
      description: t('MONETIZATION_SPONSORED_ADS_DESC'),
      revenue: "$3K - $12K/month",
      setupTime: "1 hour",
      difficulty: "Easy",
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
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

  const ActiveMethodIcon = monetizationMethods[activeMethod].Icon;

  return (
    <section>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">{t('MONETIZATION_BADGE')}</p>
          <h2 className="text-base font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">
            {t('MONETIZATION_SECTION_TITLE')}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-2xl leading-relaxed">
            {t('MONETIZATION_SECTION_SUBTITLE')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"
            >
              <div className="text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {stat.label}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-neutral-900 dark:text-white text-xs font-medium">
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
        <div className="grid lg:grid-cols-3 gap-4 mb-10">
          {monetizationMethods.map((method, index) => (
            <div
              key={method.id}
              className="relative group cursor-pointer"
              onClick={() => setActiveMethod(index)}
            >
              {/* Method Card */}
              <div className={`relative bg-white dark:bg-white/3 rounded-xl p-6 border transition-colors duration-200 h-full ${
                activeMethod === index
                  ? 'border-neutral-900/20 dark:border-white/20'
                  : 'border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8'
              }`}>
                {/* Header */}
                <div className="text-center mb-4">
                  <div className={`w-8 h-8 rounded-md bg-neutral-900 dark:bg-white/10 flex items-center justify-center mb-2`}>
                    <method.Icon className="w-4 h-4 text-white dark:text-neutral-400" />
                  </div>
                  <h3 className={`text-sm font-semibold mb-1.5 text-neutral-900 dark:text-white`}>
                    {method.title}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed">
                    {method.description}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t("REVENUE_POTENTIAL")}:</span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white">{method.revenue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t("SETUP_TIME")}:</span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white">{method.setupTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t("DIFFICULTY")}:</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      method.difficulty === "Easy" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300" :
                      method.difficulty === "Medium" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300" :
                      "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"
                    }`}>
                      {method.difficulty}
                    </span>
                  </div>
                </div>

                {/* Active Indicator - removed */}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed View */}
        <div className="mb-16">
          <div className="bg-white dark:bg-white/3 rounded-xl border border-slate-200 dark:border-white/6 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-slate-100 dark:bg-[#0a0a0a] px-6 py-4 border-b border-slate-200 dark:border-white/6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white/10 flex items-center justify-center`}>
                    <ActiveMethodIcon className="w-4 h-4 text-white dark:text-neutral-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {monetizationMethods[activeMethod].title} - Detailed Analysis
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-7 px-3 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-white/6 transition-colors"
                >
                  {showDetails ? t("HIDE_DETAILS") : t("SHOW_DETAILS")}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Features */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="">✨</span>
                    {t("KEY_FEATURES")}
                  </h4>
                  <div className="space-y-2">
                    {monetizationMethods[activeMethod].features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pros & Cons */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="">✅</span>
                      {t("PROS")}
                    </h4>
                    <div className="space-y-2">
                      {monetizationMethods[activeMethod].pros.map((pro, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                          {pro}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />
                      {t("CONS")}
                    </h4>
                    <div className="space-y-2">
                      {monetizationMethods[activeMethod].cons.map((con, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                          {con}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {showDetails && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-white/3 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Implementation Steps</h5>
                      <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <li>1. Configure payment gateway</li>
                        <li>2. Set up tracking system</li>
                        <li>3. Create user dashboard</li>
                        <li>4. Launch beta testing</li>
                      </ol>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/3 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Required Tools</h5>
                      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Stripe integration</li>
                        <li>• Analytics platform</li>
                        <li>• Content management</li>
                        <li>• User authentication</li>
                      </ul>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/3 rounded-lg p-4">
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
          <div className="bg-gray-50 dark:bg-white/3 rounded-xl p-6 border border-gray-100 dark:border-white/6">
            <h3 className="text-base font-semibold mb-2 text-slate-900 dark:text-white">
              {t("START_MONETIZING_TODAY")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs mb-4 max-w-2xl mx-auto">
              {t("START_MONETIZING_DESC")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="h-9 px-4 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                {t("GET_STARTED_NOW")}
              </button>
              <button className="h-9 px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors">
                {t("VIEW_CASE_STUDIES")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
