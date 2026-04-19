"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { PageContainer } from "@/components/ui/container";

export function HeroLanding() {
  const t = useTranslations('help');
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // Auto-rotate features
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: "⚡",
      title: t('HERO_FEATURE_1_TITLE'),
      description: t('HERO_FEATURE_1_DESC'),
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: "🎨",
      title: t('HERO_FEATURE_2_TITLE'),
      description: t('HERO_FEATURE_2_DESC'),
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: "🚀",
      title: t('HERO_FEATURE_3_TITLE'),
      description: t('HERO_FEATURE_3_DESC'),
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const stats = [
    { number: "10k+", label: t('HERO_STATS_USERS') },
    { number: "50+", label: t('HERO_STATS_COUNTRIES') },
    { number: "99.9%", label: t('HERO_STATS_UPTIME') }
  ];

  const handleGetStarted = () => {
    // Scroll to next section or navigate
    const element = document.getElementById('features-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Show loading skeleton until mounted
  if (!mounted) {
    return (
      <div>
        <PageContainer className="flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-white/8 rounded-sm w-96 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-white/8 rounded-sm w-64"></div>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div>
      <PageContainer>
        <div className="grid lg:grid-cols-2 gap-12 items-center py-10">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-white/3 backdrop-blur-xs border border-slate-200 dark:border-white/6 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-700 opacity-100 translate-y-0">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {t('HERO_BADGE_TEXT')}
        </div>

            {/* Main Heading */}
            <div className="space-y-6 transition-all duration-700 delay-200 opacity-100 translate-y-0">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                {t('HERO_MAIN_TITLE')}
                <span className="block bg-linear-to-r from-theme-primary-600 via-theme-primary-500 to-theme-primary-400 dark:from-theme-primary-400 dark:via-theme-primary-500 dark:to-theme-primary-600 bg-clip-text text-transparent">
                  {t('HERO_MAIN_TITLE_HIGHLIGHT')}
            </span>
          </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                {t('HERO_SUBTITLE')}
              </p>
          </div>

            {/* Feature Showcase */}
            <div className="space-y-4 transition-all duration-700 delay-400 opacity-100 translate-y-0">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 cursor-pointer ${
                    activeFeature === index
                      ? 'bg-white dark:bg-white/6 border border-slate-200 dark:border-white/8'
                      : 'hover:bg-slate-50 dark:hover:bg-white/4'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className={`w-10 h-10 rounded-lg bg-linear-to-r ${feature.gradient} flex items-center justify-center text-white text-base`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                  {activeFeature === index && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGetStarted}
                className="h-10 px-5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                {t('HERO_CTA_PRIMARY')}
              </button>
              <button
                className="h-10 px-5 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors"
              >
                {t('HERO_CTA_SECONDARY')}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200 dark:border-white/6 transition-all duration-700 delay-800 opacity-100 translate-y-0">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.number}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </div>
              </div>
              ))}
            </div>
          </div>

          {/* Right Column - Visual Demo */}
          <div className="relative transition-all duration-700 delay-1000 opacity-100 translate-y-0">
            {/* Main Demo Container */}
            <div className="bg-white dark:bg-white/3 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-white/6">
                {/* Browser Header */}
              <div className="flex items-center gap-3 mb-6">
                  <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-white/8 rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                  demo.ever.works
                  </div>
                    </div>

              {/* Demo Content */}
              <div className="space-y-6">
                {/* Hero Section */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs text-blue-700 dark:text-blue-300">
                    <span>✨</span>
                    {t('HERO_DEMO_BADGE')}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t('HERO_DEMO_TITLE')}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {t('HERO_DEMO_DESCRIPTION')}
                  </p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { icon: "🎯", title: t('HERO_DEMO_FEATURE_1'), color: "bg-blue-500" },
                    { icon: "⚡", title: t('HERO_DEMO_FEATURE_2'), color: "bg-purple-500" },
                    { icon: "🚀", title: t('HERO_DEMO_FEATURE_3'), color: "bg-orange-500" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/4 rounded-lg hover:bg-slate-100 dark:hover:bg-white/6 transition-colors">
                      <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                        {item.icon}
                    </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button className="w-full h-9 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                  {t('HERO_DEMO_CTA')}
                </button>
              </div>
            </div>


          </div>
        </div>
      </PageContainer>
    </div>
  );
} 