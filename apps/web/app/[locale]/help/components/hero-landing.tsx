"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from 'next-intl';
import { Zap, Paintbrush, Rocket, Target } from "lucide-react";
import { PageContainer } from "@/components/ui/container";

export function HeroLanding() {
  const t = useTranslations('help');
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 4000;
  const TICK = 50;

  const startCycle = () => {
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += TICK;
      setProgress(Math.min((elapsed / DURATION) * 100, 100));
      if (elapsed >= DURATION) {
        elapsed = 0;
        setProgress(0);
        setActiveFeature((prev) => (prev + 1) % 3);
      }
    }, TICK);
  };

  useEffect(() => {
    setMounted(true);
    startCycle();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleSelectFeature = (index: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);
    setActiveFeature(index);
    startCycle();
  };

  const features = [
    {
      icon: Zap,
      title: t('HERO_FEATURE_1_TITLE'),
      description: t('HERO_FEATURE_1_DESC'),
      color: "bg-neutral-900 dark:bg-white/10 text-white dark:text-neutral-400",
    },
    {
      icon: Paintbrush,
      title: t('HERO_FEATURE_2_TITLE'),
      description: t('HERO_FEATURE_2_DESC'),
      color: "bg-neutral-900 dark:bg-white/10 text-white dark:text-neutral-400",
    },
    {
      icon: Rocket,
      title: t('HERO_FEATURE_3_TITLE'),
      description: t('HERO_FEATURE_3_DESC'),
      color: "bg-neutral-900 dark:bg-white/10 text-white dark:text-neutral-400",
    }
  ];

  const stats = [
    { number: "10k+", label: t('HERO_STATS_USERS') },
    { number: "50+", label: t('HERO_STATS_COUNTRIES') },
    { number: "99.9%", label: t('HERO_STATS_UPTIME') }
  ];

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4 py-10">
        <div className="h-5 bg-neutral-200 dark:bg-white/8 rounded w-32" />
        <div className="h-10 bg-neutral-200 dark:bg-white/8 rounded w-3/4" />
        <div className="h-4 bg-neutral-200 dark:bg-white/8 rounded w-1/2" />
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="grid lg:grid-cols-2 gap-16 items-center py-12">

        {/* ── Left column ── */}
        <div className="space-y-8">

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/8 rounded-full">
            <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t('HERO_BADGE_TEXT')}</span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
              {t('HERO_MAIN_TITLE')}
              <span className="block text-neutral-500 dark:text-neutral-400 mt-1">
                {t('HERO_MAIN_TITLE_HIGHLIGHT')}
              </span>
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-lg">
              {t('HERO_SUBTITLE')}
            </p>
          </div>

          {/* Feature carousel */}
          <div className="space-y-1">
            {features.map((feature, index) => {
              const isActive = activeFeature === index;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectFeature(index)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-neutral-100 dark:bg-white/5'
                      : 'hover:bg-neutral-50 dark:hover:bg-white/3'
                  }`}
                >
                  {/* Active indicator bar */}
                  <div className="relative flex flex-col items-center mt-0.5 shrink-0">
                    <div className={`w-0.5 h-full rounded-full overflow-hidden ${isActive ? 'bg-neutral-200 dark:bg-white/10' : 'bg-transparent'}`} style={{ minHeight: '40px' }}>
                      {isActive && (
                        <div
                          className="w-full bg-neutral-900 dark:bg-white rounded-full transition-none"
                          style={{ height: `${progress}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 transition-colors ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-colors ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        {feature.title}
                      </p>
                      <p className="text-xs leading-relaxed mt-0.5 transition-all duration-300 overflow-hidden text-neutral-500 dark:text-neutral-400 max-h-10 opacity-100">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('features-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-9 px-4 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors"
            >
              {t('HERO_CTA_PRIMARY')}
            </button>
            <button className="h-9 px-4 text-sm font-medium border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
              {t('HERO_CTA_SECONDARY')}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-neutral-100 dark:border-white/6">
            {stats.map((stat, index) => (
              <div key={index}>
                <p className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{stat.number}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column — mock browser ── */}
        <div className="relative hidden lg:block">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/8 shadow-sm overflow-hidden">

            {/* Browser chrome */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-white/6 bg-neutral-50 dark:bg-white/3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                <div className="w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                <div className="w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
              </div>
              <div className="flex-1 bg-neutral-100 dark:bg-white/6 rounded-md px-3 py-1 text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                demo.ever.works
              </div>
            </div>

            {/* Mock page content */}
            <div className="p-6 space-y-5">

              {/* Page header */}
              <div className="text-center space-y-2">
                <span className="inline-block px-2.5 py-1 bg-neutral-100 dark:bg-white/8 text-neutral-600 dark:text-neutral-400 text-xs font-medium rounded-full">
                  {t('HERO_DEMO_BADGE')}
                </span>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight">
                  {t('HERO_DEMO_TITLE')}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('HERO_DEMO_DESCRIPTION')}
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-2">
                {[
                  { Icon: Target, title: t('HERO_DEMO_FEATURE_1'), accent: "bg-neutral-900 dark:bg-white/30" },
                  { Icon: Zap, title: t('HERO_DEMO_FEATURE_2'), accent: "bg-neutral-700 dark:bg-white/20" },
                  { Icon: Rocket, title: t('HERO_DEMO_FEATURE_3'), accent: "bg-neutral-500 dark:bg-white/15" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-neutral-50 dark:bg-white/3 rounded-lg border border-neutral-100 dark:border-white/5">
                    <div className={`w-6 h-6 ${item.accent} rounded-md flex items-center justify-center shrink-0`}>
                      <item.Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{item.title}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button className="w-full h-8 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors">
                {t('HERO_DEMO_CTA')}
              </button>
            </div>
          </div>
        </div>

      </div>
    </PageContainer>
  );
} 