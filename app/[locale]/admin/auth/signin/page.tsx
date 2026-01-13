"use client";

import { AuthForm } from "@/app/[locale]/auth/components/auth-form";
import { useParams, useSearchParams } from "next/navigation";
import { getSafeRedirectPath } from "@/lib/auth/validate-callback-url";

export default function AdminLoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? null;

  const handleLoginSuccess = () => {
    const redirectPath = getSafeRedirectPath(callbackUrl, `/${params.locale}/admin`);
    const locale = String(params.locale ?? "en");
    // Add locale prefix for non-English users if path doesn't already have it
    const finalRedirectPath =
      locale !== "en" && !redirectPath.startsWith(`/${locale}`)
        ? `/${locale}${redirectPath}`
        : redirectPath;
    window.location.href = finalRedirectPath;
  };

  return (
    <div>
      <AuthForm
        form="login"
        showSocialLogin={false}
        clientMode={true}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
} 