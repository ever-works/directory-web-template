'use client';
import Link from "next/link";
import { toTitleCase, slugify } from "@/lib/utils";
import { useCategoriesEnabled } from "@/hooks/use-categories-enabled";

interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}

export function ItemBreadcrumb({
  name,
  category,
  categoryName,
}: BreadcrumbProps) {
  const { categoriesEnabled } = useCategoriesEnabled();
  const firstCategory = Array.isArray(category) ? category[0] : category;
  const rawCategoryId =
    typeof firstCategory === "string"
      ? firstCategory
      : (firstCategory as { id?: string })?.id || String(firstCategory);
  const encodedCategory = encodeURIComponent(slugify(rawCategoryId));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href="/"
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-150 font-medium"
          >
            Home
          </Link>
        </li>
        {categoriesEnabled && (
          <>
            <li aria-hidden="true" className="text-gray-300 dark:text-white/15 text-xs select-none">/</li>
            <li>
              <Link
                href={`/categories/${encodedCategory}`}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-150 font-medium"
              >
                {toTitleCase(categoryName ?? "") ?? ""}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden="true" className="text-gray-300 dark:text-white/15 text-xs select-none">/</li>
        <li aria-current="page">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px] block">
            {name}
          </span>
        </li>
      </ol>
    </nav>
  );
}
