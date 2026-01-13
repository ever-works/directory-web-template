"use client";

import { Button, cn } from "@heroui/react";
import { useConfig } from "../../config";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import {
  IconFacebook,
  IconGithub,
  IconGoogle,
  IconMicrosoft,
  IconX,
} from "@/components/icons/Icons";
import { useActionState, useEffect } from "react";
import { signInWithProvider } from "../actions";
import { ActionState } from "@/lib/auth/middleware";
import { signIn } from "next-auth/react";
import { isValidCallbackUrl } from "@/lib/auth/validate-callback-url";

type SocialProvider = {
  icon: React.ReactNode;
  provider: string;
  isEnabled: boolean;
};

export function SocialLogin() {
  const t = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const rawRedirectUrl = searchParams.get("redirect") || searchParams.get("callbackUrl");
  const redirectUrl = isValidCallbackUrl(rawRedirectUrl) ? rawRedirectUrl! : "/client/dashboard";
  const router = useRouter();
  const config = useConfig();
  const auth = config.auth || {};
  const authProvider = config.authConfig?.provider || "next-auth";
  
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    signInWithProvider,
    {}
  );

  const socialProviders: SocialProvider[] = [
    { icon: <IconGithub />, provider: "github", isEnabled: !!auth.github },
    { icon: <IconGoogle />, provider: "google", isEnabled: !!auth.google },
    { icon: <IconFacebook />, provider: "facebook", isEnabled: !!auth.fb },
    { icon: <IconX />, provider: "x", isEnabled: !!auth.x },
    { icon: <IconMicrosoft />, provider: "microsoft", isEnabled: !!auth.microsoft },
  ].filter((provider) => provider.isEnabled);

  useEffect(() => {
    if (state.success) {
      // Handle locale preservation for social login redirects
      const finalRedirectUrl = locale !== 'en' 
        ? `/${locale}${redirectUrl}` 
        : redirectUrl;
      router.push(finalRedirectUrl);
      router.refresh();
    }
  }, [state, redirectUrl, router, locale]);

  const enabledProviders = Object.keys(auth)
    .filter((key) => key !== "credentials")
    .filter((key) => auth[key as keyof typeof auth]);

 
  const handleSocialAuth = async (provider: SocialProvider, formData: FormData) => {
    try {
      if (authProvider === "next-auth") {
        await signIn(provider.provider, {
          callbackUrl: redirectUrl,
          redirect: true,
        });
        return;
      } else {
        const safeFormData = new FormData();
        for (const [key, value] of formData.entries()) {
          safeFormData.append(key, value);
        }
        safeFormData.append("provider", provider.provider);
        safeFormData.append("callbackUrl", redirectUrl);
        safeFormData.append("authProvider",config.authConfig?.provider||"supabase");
        return formAction(safeFormData);
      }
    } catch (error) {
      console.error(`Error during authentication with ${provider.provider}:`, error);
    }
  };
  if (enabledProviders.length === 0) {
    return null;
  }

  return (
    <>
      {/* Elegant separator with gradient */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-linear-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600" />
        </div>
        <div className="relative flex justify-center">
          <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-xs border border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
              <svg className="w-3 h-3 text-theme-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t("OR_CONTINUE_WITH")}
            </span>
          </div>
        </div>
      </div>

      {/* Beautiful social buttons with glassmorphism effects */}
      <div className="flex justify-center items-center gap-3">
        {socialProviders.map((provider, index) => {
          // Provider-specific colors
          const getProviderStyles = () => {
            switch (provider.provider) {
              case 'google':
                return {
                  gradient: 'from-red-500/10 to-orange-500/10',
                  hoverGradient: 'hover:from-red-500/20 hover:to-orange-500/20',
                  border: 'border-red-200/50 dark:border-red-800/50',
                  hoverBorder: 'hover:border-red-300/70 dark:hover:border-red-700/70',
                  shadow: 'shadow-red-500/20',
                  hoverShadow: 'hover:shadow-red-500/30'
                };
              case 'github':
                return {
                  gradient: 'from-gray-500/10 to-slate-500/10',
                  hoverGradient: 'hover:from-gray-500/20 hover:to-slate-500/20',
                  border: 'border-gray-200/50 dark:border-gray-700/50',
                  hoverBorder: 'hover:border-gray-300/70 dark:hover:border-gray-600/70',
                  shadow: 'shadow-gray-500/20',
                  hoverShadow: 'hover:shadow-gray-500/30'
                };
              case 'facebook':
                return {
                  gradient: 'from-blue-500/10 to-indigo-500/10',
                  hoverGradient: 'hover:from-blue-500/20 hover:to-indigo-500/20',
                  border: 'border-blue-200/50 dark:border-blue-800/50',
                  hoverBorder: 'hover:border-blue-300/70 dark:hover:border-blue-700/70',
                  shadow: 'shadow-blue-500/20',
                  hoverShadow: 'hover:shadow-blue-500/30'
                };
              case 'microsoft':
                return {
                  gradient: 'from-blue-600/10 to-cyan-500/10',
                  hoverGradient: 'hover:from-blue-600/20 hover:to-cyan-500/20',
                  border: 'border-blue-200/50 dark:border-blue-800/50',
                  hoverBorder: 'hover:border-blue-300/70 dark:hover:border-blue-700/70',
                  shadow: 'shadow-blue-600/20',
                  hoverShadow: 'hover:shadow-blue-600/30'
                };
              case 'x':
                return {
                  gradient: 'from-gray-800/10 to-black/10',
                  hoverGradient: 'hover:from-gray-800/20 hover:to-black/20',
                  border: 'border-gray-300/50 dark:border-gray-600/50',
                  hoverBorder: 'hover:border-gray-400/70 dark:hover:border-gray-500/70',
                  shadow: 'shadow-gray-800/20',
                  hoverShadow: 'hover:shadow-gray-800/30'
                };
              default:
                return {
                  gradient: 'from-theme-primary/10 to-theme-accent/10',
                  hoverGradient: 'hover:from-theme-primary/20 hover:to-theme-accent/20',
                  border: 'border-theme-primary/30',
                  hoverBorder: 'hover:border-theme-primary/50',
                  shadow: 'shadow-theme-primary/20',
                  hoverShadow: 'hover:shadow-theme-primary/30'
                };
            }
          };

          const styles = getProviderStyles();

          return (
            <form
              key={`social-provider-${provider.provider}-${index}`}
              action={(formData) => handleSocialAuth(provider, formData)}
            >
              <Button
                name="provider"
                value={provider.provider}
                type="submit"
                disabled={pending}
                aria-label={`Continue with ${provider.provider === 'github' ? 'GitHub' :
                  provider.provider === 'google' ? 'Google' :
                  provider.provider === 'facebook' ? 'Facebook' :
                  provider.provider === 'microsoft' ? 'Microsoft' :
                  provider.provider === 'x' ? 'X' :
                  provider.provider}`}
                className={cn(
                  "w-9 h-9 rounded-md border",
                  "bg-white dark:bg-gray-800",
                  "border-gray-200 dark:border-gray-700",
                  "hover:border-gray-300 dark:hover:border-gray-600",
                  "hover:bg-gray-50 dark:hover:bg-gray-700",
                  "shadow-xs hover:shadow-sm",
                  "focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20",
                  "transition-colors duration-150",
                  "flex items-center justify-center",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  styles.gradient,
                  styles.hoverGradient,
                  styles.border,
                  styles.hoverBorder,
                  styles.shadow,
                  styles.hoverShadow,
                )}
              >
                <span className="text-base">
                  {provider.icon}
                </span>
              </Button>
            </form>
          );
        })}
      </div>

      {/* Elegant security badge */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full  dark:from-theme-primary-20 dark:to-emerald-20 border dark:border-theme-primary-800 shadow-xs">
          <div className="relative">
            <svg className="w-3 h-3 text-theme-primary-600 dark:text-theme-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-theme-primary-400 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-medium text-theme-primary-700 dark:text-theme-primary-300">
            {t("SECURE_CONNECTION")}
          </span>
        </div>
      </div>
    </>
  );
}
