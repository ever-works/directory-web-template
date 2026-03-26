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
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center text-black dark:text-white">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-medium text-black dark:text-white hover:text-white dark:hover:text-white transition-colors duration-300"
          >
            <svg
              className="w-2 h-2 mr-2.5 text-dark--theme-800 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
            </svg>
            Home
          </Link>
        </li>
        {categoriesEnabled && (
          <li>
            <div className="flex items-center">
              <svg
                className="w-2 h-2 text-dark--theme-800 dark:text-white/40 mx-1 "
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 9 4-4-4-4"
                />
              </svg>
              <Link
                href={`/categories/${encodedCategory}`}
                className="ml-1 text-xs font-medium text-gray-800 dark:text-white/50 md:ml-2 transition-colors duration-300"
              >
                {toTitleCase(categoryName ?? "") ?? ""}
              </Link>
            </div>
          </li>
        )}
        <li aria-current="page">
          <div className="flex items-center">
            <svg
              className="w-2 h-2 text-dark--theme-800 dark:text-white/50 mx-1"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 6 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 9 4-4-4-4"
              />
            </svg>
            <span className="ml-1 text-xs font-medium text-gray-800 dark:text-white md:ml-2 truncate max-w-[200px]">
              {name}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  );
}
