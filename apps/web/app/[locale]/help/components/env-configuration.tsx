"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";

interface EnvVariable {
  name: string;
  description: string;
  type: "string" | "boolean" | "number" | "url" | "secret";
  required: boolean;
  defaultValue?: string;
  example: string;
  category: "database" | "auth" | "payment" | "email" | "analytics" | "deployment";
  importance: "critical" | "important" | "optional";
}

export function EnvConfiguration() {
  const t = useTranslations("help");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showSecrets, setShowSecrets] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const envVariables: EnvVariable[] = [
    // Database
    {
      name: "DATABASE_URL",
      description: "Connection string for your PostgreSQL database",
      type: "url",
      required: true,
      example: "postgresql://username:password@localhost:5432/database_name",
      category: "database",
      importance: "critical"
    },
    {
      name: "DIRECT_URL",
      description: "Direct database connection for migrations",
      type: "url",
      required: true,
      example: "postgresql://username:password@localhost:5432/database_name",
      category: "database",
      importance: "critical"
    },

    // Authentication
    {
      name: "AUTH_SECRET",
      description: "Secret key for NextAuth.js session encryption",
      type: "secret",
      required: true,
      example: "your-super-secret-key-here",
      category: "auth",
      importance: "critical"
    },
    {
      name: "NEXT_PUBLIC_APP_URL",
      description: "Base URL of your directory website",
      type: "url",
      required: true,
      example: "http://demo.ever.works",
      category: "auth",
      importance: "critical"
    },
    {
      name: "GOOGLE_CLIENT_ID",
      description: "Google OAuth client ID for authentication",
      type: "string",
      required: false,
      example: "123456789-abcdef.apps.googleusercontent.com",
      category: "auth",
      importance: "important"
    },
    {
      name: "GOOGLE_CLIENT_SECRET",
      description: "Google OAuth client secret",
      type: "secret",
      required: false,
      example: "GOCSPX-your-secret-here",
      category: "auth",
      importance: "important"
    },

    // Payment
    {
      name: "STRIPE_SECRET_KEY",
      description: "Stripe secret key for payment processing",
      type: "secret",
      required: false,
      example: "sk_test_...",
      category: "payment",
      importance: "important"
    },
    {
      name: "STRIPE_PUBLISHABLE_KEY",
      description: "Stripe publishable key for client-side",
      type: "string",
      required: false,
      example: "pk_test_...",
      category: "payment",
      importance: "important"
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      description: "Stripe webhook secret for payment events",
      type: "secret",
      required: false,
      example: "whsec_...",
      category: "payment",
      importance: "important"
    },

    // Email
    {
      name: "RESEND_API_KEY",
      description: "Resend API key for email sending",
      type: "secret",
      required: false,
      example: "re_...",
      category: "email",
      importance: "important"
    },
    {
      name: "EMAIL_FROM",
      description: "Default sender email address",
      type: "string",
      required: false,
      example: "info@ever.works",
      category: "email",
      importance: "optional"
    },

    // Analytics
    {
      name: "POSTHOG_API_KEY",
      description: "PostHog API key for analytics",
      type: "string",
      required: false,
      example: "phc_...",
      category: "analytics",
      importance: "optional"
    },
    {
      name: "POSTHOG_HOST",
      description: "PostHog instance URL",
      type: "url",
      required: false,
      defaultValue: "https://app.posthog.com",
      example: "https://app.posthog.com",
      category: "analytics",
      importance: "optional"
    },

    // Deployment
    {
      name: "NODE_ENV",
      description: "Node.js environment mode",
      type: "string",
      required: true,
      defaultValue: "development",
      example: "production",
      category: "deployment",
      importance: "critical"
    },
    {
      name: "VERCEL_URL",
      description: "Vercel deployment URL (auto-set)",
      type: "url",
      required: false,
      example: "https://your-app.vercel.app",
      category: "deployment",
      importance: "optional"
    }
  ];

  const categories = [
    { id: "all", label: "All Variables", count: envVariables.length },
    { id: "database", label: "Database", count: envVariables.filter(v => v.category === "database").length },
    { id: "auth", label: "Authentication", count: envVariables.filter(v => v.category === "auth").length },
    { id: "payment", label: "Payment", count: envVariables.filter(v => v.category === "payment").length },
    { id: "email", label: "Email", count: envVariables.filter(v => v.category === "email").length },
    { id: "analytics", label: "Analytics", count: envVariables.filter(v => v.category === "analytics").length },
    { id: "deployment", label: "Deployment", count: envVariables.filter(v => v.category === "deployment").length }
  ];

  const filteredVariables = selectedCategory === "all" 
    ? envVariables 
    : envVariables.filter(v => v.category === selectedCategory);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(text);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "important": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "optional": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "secret": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "url": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "boolean": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "number": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const generateEnvFile = () => {
    const content = filteredVariables
      .map(v => `${v.name}=${v.example}`)
      .join('\n');
    copyToClipboard(content);
  };

  return (
    <section className="py-20 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <span>⚙️</span>
            {t("ENV_CONFIG_BADGE")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
            {t("ENV_CONFIG_TITLE")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
            {t("ENV_CONFIG_DESC")}
          </p>
        </div>

        {/* Configuration Dashboard */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          {/* Dashboard Header */}
          <div className="bg-linear-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🔧</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t("ENV_CONFIG_BADGE")}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {filteredVariables.length} variables • {filteredVariables.filter(v => v.required).length} required
                  </p>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowSecrets(!showSecrets)}
                  variant="outline"
                  className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {showSecrets ? "Hide" : "Show"} Secrets
                </Button>
                <Button
                  onClick={generateEnvFile}
                  className="bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {t("ENV_CONFIG_GENERATE")}
                </Button>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    selectedCategory === category.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {category.label}
                  <span className="text-xs opacity-75">({category.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Variables List */}
          <div className="p-6">
            <div className="space-y-4">
              {filteredVariables.map((variable) => (
                <div
                  key={variable.name}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                          {variable.name}
                        </h4>
                        {variable.required && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                            {t("ENV_CONFIG_REQUIRED")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(variable.type)}`}>
                        {variable.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImportanceColor(variable.importance)}`}>
                        {variable.importance}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">
                    {variable.description}
                  </p>

                  {/* Example */}
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("ENV_CONFIG_EXAMPLE")}
                      </span>
                      <Button
                        onClick={() => copyToClipboard(`${variable.name}=${variable.example}`)}
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 py-1 h-auto"
                      >
                        {copiedVar === `${variable.name}=${variable.example}` ? t("ENV_CONFIG_COPIED") : t("ENV_CONFIG_COPY")}
                      </Button>
                    </div>
                    <code className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                      {variable.name}={variable.example}
                    </code>
                  </div>

                  {/* Default Value */}
                  {variable.defaultValue && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                      <span className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider mb-1 block">
                        {t("ENV_CONFIG_DEFAULT_VALUE")}
                      </span>
                      <code className="text-sm font-mono text-green-800 dark:text-green-200">
                        {variable.defaultValue}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Setup Guide */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Local Development */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-linear-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">💻</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {t("ENV_CONFIG_LOCAL_DEV")}
              </h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <p>1. Create a <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded-sm">.env.local</code> file in your project root</p>
              <p>2. Copy the required variables from above</p>
              <p>3. Set up your database and other services</p>
              <p>4. Run <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded-sm">pnpm dev</code> to start development</p>
            </div>
          </div>

          {/* Production Deployment */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-linear-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {t("ENV_CONFIG_PRODUCTION")}
              </h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <p>1. Set environment variables in your hosting platform</p>
              <p>2. Ensure all required variables are configured</p>
              <p>3. Use production-grade database and services</p>
              <p>4. Set <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded-sm">NODE_ENV=production</code></p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl p-8 border border-blue-200 dark:border-blue-800">
            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
              {t("ENV_CONFIG_NEED_HELP")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
              {t("ENV_CONFIG_NEED_HELP_DESC")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                {t("ENV_CONFIG_GET_SUPPORT")}
              </Button>
              <Button variant="outline" className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-8 py-3 rounded-xl transition-all duration-300">
                {t("ENV_CONFIG_VIEW_DOCS")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 