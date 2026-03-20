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

type ProviderMode = 'public' | 'commerce' | 'app';

function getProviderMode(pathname: string): ProviderMode {
	const normalizedPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
	const appRoutes = ['/admin', '/client', '/dashboard', '/auth'];
	const commerceRoutes = ['/pricing', '/submit', '/sponsor'];

	if (appRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`))) {
		return 'app';
	}

	if (commerceRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`))) {
		return 'commerce';
	}

	return 'public';
}

function ShellProviders({ config, children, dehydratedState }: ProvidersProps) {
	const configDefaults = {
		defaultView: config.settings?.homepage?.default_view
	};

	return (
		<NavigationProvider>
			<QueryClientProvider dehydratedState={dehydratedState}>
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
			</QueryClientProvider>
		</NavigationProvider>
	);
}

function PublicProviders(props: ProvidersProps) {
	return <ShellProviders {...props} />;
}

function CommerceProviders(props: ProvidersProps) {
	return (
		<CurrencyProvider>
			<ShellProviders {...props} />
		</CurrencyProvider>
	);
}

function AppProviders(props: ProvidersProps) {
	return (
		<SessionProvider>
			<TenantProvider>
				<CurrencyProvider>
					<ConfirmProvider>
						<ShellProviders {...props} />
					</ConfirmProvider>
				</CurrencyProvider>
			</TenantProvider>
		</SessionProvider>
	);
}

export function Providers(props: ProvidersProps) {
	const pathname = usePathname();
	const mode = getProviderMode(pathname);

	if (mode === 'app') return <AppProviders {...props} />;
	if (mode === 'commerce') return <CommerceProviders {...props} />;
	return <PublicProviders {...props} />;
}
