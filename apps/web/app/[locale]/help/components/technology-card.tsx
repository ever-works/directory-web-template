"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';

interface TechnologyCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  version?: string;
  color?: string;
  popularity?: "high" | "medium" | "low";
  performance?: {
    speed: number;
    reliability: number;
    community: number;
    documentation: number;
  };
  alternatives?: string[];
  useCases?: string[];
  pros?: string[];
  cons?: string[];
}

export function TechnologyCard({ 
  name, 
  description, 
  icon, 
  category, 
  version,
  color = "blue",
  popularity = "medium",
  performance,
  alternatives = [],
  useCases = [],
  pros = [],
  cons = []
}: TechnologyCardProps) {
  const t = useTranslations('help');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'comparison'>('overview');

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-neutral-900 dark:text-white",
        border: "border-neutral-200 dark:border-white/6",
        hover: "hover:border-neutral-300 dark:hover:border-white/8"
      },
      green: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-neutral-900 dark:text-white",
        border: "border-neutral-200 dark:border-white/6",
        hover: "hover:border-neutral-300 dark:hover:border-white/8"
      },
      purple: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-neutral-900 dark:text-white",
        border: "border-neutral-200 dark:border-white/6",
        hover: "hover:border-neutral-300 dark:hover:border-white/8"
      },
      orange: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-neutral-900 dark:text-white",
        border: "border-neutral-200 dark:border-white/6",
        hover: "hover:border-neutral-300 dark:hover:border-white/8"
      },
      pink: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-neutral-900 dark:text-white",
        border: "border-neutral-200 dark:border-white/6",
        hover: "hover:border-neutral-300 dark:hover:border-white/8"
      },
      yellow: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-neutral-900 dark:text-white",
        border: "border-neutral-200 dark:border-white/6",
        hover: "hover:border-neutral-300 dark:hover:border-white/8"
      },
      red: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-neutral-900 dark:text-white",
        border: "border-neutral-200 dark:border-white/6",
        hover: "hover:border-neutral-300 dark:hover:border-white/8"
      },
      gray: {
        bg: "from-neutral-700 to-neutral-900",
        text: "text-gray-600 dark:text-gray-400",
        border: "border-gray-200 dark:border-white/6",
        hover: "hover:border-gray-300 dark:hover:border-white/8"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const colors = getColorClasses(color);

  const popularityData = {
    high: { 
      label: t('TECH_CARD_POPULAR'), 
      color: "bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300",
      ring: "",
      percentage: 95
    },
    medium: { 
      label: t('TECH_CARD_STABLE'), 
      color: "bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300",
      ring: "",
      percentage: 75
    },
    low: { 
      label: t('TECH_CARD_NICHE'), 
      color: "bg-gray-100 dark:bg-white/3 text-gray-800 dark:text-gray-200",
      ring: "opacity-90",
      percentage: 45
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-neutral-900 dark:text-white";
    if (score >= 70) return "text-neutral-900 dark:text-white";
    return "text-neutral-900 dark:text-white";
  };

  return (
    <div className={`group relative bg-white dark:bg-white/3 rounded-xl border transition-colors duration-200 ${colors.border} ${colors.hover}`}>
      {/* Popularity Badge */}
      <div className="absolute -top-3 -right-3 z-10">
        <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-lg transition-all duration-300 ${popularityData[popularity].color}`}>
          {popularityData[popularity].label}
        </span>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 relative">
            <div className={`w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-base`}>
            {icon}
          </div>
          </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
            <div>
                <h3 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white mb-1">
                {name}
              </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  {category}
                </span>
                {version && (
                    <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-white/8 rounded-full font-mono border border-slate-200 dark:border-white/8">
                    v{version}
                  </span>
                )}
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Description */}
        <p className="text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed mb-4">
            {description}
          </p>

        {/* Usage Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {t('TECH_CARD_USAGE_IN_PROJECT')}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {popularityData[popularity].percentage}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-white/8 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-neutral-900 dark:bg-white transition-all duration-1000 ease-out`}
              style={{ width: `${popularityData[popularity].percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Features Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {getFeatureTags(name).slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
              className="px-2 py-1 text-xs bg-slate-100 dark:bg-white/8 rounded-md border border-slate-200 dark:border-white/8 font-medium text-slate-700 dark:text-slate-300 transition-all duration-300 hover:bg-slate-200 dark:hover:bg-white/8"
              >
                {tag}
              </span>
            ))}
          {getFeatureTags(name).length > 3 && (
            <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-white/8 rounded-md border border-slate-200 dark:border-white/8 font-medium text-slate-700 dark:text-slate-300">
              +{getFeatureTags(name).length - 3} more
            </span>
          )}
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full h-8 text-xs font-medium border border-gray-200 dark:border-white/10 rounded-md transition-colors ${
            isExpanded ? 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6'
          }`}
        >
          {isExpanded ? "Show Less" : "Show Details"}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/6">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-white/8 rounded-lg p-1">
              {[
                { id: 'overview', label: 'Overview', icon: '📋' },
                { id: 'performance', label: 'Performance', icon: '⚡' },
                { id: 'comparison', label: 'Comparison', icon: '📊' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-white/5 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
      </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Use Cases */}
                  {useCases.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className="">🎯</span>
                        Use Cases
                      </h4>
                      <div className="space-y-1">
                        {useCases.map((useCase, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <div className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                            {useCase}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-2 gap-4">
                    {pros.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="">✅</span>
                          Pros
                        </h4>
                        <div className="space-y-1">
                          {pros.map((pro, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <div className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                              {pro}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cons.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="">⚠️</span>
                          Cons
                        </h4>
                        <div className="space-y-1">
                          {cons.map((con, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <div className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                              {con}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'performance' && performance && (
                <div className="space-y-4">
                  {Object.entries(performance).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {key}
                        </span>
                        <span className={`text-sm font-bold ${getPerformanceColor(value)}`}>
                          {value}/100
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-white/8 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-neutral-900 dark:bg-white transition-all duration-1000 ease-out`}
                          style={{ width: `${value}%` }}
          ></div>
        </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'comparison' && alternatives.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="">🔄</span>
                    Alternatives
                  </h4>
                  <div className="space-y-2">
                    {alternatives.map((alternative, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-white/8 rounded-lg border border-slate-200 dark:border-white/8">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {alternative}
                        </span>
                        <button
                          className="h-6 px-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                        >
                          Compare
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getFeatureTags(name: string): string[] {
  const tags: Record<string, string[]> = {
    "React": ["Hooks", "JSX", "Virtual DOM", "Component-Based"],
    "Next.js": ["SSR", "SSG", "API Routes", "File-based Routing"],
    "TypeScript": ["Type Safety", "Intellisense", "Compilation", "Interfaces"],
    "Tailwind CSS": ["Utility-First", "Responsive", "Dark Mode", "Customizable"],
    "HeroUI": ["Components", "Theming", "Accessible", "Modern"],
    "Drizzle ORM": ["Type-Safe", "Migration", "Query Builder", "Lightweight"],
    "PostgreSQL": ["ACID", "Relational", "Scalable", "JSON Support"],
    "Supabase": ["Real-time", "Auth", "Storage", "Edge Functions"],
    "NextAuth.js": ["OAuth", "Sessions", "Callbacks", "Secure"],
    "TanStack Query": ["Caching", "Sync", "Optimistic", "DevTools"],
    "Zustand": ["Lightweight", "Immutable", "DevTools", "TypeScript"],
    "Stripe": ["Payments", "Webhooks", "Subscriptions", "Global"],
    "Resend": ["Templates", "Analytics", "Deliverability", "API"],
    "Sentry": ["Error Tracking", "Performance", "Releases", "Alerts"],
    "PostHog": ["Events", "Funnels", "Feature Flags", "A/B Testing"],
  };
  return tags[name] || ["Modern", "Reliable", "Scalable", "Well-Documented"];
} 