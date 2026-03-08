'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

// ######################### Types #########################

export interface TenantData {
	id: string;
	name: string;
	website: string | null;
	domain: string | null;
	slug: string | null;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface TenantContextValue {
	tenant: TenantData | null;
	tenantId: string | null;
	isLoading: boolean;
	isError: boolean;
}

// ######################### Context #########################

const TenantContext = createContext<TenantContextValue | null>(null);

// ######################### Provider #########################

interface TenantProviderProps {
	children: ReactNode;
}

/**
 * Provides tenant context to the application.
 * Reads the tenantId from the NextAuth session and fetches
 * full tenant details from the API.
 */
export function TenantProvider({ children }: TenantProviderProps) {
	const { data: session, status } = useSession();
	const [tenant, setTenant] = useState<TenantData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);

	const tenantId = session?.user?.tenantId ?? null;

	useEffect(() => {
		// Skip while session is loading
		if (status === 'loading') return;

		// No session or no tenantId — nothing to fetch
		if (!tenantId) {
			setTenant(null);
			setIsError(false);
			setIsLoading(false);
			return;
		}

		let cancelled = false;

		async function fetchTenant() {
			setIsLoading(true);
			setIsError(false);

			try {
				const res = await fetch('/api/tenant');
				if (!res.ok) throw new Error(`Failed to fetch tenant: ${res.status}`);

				const data = await res.json();
				if (!cancelled) {
					setTenant(data.tenant ?? null);
				}
			} catch (error) {
				console.error('[TenantProvider] Error fetching tenant:', error);
				if (!cancelled) {
					setIsError(true);
					setTenant(null);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		}

		fetchTenant();

		return () => {
			cancelled = true;
		};
	}, [tenantId, status]);

	return <TenantContext.Provider value={{ tenant, tenantId, isLoading, isError }}>{children}</TenantContext.Provider>;
}

// ######################### Hook #########################

/**
 * Hook to access the current tenant context.
 * Must be used within a TenantProvider.
 */
export function useTenant(): TenantContextValue {
	const context = useContext(TenantContext);

	if (!context) {
		// Graceful fallback if not wrapped in provider
		return {
			tenant: null,
			tenantId: null,
			isLoading: false,
			isError: false
		};
	}

	return context;
}
