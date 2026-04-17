"use client";

import { Building, Globe, User } from "lucide-react";
import { useConfig } from "../../config";
import { CredentialsForm } from "./credentials-form";
import { SocialLogin } from "./social-login";
import { AnimatedContainer, StaggerContainer } from "@/components/ui/animations";
import { useTranslations } from "next-intl";
import {
  LoginIllustration,
  SignupIllustration,
  GeometricDecoration,
  TrustBadge
} from "@/components/ui/auth-illustrations";
import { authFeatures } from "@/lib/config/auth-features";
import { SiteLogo } from "@/components/shared/site-logo/site-logo";

export function AuthForm({ form, showSocialLogin = true, onSuccess, clientMode = false }: { form: "login" | "signup", showSocialLogin?: boolean, onSuccess?: () => void, clientMode?: boolean }) {
  const _config = useConfig();
  const t = useTranslations("common");
  const tAuth = useTranslations("admin.AUTH_FORM");
  const isLogin = form === "login";

  return (
    <div className="flex items-center justify-center py-8 px-4 relative">
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
                  {isLogin ? (
                    <LoginIllustration className="w-full max-w-sm" />
                  ) : (
                    <SignupIllustration className="w-full max-w-sm" />
                  )}
                </AnimatedContainer>
              </div>

              {/* Informational content */}
              <div className="space-y-6">
                <AnimatedContainer type="slideUp" delay={500}>
                  <div className="text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start mb-4">
                      <SiteLogo size="sm" showText={true} linkToHome={false} />
                    </div>

                    {/* Admin-specific message */}
                    {showSocialLogin === false ? (
                      <>
                        <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                          {tAuth('ADMIN_WELCOME_TITLE')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                          {tAuth('ADMIN_WELCOME_DESCRIPTION')}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                          {isLogin ? (
                            <>
                              {t("WELCOME_BACK")} {" "}
                              <span className="text-theme-primary">{t("AMONG_US")}</span>
                            </>
                          ) : (
                            <>
                              {t("JOIN_OUR")} {" "}
                              <span className="text-theme-primary">{t("COMMUNITY")}</span>
                            </>
                          )}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                          {isLogin
                            ? t("ACCESS_THOUSANDS")
                            : t("CREATE_ACCOUNT_DESC")}
                        </p>
                      </>
                    )}
                  </div>
                </AnimatedContainer>

                {/* Feature list with staggered animations */}
                <StaggerContainer staggerDelay={150} className="space-y-4">
                  {showSocialLogin === false ? (
                    <>
                      <div className="flex items-center">
                        <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl mr-4 group">
                          <User className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block">
                            {tAuth("USER_MANAGEMENT")}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {tAuth("USER_MANAGEMENT_DESC")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl mr-4 group">
                          <Building className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block">
                            {tAuth("CONTENT_MODERATION")}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {tAuth("CONTENT_MODERATION_DESC")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl mr-4 group">
                          <Globe className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block">
                            {tAuth("ANALYTICS_DASHBOARD")}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {tAuth("ANALYTICS_DASHBOARD_DESC")}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {authFeatures.map((feature) => {
                        return (
                          <div key={feature.titleKey} className="flex items-center">
                            <div className={`bg-gray-100 dark:bg-white/5 p-3 rounded-xl mr-4 group transition-colors`}>
                              <feature.icon className={`h-3 w-3 text-gray-400 dark:text-gray-500`} />
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-gray-900 dark:text-white block">
                                {t(feature.titleKey as any)}
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {t(feature.descriptionKey as any)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </StaggerContainer>

                {/* Trust badge */}
                <AnimatedContainer type="fadeIn" delay={800}>
                  <div className="flex items-center justify-center lg:justify-start pt-4">
                    <TrustBadge />
                  </div>
                </AnimatedContainer>
              </div>
            </div>

            {/* Form side */}
            <div className="w-full lg:w-1/2 p-4 lg:p-6 flex border-l dark:border-white/3 border-gray-200 flex-col justify-center bg-white/50 dark:bg-white/3 backdrop-blur-xs">
              <div className="max-w-sm mx-auto w-full">
                <AnimatedContainer type="slideLeft" delay={400}>
                  <CredentialsForm
                    type={form}
                    hideSwitchButton={!showSocialLogin}
                    onSuccess={onSuccess}
                    clientMode={clientMode}
                  >
                    {showSocialLogin && <SocialLogin />}
                  </CredentialsForm>
                </AnimatedContainer>
              </div>
            </div>
          </div>
        </div>
      </AnimatedContainer>
    </div>
  );
}
