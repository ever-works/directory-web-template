import { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import TagsGridClient from "./tags-grid-client";
import { notFound } from "next/navigation";
import { getTagsEnabled } from "@/lib/utils/settings";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DEFAULT_LOCALE } from "@/lib/constants";

// Enable ISR with 10 minutes revalidation
// Rendered per request, as before Spec 061: not made cacheable yet (docs/questions.md,
// Q-061b). `revalidate` below has no effect while this is set.
export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { tags } = await getCachedItems({ lang: locale, sortTags: true });

  return generateListingMetadata({
    title: "Tags",
    path: "/tags",
    locale,
    itemCount: tags.length,
    keywords: ["tags", "browse", "directory", "labels"],
  });
}

export default async function TagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const tagsEnabled = getTagsEnabled();
  if (!tagsEnabled) {
    notFound();
  }

  const { locale } = await params;
  // Sets the request locale for next-intl's server helpers, so they do not read it
  // from the request headers, which makes a page render per request (Spec 061).
  setRequestLocale(locale);
  const { tags } = await getCachedItems({ lang: locale, sortTags: true });
  const tCommon = await getTranslations("common");

  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: tCommon("HOME"), url: `${localePrefix || "/"}` },
          { name: tCommon("TAGS") },
        ]}
      />
      <TagsGridClient tags={tags} />
    </>
  );
}
