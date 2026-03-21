'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationContextType {
	isInitialLoad: boolean;
	isNavigating: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

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

export function NavigationProvider({ children }: NavigationProviderProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const previousRouteRef = useRef<string | null>(null);
	const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [isNavigating, setIsNavigating] = useState(false);

	const currentRoute = `${pathname}?${searchParams?.toString() || ''}`;

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
			if (nextRoute === currentRoute) {
				return;
			}

			setIsNavigating(true);
		};

		document.addEventListener('click', handleDocumentClick, true);
		return () => document.removeEventListener('click', handleDocumentClick, true);
	}, [currentRoute]);

	useEffect(() => {
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
				isNavigating
			}}
		>
			{children}
		</NavigationContext.Provider>
	);
}
