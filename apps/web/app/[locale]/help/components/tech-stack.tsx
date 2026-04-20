"use client";

import { useState, useMemo } from "react";
import { useTranslations } from 'next-intl';
import { TechnologyCard } from './technology-card';

interface TechItem {
  name: string;
  icon: string;
  descriptionKey: string;
  categoryKey: string;
  color: string;
  version: string;
  popularity: "high" | "medium" | "low";
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

const techStack: TechItem[] = [
  {
    name: "Next.js",
    icon: "⚡",
    descriptionKey: "TECH_NEXTJS_DESC",
    categoryKey: "TECH_NEXTJS_CATEGORY",
    color: "blue",
    version: "14.0.0",
    popularity: "high",
    performance: { speed: 95, reliability: 90, community: 95, documentation: 92 },
    alternatives: ["Nuxt.js", "Gatsby", "Remix"],
    useCases: ["Full-stack applications", "E-commerce platforms", "Content management"],
    pros: ["Excellent performance", "Great developer experience", "Built-in optimizations"],
    cons: ["Learning curve", "Vendor lock-in", "Complex configuration"]
  },
  {
    name: "TypeScript",
    icon: "🔷",
    descriptionKey: "TECH_TYPESCRIPT_DESC",
    categoryKey: "TECH_TYPESCRIPT_CATEGORY",
    color: "blue",
    version: "5.2.0",
    popularity: "high",
    performance: { speed: 85, reliability: 95, community: 90, documentation: 88 },
    alternatives: ["Flow", "JSDoc", "Pure JavaScript"],
    useCases: ["Large codebases", "Team development", "Enterprise applications"],
    pros: ["Type safety", "Better IDE support", "Catch errors early"],
    cons: ["Additional complexity", "Build time overhead", "Learning curve"]
  },
  {
    name: "Tailwind CSS",
    icon: "🎨",
    descriptionKey: "TECH_TAILWIND_DESC",
    categoryKey: "TECH_TAILWIND_CATEGORY",
    color: "cyan",
    version: "3.3.0",
    popularity: "high",
    performance: { speed: 90, reliability: 85, community: 92, documentation: 95 },
    alternatives: ["Bootstrap", "Material-UI", "Styled Components"],
    useCases: ["Rapid prototyping", "Custom designs", "Component libraries"],
    pros: ["Utility-first approach", "Highly customizable", "Small bundle size"],
    cons: ["HTML bloat", "Learning curve", "Design consistency"]
  },
  {
    name: "HeroUI",
    icon: "🎯",
    descriptionKey: "TECH_HEROUI_DESC",
    categoryKey: "TECH_HEROUI_CATEGORY",
    color: "purple",
    version: "2.0.0",
    popularity: "medium",
    performance: { speed: 88, reliability: 92, community: 75, documentation: 85 },
    alternatives: ["Ant Design", "Chakra UI", "Mantine"],
    useCases: ["Admin dashboards", "Design systems", "Rapid development"],
    pros: ["Beautiful components", "Accessibility built-in", "Customizable"],
    cons: ["Limited components", "Newer library", "Community size"]
  },
  {
    name: "NextAuth.js",
    icon: "🔐",
    descriptionKey: "TECH_NEXTAUTH_DESC",
    categoryKey: "TECH_NEXTAUTH_CATEGORY",
    color: "green",
    version: "4.24.0",
    popularity: "high",
    performance: { speed: 85, reliability: 90, community: 88, documentation: 85 },
    alternatives: ["Auth0", "Firebase Auth", "Supabase Auth"],
    useCases: ["User authentication", "OAuth integration", "Session management"],
    pros: ["Easy setup", "Multiple providers", "Secure by default"],
    cons: ["Limited customization", "Vendor lock-in", "Complex configuration"]
  },
  {
    name: "Supabase",
    icon: "🗃️",
    descriptionKey: "TECH_SUPABASE_DESC",
    categoryKey: "TECH_SUPABASE_CATEGORY",
    color: "green",
    version: "2.38.0",
    popularity: "high",
    performance: { speed: 88, reliability: 85, community: 80, documentation: 90 },
    alternatives: ["Firebase", "AWS Amplify", "PlanetScale"],
    useCases: ["Real-time applications", "Backend as a service", "Database management"],
    pros: ["Real-time features", "PostgreSQL based", "Great developer experience"],
    cons: ["Vendor lock-in", "Limited regions", "Pricing complexity"]
  },
  {
    name: "Drizzle ORM",
    icon: "🔧",
    descriptionKey: "TECH_DRIZZLE_DESC",
    categoryKey: "TECH_DRIZZLE_CATEGORY",
    color: "orange",
    version: "0.29.0",
    popularity: "medium",
    performance: { speed: 95, reliability: 88, community: 70, documentation: 85 },
    alternatives: ["Prisma", "TypeORM", "Sequelize"],
    useCases: ["Database operations", "Type-safe queries", "Migrations"],
    pros: ["Type-safe", "Lightweight", "Excellent performance"],
    cons: ["Smaller community", "Limited features", "Newer library"]
  },
  {
    name: "TanStack Query",
    icon: "🔄",
    descriptionKey: "TECH_TANSTACK_DESC",
    categoryKey: "TECH_TANSTACK_CATEGORY",
    color: "red",
    version: "5.8.0",
    popularity: "high",
    performance: { speed: 90, reliability: 92, community: 88, documentation: 90 },
    alternatives: ["SWR", "Apollo Client", "React Query"],
    useCases: ["Data fetching", "Caching", "Server state management"],
    pros: ["Excellent caching", "DevTools", "TypeScript support"],
    cons: ["Learning curve", "Bundle size", "Complex configuration"]
  },
  {
    name: "Stripe",
    icon: "💳",
    descriptionKey: "TECH_STRIPE_DESC",
    categoryKey: "TECH_STRIPE_CATEGORY",
    color: "purple",
    version: "14.0.0",
    popularity: "high",
    performance: { speed: 85, reliability: 95, community: 90, documentation: 95 },
    alternatives: ["PayPal", "Square", "Adyen"],
    useCases: ["Payment processing", "Subscriptions", "E-commerce"],
    pros: ["Excellent documentation", "Global support", "Reliable"],
    cons: ["High fees", "Vendor lock-in", "Complex webhooks"]
  },
  {
    name: "Resend",
    icon: "✉️",
    descriptionKey: "TECH_RESEND_DESC",
    categoryKey: "TECH_RESEND_CATEGORY",
    color: "teal",
    version: "2.0.0",
    popularity: "medium",
    performance: { speed: 90, reliability: 85, community: 60, documentation: 80 },
    alternatives: ["SendGrid", "Mailgun", "AWS SES"],
    useCases: ["Email delivery", "Transactional emails", "Marketing campaigns"],
    pros: ["Developer-friendly", "Good deliverability", "Simple API"],
    cons: ["Limited features", "Newer service", "Pricing"]
  },
  {
    name: "Sentry",
    icon: "🛡️",
    descriptionKey: "TECH_SENTRY_DESC",
    categoryKey: "TECH_SENTRY_CATEGORY",
    color: "red",
    version: "7.0.0",
    popularity: "high",
    performance: { speed: 85, reliability: 90, community: 85, documentation: 88 },
    alternatives: ["LogRocket", "Bugsnag", "Rollbar"],
    useCases: ["Error tracking", "Performance monitoring", "Release management"],
    pros: ["Excellent error tracking", "Performance insights", "Release tracking"],
    cons: ["Expensive", "Data privacy", "Complex setup"]
  },
  {
    name: "Framer Motion",
    icon: "🎪",
    descriptionKey: "TECH_FRAMER_DESC",
    categoryKey: "TECH_FRAMER_CATEGORY",
    color: "pink",
    version: "10.16.0",
    popularity: "high",
    performance: { speed: 80, reliability: 85, community: 85, documentation: 90 },
    alternatives: ["React Spring", "Lottie", "GSAP"],
    useCases: ["Animations", "Micro-interactions", "Page transitions"],
    pros: ["Declarative API", "Great performance", "Excellent documentation"],
    cons: ["Bundle size", "Learning curve", "Overkill for simple animations"]
  },
  {
    name: "Zustand",
    icon: "🐻",
    descriptionKey: "TECH_ZUSTAND_DESC",
    categoryKey: "TECH_ZUSTAND_CATEGORY",
    color: "yellow",
    version: "4.4.0",
    popularity: "high",
    performance: { speed: 95, reliability: 90, community: 80, documentation: 85 },
    alternatives: ["Redux", "Jotai", "Valtio"],
    useCases: ["State management", "Global state", "Simple stores"],
    pros: ["Lightweight", "TypeScript support", "Simple API"],
    cons: ["Limited features", "No DevTools", "Smaller ecosystem"]
  },
  {
    name: "Zod",
    icon: "✅",
    descriptionKey: "TECH_ZOD_DESC",
    categoryKey: "TECH_ZOD_CATEGORY",
    color: "green",
    version: "3.22.0",
    popularity: "high",
    performance: { speed: 90, reliability: 95, community: 85, documentation: 90 },
    alternatives: ["Yup", "Joi", "io-ts"],
    useCases: ["Schema validation", "Type inference", "Runtime validation"],
    pros: ["TypeScript first", "Excellent inference", "Composable"],
    cons: ["Bundle size", "Learning curve", "Performance overhead"]
  },
  {
    name: "PostHog",
    icon: "📊",
    descriptionKey: "TECH_POSTHOG_DESC",
    categoryKey: "TECH_POSTHOG_CATEGORY",
    color: "purple",
    version: "1.0.0",
    popularity: "medium",
    performance: { speed: 85, reliability: 80, community: 70, documentation: 75 },
    alternatives: ["Mixpanel", "Amplitude", "Google Analytics"],
    useCases: ["Product analytics", "Feature flags", "A/B testing"],
    pros: ["Open source", "Privacy focused", "Feature flags"],
    cons: ["Self-hosted complexity", "Limited features", "Community size"]
  },
  {
    name: "Vercel",
    icon: "🚀",
    descriptionKey: "TECH_VERCEL_DESC",
    categoryKey: "TECH_VERCEL_CATEGORY",
    color: "gray",
    version: "Latest",
    popularity: "high",
    performance: { speed: 95, reliability: 90, community: 85, documentation: 90 },
    alternatives: ["Netlify", "AWS", "Railway"],
    useCases: ["Deployment", "Hosting", "Edge functions"],
    pros: ["Excellent performance", "Easy deployment", "Great DX"],
    cons: ["Vendor lock-in", "Pricing", "Limited regions"]
  }
];



export function TechStack() {
  const t = useTranslations('help');
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "popularity" | "performance">("popularity");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Helper function to get translation or fallback
  const getTranslation = (key: string, fallback: string): string => {
    // For dynamic keys, we need to use type assertion
    // This is safe because we always provide a fallback
    try {
      return (t as any)(key) || fallback;
    } catch {
      return fallback;
    }
  };

  // Define categories with translations directly to avoid type issues
  const categories = [
    { id: "all", label: t("CATEGORY_ALL_TECH" as any) || "All Technologies", icon: "🔧", count: techStack.length },
    { id: "frontend", label: t("CATEGORY_FRONTEND" as any) || "Frontend", icon: "🎨", count: techStack.filter(tech => tech.categoryKey.includes("FRONTEND")).length },
    { id: "backend", label: t("CATEGORY_BACKEND" as any) || "Backend", icon: "⚙️", count: techStack.filter(tech => tech.categoryKey.includes("BACKEND")).length },
    { id: "database", label: t("CATEGORY_DATABASE" as any) || "Database", icon: "🗃️", count: techStack.filter(tech => tech.categoryKey.includes("DATABASE")).length },
    { id: "auth", label: t("CATEGORY_AUTH" as any) || "Authentication", icon: "🔐", count: techStack.filter(tech => tech.categoryKey.includes("AUTH")).length },
    { id: "payment", label: t("CATEGORY_PAYMENT" as any) || "Payment", icon: "💳", count: techStack.filter(tech => tech.categoryKey.includes("PAYMENT")).length },
    { id: "monitoring", label: t("CATEGORY_MONITORING" as any) || "Monitoring", icon: "📊", count: techStack.filter(tech => tech.categoryKey.includes("MONITORING")).length },
    { id: "deployment", label: t("CATEGORY_DEPLOYMENT" as any) || "Deployment", icon: "🚀", count: techStack.filter(tech => tech.categoryKey.includes("DEPLOYMENT")).length }
  ];

  const filteredTech = useMemo(() => {
    let filtered = techStack;
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(tech => 
        tech.categoryKey.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "popularity":
          const popularityOrder = { high: 3, medium: 2, low: 1 };
          return popularityOrder[b.popularity] - popularityOrder[a.popularity];
        case "performance":
          const aAvg = a.performance ? Object.values(a.performance).reduce((sum, val) => sum + val, 0) / 4 : 0;
          const bAvg = b.performance ? Object.values(b.performance).reduce((sum, val) => sum + val, 0) / 4 : 0;
          return bAvg - aAvg;
        default:
          return 0;
      }
    });

    return filtered;
  }, [selectedCategory, sortBy]);

  const stats = {
    total: techStack.length,
    highPopularity: techStack.filter(t => t.popularity === "high").length,
    avgPerformance: Math.round(
      techStack.reduce((sum, tech) => {
        if (tech.performance) {
          return sum + Object.values(tech.performance).reduce((s, v) => s + v, 0) / 4;
        }
        return sum;
      }, 0) / techStack.length
    )
  };

  return (
    <section>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">{t('TECH_STACK_BADGE')}</p>
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">
            {t('TECH_STACK_TITLE')}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-2xl leading-relaxed">
            {t('TECH_STACK_SUBTITLE')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {stats.total}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t('TECH_STACK_TOTAL_TECH')}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                {stats.highPopularity}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t('TECH_STACK_HIGH_POPULARITY')}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                {stats.avgPerformance}%
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t('TECH_STACK_AVG_PERFORMANCE')}
              </div>
            </div>
          </div>

        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-white/3 rounded-xl border border-slate-200 dark:border-white/6 shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    selectedCategory === category.id
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/8"
                  }`}
                >
                  <span>{category.icon}</span>
                  {category.label}
                  <span className="text-xs opacity-75">({category.count})</span>
                </button>
              ))}
            </div>

            {/* Sort & View Controls */}
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "popularity" | "performance" | "name")}
                className="px-3 py-2 bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/8 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="popularity">{t("SORT_BY_POPULARITY")}</option>
                <option value="performance">{t("SORT_BY_PERFORMANCE")}</option>
                <option value="name">{t("SORT_BY_NAME")}</option>
              </select>

              <div className="flex bg-slate-100 dark:bg-white/8 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-white/5 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all duration-300 ${
                    viewMode === "list"
                      ? "bg-white dark:bg-white/5 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Grid/List */}
        <div className={`${
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
        }`}>
          {filteredTech.map((tech) => (
            <TechnologyCard
              key={tech.name}
              name={tech.name}
              description={getTranslation(tech.descriptionKey, `Description for ${tech.name}`)}
              icon={<span className="text-2xl">{tech.icon}</span>}
              category={getTranslation(tech.categoryKey, 'Technology')}
              version={tech.version}
              color={tech.color}
              popularity={tech.popularity}
              performance={tech.performance}
              alternatives={tech.alternatives}
              useCases={tech.useCases}
              pros={tech.pros}
              cons={tech.cons}
            />
          ))}
        </div>

        {/* Results Summary */}
        <div className="mt-8 text-center">
          <div className="bg-white dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t("SHOWING_TECHNOLOGIES", { filtered: filteredTech.length, total: techStack.length })}
            </p>
            {filteredTech.length === 0 && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {t("NO_TECH_FOUND")}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {t("TRY_ADJUSTING_FILTERS")}
                </p>
              </div>
            )}
            </div>
          </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gray-50 dark:bg-white/3 rounded-xl p-8 border border-gray-100 dark:border-white/6">
            <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
              {t("READY_TO_BUILD_WITH_TECH")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-5 max-w-2xl mx-auto">
              {t("ALL_TECH_PRECONFIGURED")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="h-9 px-4 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                {t("GET_STARTED_NOW")}
              </button>
              <button className="h-9 px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors">
                {t("VIEW_DOCUMENTATION")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 