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
import { Button } from "@/components/ui/button";

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
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const handleScroll = useCallback(() => {
    setShowProgress(window.scrollY > 100);
  }, []);

  useThrottledScroll(handleScroll);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-black text-slate-900 dark:text-white transition-all duration-300">
      {/* Progress Bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("PROGRESS")}: {completedCount}/{totalSteps}
                </span>
                <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-linear-to-r from-theme-primary-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {Math.round(progressPercentage)}% {t("COMPLETE")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <HeroLanding />
      <PageContainer className="py-12">
        {/* Interactive Navigation */}
        <div className="mb-16">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-linear-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-linear-to-r from-theme-primary-500 to-theme-primary-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">📋</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {t("INTERACTIVE_GUIDE")}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t("INTERACTIVE_GUIDE_DESC")}
                    </p>
                  </div>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t("SEARCH_GUIDES_PLACEHOLDER")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 px-4 py-2 pl-10 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                </div>
              </div>
            </div>

            {/* Steps Grid */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSteps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:transform hover:scale-105 hover:shadow-lg group ${
                      currentStep === index
                        ? "border-theme-primary-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/25"
                        : completedSteps.has(step.id)
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {/* Completion Check */}
                    {completedSteps.has(step.id) && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}

                    {/* Step Number */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        currentStep === index
                          ? "bg-theme-primary-500 text-white"
                          : completedSteps.has(step.id)
                          ? "bg-green-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}>
                        {index + 1}
                      </div>
                      <div className={`w-8 h-8 rounded-lg bg-linear-to-r ${step.gradient} flex items-center justify-center text-white text-base shadow-lg`}>
                        {step.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className={`font-bold text-base mb-1 ${step.color}`}>
                        {step.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-xs mb-2 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getDifficultyColor(step.difficulty)}`}>
                            {step.difficulty}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ⏱️ {step.estimatedTime}
                          </span>
                        </div>
                        {currentStep === index ? (
                          <span className="text-xs text-theme-primary-600 dark:text-theme-primary-400 font-medium">
                            {t("CURRENT")}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            📍 Click to view
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current Step Content */}
        <div ref={contentSectionRef} className="mb-16">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            {/* Step Header */}
            <div className="bg-linear-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-linear-to-r ${navigationSteps[currentStep].gradient} flex items-center justify-center text-white text-xl shadow-lg`}>
                    {navigationSteps[currentStep].icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {navigationSteps[currentStep].title}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      {t("STEP_OF", { current: currentStep + 1, total: totalSteps })}
                    </p>
                  </div>
                </div>
                
                {/* Navigation Controls */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    variant="outline"
                    className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    ← {t("PREVIOUS")}
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={currentStep === totalSteps - 1}
                    className="bg-linear-to-r from-theme-primary-500 to-theme-primary-600 hover:from-theme-primary-600 hover:to-theme-primary-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  >
                    {currentStep === totalSteps - 1 ? t("COMPLETE") : `${t("NEXT")} →`}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6">
              {navigationSteps[currentStep].component}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {t("QUICK_NAVIGATION")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {navigationSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:transform hover:scale-105 ${
                  currentStep === index
                    ? "bg-theme-primary-600 text-white shadow-lg shadow-blue-500/25"
                    : completedSteps.has(step.id)
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <span>{step.icon}</span>
                {step.title}
                {completedSteps.has(step.id) && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
