'use client';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Hero from '@/components/hero';
import Link from 'next/link';
import CategoriesGrid from '@/components/categories-grid';
import { Category } from '@/lib/content';
import { useLayoutTheme, LayoutHome } from '@/components/context';
import { ListingSkeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';
import { GridBackground, DotBgsible } from '@/components/shared/decorative-bg';

interface ListingCategoriesProps {
	page: number;
	basePath: string;
	categories: Category[];
}

function ListingCategoriesContent(props: ListingCategoriesProps) {
	const { layoutHome = LayoutHome.HOME_ONE, paginationType: _paginationType } = useLayoutTheme();
	const t = useTranslations();

	return (
		<div className="relative">
			<Hero
				badgeText={t('listing.CATEGORIES')}
				title={
					<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
						{t('listing.CATEGORIES', { defaultValue: 'Open Source Software Categories' })}
					</span>
				}
				description={t('common.CATEGORIES_DESCRIPTION', {
					defaultValue: 'Browse top categories to find your best Open Source software options.'
				})}
				className="min-h-screen text-center pb-24 relative"
			>
				<div className="absolute inset-x-0 -top-30 w-full h-[350px] flex justify-center items-start -z-10">
					<GridBackground className="w-full h-full" />
				</div>
				<div className='mt-12 xl:mt-[4%]'>
					{layoutHome === LayoutHome.HOME_ONE && <HomeOneLayout categories={props.categories} />}
					{layoutHome === LayoutHome.HOME_TWO && <HomeTwoLayout categories={props.categories} />}
				</div>
			</Hero>
			<DotBgsible />
		</div>
	);
}

export default function ListingCategories(props: ListingCategoriesProps) {
	return (
		<Suspense fallback={<ListingSkeleton />}>
			<ListingCategoriesContent {...props} />
		</Suspense>
	);
}

function HomeOneLayout({ categories }: { categories: Category[] }) {
	const t = useTranslations();

	return (
		<>
			{/* Breadcrumb */}
			<nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
				<ol className="inline-flex items-center space-x-1 md:space-x-3">
					<li className="inline-flex items-center text-black dark:text-white">
						<Link
							href="/"
							className="inline-flex items-center text-sm font-medium text-black dark:text-white hover:text-white dark:hover:text-white transition-colors duration-300"
						>
							<svg
								className="w-3 h-3 mr-2.5 text-dark--theme-800 dark:text-white"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
							</svg>
							{t('common.HOME')}
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<svg
								className="w-3 h-3 text-dark--theme-800 dark:text-white mx-1 "
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
							<span className="ml-1 text-sm font-medium text-gray-800 dark:text-white/50 md:ml-2 transition-colors duration-300">
								{t('listing.CATEGORIES')}
							</span>
						</div>
					</li>
				</ol>
			</nav>

			{/* Categories Grid */}
			{categories.length > 0 && (
				<Container maxWidth="7xl" padding="lg" useGlobalWidth className="">
					<CategoriesGrid categories={categories} />
				</Container>
			)}
		</>
	);
}

function HomeTwoLayout({ categories }: { categories: Category[] }) {
	const t = useTranslations();

	return (
		<Container maxWidth="7xl" padding="lg" useGlobalWidth>
			{/* Breadcrumb */}
			<nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
				<ol className="inline-flex items-center space-x-1 md:space-x-3">
					<li className="inline-flex items-center text-black dark:text-white">
						<Link
							href="/"
							className="inline-flex items-center text-sm font-medium text-black dark:text-white hover:text-white dark:hover:text-white transition-colors duration-300"
						>
							<svg
								className="w-3 h-3 mr-2.5 text-dark--theme-800 dark:text-white"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
							</svg>
							{t('common.HOME')}
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<svg
								className="w-3 h-3 text-dark--theme-800 dark:text-white mx-1"
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
							<span className="ml-1 text-sm font-medium text-gray-800 dark:text-white/50 md:ml-2 transition-colors duration-300">
								{t('listing.CATEGORIES')}
							</span>
						</div>
					</li>
				</ol>
			</nav>

			{/* Categories Grid */}
			{categories.length > 0 && <CategoriesGrid categories={categories} />}
		</Container>
	);
}
