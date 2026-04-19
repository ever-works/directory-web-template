"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from 'next-intl';

interface ProcessStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  duration: string;
  complexity: "Simple" | "Moderate" | "Advanced";
  requirements: string[];
  tips: string[];
  status: "pending" | "active" | "completed";
}

export const ProcessExplanation = () => {
  const t = useTranslations('help');
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processSteps: ProcessStep[] = [
    {
      id: 1,
      title: t('HOW_IT_WORKS_PROCESS_STEP1'),
      description: t('HOW_IT_WORKS_PROCESS_STEP1_DESC'),
      icon: "🚀",
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
      duration: "5-10 minutes",
      complexity: "Simple",
      requirements: [
        "Git repository access",
        "Node.js installed",
        "Basic terminal knowledge"
      ],
      tips: [
        "Ensure you have the latest Node.js version",
        "Check your internet connection",
        "Have your project details ready"
      ],
      status: "completed"
    },
    {
      id: 2,
      title: t('HOW_IT_WORKS_PROCESS_STEP2'),
      description: t('HOW_IT_WORKS_PROCESS_STEP2_DESC'),
      icon: "⚙️",
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500 to-pink-500",
      duration: "15-30 minutes",
      complexity: "Moderate",
      requirements: [
        "Environment variables setup",
        "Database configuration",
        "API keys preparation"
      ],
      tips: [
        "Follow the configuration guide step by step",
        "Test each integration individually",
        "Keep your API keys secure"
      ],
      status: "active"
    },
    {
      id: 3,
      title: t('HOW_IT_WORKS_PROCESS_STEP3'),
      description: t('HOW_IT_WORKS_PROCESS_STEP3_DESC'),
      icon: "🎨",
      color: "text-green-600 dark:text-green-400",
      gradient: "from-green-500 to-emerald-500",
      duration: "30-60 minutes",
      complexity: "Moderate",
      requirements: [
        "Design assets ready",
        "Brand guidelines",
        "Content strategy"
      ],
      tips: [
        "Use high-quality images",
        "Maintain brand consistency",
        "Optimize for mobile devices"
      ],
      status: "pending"
    },
    {
      id: 4,
      title: t('HOW_IT_WORKS_PROCESS_STEP4'),
      description: t('HOW_IT_WORKS_PROCESS_STEP4_DESC'),
      icon: "🚀",
      color: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500 to-red-500",
      duration: "10-20 minutes",
      complexity: "Simple",
      requirements: [
        "Domain configuration",
        "SSL certificate",
        "Performance optimization"
      ],
      tips: [
        "Enable HTTPS for security",
        "Set up monitoring tools",
        "Configure backup systems"
      ],
      status: "pending"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleStepClick = (stepIndex: number) => {
    setIsAnimating(true);
    setActiveStep(stepIndex);
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, 300);
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < activeStep) return "completed";
    if (stepIndex === activeStep) return "active";
    return "pending";
  };

  return (
    <div className="mt-8 rounded-xl p-6 border border-slate-200 dark:border-white/6 bg-white dark:bg-white/3">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">{t('PROCESS_OVERVIEW_BADGE')}</p>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {t('HOW_IT_WORKS_PROCESS_TITLE')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Follow our proven 4-step process to get your platform up and running quickly
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Overall Progress
          </span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {Math.round(progress)}%
          </span>
          </div>
        <div className="w-full bg-slate-200 dark:bg-white/8 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-theme-primary-500 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-200 dark:bg-white/8 rounded-full"></div>
        
        <div className="space-y-8">
          {processSteps.map((step, index) => {
            const status = getStepStatus(index);
            const isActive = index === activeStep;
            
            return (
              <div
                key={step.id}
                className="relative group cursor-pointer"
                onClick={() => handleStepClick(index)}
              >
                {/* Timeline Node */}
                <div className={`absolute left-6 top-6 w-4 h-4 rounded-full border-4 transition-all duration-300 z-10 ${
                  status === "completed" 
                    ? "bg-green-500 border-green-500 shadow-lg shadow-green-500/50" 
                    : status === "active"
                    ? "bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/50 animate-pulse"
                    : "bg-slate-300 dark:bg-white/1 border-slate-300 dark:border-white/8"
                }`}></div>

                {/* Step Card */}
                <div className={`ml-16 bg-white dark:bg-white/3 rounded-xl p-5 border transition-colors duration-200 ${
                  isActive
                    ? 'border-blue-500 dark:border-blue-500'
                    : 'border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-linear-to-r ${step.gradient} flex items-center justify-center text-white text-base`}>
                        {step.icon}
          </div>
                      <div>
                        <h4 className={`text-lg font-bold mb-1 ${step.color}`}>
                          {step.title}
          </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-400">
                            {step.duration}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            step.complexity === "Simple" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                            step.complexity === "Moderate" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}>
                            {step.complexity}
                          </span>
                        </div>
                      </div>
                    </div>
                    {status === "completed" && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Active Step Details */}
                  {isActive && (
                    <div className={`mt-6 pt-6 border-t border-slate-200 dark:border-white/6 transition-all duration-300 ${
                      isAnimating ? 'animate-fade-in' : ''
                    }`}>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Requirements */}
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <span className="text-blue-600">📋</span>
                            Requirements
                          </h5>
                          <ul className="space-y-2">
                            {step.requirements.map((req, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Tips */}
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <span className="text-green-600">💡</span>
                            Pro Tips
                          </h5>
                          <ul className="space-y-2">
                            {step.tips.map((tip, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-5">
                        <button className="h-8 px-3 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                          Start This Step
                        </button>
                        <button className="h-8 px-3 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-white/6 transition-colors">
                          View Documentation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center">
        <div className="bg-gray-50 dark:bg-white/3 rounded-xl p-6 border border-gray-100 dark:border-white/6">
          <h4 className="text-base font-semibold mb-2 text-slate-900 dark:text-white">
            Ready to Get Started?
          </h4>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 max-w-2xl mx-auto">
            Follow our step-by-step process and have your platform running in under 2 hours
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="h-9 px-4 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
              Begin Setup Process
            </button>
            <button className="h-9 px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors">
              Download Guide PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
