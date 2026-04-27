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
import { AnimatedContainer, StaggerContainer } from "@/components/ui/animations";
import { GeometricDecoration } from "@/components/ui/auth-illustrations";
import { SiteLogo } from "@/components/shared/site-logo/site-logo";

export default function ForgotPasswordPageClient() {
  const config = useConfig();
  const t = useTranslations("common");
  const tForgot = useTranslations("admin.FORGOT_PASSWORD_PAGE");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    forgotPassword,
    {}
  );

  return (
    <div className="flex items-center justify-center py-8 px-4 relative min-h-[90dvh] max-h-[100dvh]">
      <GeometricDecoration />
      {/* Main container with modern design */}
      <AnimatedContainer type="scaleIn" duration="slow" easing="bounce">
        <div className="w-full max-w-5xl mx-auto rounded-2xl bg-white/80 dark:bg-white/3 border border-gray-200 dark:border-white/6 shadow-lg overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[400px] lg:min-h-[500px]">
            {/* Illustration and branding side */}
            <div className="w-full lg:w-1/2 relative p-6 lg:p-8 flex flex-col justify-center">
              {/* Main illustration */}
              <div className="flex-1 flex items-center mb-8 lg:mb-0">
                <AnimatedContainer type="fadeIn" delay={300}>
                  <div className="relative w-full max-w-sm">
                    {/* Decorative key illustration */}
                    <svg
                      viewBox="0 0 300 200"
                      className="w-30 h-auto"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="240"
                        cy="60"
                        r="50"
                        fill="var(--theme-primary-100)"
                        opacity=".2"
                      />
                      <circle
                        cx="60"
                        cy="160"
                        r="40"
                        fill="var(--theme-accent-100)"
                        opacity=".3"
                      />
                      <rect
                        x="110"
                        y="50"
                        width="80"
                        height="90"
                        rx="8"
                        fill="var(--theme-primary-200)"
                        opacity=".15"
                      />
                      <path
                        d="M140 50 Q140 30 150 30 Q160 30 160 50"
                        stroke="var(--theme-primary)"
                        stroke-width="3"
                        fill="none"
                        opacity=".4"
                      />
                      <circle cx="150" cy="95" r="8" fill="var(--theme-primary)" opacity=".2" />
                      <rect
                        x="145"
                        y="108"
                        width="10"
                        height="20"
                        fill="var(--theme-primary)"
                        opacity=".3"
                      />
                      <rect
                        x="110"
                        y="155"
                        width="60"
                        height="8"
                        rx="4"
                        fill="var(--theme-accent)"
                        opacity=".5"
                      />
                      <circle cx="125" cy="159" r="10" fill="var(--theme-accent)" opacity=".4" />
                      <circle cx="80" cy="40" r="3" fill="var(--theme-primary)" opacity=".5">
                        <animate
                          attributeName="cy"
                          values="40;35;40"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle cx="220" cy="130" r="2" fill="var(--theme-accent)" opacity=".6">
                        <animate
                          attributeName="cy"
                          values="130;125;130"
                          dur="2.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </svg>
                  </div>
                </AnimatedContainer>
              </div>

              {/* Informational content */}
              <div className="space-y-6">
                <AnimatedContainer type="slideUp" delay={500}>
                  <div className="text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start mb-4">
                      <SiteLogo size="sm" showText={true} linkToHome={false} />
                    </div>

                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                      {t("PASSWORD_RECOVERY").split(" ")[0]} <br />
                      <span className="text-theme-primary">
                        {t("PASSWORD_RECOVERY").split(" ")[1]}
                      </span>
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {tForgot("SUBTITLE")}
                    </p>
                  </div>
                </AnimatedContainer>

                {/* Security features */}
                <StaggerContainer staggerDelay={150} className="space-y-4">
                  <div className="flex items-center">
                    <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl mr-4 group transition-colors">
                      <Shield className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white block">
                        {t("SECURE_RESET_LINK")}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t("ENCRYPTED_TIME_LIMITED")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl mr-4 group transition-colors">
                      <Mail className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white block">
                        {t("EMAIL_VERIFICATION")}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t("CHECK_INBOX_INSTRUCTIONS")}
                      </span>
                    </div>
                  </div>
                </StaggerContainer>
              </div>
            </div>

            {/* Form side */}
            <div className="w-full lg:w-1/2 p-4 lg:p-6 flex border-l dark:border-white/3 border-gray-200 flex-col justify-center bg-white/50 dark:bg-white/3 backdrop-blur-xs">
              <div className="max-w-sm mx-auto w-full">
                <AnimatedContainer type="slideLeft" delay={400}>
                  <div className="space-y-6">

                    {/* Header */}
                    <div className="text-center mb-8">
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-theme-primary to-theme-accent flex items-center justify-center">
                            <Key className="text-white w-8 h-8" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {t("RESET_PASSWORD")}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md mx-auto leading-relaxed">
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
                        <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/6 backdrop-blur-xs">
                          <h5 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-gray-400" />
                            {tForgot("DIDNT_RECEIVE_EMAIL")}
                          </h5>
                          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
                            <Mail className="h-4 w-4 text-gray-400 pointer-events-none shrink-0" />
                          </div>
                          <input
                            id="email"
                            type="email"
                            name="email"
                            className={cn(
                              "pl-10 pr-4 w-full py-3 border-2 rounded-lg transition-all duration-200",
                              "bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100",
                              "border-gray-200 dark:border-white/6",
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
                          className={cn(
                            'w-full h-10 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium rounded-sm',
                            'hover:bg-theme-primary/90 focus:outline-none',
                            'focus:ring-2 focus:ring-theme-primary/30 transition-colors duration-150',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                          spinner={
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                          }
                        >
                          {pending ? tForgot('SENDING') : tForgot('SEND_RESET_LINK')}
                        </Button>

                        {/* Back to login */}
                        <div className="text-center pt-4 border-t border-gray-200 dark:border-white/6">
                          <Link
                            href="/auth/signin"
                            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-theme-primary dark:hover:text-theme-primary transition-colors duration-200"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            {tForgot("BACK_TO_LOGIN")}
                          </Link>
                        </div>
                      </form>
                    )}
                  </div>
                </AnimatedContainer>
              </div>
            </div>
          </div>
        </div>
      </AnimatedContainer>
    </div>
  );
}
