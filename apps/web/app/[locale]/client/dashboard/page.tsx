import { DashboardClientGate } from "./dashboard-client-gate";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { generateHreflangAlternates, getLocalizedUrl } from "@/lib/seo/hreflang";
import { siteConfig } from "@/lib/config";
import { Locale } from "@/lib/constants";

// Spec 027: this page used to call `await auth()` server-side and `redirect()`
// to /auth/signin when null. In Vercel production (Auth.js v5 beta.30 + Next
// 16 + next-intl) that path silently returns null for valid sessions while
// /api/auth/session and /api/current-user happily return the user with the
// same cookie. The asymmetry is documented at length in Spec 027 — we
// reproduced it in raw fetches and a temporary debug endpoint. Until upstream
// fixes it, the dashboard does its auth gating on the client via useSession
// (which hits /api/auth/session, the path that works). Render is a thin
// server shell that delegates to a client gate.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  const path = "/client/dashboard";
  const title = `${t("DASHBOARD")} | ${siteConfig.name}`;
  const description = t("DASHBOARD");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: getLocalizedUrl(path, locale as Locale),
      siteName: siteConfig.name,
    },
    alternates: {
        canonical: getLocalizedUrl(path, locale as Locale),
        languages: generateHreflangAlternates(path)
    }
  };
}

export default function ClientDashboardPage() {
  return <DashboardClientGate />;
}
