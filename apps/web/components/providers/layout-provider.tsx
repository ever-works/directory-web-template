'use client';

import { LayoutThemeProvider } from '@/components/context';
import { EditorContextProvider } from '@/lib/editor';

interface LayoutProviderProps {
	children: React.ReactNode;
	configDefaults?: {
		defaultView?: string;
	};
}

export function LayoutProvider({ children, configDefaults }: LayoutProviderProps) {
	return (
		<LayoutThemeProvider configDefaults={configDefaults}>
			<EditorContextProvider>{children}</EditorContextProvider>
		</LayoutThemeProvider>
	);
}
