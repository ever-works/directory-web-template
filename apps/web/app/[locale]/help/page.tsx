import HelpPageClient from "./help-client";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generateHreflangAlternates, getLocalizedUrl } from "@/lib/seo/hreflang";
import { getSiteName } from '@/lib/seo/site-identity';
import { Locale, DEFAULT_LOCALE } from "@/lib/constants";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });

  const path = "/help";
  const title = `${t("INTERACTIVE_GUIDE")} | ${await getSiteName()}`;
  const description = t("INTERACTIVE_GUIDE_DESC");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: getLocalizedUrl(path, locale as Locale),
      siteName: await getSiteName(),
    },
    alternates: {
        canonical: getLocalizedUrl(path, locale as Locale),
        languages: generateHreflangAlternates(path),
        types: { 'text/markdown': `${getLocalizedUrl(path, locale as Locale)}.md` }
    }
  };
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [tCommon, tHelp] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "help" }),
  ]);
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: tCommon("HOME"), url: `${localePrefix || "/"}` },
          { name: tHelp("INTERACTIVE_GUIDE") },
        ]}
      />
      <HelpPageClient />
    </>
  );
}
