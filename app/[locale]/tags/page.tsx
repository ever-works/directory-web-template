import { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import TagsGridClient from "./tags-grid-client";
import { notFound } from "next/navigation";
import { getTagsEnabled } from "@/lib/utils/settings";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";

// Enable ISR with 10 minutes revalidation
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
  const { tags } = await getCachedItems({ lang: locale, sortTags: true });

  return <TagsGridClient tags={tags} />;
}
