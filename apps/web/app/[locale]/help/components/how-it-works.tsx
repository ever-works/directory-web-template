"use client";

import { useState, type ComponentType } from "react";
import { useTranslations } from 'next-intl';
import { Settings, Target, Rocket, Zap, Lock, Smartphone, Palette } from "lucide-react";
interface Step {
  id: string;
  number: string;
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  code: string;
  codeLanguage: string;
  features: string[];
}

export function HowItWorks() {
  const t = useTranslations('help');
  const [activeStep, setActiveStep] = useState(0);
  
  const steps: Step[] = [
    {
      id: "setup",
      number: "01",
      title: t('HOW_IT_WORKS_STEP1_TITLE'),
      description: t('HOW_IT_WORKS_STEP1_DESC'),
      Icon: Settings,
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
      codeLanguage: "bash",
      code: `# Clone the repository
git clone https://github.com/your-username/ever-works.git

# Navigate to project directory
cd ever-works

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env`,
      features: [
        t('STEP1_FEATURE_1'),
        t('STEP1_FEATURE_2'),
        t('STEP1_FEATURE_3'),
        t('STEP1_FEATURE_4')
      ]
    },
    {
      id: "configure",
      number: "02", 
      title: t('HOW_IT_WORKS_STEP2_TITLE'),
      description: t('HOW_IT_WORKS_STEP2_DESC'),
      Icon: Target,
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500 to-pink-500",
      codeLanguage: "env",
      code: `# Core Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database Setup
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Authentication
AUTH_SECRET=your_auth_secret

# External Services
RESEND_API_KEY=your_resend_key
STRIPE_PUBLIC_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret`,
      features: [
        t('STEP2_FEATURE_1'),
        t('STEP2_FEATURE_2'),
        t('STEP2_FEATURE_3'),
        t('STEP2_FEATURE_4')
      ]
    },
    {
      id: "deploy",
      number: "03",
      title: t('HOW_IT_WORKS_STEP3_TITLE'),
      description: t('HOW_IT_WORKS_STEP3_DESC'),
      Icon: Rocket,
      color: "text-green-600 dark:text-green-400",
      gradient: "from-green-500 to-emerald-500",
      codeLanguage: "bash",
      code: `# Start development server
pnpm dev

# Or deploy to production
pnpm build
pnpm start

# Deploy to Vercel (recommended)
vercel --prod`,
      features: [
        t('STEP3_FEATURE_1'),
        t('STEP3_FEATURE_2'),
        t('STEP3_FEATURE_3'),
        t('STEP3_FEATURE_4')
      ]
    }
  ];

  const benefits = [
    {
      Icon: Zap,
      title: t('BENEFITS_FAST_TITLE'),
      description: t('BENEFITS_FAST_DESC')
    },
    {
      Icon: Lock,
      title: t('BENEFITS_SECURE_TITLE'),
      description: t('BENEFITS_SECURE_DESC')
    },
    {
      Icon: Smartphone,
      title: t('BENEFITS_MOBILE_TITLE'),
      description: t('BENEFITS_MOBILE_DESC')
    },
    {
      Icon: Palette,
      title: t('BENEFITS_CUSTOMIZABLE_TITLE'),
      description: t('BENEFITS_CUSTOMIZABLE_DESC')
    }
  ];

  return (
    <div>
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">{t('HOW_IT_WORKS_TITLE')}</p>
            <h2 className="text-2xl font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">
                {t('HOW_IT_WORKS_SUBTITLE')}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-2xl leading-relaxed">
                {t('HOW_IT_WORKS_DESCRIPTION')}
              </p>
          </div>

        {/* Interactive Steps */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
              {steps.map((step, index) => (
                <div
              key={step.id}
              className="relative group cursor-pointer"
              onClick={() => setActiveStep(index)}
                >
              {/* Step Card */}
              <div className={`relative bg-white dark:bg-white/3 rounded-xl p-6 border transition-colors duration-200 ${
                activeStep === index
                  ? 'border-neutral-900/20 dark:border-white/20'
                  : 'border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8'
              }`}>
                {/* Step Number */}
                <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white dark:text-neutral-400 font-bold text-sm mb-4">
                  {step.number}
                </div>

                {/* Step Icon */}
                <div className="w-7 h-7 flex items-center justify-center mb-3">
                  <step.Icon className="w-4 h-4 text-neutral-700 dark:text-neutral-400" />
                </div>

                {/* Step Content */}
                <h3 className="text-sm font-semibold mb-1.5 text-neutral-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Features List */}
                <div className="space-y-2">
                  {step.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
                      {feature}
                    </div>
                  ))}
                  </div>


                  </div>
                </div>
              ))}
            </div>

        {/* Code Preview */}
        <div className="mb-12">
          <div className="bg-white dark:bg-white/3 rounded-xl border border-slate-200 dark:border-white/6 shadow-sm overflow-hidden">
            {/* Code Header */}
            <div className="bg-slate-100 dark:bg-[#0a0a0a] px-6 py-4 border-b border-slate-200 dark:border-white/6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                      <div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                      <div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                      <div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                    </div>
                  <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                    {steps[activeStep].codeLanguage}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    Step {activeStep + 1} of {steps.length}
                  </span>
                </div>
                  </div>
                  </div>

                  {/* Code Content */}
            <div className="p-6">
              <pre className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed overflow-x-auto">
                      <code>
                  {steps[activeStep].code.split('\n').map((line, index) => (
                          <div key={index} className="flex">
                      <span className="text-slate-500 dark:text-slate-600 mr-4 select-none w-8 text-right">
                        {index + 1}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200">
                              {line}
                            </span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

        {/* Benefits Grid */}
        <div className="mb-12">
          <h3 className="text-sm font-semibold mb-4 text-neutral-900 dark:text-white">
            {t('WHY_CHOOSE_PLATFORM')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"
              >
                <div className="w-7 h-7 flex items-center justify-center mb-3">
                  <benefit.Icon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                  {benefit.title}
                </h4>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
              </div>
            </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gray-50 dark:bg-white/3 rounded-xl p-8 border border-gray-100 dark:border-white/6">
            <h3 className="text-base font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">
              {t('READY_TO_GET_STARTED')}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-5 max-w-xl mx-auto">
              {t('JOIN_DEVELOPERS_DESC')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="h-9 px-4 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                {t('START_BUILDING_NOW')}
              </button>
              <button className="h-9 px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors">
                {t('VIEW_DOCUMENTATION')}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
} 