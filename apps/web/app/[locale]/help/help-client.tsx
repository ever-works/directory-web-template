"use client";

import { useState, useCallback, useRef } from "react";
import { useThrottledScroll } from "@/hooks/use-throttled-scroll";
import { PageContainer } from "@/components/ui/container";
import {
  HowItWorks,
  InstallationGuide,
  UsageGuide,
  TechStack,
  MonetizationSection,
  HeroLanding,
  Support,
  EnvConfiguration
} from "./components";
import { useTranslations } from "next-intl";

interface NavigationStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  component: React.ReactNode;
  completed: boolean;
  estimatedTime: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export default function HelpPageClient() {
  const t = useTranslations("help");
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showProgress, setShowProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const contentSectionRef = useRef<HTMLDivElement>(null);

  const navigationSteps: NavigationStep[] = [
    {
      id: "quick-start",
      title: t("QUICK_START"),
      description: t("QUICK_START_DESC"),
      icon: "🚀",
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
      component: <HowItWorks />,
      completed: false,
      estimatedTime: "5 min",
      difficulty: "beginner"
    },
    {
      id: "env-config",
      title: t("ENV_SETUP"),
      description: t("ENV_SETUP_DESC"),
      icon: "⚙️",
      color: "text-indigo-600 dark:text-indigo-400",
      gradient: "from-indigo-500 to-purple-500",
      component: <EnvConfiguration />,
      completed: false,
      estimatedTime: "8 min",
      difficulty: "beginner"
    },
    {
      id: "installation",
      title: t("INSTALLATION"),
      description: t("INSTALLATION_DESC"),
      icon: "📚",
      color: "text-green-600 dark:text-green-400",
      gradient: "from-green-500 to-emerald-500",
      component: <InstallationGuide />,
      completed: false,
      estimatedTime: "10 min",
      difficulty: "beginner"
    },
    {
      id: "usage",
      title: t("USAGE_GUIDE"),
      description: t("USAGE_GUIDE_DESC"),
      icon: "🎨",
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500 to-pink-500",
      component: <UsageGuide />,
      completed: false,
      estimatedTime: "15 min",
      difficulty: "intermediate"
    },
    {
      id: "tech-stack",
      title: t("TECH_STACK"),
      description: t("TECH_STACK_DESC"),
      icon: "🔧",
      color: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500 to-red-500",
      component: <TechStack />,
      completed: false,
      estimatedTime: "8 min",
      difficulty: "intermediate"
    },
    {
      id: "monetization",
      title: t("MONETIZATION"),
      description: t("MONETIZATION_DESC"),
      icon: "💰",
      color: "text-yellow-600 dark:text-yellow-400",
      gradient: "from-yellow-500 to-orange-500",
      component: <MonetizationSection />,
      completed: false,
      estimatedTime: "12 min",
      difficulty: "advanced"
    },
    {
      id: "support",
      title: t("SUPPORT"),
      description: t("SUPPORT_DESC"),
      icon: "🆘",
      color: "text-red-600 dark:text-red-400",
      gradient: "from-red-500 to-pink-500",
      component: <Support />,
      completed: false,
      estimatedTime: "3 min",
      difficulty: "beginner"
    }
  ];

  const filteredSteps = navigationSteps.filter(step =>
    step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    step.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSteps = navigationSteps.length;
  const completedCount = completedSteps.size;
  const progressPercentage = (completedCount / totalSteps) * 100;

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const nextStep = () => {
    if (currentStep < navigationSteps.length - 1) {
      markStepCompleted(navigationSteps[currentStep].id);
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);

    // Auto scroll to content section
    setTimeout(() => {
      if (contentSectionRef.current) {
        const yOffset = -80; // Offset to account for fixed progress bar
        const element = contentSectionRef.current;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
      }
    }, 100); // Small delay to allow state to update
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "intermediate": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "advanced": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-[#0a0a0a]/30 dark:text-gray-300";
    }
  };

  const handleScroll = useCallback(() => {
    setShowProgress(window.scrollY > 100);
  }, []);

  useThrottledScroll(handleScroll);

  return (
    <div className="min-h-screen bg-gray-50/40 dark:bg-transparent text-gray-900 dark:text-white">
      {/* Progress Bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0a0a0a]/95 border-b border-gray-200 dark:border-white/6 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                  {t("PROGRESS")}
                </span>
                <div className="w-28 h-1.5 bg-gray-200 dark:bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-theme-primary-500 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                  {completedCount}/{totalSteps}
                </span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                {Math.round(progressPercentage)}% {t("COMPLETE")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <HeroLanding />

      <PageContainer className="py-10">
        {/* Interactive Navigation */}
        <div className="mb-8">
          <div className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/6 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-linear-to-br from-theme-primary-100 to-cyan-100 dark:from-theme-primary-900/30 dark:to-cyan-900/30 rounded-xl shrink-0">
                    <svg className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t("INTERACTIVE_GUIDE")}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("INTERACTIVE_GUIDE_DESC")}
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t("SEARCH_GUIDES_PLACEHOLDER")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/50 focus:border-theme-primary-400"
                  />
                </div>
              </div>
            </div>

            {/* Steps Grid */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredSteps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={`relative p-3.5 rounded-lg border cursor-pointer transition-colors duration-150 group ${
                      currentStep === index
                        ? "border-theme-primary-400 dark:border-theme-primary-500 bg-theme-primary-50 dark:bg-theme-primary-500/8"
                        : completedSteps.has(step.id)
                        ? "border-green-300 dark:border-green-500/30 bg-green-50/60 dark:bg-green-500/5"
                        : "border-gray-200 dark:border-white/6 bg-white dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-50 dark:hover:bg-white/4"
                    }`}
                  >
                    {/* Completion badge */}
                    {completedSteps.has(step.id) && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Icon row */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        currentStep === index
                          ? "bg-theme-primary-500 text-white"
                          : completedSteps.has(step.id)
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400"
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-base leading-none">{step.icon}</span>
                    </div>

                    {/* Content */}
                    <h3 className={`text-xs font-semibold mb-1 leading-snug ${step.color}`}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-2.5">
                      {step.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full leading-none ${getDifficultyColor(step.difficulty)}`}>
                          {step.difficulty}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {step.estimatedTime}
                        </span>
                      </div>
                      {currentStep === index ? (
                        <span className="text-[10px] text-theme-primary-600 dark:text-theme-primary-400 font-semibold">
                          {t("CURRENT")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          View →
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current Step Content */}
        <div ref={contentSectionRef} className="mb-8">
          <div className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/6 shadow-sm overflow-hidden">
            {/* Step Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl bg-linear-to-br ${navigationSteps[currentStep].gradient} shrink-0`}>
                    <span className="text-base leading-none text-white">{navigationSteps[currentStep].icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {navigationSteps[currentStep].title}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("STEP_OF", { current: currentStep + 1, total: totalSteps })}
                    </p>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-white/3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    ← {t("PREVIOUS")}
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={currentStep === totalSteps - 1}
                    className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    {currentStep === totalSteps - 1 ? t("COMPLETE") : `${t("NEXT")} →`}
                  </button>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="p-5">
              {navigationSteps[currentStep].component}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/6 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {t("QUICK_NAVIGATION")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {navigationSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  currentStep === index
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : completedSteps.has(step.id)
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"
                    : "bg-gray-100 dark:bg-white/6 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent"
                }`}
              >
                <span className="text-sm leading-none">{step.icon}</span>
                <span>{step.title}</span>
                {completedSteps.has(step.id) && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
