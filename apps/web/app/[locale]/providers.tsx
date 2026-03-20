'use client';

import type { Config } from '@/lib/content';
import { HeroUIProvider } from '@heroui/react';
import { usePathname } from 'next/navigation';
import { ConfigProvider } from './config';
import {
	ConfirmProvider,
	ErrorProvider,
	LayoutProvider,
	QueryClientProvider,
	ThemeProvider,
	NavigationProvider
} from '@/components/providers';
import { SessionProvider } from 'next-auth/react';
import { LoginModalProvider } from '@/components/auth/login-modal-provider';
import { CurrencyProvider } from '@/components/context';
import { TenantProvider } from '@/components/context/tenant-provider';

interface ProvidersProps {
	config: Config;
	children: React.ReactNode;
	dehydratedState?: unknown;
}

type ProviderMode = 'public' | 'app';

function getProviderMode(pathname: string): ProviderMode {
	const normalizedPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
	const appRoutes = ['/admin', '/client', '/dashboard', '/auth'];

	return appRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`))
		? 'app'
		: 'public';
}

function BaseProviders({
	config,
	children,
	dehydratedState
}: ProvidersProps) {
	const configDefaults = {
		defaultView: config.settings?.homepage?.default_view
	};

	return (
		<SessionProvider>
			<NavigationProvider>
				<QueryClientProvider dehydratedState={dehydratedState}>
					<CurrencyProvider>
						<LayoutProvider configDefaults={configDefaults}>
							<ErrorProvider>
								<ConfigProvider config={config}>
									<ThemeProvider>
										<HeroUIProvider>
											<LoginModalProvider />
											{children}
										</HeroUIProvider>
									</ThemeProvider>
								</ConfigProvider>
							</ErrorProvider>
						</LayoutProvider>
					</CurrencyProvider>
				</QueryClientProvider>
			</NavigationProvider>
		</SessionProvider>
	);
}

function AppProviders(props: ProvidersProps) {
	return (
		<TenantProvider>
			<ConfirmProvider>
				<BaseProviders {...props} />
			</ConfirmProvider>
		</TenantProvider>
	);
}

export function Providers(props: ProvidersProps) {
	const pathname = usePathname();
	const mode = getProviderMode(pathname);

	if (mode === 'app') {
		return <AppProviders {...props} />;
	}

	return <BaseProviders {...props} />;
}
