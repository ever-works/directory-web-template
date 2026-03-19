'use client';

import { createContext, useContext } from 'react';

/**
 * Context for providing item distance data from location filtering.
 * Used by Item components to display distance badges without prop threading.
 */
const LocationDistanceContext = createContext<Map<string, number>>(new Map());

interface LocationDistanceProviderProps {
	distances: Map<string, number>;
	children: React.ReactNode;
}

export function LocationDistanceProvider({ distances, children }: LocationDistanceProviderProps) {
	return (
		<LocationDistanceContext.Provider value={distances}>
			{children}
		</LocationDistanceContext.Provider>
	);
}

/**
 * Get the distance for a specific item.
 * Returns undefined if no location filter is active or item has no distance data.
 */
export function useItemDistance(slug: string): number | undefined {
	const distances = useContext(LocationDistanceContext);
	return distances.get(slug);
}
