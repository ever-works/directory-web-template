import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
	label: string;
	href?: string;
}

interface BreadcrumbProps {
	items: BreadcrumbItem[];
	homeLabel?: string;
	className?: string;
}

/**
 * Reusable breadcrumb navigation component
 * Displays a navigational hierarchy with Home icon and separator chevrons
 */
export function Breadcrumb({ items, homeLabel = 'Home', className }: BreadcrumbProps) {
	return (
		<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
			<ol className="inline-flex items-center space-x-1 md:space-x-3">
				{/* Home link */}
				<li className="inline-flex items-center text-black dark:text-white">
					<Link
						href="/"
						className="inline-flex items-center text-sm font-medium text-black dark:text-white hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
					>
						<HomeIcon />
						{homeLabel}
					</Link>
				</li>

				{/* Breadcrumb items */}
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					const itemContent = (
						<span className="ml-1 text-sm font-medium text-gray-800 dark:text-white/50 md:ml-2">
							{item.label}
						</span>
					);

					return (
						<li key={index} aria-current={isLast ? 'page' : undefined}>
							<div className="flex items-center">
								<ChevronIcon />
								{item.href && !isLast ? (
									<Link
										href={item.href}
										className="ml-1 text-sm font-medium text-gray-800 dark:text-white/50 md:ml-2 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
									>
										{item.label}
									</Link>
								) : (
									itemContent
								)}
							</div>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

/**
 * Home icon SVG component
 */
function HomeIcon() {
	return (
		<svg
			className="w-3 h-3 mr-2.5 text-dark--theme-800 dark:text-white"
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
		</svg>
	);
}

/**
 * Chevron separator icon SVG component
 */
function ChevronIcon() {
	return (
		<svg
			className="w-3 h-3 text-dark--theme-800 dark:text-white/50 mx-1"
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 6 10"
		>
			<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4" />
		</svg>
	);
}
