/**
 * Map Components
 *
 * Interactive map components that work with the configured provider.
 */

export { Map } from './map';
export { MapErrorBoundary } from './map-error-boundary';
export { MapMarkerInternal, MapMarkerDisplay } from './map-marker';
export { ClusterDisplay, ClusterList, createClusterElement } from './map-cluster';
export { MapItemPopup, MapItemCard } from './map-item-popup';
export { LocationPicker } from './location-picker';

// Re-export types for convenience
export type {
	MapComponentProps,
	MapMarkerProps,
	MapMarkerData,
	MapClusterData,
	MapClusterProps,
	MapItemPopupProps,
	LocationPickerProps,
	LocationPickerValue,
	MapViewport,
	Coordinates,
	MapBounds,
	ServiceArea
} from '@/lib/maps/types';
