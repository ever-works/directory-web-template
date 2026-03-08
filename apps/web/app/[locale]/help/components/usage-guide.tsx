"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface UsageSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  content: {
    type: "code" | "screenshot" | "text" | "terminal";
    value: string;
    language?: string;
    output?: string;
    explanation?: string;
  }[];
  prerequisites: string[];
  nextSteps: string[];
}

export function UsageGuide() {
  const [activeSection, setActiveSection] = useState("creating-items");
  const [activeTab, setActiveTab] = useState("code");
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const t = useTranslations("help");

  const usageSections: UsageSection[] = [
    {
      id: "creating-items",
      title: t("USAGE_CREATING_ITEMS_TITLE"),
      description: t("USAGE_CREATING_ITEMS_DESC"),
      icon: "📝",
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
      difficulty: "Beginner",
      estimatedTime: "10-15 minutes",
      prerequisites: [
        "Basic JavaScript knowledge",
        "API endpoint access",
        "Authentication setup"
      ],
      nextSteps: [
        "Add item validation",
        "Implement file uploads",
        "Set up item categories"
      ],
      content: [
        {
          type: "text",
          value: "Learn how to create and manage items in your platform using our comprehensive API. This guide covers everything from basic item creation to advanced features like custom fields and media uploads.",
          explanation: "This section introduces the core concepts of item management and provides practical examples for implementation."
        },
        {
          type: "code",
          value: `// Example: Creating an item programmatically
import { createItem } from '@/lib/api';

const newItem = await createItem({
  title: "Modern Web Application",
  description: "A powerful application for modern businesses",
  category: "business",
  tags: ["web", "business", "productivity"],
  url: "https://example.com",
  pricing: "premium",
  features: [
    "Real-time collaboration",
    "Advanced analytics",
    "API integration"
  ]
});`,
          language: "typescript",
          output: `✅ Item created successfully!
ID: item_123456789
Title: Modern Web Application
Status: published
Created: 2024-01-15T10:30:00Z`,
          explanation: "This code demonstrates how to create a new item using our API with all necessary fields and metadata."
        },
        {
          type: "terminal",
          value: `npm install @platform/api
npm run dev
curl -X POST /api/items \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Test Item"}'`,
          output: `📦 Installing dependencies...
✅ @platform/api@2.1.0 installed
🚀 Development server started on http://localhost:3000
📡 API request sent successfully
✅ Item created with ID: item_987654321`
        }
      ],
    },
    {
      id: "customizing-design",
      title: t("USAGE_CUSTOMIZING_DESIGN_TITLE"),
      description: t("USAGE_CUSTOMIZING_DESIGN_DESC"),
      icon: "🎨",
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500 to-pink-500",
      difficulty: "Intermediate",
      estimatedTime: "20-30 minutes",
      prerequisites: [
        "CSS/SCSS knowledge",
        "Design system understanding",
        "Theme configuration access"
      ],
      nextSteps: [
        "Create custom components",
        "Implement dark mode",
        "Add animations"
      ],
      content: [
        {
          type: "text",
          value: "Customize your platform's appearance with our flexible theming system. Learn how to modify colors, typography, spacing, and create custom components that match your brand identity.",
          explanation: "This guide covers advanced theming techniques and best practices for maintaining design consistency."
        },
        {
          type: "code",
          value: `// Example: Customizing theme colors
export const customTheme = {
  primary: "#3b82f6",
  secondary: "#10b981",
  accent: "#8b5cf6",
  background: "#ffffff",
  surface: "#f8f9fa",
  text: "#1a1a1a",
  textSecondary: "#6c757d",
};

// Apply theme in your component
function MyComponent() {
  return (
    <div className="bg-theme-primary text-white">
      Custom themed content
    </div>
  );
}`,
          language: "typescript",
          output: `🎨 Theme applied successfully!
Primary: #3b82f6
Secondary: #10b981
Accent: #8b5cf6
✅ Component rendered with custom theme`,
          explanation: "This example shows how to define and apply custom theme colors throughout your application."
        }
      ],
    },
    {
      id: "managing-users",
      title: t("USAGE_MANAGING_USERS_TITLE"),
      description: t("USAGE_MANAGING_USERS_DESC"),
      icon: "👥",
      color: "text-green-600 dark:text-green-400",
      gradient: "from-green-500 to-emerald-500",
      difficulty: "Advanced",
      estimatedTime: "30-45 minutes",
      prerequisites: [
        "Authentication system",
        "Database knowledge",
        "Security best practices"
      ],
      nextSteps: [
        "Implement role-based access",
        "Add user analytics",
        "Set up user notifications"
      ],
      content: [
        {
          type: "text",
          value: "Implement comprehensive user management with role-based access control, user profiles, and advanced security features. This guide covers authentication, authorization, and user lifecycle management.",
          explanation: "Advanced user management requires careful consideration of security, scalability, and user experience."
        },
        {
          type: "code",
          value: `// Example: User role middleware
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // Check user permissions
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  return NextResponse.next();
}`,
          language: "typescript",
          output: `🔐 Middleware configured successfully!
✅ Authentication check enabled
✅ Role-based access control active
✅ Admin routes protected
🛡️ Security headers applied`,
          explanation: "This middleware ensures proper authentication and authorization for different user roles and protected routes."
        }
      ],
    },
    {
      id: "payments-setup",
      title: t("USAGE_PAYMENTS_SETUP_TITLE"),
      description: t("USAGE_PAYMENTS_SETUP_DESC"),
      icon: "💳",
      color: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500 to-red-500",
      difficulty: "Intermediate",
      estimatedTime: "25-35 minutes",
      prerequisites: [
        "Stripe account",
        "Payment processing knowledge",
        "Webhook handling"
      ],
      nextSteps: [
        "Add subscription management",
        "Implement refunds",
        "Set up payment analytics"
      ],
      content: [
        {
          type: "text",
          value: "Set up secure payment processing with Stripe integration. Learn how to handle payments, subscriptions, and implement webhooks for real-time payment status updates.",
          explanation: "Payment integration requires careful attention to security, error handling, and user experience."
        },
        {
          type: "code",
          value: `// Example: Creating a payment intent
import { stripe } from '@/lib/stripe';

export async function createPaymentIntent(amount: number, currency = 'usd') {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency,
    metadata: {
      type: 'platform_subscription',
      plan: 'premium'
    }
  });
  
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
}

// Usage in API route
export async function POST(request: Request) {
  const { amount } = await request.json();
  
  try {
    const { clientSecret } = await createPaymentIntent(amount);
    return Response.json({ clientSecret });
  } catch (error) {
    return Response.json({ error: 'Payment failed' }, { status: 500 });
  }
}`,
          language: "typescript",
          output: `💳 Payment intent created successfully!
Amount: $99.00 USD
Client Secret: pi_3Oq..._secret_abc123
Status: requires_payment_method
✅ Ready for payment processing`,
          explanation: "This code creates a secure payment intent with Stripe and handles the payment flow safely."
        }
      ],
    },
    {
      id: "deployment",
      title: t("USAGE_DEPLOYMENT_TITLE"),
      description: t("USAGE_DEPLOYMENT_DESC"),
      icon: "🚀",
      color: "text-indigo-600 dark:text-indigo-400",
      gradient: "from-indigo-500 to-purple-500",
      difficulty: "Beginner",
      estimatedTime: "15-25 minutes",
      prerequisites: [
        "Git repository",
        "Deployment platform account",
        "Environment variables"
      ],
      nextSteps: [
        "Set up CI/CD pipeline",
        "Configure monitoring",
        "Implement backups"
      ],
      content: [
        {
          type: "text",
          value: "Deploy your platform to production with confidence. This guide covers various deployment options including Vercel, Docker, and manual deployment with best practices for production environments.",
          explanation: "Proper deployment ensures your platform is secure, scalable, and performant in production."
        },
        {
          type: "terminal",
          value: `# Vercel Deployment
npx vercel

# Or with custom domain
npx vercel --prod --alias yourdomain.com

# Docker Deployment
docker build -t my-platform .
docker run -p 3000:3000 my-platform

# Manual deployment
npm run build
npm start`,
          output: `🚀 Deploying to Vercel...
📦 Building project...
✅ Build completed successfully
🌐 Deploying to production...
🔗 https://your-platform.vercel.app
✅ Deployment successful!

🐳 Docker build started...
📦 Creating image: my-platform
✅ Image built successfully
🚀 Container running on port 3000

📦 Building for production...
✅ Build completed
🚀 Server started on port 3000`
        }
      ],
    },
  ];

  const runCode = async () => {
    setIsRunning(true);
    setOutput("Running code...");
    
    // Simulate code execution
    setTimeout(() => {
      const currentSection = usageSections.find(s => s.id === activeSection);
      const currentContent = currentSection?.content.find(c => c.type === "code");
      setOutput(currentContent?.output || "Code executed successfully!");
      setIsRunning(false);
    }, 2000);
  };

  const currentSection = usageSections.find(s => s.id === activeSection);

  return (
    <section className="py-20 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
            <span>📚</span>
            Developer Guide
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
            {t("USAGE_GUIDE_TITLE")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
            {t("USAGE_GUIDE_SUBTITLE")}
          </p>
        </div>

        {/* IDE-like Interface */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          {/* IDE Header */}
          <div className="bg-slate-100 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Window Controls */}
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                
                {/* File Path */}
                <div className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                  docs/usage-guide/{activeSection}.md
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={runCode}
                  disabled={isRunning}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isRunning ? "Running..." : "▶️ Run Code"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar - Section Navigation */}
            <div className="w-80 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">
                  Sections
                </h3>
                <div className="space-y-2">
                  {usageSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-300 ${
                        activeSection === section.id
                          ? "bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-linear-to-r ${section.gradient} flex items-center justify-center text-white text-sm`}>
                          {section.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-white text-sm">
                            {section.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {section.estimatedTime} • {section.difficulty}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              {/* Content Tabs */}
              <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <div className="flex">
                  {["code", "output", "docs"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-3 text-sm font-medium transition-all duration-300 ${
                        activeTab === tab
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {tab === "code" && "💻 Code"}
                      {tab === "output" && "📤 Output"}
                      {tab === "docs" && "📖 Documentation"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "code" && (
                  <div className="space-y-6">
                    {currentSection?.content.map((content, index) => (
                      <div key={index}>
                        {content.type === "text" && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {content.value}
                            </p>
                            {content.explanation && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  <strong>💡 Note:</strong> {content.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {content.type === "code" && (
                          <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-xl">
                            <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              </div>
                              <div className="text-slate-400 text-sm font-mono">
                                {content.language || "code"}
                              </div>
                            </div>
                            <div className="p-4 font-mono text-sm overflow-x-auto">
                              <pre className="text-slate-300 leading-relaxed">
                                <code>
                                  {content.value
                                    .split("\n")
                                    .map((line, lineIndex) => (
                                      <div key={lineIndex} className="flex">
                                        <span className="text-slate-500 mr-4 select-none w-8 text-right">
                                          {lineIndex + 1}
                                        </span>
                                        <span
                                          className={`${
                                            line.trim().startsWith("//") ||
                                            line.trim().startsWith("#")
                                              ? "text-slate-500"
                                              : line.includes("import") ||
                                                line.includes("export")
                                              ? "text-blue-400"
                                              : line.includes("const") ||
                                                line.includes("let") ||
                                                line.includes("var")
                                              ? "text-purple-400"
                                              : line.includes("function") ||
                                                line.includes("async") ||
                                                line.includes("await")
                                              ? "text-green-400"
                                              : line.includes("return")
                                              ? "text-yellow-400"
                                              : "text-slate-300"
                                          }`}
                                        >
                                          {line}
                                        </span>
                                      </div>
                                    ))}
                                </code>
                              </pre>
                            </div>
                          </div>
                        )}

                        {content.type === "terminal" && (
                          <div className="bg-black rounded-lg border border-slate-700 overflow-hidden shadow-xl">
                            <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
                              <div className="flex items-center space-x-2">
                                <span className="text-green-400">●</span>
                                <span className="text-slate-400 text-sm">Terminal</span>
                              </div>
                            </div>
                            <div className="p-4 font-mono text-sm">
                              <div className="text-green-400 mb-2">$ {content.value}</div>
                              <div className="text-slate-300">{content.output}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "output" && (
                  <div className="bg-black rounded-lg border border-slate-700 p-4 font-mono text-sm">
                    <div className="text-green-400 mb-2">$ Output:</div>
                    <div className="text-slate-300 whitespace-pre-wrap">
                      {output || "No output available. Run the code to see results."}
                    </div>
                  </div>
                )}

                {activeTab === "docs" && (
                  <div className="space-y-6">
                    {/* Prerequisites */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="text-blue-600">📋</span>
                        Prerequisites
                      </h4>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <ul className="space-y-2">
                          {currentSection?.prerequisites.map((prereq, index) => (
                            <li key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {prereq}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Next Steps */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="text-green-600">🚀</span>
                        Next Steps
                      </h4>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <ul className="space-y-2">
                          {currentSection?.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="mt-16">
          <div className="bg-linear-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8 border border-indigo-200 dark:border-indigo-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              {t("USAGE_BEST_PRACTICES_TITLE")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {t("USAGE_BEST_PRACTICE_1_TITLE")}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {t("USAGE_BEST_PRACTICE_1_DESC")}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-white text-lg">🔒</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {t("USAGE_BEST_PRACTICE_2_TITLE")}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {t("USAGE_BEST_PRACTICE_2_DESC")}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-white text-lg">⚡</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {t("USAGE_BEST_PRACTICE_3_TITLE")}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {t("USAGE_BEST_PRACTICE_3_DESC")}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-white text-lg">📊</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {t("USAGE_BEST_PRACTICE_4_TITLE")}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {t("USAGE_BEST_PRACTICE_4_DESC")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
