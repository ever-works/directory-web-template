'use client';

import React, { Suspense, createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationContextType {
	isInitialLoad: boolean;
	isNavigating: boolean;
	/** Current query string without `?`; `null` until known in the browser. */
	search: string | null;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

/**
 * Current query string (without `?`), or `''` until it is known in the browser.
 *
 * Use this instead of `useSearchParams()` in components that render page content
 * on cached (ISR) pages: `useSearchParams()` there bails the component tree out
 * to client rendering up to the closest Suspense boundary (Spec 061).
 */
export function useCurrentSearch(): string {
	return useContext(NavigationContext)?.search ?? '';
}

export function useNavigation(): NavigationContextType {
	const context = useContext(NavigationContext);

	if (!context) {
		throw new Error('useNavigation must be used within NavigationProvider');
	}

	return context;
}

interface NavigationProviderProps {
	children: React.ReactNode;
}

function isInternalNavigationTarget(anchor: HTMLAnchorElement): boolean {
	const href = anchor.getAttribute('href');
	if (!href || href.startsWith('#')) {
		return false;
	}

	if (anchor.target && anchor.target !== '_self') {
		return false;
	}

	if (anchor.hasAttribute('download')) {
		return false;
	}

	try {
		const url = new URL(anchor.href, window.location.href);
		return url.origin === window.location.origin;
	} catch {
		return false;
	}
}

/**
 * Reports the query string to NavigationProvider. Kept in its own component
 * behind a Suspense boundary: `useSearchParams()` in a statically rendered page
 * bails out to client rendering up to the closest Suspense boundary, and the
 * provider wraps the whole app, so reading it there would have left every
 * cached (ISR) page with an empty server-rendered body (Spec 061).
 */
function SearchParamsReporter({ onChange }: { onChange: (search: string) => void }) {
	const searchParams = useSearchParams();
	const search = searchParams?.toString() || '';
	useEffect(() => {
		onChange(search);
	}, [search, onChange]);
	return null;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
	const pathname = usePathname();
	// `null` until SearchParamsReporter has run in the browser.
	const [search, setSearch] = useState<string | null>(null);
	const previousRouteRef = useRef<string | null>(null);
	const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [isNavigating, setIsNavigating] = useState(false);

	const currentRoute = search === null ? null : `${pathname}?${search}`;

	useEffect(() => {
		const handleDocumentClick = (event: MouseEvent) => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			const anchor = target.closest('a');
			if (!(anchor instanceof HTMLAnchorElement) || !isInternalNavigationTarget(anchor)) {
				return;
			}

			const nextRoute = `${anchor.pathname}${anchor.search}`;
			if (nextRoute === (currentRoute ?? `${pathname}?`)) {
				return;
			}

			setIsNavigating(true);
		};

		document.addEventListener('click', handleDocumentClick, true);
		return () => document.removeEventListener('click', handleDocumentClick, true);
	}, [currentRoute, pathname]);

	useEffect(() => {
		if (currentRoute === null) {
			return;
		}
		if (previousRouteRef.current === null) {
			previousRouteRef.current = currentRoute;
			return;
		}

		if (previousRouteRef.current !== currentRoute) {
			setIsInitialLoad(false);
			previousRouteRef.current = currentRoute;

			if (navigationTimeoutRef.current) {
				clearTimeout(navigationTimeoutRef.current);
			}

			navigationTimeoutRef.current = setTimeout(() => {
				setIsNavigating(false);
				navigationTimeoutRef.current = null;
			}, 150);
		}
	}, [currentRoute]);

	useEffect(() => {
		return () => {
			if (navigationTimeoutRef.current) {
				clearTimeout(navigationTimeoutRef.current);
			}
		};
	}, []);

	return (
		<NavigationContext.Provider
			value={{
				isInitialLoad,
				isNavigating,
				search
			}}
		>
			<Suspense fallback={null}>
				<SearchParamsReporter onChange={setSearch} />
			</Suspense>
			{children}
		</NavigationContext.Provider>
	);
}
