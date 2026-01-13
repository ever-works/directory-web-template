"use client";

import { AuthForm } from "@/app/[locale]/auth/components/auth-form";
import { useParams, useSearchParams } from "next/navigation";
import { getSafeRedirectPath } from "@/lib/auth/validate-callback-url";

export default function AdminLoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const handleLoginSuccess = () => {
    const redirectPath = getSafeRedirectPath(callbackUrl, `/${params.locale}/admin`);
    window.location.href = redirectPath;
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