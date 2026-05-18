import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard";
import { getLocale, getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { generateHreflangAlternates, getLocalizedUrl } from "@/lib/seo/hreflang";
import { siteConfig } from "@/lib/config";
import { Locale } from "@/lib/constants";
import { getClientProfileByUserId } from "@/lib/db/queries/client.queries";

// Force dynamic rendering — page depends on session cookies. Spec 027.
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

  // Resolve the viewer's profile username so the header can link to
  // /client/profile/{username}. May be null if the user has no id (shouldn't
  // happen after auth but the session type allows it) or no profile row yet
  // — header hides the button in those cases.
  const clientProfile = session.user.id
    ? await getClientProfileByUserId(session.user.id)
    : null;
  const profileUsername = clientProfile?.username ?? null;

  return <DashboardContent session={session} profileUsername={profileUsername} />;
}
