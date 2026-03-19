"use client";

import Link from "next/link";
import { FiTag } from "react-icons/fi";

function normalizeTagForUrl(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function MarkdownTag({ name }: { name: string }) {
  const normalizedTag = normalizeTagForUrl(name);

  return (
    <div className="inline-block">
      <Link
        href={`/tags/${normalizedTag}`}
        className="no-underline inline-block"
      >
        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full inline-flex items-center gap-1 hover:shadow-xs transition-all">
          <FiTag className="w-3 h-3" />
          {name}
        </span>
      </Link>
    </div>
  );
}

export function MarkdownTags({ tags }: { tags: string[] }) {
  // Don't render if tags array is empty or undefined
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 my-4">
      {tags.map((tag, index) => (
        <MarkdownTag key={`${tag}-${index}`} name={tag} />
      ))}
    </div>
  );
}

export function TagsSection({
  title,
  tags,
}: {
  title: string;
  tags: string[];
}) {
  // Don't render if tags array is empty or undefined
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="my-6 p-4 bg-dark--theme-50 dark:bg-dark--theme-900 rounded-lg border border-dark--theme-200 dark:border-dark--theme-800">
      <h3 className="text-sm font-medium text-dark--theme-700 dark:text-dark--theme-100 mb-3">
        {title}
      </h3>
      <MarkdownTags tags={tags} />
    </div>
  );
}
