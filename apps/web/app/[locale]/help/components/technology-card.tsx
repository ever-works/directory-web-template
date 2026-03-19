"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";

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
        bg: "from-blue-500 to-cyan-500",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
        hover: "hover:border-blue-300 dark:hover:border-blue-700"
      },
      green: {
        bg: "from-green-500 to-emerald-500",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
        hover: "hover:border-green-300 dark:hover:border-green-700"
      },
      purple: {
        bg: "from-purple-500 to-pink-500",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-800",
        hover: "hover:border-purple-300 dark:hover:border-purple-700"
      },
      orange: {
        bg: "from-orange-500 to-red-500",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-800",
        hover: "hover:border-orange-300 dark:hover:border-orange-700"
      },
      pink: {
        bg: "from-pink-500 to-rose-500",
        text: "text-pink-600 dark:text-pink-400",
        border: "border-pink-200 dark:border-pink-800",
        hover: "hover:border-pink-300 dark:hover:border-pink-700"
      },
      yellow: {
        bg: "from-yellow-500 to-amber-500",
        text: "text-yellow-600 dark:text-yellow-400",
        border: "border-yellow-200 dark:border-yellow-800",
        hover: "hover:border-yellow-300 dark:hover:border-yellow-700"
      },
      red: {
        bg: "from-red-500 to-pink-500",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
        hover: "hover:border-red-300 dark:hover:border-red-700"
      },
      gray: {
        bg: "from-gray-500 to-slate-500",
        text: "text-gray-600 dark:text-gray-400",
        border: "border-gray-200 dark:border-gray-700",
        hover: "hover:border-gray-300 dark:hover:border-gray-600"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const colors = getColorClasses(color);

  const popularityData = {
    high: { 
      label: t('TECH_CARD_POPULAR'), 
      color: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200",
      ring: "ring-2 ring-yellow-400 dark:ring-yellow-500 ring-opacity-50",
      percentage: 95
    },
    medium: { 
      label: t('TECH_CARD_STABLE'), 
      color: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200",
      ring: "",
      percentage: 75
    },
    low: { 
      label: t('TECH_CARD_NICHE'), 
      color: "bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200",
      ring: "opacity-90",
      percentage: 45
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className={`group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${colors.border} ${colors.hover} ${popularityData[popularity].ring}`}>
      {/* Popularity Badge */}
      <div className="absolute -top-3 -right-3 z-10">
        <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-lg transition-all duration-300 ${popularityData[popularity].color}`}>
          {popularityData[popularity].label}
        </span>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0 relative">
            <div className={`w-16 h-16 rounded-xl bg-linear-to-br ${colors.bg} flex items-center justify-center text-white text-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
            {icon}
          </div>
            <div className="absolute -inset-1 rounded-xl bg-linear-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
            <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 group-hover:text-opacity-80 transition-colors duration-300">
                {name}
              </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  {category}
                </span>
                {version && (
                    <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full font-mono border border-slate-200 dark:border-slate-600">
                    v{version}
                  </span>
                )}
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
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
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-linear-to-r ${colors.bg} transition-all duration-1000 ease-out`}
              style={{ width: `${popularityData[popularity].percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Features Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {getFeatureTags(name).slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
              className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-300 transition-all duration-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                {tag}
              </span>
            ))}
          {getFeatureTags(name).length > 3 && (
            <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-300">
              +{getFeatureTags(name).length - 3} more
            </span>
          )}
        </div>

        {/* Expand/Collapse Button */}
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          variant="outline"
          size="sm"
          className={`w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 ${
            isExpanded ? 'bg-slate-50 dark:bg-slate-800' : ''
          }`}
        >
          {isExpanded ? "Show Less" : "Show Details"}
        </Button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
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
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
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
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className="text-blue-600">🎯</span>
                        Use Cases
                      </h4>
                      <div className="space-y-1">
                        {useCases.map((useCase, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
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
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-green-600">✅</span>
                          Pros
                        </h4>
                        <div className="space-y-1">
                          {pros.map((pro, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              {pro}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cons.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-red-600">⚠️</span>
                          Cons
                        </h4>
                        <div className="space-y-1">
                          {cons.map((con, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
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
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-linear-to-r ${colors.bg} transition-all duration-1000 ease-out`}
                          style={{ width: `${value}%` }}
          ></div>
        </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'comparison' && alternatives.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-purple-600">🔄</span>
                    Alternatives
                  </h4>
                  <div className="space-y-2">
                    {alternatives.map((alternative, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {alternative}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          Compare
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
        )}
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-transparent via-white/20 dark:via-slate-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
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