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

export function SocialLogin({ callbackUrl: callbackUrlProp }: { callbackUrl?: string } = {}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const rawRedirectUrl = searchParams.get("redirect") || searchParams.get("callbackUrl");
  const redirectUrl = isValidCallbackUrl(rawRedirectUrl) ? rawRedirectUrl! : (callbackUrlProp || "/client/dashboard");
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
      // Handle locale preservation for social login redirects (avoid double prefix if path already has locale)
      const shouldPrefixLocale = locale !== 'en' && !redirectUrl.startsWith(`/${locale}`);
      const finalRedirectUrl = shouldPrefixLocale
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
      {/* Separator */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gray-200 dark:bg-white/8" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-[#0a0a0a] rounded-full px-3 text-xs text-gray-400 dark:text-gray-500">
            {t("OR_CONTINUE_WITH")}
          </span>
        </div>
      </div>

      {/* Social login buttons */}
      <div className="flex justify-center items-center gap-2.5">
        {socialProviders.map((provider, index) => {
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
                  "w-7 h-7 min-w-7 rounded-md border",
                  "bg-white dark:bg-white/5",
                  "border-gray-200 dark:border-white/8",
                  "hover:border-gray-300 dark:hover:border-white/12",
                  "hover:bg-gray-50 dark:hover:bg-white/8",
                  "focus:outline-hidden focus:ring-1 focus:ring-theme-primary/20",
                  "transition-colors duration-150",
                  "flex items-center justify-center",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
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

      {/* Security indicator */}
      <div className="mt-3 flex justify-center">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>{t("SECURE_CONNECTION")}</span>
        </div>
      </div>
    </>
  );
}
