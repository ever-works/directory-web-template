"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";

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

  const handleStepClick = (stepIndex: number) => {
    setIsAnimating(true);
    setActiveStep(stepIndex);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < activeStep) return "completed";
    if (stepIndex === activeStep) return "active";
    return "pending";
  };

  return (
    <div className="mt-12 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-black rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
          <span>🔄</span>
          {t('PROCESS_OVERVIEW_BADGE')}
        </div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          {t('HOW_IT_WORKS_PROCESS_TITLE')}
      </h3>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
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
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-linear-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        
        <div className="space-y-8">
          {processSteps.map((step, index) => {
            const status = getStepStatus(index);
            const isActive = index === activeStep;
            
            return (
              <div
                key={step.id}
                className={`relative group cursor-pointer transition-all duration-300 ${
                  isActive ? 'transform scale-105' : 'hover:transform hover:scale-102'
                }`}
                onClick={() => handleStepClick(index)}
              >
                {/* Timeline Node */}
                <div className={`absolute left-6 top-6 w-4 h-4 rounded-full border-4 transition-all duration-300 z-10 ${
                  status === "completed" 
                    ? "bg-green-500 border-green-500 shadow-lg shadow-green-500/50" 
                    : status === "active"
                    ? "bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/50 animate-pulse"
                    : "bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600"
                }`}></div>

                {/* Step Card */}
                <div className={`ml-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-2xl p-6 border-2 transition-all duration-300 ${
                  isActive
                    ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-linear-to-r ${step.gradient} flex items-center justify-center text-white text-xl shadow-lg`}>
                        {step.icon}
          </div>
                      <div>
                        <h4 className={`text-lg font-bold mb-1 ${step.color}`}>
                          {step.title}
          </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
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
                    <div className={`mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 transition-all duration-300 ${
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
                      <div className="flex gap-3 mt-6">
                        <Button className="bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                          Start This Step
                        </Button>
                        <Button variant="outline" className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-6 py-2 rounded-xl transition-all duration-300">
                          View Documentation
                        </Button>
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
        <div className="bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl p-8 border border-blue-200 dark:border-blue-800">
          <h4 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
            Ready to Get Started?
          </h4>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
            Follow our step-by-step process and have your platform running in under 2 hours
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              Begin Setup Process
            </Button>
            <Button variant="outline" className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-8 py-3 rounded-xl transition-all duration-300">
              Download Guide PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

