import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard";
import { getLocale, getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { generateHreflangAlternates, getLocalizedUrl } from "@/lib/seo/hreflang";
import { siteConfig } from "@/lib/config";
import { Locale } from "@/lib/constants";

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

export default async function ClientDashboardPage() {
  const locale = await getLocale();
  const session = await auth();
  
  // Check if user is authenticated
  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }
  
  // Check if user is admin - redirect to admin dashboard
  if (session.user.isAdmin === true) {
    redirect(`/${locale}/admin`);
  }
  
  return <DashboardContent session={session} />;
}
