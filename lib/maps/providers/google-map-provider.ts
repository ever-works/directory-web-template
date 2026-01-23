/**
 * Google Maps Provider
 *
 * Implementation of IMapProvider using Google Maps JavaScript API.
 *
 * @security Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (browser-exposed).
 * Only use HTTP referrer-restricted keys, never unrestricted or server keys.
 */

/// <reference types="@types/google.maps" />

import type {
	IMapProvider,
	IMapInstance,
	IMarkerInstance,
	IClustererInstance,
	IAutocompleteInstance,
	MapCreateOptions,
	MarkerCreateOptions
} from './map-provider.interface';
import type {
	Coordinates,
	MapBounds,
	MapMarkerData,
	ClusterOptions,
	AddressSuggestion
} from '../types';
import type { MapStyle } from '@/lib/types/location';
import type { MarkerClusterer } from '@googlemaps/markerclusterer';

// ######################### Google Map Instance #########################

class GoogleMapInstance implements IMapInstance {
	private map: google.maps.Map;
	private eventListeners: Map<string, google.maps.MapsEventListener[]>;

	constructor(map: google.maps.Map) {
		this.map = map;
		this.eventListeners = new Map();
	}

	setCenter(coordinates: Coordinates): void {
		this.map.setCenter({ lat: coordinates.latitude, lng: coordinates.longitude });
	}

	setZoom(zoom: number): void {
		this.map.setZoom(zoom);
	}

	getCenter(): Coordinates {
		const center = this.map.getCenter();
		if (!center) {
			return { latitude: 0, longitude: 0 };
		}
		return { latitude: center.lat(), longitude: center.lng() };
	}

	getZoom(): number {
		return this.map.getZoom() ?? 10;
	}

	getBounds(): MapBounds | null {
		const bounds = this.map.getBounds();
		if (!bounds) return null;
		const ne = bounds.getNorthEast();
		const sw = bounds.getSouthWest();
		return {
			north: ne.lat(),
			south: sw.lat(),
			east: ne.lng(),
			west: sw.lng()
		};
	}

	fitBounds(bounds: MapBounds, padding = 50): void {
		const googleBounds = new google.maps.LatLngBounds(
			{ lat: bounds.south, lng: bounds.west },
			{ lat: bounds.north, lng: bounds.east }
		);
		this.map.fitBounds(googleBounds, padding);
	}

	resize(): void {
		google.maps.event.trigger(this.map, 'resize');
	}

	on(event: string, handler: (...args: unknown[]) => void): void {
		const listener = this.map.addListener(event, handler);
		const listeners = this.eventListeners.get(event) || [];
		listeners.push(listener);
		this.eventListeners.set(event, listeners);
	}

	off(event: string): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((listener) => {
				google.maps.event.removeListener(listener);
			});
			this.eventListeners.delete(event);
		}
	}

	destroy(): void {
		// Remove all listeners
		this.eventListeners.forEach((listeners) => {
			listeners.forEach((listener) => {
				google.maps.event.removeListener(listener);
			});
		});
		this.eventListeners.clear();
	}

	/** Get the underlying Google Map instance (for advanced usage) */
	getGoogleMap(): google.maps.Map {
		return this.map;
	}
}

// ######################### Google Marker Instance #########################

class GoogleMarkerInstance implements IMarkerInstance {
	private marker: google.maps.marker.AdvancedMarkerElement;
	private clickListener: google.maps.MapsEventListener | null = null;
	private dragEndListener: google.maps.MapsEventListener | null = null;
	private map: google.maps.Map | null = null;

	constructor(marker: google.maps.marker.AdvancedMarkerElement, map: google.maps.Map) {
		this.marker = marker;
		this.map = map;
	}

	setPosition(coordinates: Coordinates): void {
		this.marker.position = { lat: coordinates.latitude, lng: coordinates.longitude };
	}

	setDraggable(draggable: boolean): void {
		this.marker.gmpDraggable = draggable;
	}

	getPosition(): Coordinates {
		const position = this.marker.position;
		if (!position) {
			return { latitude: 0, longitude: 0 };
		}
		if (typeof position === 'object' && 'lat' in position) {
			if (typeof position.lat === 'function') {
				return {
					latitude: (position as google.maps.LatLng).lat(),
					longitude: (position as google.maps.LatLng).lng()
				};
			}
			return {
				latitude: position.lat as number,
				longitude: position.lng as number
			};
		}
		return { latitude: 0, longitude: 0 };
	}

	show(): void {
		if (this.map) {
			this.marker.map = this.map;
		}
	}

	hide(): void {
		this.marker.map = null;
	}

	remove(): void {
		if (this.clickListener) {
			google.maps.event.removeListener(this.clickListener);
		}
		if (this.dragEndListener) {
			google.maps.event.removeListener(this.dragEndListener);
		}
		this.marker.map = null;
	}

	onClick(handler: () => void): void {
		this.clickListener = this.marker.addListener('click', handler);
	}

	onDragEnd(handler: (coordinates: Coordinates) => void): void {
		this.dragEndListener = this.marker.addListener('dragend', () => {
			const position = this.getPosition();
			handler(position);
		});
	}

	/** Get the underlying Google marker instance */
	getGoogleMarker(): google.maps.marker.AdvancedMarkerElement {
		return this.marker;
	}
}

// ######################### Google Clusterer Instance #########################

class GoogleClustererInstance implements IClustererInstance {
	private map: google.maps.Map;
	private clusterer: MarkerClusterer | null = null;
	private markers: Map<string, google.maps.marker.AdvancedMarkerElement>;
	private markerData: Map<string, MapMarkerData>;
	private onClusterClick?: (cluster: {
		coordinates: Coordinates;
		markerIds: string[];
		expansionZoom: number;
	}) => void;

	constructor(
		map: google.maps.Map,
		_options: ClusterOptions,
		onClusterClick?: (cluster: {
			coordinates: Coordinates;
			markerIds: string[];
			expansionZoom: number;
		}) => void
	) {
		this.map = map;
		this.markers = new Map();
		this.markerData = new Map();
		this.onClusterClick = onClusterClick;

		this.initializeClusterer();
	}

	private async initializeClusterer(): Promise<void> {
		try {
			const { MarkerClusterer } = await import('@googlemaps/markerclusterer');

			this.clusterer = new MarkerClusterer({
				map: this.map,
				markers: [],
				onClusterClick: (_, cluster, map) => {
					if (this.onClusterClick) {
						const position = cluster.position;
						const clusterMarkers = cluster.markers || [];

						const markerIds = clusterMarkers
							.map((m) => {
								// Find the marker ID from our stored data
								for (const [id, marker] of this.markers) {
									if (marker === m) return id;
								}
								return null;
							})
							.filter((id): id is string => id !== null);

						this.onClusterClick({
							coordinates: { latitude: position.lat(), longitude: position.lng() },
							markerIds,
							expansionZoom: map.getZoom() ? map.getZoom()! + 2 : 14
						});
					} else {
						// Default: zoom to cluster bounds
						const bounds = cluster.bounds;
						if (bounds) {
							map.fitBounds(bounds);
						}
					}
				}
			});
		} catch (err) {
			console.error('Failed to load MarkerClusterer:', err);
		}
	}

	addMarkers(markersData: MapMarkerData[]): void {
		markersData.forEach((data) => {
			this.markerData.set(data.id, data);

			// Create marker element
			const content = document.createElement('div');
			content.className = 'map-marker';

			if (data.icon) {
				const img = document.createElement('img');
				img.src = data.icon;
				img.alt = data.title;
				img.className = 'w-8 h-8 rounded-full border-2 border-white shadow-md';
				content.appendChild(img);
			} else {
				// Default marker pin
				content.innerHTML = `
					<div class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
						<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
						</svg>
					</div>
				`;
			}

			const marker = new google.maps.marker.AdvancedMarkerElement({
				position: { lat: data.coordinates.latitude, lng: data.coordinates.longitude },
				content,
				title: data.title
			});

			this.markers.set(data.id, marker);
		});

		this.refresh();
	}

	removeMarkers(markerIds: string[]): void {
		markerIds.forEach((id) => {
			const marker = this.markers.get(id);
			if (marker) {
				marker.map = null;
				this.markers.delete(id);
				this.markerData.delete(id);
			}
		});
		this.refresh();
	}

	clearMarkers(): void {
		this.markers.forEach((marker) => {
			marker.map = null;
		});
		this.markers.clear();
		this.markerData.clear();
		this.refresh();
	}

	refresh(): void {
		if (this.clusterer) {
			this.clusterer.clearMarkers();
			this.clusterer.addMarkers(Array.from(this.markers.values()));
		}
	}

	destroy(): void {
		if (this.clusterer) {
			this.clusterer.clearMarkers();
		}
		this.markers.forEach((marker) => {
			marker.map = null;
		});
		this.markers.clear();
		this.markerData.clear();
	}
}

// ######################### Google Autocomplete Instance #########################

class GoogleAutocompleteInstance implements IAutocompleteInstance {
	private autocomplete: google.maps.places.Autocomplete | null = null;
	private listener: google.maps.MapsEventListener | null = null;
	private input: HTMLInputElement;
	private onSelectCallback: (suggestion: AddressSuggestion) => void;

	constructor(input: HTMLInputElement, onSelect: (suggestion: AddressSuggestion) => void) {
		this.input = input;
		this.onSelectCallback = onSelect;
		this.initializeAutocomplete();
	}

	private async initializeAutocomplete(): Promise<void> {
		try {
			// Wait for the places library to be available
			if (typeof google === 'undefined' || !google.maps?.places) {
				const { importLibrary } = await import('@googlemaps/js-api-loader');
				await importLibrary('places');
			}

			this.autocomplete = new google.maps.places.Autocomplete(this.input, {
				types: ['address'],
				fields: ['formatted_address', 'geometry', 'name', 'address_components']
			});

			this.listener = this.autocomplete.addListener('place_changed', () => {
				const place = this.autocomplete?.getPlace();
				if (!place || !place.geometry?.location) return;

				const addressComponents = place.address_components || [];
				const getComponent = (type: string) =>
					addressComponents.find((c: google.maps.GeocoderAddressComponent) =>
						c.types.includes(type)
					)?.long_name || '';

				const suggestion: AddressSuggestion = {
					id: place.place_id || crypto.randomUUID(),
					mainText: place.name || getComponent('street_number') + ' ' + getComponent('route'),
					secondaryText: `${getComponent('locality')}, ${getComponent('administrative_area_level_1')}`,
					fullAddress: place.formatted_address || '',
					coordinates: {
						latitude: place.geometry.location.lat(),
						longitude: place.geometry.location.lng()
					}
				};

				this.onSelectCallback(suggestion);
			});
		} catch (err) {
			console.error('Failed to initialize Google Places Autocomplete:', err);
		}
	}

	clear(): void {
		this.input.value = '';
	}

	destroy(): void {
		if (this.listener) {
			google.maps.event.removeListener(this.listener);
		}
		// Clear the autocomplete
		if (this.autocomplete) {
			google.maps.event.clearInstanceListeners(this.autocomplete);
		}
	}
}

// ######################### Google Maps Provider #########################

let googleMapsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export class GoogleMapProvider implements IMapProvider {
	readonly name = 'google' as const;

	isLoaded(): boolean {
		return googleMapsLoaded && typeof google !== 'undefined' && typeof google.maps !== 'undefined';
	}

	async loadScript(): Promise<void> {
		if (this.isLoaded()) return;

		if (loadingPromise) {
			return loadingPromise;
		}

		loadingPromise = (async () => {
			try {
				const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader');

				const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
				if (!apiKey) {
					throw new Error('Google Maps API key not configured');
				}

				setOptions({
					key: apiKey,
					v: 'weekly'
				});

				// Load required libraries
				await importLibrary('maps');
				await importLibrary('marker');
				await importLibrary('places');

				googleMapsLoaded = true;
			} catch (err) {
				loadingPromise = null;
				throw new Error('Failed to load Google Maps library');
			}
		})();

		return loadingPromise;
	}

	async createMap(container: HTMLElement, options: MapCreateOptions): Promise<IMapInstance> {
		await this.loadScript();

		const map = new google.maps.Map(container, {
			center: { lat: options.center.latitude, lng: options.center.longitude },
			zoom: options.zoom,
			mapTypeId: this.getStyleUrl(options.style),
			disableDefaultUI: true,
			zoomControl: options.controls?.showZoomControls !== false,
			fullscreenControl: options.controls?.showFullscreenControl ?? false,
			scaleControl: options.controls?.showScaleControl ?? false,
			mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
			gestureHandling: options.interactive !== false ? 'auto' : 'none'
		});

		// Wait for map to be idle
		await new Promise<void>((resolve) => {
			google.maps.event.addListenerOnce(map, 'idle', () => resolve());
		});

		return new GoogleMapInstance(map);
	}

	createMarker(map: IMapInstance, options: MarkerCreateOptions): IMarkerInstance {
		const googleMap = (map as GoogleMapInstance).getGoogleMap();

		// Create marker content
		const content = document.createElement('div');
		content.className = 'map-marker';

		if (options.icon) {
			if (typeof options.icon === 'string') {
				const img = document.createElement('img');
				img.src = options.icon;
				img.alt = options.data.title;
				img.className = 'w-8 h-8 rounded-full border-2 border-white shadow-md';
				content.appendChild(img);
			} else {
				content.appendChild(options.icon);
			}
		}

		const marker = new google.maps.marker.AdvancedMarkerElement({
			map: googleMap,
			position: { lat: options.data.coordinates.latitude, lng: options.data.coordinates.longitude },
			content: options.icon ? content : undefined,
			title: options.data.title,
			gmpDraggable: options.draggable
		});

		return new GoogleMarkerInstance(marker, googleMap);
	}

	createClusterer(
		map: IMapInstance,
		options: ClusterOptions,
		onClusterClick?: (cluster: {
			coordinates: Coordinates;
			markerIds: string[];
			expansionZoom: number;
		}) => void
	): IClustererInstance {
		const googleMap = (map as GoogleMapInstance).getGoogleMap();
		return new GoogleClustererInstance(googleMap, options, onClusterClick);
	}

	createAutocomplete(
		input: HTMLInputElement,
		onSelect: (suggestion: AddressSuggestion) => void
	): IAutocompleteInstance {
		return new GoogleAutocompleteInstance(input, onSelect);
	}

	getStyleUrl(style: MapStyle): string {
		return style === 'satellite' ? 'satellite' : 'roadmap';
	}

	isConfigured(): boolean {
		return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
	}
}
