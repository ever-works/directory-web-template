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
  AnimatedBackground,
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
    <div className="flex items-center justify-center py-8 px-4 relative bg-gray-50 dark:bg-white/3">
      {/* Animated background */}
      <AnimatedBackground />
      <GeometricDecoration />
      {/* Main container with modern design */}
      <AnimatedContainer type="scaleIn" duration="slow" easing="bounce">
        <div className="w-full max-w-5xl mx-auto rounded-2xl bg-white/80 dark:bg-white/3 backdrop-blur-xl border border-white/20 dark:border-white/6 shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[400px] lg:min-h-[500px]">
            {/* Illustration and branding side */}
            <div className="w-full lg:w-1/2 relative bg-linear-to-br from-theme-primary/5 via-theme-accent/5 to-theme-secondary/5 p-6 lg:p-8 flex flex-col justify-center">
              {/* Main illustration */}
              <div className="flex-1 flex items-center justify-center mb-8 lg:mb-0">
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
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                          {tAuth('ADMIN_WELCOME_TITLE')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                          {tAuth('ADMIN_WELCOME_DESCRIPTION')}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                          {isLogin ? (
                            <>
                              {t("WELCOME_BACK")} <br />
                              <span className="text-theme-primary">{t("AMONG_US")}</span>
                            </>
                          ) : (
                            <>
                              {t("JOIN_OUR")} <br />
                              <span className="text-theme-primary">{t("COMMUNITY")}</span>
                            </>
                          )}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
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
                        <div className="bg-theme-primary/10 p-3 rounded-xl mr-4 group">
                          <User className="h-5 w-5 text-theme-primary" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block">
                            {tAuth("USER_MANAGEMENT")}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {tAuth("USER_MANAGEMENT_DESC")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="bg-theme-accent/10 p-3 rounded-xl mr-4 group">
                          <Building className="h-5 w-5 text-theme-accent" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block">
                            {tAuth("CONTENT_MODERATION")}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {tAuth("CONTENT_MODERATION_DESC")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="bg-theme-secondary/10 p-3 rounded-xl mr-4 group">
                          <Globe className="h-5 w-5 text-theme-secondary" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block">
                            {tAuth("ANALYTICS_DASHBOARD")}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {tAuth("ANALYTICS_DASHBOARD_DESC")}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {authFeatures.map((feature) => {
                        const bgColorClass = feature.colorVariant === "primary"
                          ? "bg-theme-primary/10 hover:bg-theme-primary/20"
                          : feature.colorVariant === "accent"
                          ? "bg-theme-accent/10 hover:bg-theme-accent/20"
                          : "bg-theme-secondary/10 hover:bg-theme-secondary/20";

                        const iconColorClass = feature.colorVariant === "primary"
                          ? "text-theme-primary"
                          : feature.colorVariant === "accent"
                          ? "text-theme-accent"
                          : "text-theme-secondary";

                        return (
                          <div key={feature.titleKey} className="flex items-center">
                            <div className={`${bgColorClass} p-3 rounded-xl mr-4 group transition-colors`}>
                              <feature.icon className={`h-5 w-5 ${iconColorClass} group-hover:scale-110 transition-transform`} />
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-white block">
                                {t(feature.titleKey as any)}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
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
            <div className="w-full lg:w-1/2 p-4 lg:p-6 flex flex-col justify-center bg-white/50 dark:bg-white/3 backdrop-blur-xs">
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
