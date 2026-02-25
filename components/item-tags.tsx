"use client";

import Link from "next/link";
import { FiTag, FiHash } from "react-icons/fi";
import { cn } from "../lib/utils/index";

function normalizeTagForUrl(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const getTagClasses = () =>
  cn(
    "relative px-4 py-1.5 text-xs font-semibold rounded-full flex items-center gap-2",
    "bg-linear-to-r from-primary-50/80 to-primary-100/80",
    "dark:from-primary-900/80 dark:to-primary-800/80",
    "text-primary-700 dark:text-primary-300",
    "border border-primary-200/60 dark:border-primary-700/60",
    "shadow-xs hover:shadow-md",
    "transition-[color,box-shadow,border-color] duration-200 hover:border-primary-300 dark:hover:border-primary-600",
    "group overflow-hidden"
  );

export function ItemTag({ name }: { name: string }) {
  const normalizedTag = normalizeTagForUrl(name);

  return (
    <div className="inline-block">
      <Link
        href={`/tags/${normalizedTag}`}
        className="no-underline"
        aria-label={`View all items tagged with ${name}`}
      >
        <div className={getTagClasses()}>
          <span
            className={cn(
              "relative flex items-center justify-center w-5 h-5 rounded-full bg-primary-100/60 dark:bg-primary-700/60",
              "group-hover:bg-primary-200/80 dark:group-hover:bg-primary-600/70",
              "transition-colors duration-300 ring-1 ring-inset ring-primary-300/20 dark:ring-primary-600/30"
            )}
          >
            <FiTag className="w-3 h-3 text-primary-700 dark:text-primary-200 group-hover:text-primary-900 dark:group-hover:text-primary-100 transition-colors duration-300" />
          </span>

          <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5">
            {name}
          </span>

        </div>
      </Link>
    </div>
  );
}

export function ItemTags({ tags }: { tags: string[] }) {
  // Don't render if tags array is empty or undefined
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 dark:border-dark--theme-200">
      {tags.map((tag, index) => (
        <ItemTag key={index} name={tag} />
      ))}
    </div>
  );
}

export function ItemTagsSection({
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
    <div className="mb-6">
      {title && (
        <h3 className="text-sm font-medium text-dark--theme-600 dark:text-dark--theme-200 mb-3 flex items-center">
          <FiHash className="w-3.5 h-3.5 mr-1.5 text-primary-500 dark:text-primary-400" />
          {title}
        </h3>
      )}
      <ItemTags tags={tags} />
    </div>
  );
}
