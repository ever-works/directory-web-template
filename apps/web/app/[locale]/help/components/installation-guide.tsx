"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface InstallationStep {
  id: string;
  number: string;
  title: string;
  description: string;
  code: string;
  codeLanguage: string;
  icon: string;
  color: string;
  gradient: string;
  estimatedTime: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export function InstallationGuide() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const t = useTranslations("help");

  const installationSteps: InstallationStep[] = [
    {
      id: "clone",
      number: "01",
      title: t("INSTALLATION_STEP1_TITLE"),
      description: t("INSTALLATION_STEP1_DESC"),
      code: `# Clone the repository
git clone https://github.com/ever-co/ever-works-website-template.git

# Navigate to project directory
cd ever-works-website-template

# Verify the setup
ls -la`,
      codeLanguage: "bash",
      icon: "📥",
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
      estimatedTime: "2 min",
      difficulty: "Easy"
    },
    {
      id: "install",
      number: "02",
      title: t("INSTALLATION_STEP2_TITLE"),
      description: t("INSTALLATION_STEP2_DESC"),
      code: `# Using pnpm (recommended)
pnpm install

# Verify installation
pnpm --version`,
      codeLanguage: "bash",
      icon: "📦",
      color: "text-green-600 dark:text-green-400",
      gradient: "from-green-500 to-emerald-500",
      estimatedTime: "3 min",
      difficulty: "Easy"
    },
    {
      id: "env",
      number: "03",
      title: t("INSTALLATION_STEP3_TITLE"),
      description: t("INSTALLATION_STEP3_DESC"),
      code: `# Copy environment file
cp .env.example .env

# Edit with your configuration
nano .env

# Required variables:
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
AUTH_SECRET=your_nextauth_secret`,
      codeLanguage: "env",
      icon: "⚙️",
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500 to-pink-500",
      estimatedTime: "5 min",
      difficulty: "Medium"
    },
    {
      id: "database",
      number: "04",
      title: t("INSTALLATION_STEP4_TITLE"),
      description: t("INSTALLATION_STEP4_DESC"),
      code: `# Generate database schema
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Verify database connection
pnpm db:studio

# Optional: Seed with sample data
pnpm db:seed`,
      codeLanguage: "bash",
      icon: "🗄️",
      color: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500 to-red-500",
      estimatedTime: "4 min",
      difficulty: "Medium"
    },
    {
      id: "dev",
      number: "05",
      title: t("INSTALLATION_STEP5_TITLE"),
      description: t("INSTALLATION_STEP5_DESC"),
      code: `# Start development server
pnpm dev

# Server will be available at:
# http://localhost:3000

# Build for production
pnpm build

# Start production server
pnpm start`,
      codeLanguage: "bash",
      icon: "🚀",
      color: "text-indigo-600 dark:text-indigo-400",
      gradient: "from-indigo-500 to-purple-500",
      estimatedTime: "2 min",
      difficulty: "Easy"
    }
  ];

  const tips = [
    {
      icon: "⚡",
      title: "Use pnpm",
      description: "Faster and more efficient than npm",
      color: "bg-green-500"
    },
    {
      icon: "🔍",
      title: "Check Environment",
      description: "Verify your setup with pnpm check-env",
      color: "bg-blue-500"
    },
    {
      icon: "🔄",
      title: "Hot Reload",
      description: "Development mode with live updates",
      color: "bg-purple-500"
    }
  ];

  const handleStepComplete = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };

  const handleNextStep = () => {
    if (activeStep < installationSteps.length - 1) {
      handleStepComplete(activeStep);
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const progressPercentage = (completedSteps.length / installationSteps.length) * 100;

  return (
    <section className="py-20 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-300 text-sm font-medium mb-6">
            <span>⚡</span>
            {t("INSTALLATION_GUIDE_TITLE")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
            {t("INSTALLATION_GUIDE_SUBTITLE")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
            {t("INSTALLATION_GUIDE_DESC")}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("INSTALLATION_PROGRESS")}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {completedSteps.length} of {installationSteps.length} completed
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div
              className="bg-linear-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Timeline Steps */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {installationSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`relative group cursor-pointer transition-all duration-300 ${activeStep === index ? 'transform scale-105' : 'hover:transform hover:scale-102'
                    }`}
                  onClick={() => setActiveStep(index)}
                >
                  {/* Step Card */}
                  <div className={`relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-xl p-6 border-2 transition-all duration-300 ${activeStep === index
                      ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                      : completedSteps.includes(index)
                        ? 'border-green-500 shadow-lg shadow-green-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}>
                    {/* Step Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-full bg-linear-to-r ${step.gradient} flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform duration-300`}>
                        {completedSteps.includes(index) ? "✓" : step.number}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${step.color}`}>
                          {step.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {step.estimatedTime}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${step.difficulty === "Easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                              step.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}>
                            {step.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl">{step.icon}</div>
                    </div>

                    {/* Step Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Active Indicator */}
                    {activeStep === index && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}

                    {/* Completed Indicator */}
                    {completedSteps.includes(index) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Connection Line */}
                  {index < installationSteps.length - 1 && (
                    <div className="absolute left-6 top-full w-0.5 h-4 bg-slate-300 dark:bg-slate-600"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Code Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
              {/* Code Header */}
              <div className="bg-slate-100 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                      {installationSteps[activeStep].codeLanguage}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      Step {activeStep + 1} of {installationSteps.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {installationSteps[activeStep].estimatedTime}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${installationSteps[activeStep].difficulty === "Easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                          installationSteps[activeStep].difficulty === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                        {installationSteps[activeStep].difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Content */}
              <div className="p-6">
                <pre className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed overflow-x-auto">
                  <code>
                    {installationSteps[activeStep].code.split('\n').map((line, index) => (
                      <div key={index} className="flex">
                        <span className="text-slate-500 dark:text-slate-600 mr-4 select-none w-8 text-right">
                          {index + 1}
                        </span>
                        <span className={
                          line.startsWith('#') ? 'text-slate-500 dark:text-slate-500' :
                            line.includes('pnpm') || line.includes('npm') || line.includes('yarn') ? 'text-green-600 dark:text-green-400' :
                              line.startsWith('git') ? 'text-blue-600 dark:text-blue-400' :
                                line.startsWith('cp') ? 'text-yellow-600 dark:text-yellow-400' :
                                  line.includes('http://') ? 'text-cyan-600 dark:text-cyan-400' :
                                    line.includes('=') ? 'text-purple-600 dark:text-purple-400' :
                                      'text-slate-800 dark:text-slate-200'
                        }>
                          {line}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>

              {/* Navigation */}
              <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handlePrevStep}
                    disabled={activeStep === 0}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleStepComplete(activeStep)}
                      disabled={completedSteps.includes(activeStep)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {completedSteps.includes(activeStep) ? "✓ Completed" : "Mark Complete"}
                    </Button>
                  </div>

                  <Button
                    onClick={handleNextStep}
                    disabled={activeStep === installationSteps.length - 1}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-12 text-slate-900 dark:text-white">
            💡 Quick Tips for Success
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xs rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className={`w-12 h-12 ${tip.color} rounded-lg flex items-center justify-center text-white text-xl mb-4`}>
                  {tip.icon}
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {tip.title}
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-linear-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl p-8 border border-green-200 dark:border-green-800">
            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
              Ready to Launch Your Platform?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
              You&apos;re just a few steps away from having your web platform live and ready for users.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-linear-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Deploy to Production
              </Button>
              <Button variant="outline" className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-8 py-3 rounded-xl transition-all duration-300">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
