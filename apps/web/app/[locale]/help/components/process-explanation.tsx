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
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
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
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
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
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
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
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
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
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">{t('PROCESS_OVERVIEW_BADGE')}</p>
        <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white mb-2">
          {t('HOW_IT_WORKS_PROCESS_TITLE')}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          {t('PROCESS_OVERVIEW_SUBTITLE') || 'Follow our proven 4-step process to get your platform up and running quickly'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Overall Progress
          </span>
          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-white/8 rounded-full h-1 overflow-hidden">
          <div 
            className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-200 dark:bg-white/8 rounded-full"></div>
        
        <div className="space-y-5">
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
                    ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white" 
                    : status === "active"
                    ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"
                    : "bg-slate-300 dark:bg-white/1 border-slate-300 dark:border-white/8"
                }`}></div>

                {/* Step Card */}
                <div className={`ml-16 bg-white dark:bg-white/3 rounded-lg p-4 border transition-colors duration-200 ${
                  isActive
                    ? 'border-neutral-900/20 dark:border-white/20'
                    : 'border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-sm`}>
                        {step.icon}
          </div>
                      <div>
                        <h4 className={`text-sm font-semibold mb-1 text-neutral-900 dark:text-white`}>
                          {step.title}
          </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-400">
                            {step.duration}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            step.complexity === "Simple" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300" :
                            step.complexity === "Moderate" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300" :
                            "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"
                          }`}>
                            {step.complexity}
                          </span>
                        </div>
                      </div>
                    </div>
                    {status === "completed" && (
                      <div className="w-6 h-6 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-3 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Active Step Details */}
                  {isActive && (
                    <div className={`mt-4 pt-4 border-t border-slate-200 dark:border-white/6 transition-all duration-300 ${
                      isAnimating ? 'animate-fade-in' : ''
                    }`}>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Requirements */}
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <span>📋</span>
                            Requirements
                          </h5>
                          <ul className="space-y-2">
                            {step.requirements.map((req, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Tips */}
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <span>💡</span>
                            Pro Tips
                          </h5>
                          <ul className="space-y-2">
                            {step.tips.map((tip, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
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
      <div className="mt-8 text-center">
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
