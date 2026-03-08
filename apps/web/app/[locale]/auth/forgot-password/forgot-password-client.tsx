"use client";

import {
  Mail,
  ArrowLeft,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useConfig } from "../../config";
import { useActionState } from "react";
import { Button } from "@heroui/react";
import { ActionState } from "@/lib/auth/middleware";
import { forgotPassword } from "../actions";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPageClient() {
  const config = useConfig();
  const t = useTranslations("common");
  const tForgot = useTranslations("admin.FORGOT_PASSWORD_PAGE");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    forgotPassword,
    {}
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-theme-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-theme-accent/5 rounded-full blur-3xl animate-pulse-subtle animation-delay-2000" />
      </div>

      {/* Geometric decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-4 h-4 bg-theme-primary/20 rounded-full animate-bounce" />
        <div
          className="absolute top-20 right-20 w-3 h-3 bg-theme-accent/30 rounded-full animate-bounce"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute bottom-20 left-20 w-5 h-5 bg-theme-secondary/20 rounded-full animate-bounce"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main container with modern design */}
      <div className="w-full max-w-5xl mx-auto rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-2xl overflow-hidden">      
        <div className="flex flex-col lg:flex-row min-h-[500px]">
          {/* Illustration and branding side */}
          <div className="w-full lg:w-1/2 relative bg-linear-to-br from-theme-primary/5 via-theme-accent/5 to-theme-secondary/5 p-8 lg:p-12 flex flex-col justify-center">
            {/* Password recovery illustration */}
            <div className="flex-1 flex items-center justify-center mb-8 lg:mb-0">
              <div className="relative w-full max-w-sm">
                <svg
                  viewBox="0 0 400 300"
                  className="w-full h-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background elements */}
                  <circle
                    cx="320"
                    cy="80"
                    r="60"
                    fill="var(--theme-primary-100)"
                    opacity="0.3"
                  />
                  <circle
                    cx="80"
                    cy="220"
                    r="40"
                    fill="var(--theme-accent-100)"
                    opacity="0.4"
                  />

                  {/* Key and lock illustration */}
                  <rect
                    x="150"
                    y="120"
                    width="100"
                    height="80"
                    rx="8"
                    fill="var(--theme-primary-200)"
                    opacity="0.2"
                  />
                  <circle
                    cx="200"
                    cy="100"
                    r="25"
                    fill="var(--theme-primary)"
                    opacity="0.1"
                  />
                  <path
                    d="M185 85 L200 75 L215 85 L215 105 C215 115 210 125 200 125 C190 125 185 115 185 105 Z"
                    fill="var(--theme-primary)"
                  />
                  <circle cx="200" cy="95" r="4" fill="white" />

                  {/* Key */}
                  <rect
                    x="160"
                    y="160"
                    width="80"
                    height="8"
                    rx="4"
                    fill="var(--theme-accent)"
                  />
                  <circle cx="170" cy="164" r="12" fill="var(--theme-accent)" />
                  <rect
                    x="220"
                    y="158"
                    width="8"
                    height="4"
                    fill="var(--theme-accent)"
                  />
                  <rect
                    x="220"
                    y="166"
                    width="8"
                    height="4"
                    fill="var(--theme-accent)"
                  />

                  {/* Floating particles */}
                  <circle
                    cx="130"
                    cy="60"
                    r="3"
                    fill="var(--theme-primary)"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="cy"
                      values="60;55;60"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    cx="280"
                    cy="180"
                    r="2"
                    fill="var(--theme-accent)"
                    opacity="0.8"
                  >
                    <animate
                      attributeName="cy"
                      values="180;175;180"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </div>
            </div>

            {/* Informational content */}
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <div className="w-10 h-10 bg-theme-primary rounded-xl flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-lg">
                      {config.company_name?.charAt(0) || "E"}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {config.company_name}
                  </span>
                </div>

                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                  {t("PASSWORD_RECOVERY").split(" ")[0]} <br />
                  <span className="text-theme-primary">
                    {t("PASSWORD_RECOVERY").split(" ")[1]}
                  </span>
                </h2>

                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  {tForgot("SUBTITLE")}
                </p>
              </div>

              {/* Security features */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="bg-theme-primary/10 p-3 rounded-xl mr-4 group hover:bg-theme-primary/20 transition-colors">
                    <Shield className="h-5 w-5 text-theme-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white block">
                      {t("SECURE_RESET_LINK")}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("ENCRYPTED_TIME_LIMITED")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="bg-theme-accent/10 p-3 rounded-xl mr-4 group hover:bg-theme-accent/20 transition-colors">
                    <Mail className="h-5 w-5 text-theme-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white block">
                      {t("EMAIL_VERIFICATION")}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("CHECK_INBOX_INSTRUCTIONS")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form side */}
          <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-gray-800/30 backdrop-blur-xs">
            <div className="max-w-sm mx-auto w-full">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-theme-primary to-theme-accent flex items-center justify-center shadow-xl shadow-theme-primary/25">
                      <Key className="text-white w-8 h-8" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-white">
                    {t("RESET_PASSWORD")}
                  </h1>
                  <p className="text-gray-300 text-lg max-w-md mx-auto leading-relaxed">
                    {t("ENTER_EMAIL_ASSOCIATED")}
                  </p>
                </div>
              </div>

              {state.success ? (
                <div className="space-y-6">
                  {/* Success message */}
                  <div className="flex items-start space-x-3 p-6 bg-green-900/20 border border-green-700/50 rounded-xl backdrop-blur-xs">
                    <div className="shrink-0">
                      <div className="w-8 h-8 bg-green-900/40 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-green-200 mb-2">
                        {tForgot("SUCCESS_TITLE")}
                      </h4>
                      <p className="text-sm text-green-300 mb-3">
                        {tForgot("SUCCESS_MESSAGE")}
                      </p>
                    </div>
                  </div>

                  {/* Help section */}
                  <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-xs">
                    <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      {tForgot("DIDNT_RECEIVE_EMAIL")}
                    </h5>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
                        <span>{tForgot("CHECK_SPAM_FOLDER")}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
                        <span>
                          {tForgot("INVALID_EMAIL")}
                        </span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
                        <span>{tForgot("SUCCESS_NOTE")}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <form action={formAction} className="space-y-6">
                  {/* Email field */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Mail className="h-5 w-5 text-gray-400 pointer-events-none shrink-0" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      className={cn(
                        "pl-10 pr-4 w-full py-3 border-2 rounded-lg transition-all duration-200",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                        "border-gray-200 dark:border-gray-700",
                        "focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-sm",
                        "shadow-xs hover:shadow-md focus:shadow-lg",
                        "disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      )}
                      placeholder={tForgot("EMAIL_PLACEHOLDER")}
                      required
                      autoComplete="email"
                      aria-describedby="email-error"
                    />
                  </div>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    isLoading={pending}
                    size="lg"
                    radius="lg"
                    className="w-full font-semibold bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 text-white shadow-xl shadow-theme-primary/25 hover:shadow-2xl hover:shadow-theme-primary/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-xs"
                    spinner={
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    }
                  >
                    {pending ? tForgot("SENDING") : tForgot("SEND_RESET_LINK")}
                  </Button>

                  {/* Back to login */}
                  <div className="text-center pt-4 border-t border-gray-700/50">
                    <Link
                      href="/auth/signin"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-theme-primary transition-colors duration-200"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {tForgot("BACK_TO_LOGIN")}
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
