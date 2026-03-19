'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationContextType {
	isInitialLoad: boolean;
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

export function NavigationProvider({ children }: NavigationProviderProps) {
	const pathname = usePathname();
	const previousPathnameRef = useRef<string | null>(null);

	const [isInitialLoad, setIsInitialLoad] = useState(true);

	useEffect(() => {
		if (previousPathnameRef.current === null) {
			previousPathnameRef.current = pathname;
			return;
		}

		if (previousPathnameRef.current !== pathname) {
			setIsInitialLoad(false);
			previousPathnameRef.current = pathname;
		}
	}, [pathname]);

	return (
		<NavigationContext.Provider
			value={{
				isInitialLoad
			}}
		>
			{children}
		</NavigationContext.Provider>
	);
}
