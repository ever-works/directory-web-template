"use client";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import Hero from "@/components/hero";
import Link from "next/link";
import { Collection } from "@/types/collection";
import { ListingSkeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";
import { Paginate } from "@/components/filters/components/pagination/paginate";
import { totalPages } from "@/lib/paginate";
import { CollectionsGrid } from "./collections-grid";

interface CollectionsListProps {
  collections: Collection[];
  locale: string;
  total: number;
  page: number;
  basePath: string;
}

function CollectionsListContent(props: CollectionsListProps) {
  const { collections } = props;
  const t = useTranslations();

  return (
    <>
      <Hero
        badgeText={t("common.COLLECTION")}
        title={
          <span className="bg-linear-to-r from-theme-primary via-purple-500 to-theme-primary bg-clip-text text-transparent">
            {t("common.EXPLORE_BY_COLLECTIONS")}
          </span>
        }
        description={t("common.COLLECTIONS_DESCRIPTION")}
        className="min-h-screen text-center"
      >
        <Container maxWidth="7xl" padding="default" useGlobalWidth>
          {/* Breadcrumb */}
          <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center text-black dark:text-white">
                <Link
                  href="/"
                  className="inline-flex items-center text-sm font-medium text-black dark:text-white hover:text-white dark:hover:text-white transition-colors duration-300"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                  </svg>
                  {t("common.HOME")}
                </Link>
              </li>
              <li>
                <div className="flex items-center text-black dark:text-white">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <span className="ml-1 text-sm font-medium md:ml-2">
                    {t("common.COLLECTION")}
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <CollectionsGrid collections={collections} />
        </Container>
        <footer className="flex items-center justify-center">
          <Paginate basePath={props.basePath} initialPage={props.page} total={totalPages(props.total)} />
        </footer>
      </Hero>
    </>
  );
}

export function CollectionsList(props: CollectionsListProps) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <CollectionsListContent {...props} />
    </Suspense>
  );
}
