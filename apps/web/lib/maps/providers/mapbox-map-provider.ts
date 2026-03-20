/**
 * Mapbox Map Provider
 *
 * Implementation of IMapProvider using Mapbox GL JS.
 *
 * @security Uses NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN (browser-exposed).
 * Only use public tokens (pk.*) with URL restrictions, never secret tokens (sk.*).
 */

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
import type mapboxgl from 'mapbox-gl';

// ######################### Mapbox Map Instance #########################

class MapboxMapInstance implements IMapInstance {
	private map: mapboxgl.Map;

	constructor(map: mapboxgl.Map) {
		this.map = map;
	}

	setCenter(coordinates: Coordinates): void {
		this.map.setCenter([coordinates.longitude, coordinates.latitude]);
	}

	setZoom(zoom: number): void {
		this.map.setZoom(zoom);
	}

	getCenter(): Coordinates {
		const center = this.map.getCenter();
		return { latitude: center.lat, longitude: center.lng };
	}

	getZoom(): number {
		return this.map.getZoom();
	}

	getBounds(): MapBounds | null {
		const bounds = this.map.getBounds();
		if (!bounds) return null;
		return {
			north: bounds.getNorth(),
			south: bounds.getSouth(),
			east: bounds.getEast(),
			west: bounds.getWest()
		};
	}

	fitBounds(bounds: MapBounds, padding = 50): void {
		this.map.fitBounds(
			[
				[bounds.west, bounds.south],
				[bounds.east, bounds.north]
			],
			{ padding }
		);
	}

	resize(): void {
		this.map.resize();
	}

	on(event: string, handler: (...args: unknown[]) => void): void {
		(this.map.on as Function)(event, handler);
	}

	off(event: string, handler: (...args: unknown[]) => void): void {
		(this.map.off as Function)(event, handler);
	}

	destroy(): void {
		this.map.remove();
	}

	/** Get the underlying Mapbox map instance (for advanced usage) */
	getMapboxMap(): mapboxgl.Map {
		return this.map;
	}
}

// ######################### Mapbox Marker Instance #########################

class MapboxMarkerInstance implements IMarkerInstance {
	private marker: mapboxgl.Marker;

	constructor(marker: mapboxgl.Marker) {
		this.marker = marker;
	}

	setPosition(coordinates: Coordinates): void {
		this.marker.setLngLat([coordinates.longitude, coordinates.latitude]);
	}

	setDraggable(draggable: boolean): void {
		this.marker.setDraggable(draggable);
	}

	getPosition(): Coordinates {
		const lngLat = this.marker.getLngLat();
		return { latitude: lngLat.lat, longitude: lngLat.lng };
	}

	show(): void {
		const el = this.marker.getElement();
		if (el) el.style.display = '';
	}

	hide(): void {
		const el = this.marker.getElement();
		if (el) el.style.display = 'none';
	}

	remove(): void {
		this.marker.remove();
	}

	onClick(handler: () => void): void {
		const el = this.marker.getElement();
		if (el) {
			el.addEventListener('click', handler);
		}
	}

	onDragEnd(handler: (coordinates: Coordinates) => void): void {
		this.marker.on('dragend', () => {
			const lngLat = this.marker.getLngLat();
			handler({ latitude: lngLat.lat, longitude: lngLat.lng });
		});
	}

	/** Get the underlying Mapbox marker instance */
	getMapboxMarker(): mapboxgl.Marker {
		return this.marker;
	}
}

// ######################### Mapbox Clusterer Instance #########################

class MapboxClustererInstance implements IClustererInstance {
	private map: mapboxgl.Map;
	private sourceId: string;
	private markers: Map<string, MapMarkerData>;
	private onClusterClick?: (cluster: {
		coordinates: Coordinates;
		markerIds: string[];
		expansionZoom: number;
	}) => void;

	constructor(
		map: mapboxgl.Map,
		options: ClusterOptions,
		onClusterClick?: (cluster: {
			coordinates: Coordinates;
			markerIds: string[];
			expansionZoom: number;
		}) => void
	) {
		this.map = map;
		this.sourceId = `cluster-source-${Date.now()}`;
		this.markers = new Map();
		this.onClusterClick = onClusterClick;

		this.initializeLayers(options);
	}

	private initializeLayers(options: ClusterOptions): void {
		// Add GeoJSON source with clustering
		this.map.addSource(this.sourceId, {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] },
			cluster: true,
			clusterMaxZoom: options.maxZoom ?? 14,
			clusterRadius: options.radius ?? 50
		});

		// Add cluster circles layer
		this.map.addLayer({
			id: `${this.sourceId}-clusters`,
			type: 'circle',
			source: this.sourceId,
			filter: ['has', 'point_count'],
			paint: {
				'circle-color': [
					'step',
					['get', 'point_count'],
					'#51bbd6',
					10,
					'#f1f075',
					50,
					'#f28cb1'
				],
				'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40]
			}
		});

		// Add cluster count labels
		this.map.addLayer({
			id: `${this.sourceId}-cluster-count`,
			type: 'symbol',
			source: this.sourceId,
			filter: ['has', 'point_count'],
			layout: {
				'text-field': ['get', 'point_count_abbreviated'],
				'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
				'text-size': 12
			}
		});

		// Add unclustered point layer
		this.map.addLayer({
			id: `${this.sourceId}-unclustered-point`,
			type: 'circle',
			source: this.sourceId,
			filter: ['!', ['has', 'point_count']],
			paint: {
				'circle-color': '#11b4da',
				'circle-radius': 8,
				'circle-stroke-width': 2,
				'circle-stroke-color': '#fff'
			}
		});

		// Handle cluster click
		this.map.on('click', `${this.sourceId}-clusters`, (e) => {
			const features = this.map.queryRenderedFeatures(e.point, {
				layers: [`${this.sourceId}-clusters`]
			});

			if (!features.length) return;

			const feature = features[0];
			const clusterId = feature.properties?.cluster_id as number;
			const geometry = feature.geometry as GeoJSON.Point;
			const coordinates = geometry.coordinates as [number, number];

			const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource;

			if (this.onClusterClick) {
				// Get cluster expansion zoom and leaves
				source.getClusterExpansionZoom(clusterId, (err, zoom) => {
					if (err) return;

					source.getClusterLeaves(clusterId, 100, 0, (err2, leaves) => {
						if (err2 || !leaves) return;

						const markerIds = leaves.map(
							(leaf) => (leaf.properties?.id as string) || ''
						);

						this.onClusterClick?.({
							coordinates: { latitude: coordinates[1], longitude: coordinates[0] },
							markerIds,
							expansionZoom: zoom ?? 14
						});
					});
				});
			} else {
				// Default behavior: zoom to expand
				source.getClusterExpansionZoom(clusterId, (err, zoom) => {
					if (err) return;
					this.map.easeTo({
						center: coordinates,
						zoom: zoom ?? 14
					});
				});
			}
		});

		// Change cursor on cluster hover
		this.map.on('mouseenter', `${this.sourceId}-clusters`, () => {
			this.map.getCanvas().style.cursor = 'pointer';
		});
		this.map.on('mouseleave', `${this.sourceId}-clusters`, () => {
			this.map.getCanvas().style.cursor = '';
		});
	}

	addMarkers(markers: MapMarkerData[]): void {
		markers.forEach((m) => this.markers.set(m.id, m));
		this.refresh();
	}

	removeMarkers(markerIds: string[]): void {
		markerIds.forEach((id) => this.markers.delete(id));
		this.refresh();
	}

	clearMarkers(): void {
		this.markers.clear();
		this.refresh();
	}

	refresh(): void {
		const features: GeoJSON.Feature<GeoJSON.Point>[] = Array.from(this.markers.values()).map(
			(m) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [m.coordinates.longitude, m.coordinates.latitude]
				},
				properties: {
					id: m.id,
					title: m.title,
					slug: m.slug,
					category: m.category,
					icon: m.icon
				}
			})
		);

		const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource;
		if (source) {
			source.setData({ type: 'FeatureCollection', features });
		}
	}

	destroy(): void {
		// Remove layers
		if (this.map.getLayer(`${this.sourceId}-clusters`)) {
			this.map.removeLayer(`${this.sourceId}-clusters`);
		}
		if (this.map.getLayer(`${this.sourceId}-cluster-count`)) {
			this.map.removeLayer(`${this.sourceId}-cluster-count`);
		}
		if (this.map.getLayer(`${this.sourceId}-unclustered-point`)) {
			this.map.removeLayer(`${this.sourceId}-unclustered-point`);
		}
		// Remove source
		if (this.map.getSource(this.sourceId)) {
			this.map.removeSource(this.sourceId);
		}
	}
}

// ######################### Mapbox Autocomplete Instance #########################

class MapboxAutocompleteInstance implements IAutocompleteInstance {
	private input: HTMLInputElement;
	private onSelect: (suggestion: AddressSuggestion) => void;
	private abortController: AbortController | null = null;
	private dropdown: HTMLDivElement | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(input: HTMLInputElement, onSelect: (suggestion: AddressSuggestion) => void) {
		this.input = input;
		this.onSelect = onSelect;
		this.setupAutocomplete();
	}

	private setupAutocomplete(): void {
		// Create dropdown container
		this.dropdown = document.createElement('div');
		this.dropdown.className =
			'absolute z-50 w-full mt-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/6 rounded-lg shadow-lg max-h-60 overflow-auto hidden';
		this.input.parentElement?.appendChild(this.dropdown);

		// Make parent relative if not already
		if (this.input.parentElement) {
			const parentStyle = getComputedStyle(this.input.parentElement);
			if (parentStyle.position === 'static') {
				this.input.parentElement.style.position = 'relative';
			}
		}

		// Add input listener
		this.input.addEventListener('input', this.handleInput);
		this.input.addEventListener('blur', this.handleBlur);
	}

	private handleInput = (): void => {
		const query = this.input.value.trim();

		if (query.length < 3) {
			this.hideDropdown();
			return;
		}

		// Debounce
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => this.fetchSuggestions(query), 300);
	};

	private handleBlur = (): void => {
		// Delay to allow click on dropdown
		setTimeout(() => this.hideDropdown(), 200);
	};

	private async fetchSuggestions(query: string): Promise<void> {
		// Cancel previous request
		if (this.abortController) {
			this.abortController.abort();
		}
		this.abortController = new AbortController();

		const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
		if (!accessToken) return;

		try {
			const response = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&autocomplete=true&limit=5`,
				{ signal: this.abortController.signal }
			);

			if (!response.ok) return;

			const data = await response.json();
			this.showSuggestions(data.features || []);
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				console.error('Autocomplete error:', err);
			}
		}
	}

	private showSuggestions(
		features: Array<{
			id: string;
			place_name: string;
			text: string;
			context?: Array<{ text: string }>;
			center: [number, number];
		}>
	): void {
		if (!this.dropdown || features.length === 0) {
			this.hideDropdown();
			return;
		}

		this.dropdown.innerHTML = '';
		this.dropdown.classList.remove('hidden');

		features.forEach((feature) => {
			const item = document.createElement('button');
			item.type = 'button';
			item.className =
				'w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/6 text-sm';

			const mainText = feature.text;
			const secondaryText = feature.context?.map((c) => c.text).join(', ') || '';

			const mainDiv = document.createElement('div');
			mainDiv.className = 'font-medium text-gray-900 dark:text-gray-100';
			mainDiv.textContent = mainText;
			item.appendChild(mainDiv);
			if (secondaryText) {
				const secDiv = document.createElement('div');
				secDiv.className = 'text-gray-500 dark:text-gray-400 text-xs';
				secDiv.textContent = secondaryText;
				item.appendChild(secDiv);
			}

			item.addEventListener('click', () => {
				const suggestion: AddressSuggestion = {
					id: feature.id,
					mainText,
					secondaryText,
					fullAddress: feature.place_name,
					coordinates: {
						latitude: feature.center[1],
						longitude: feature.center[0]
					}
				};

				this.input.value = feature.place_name;
				this.hideDropdown();
				this.onSelect(suggestion);
			});

			this.dropdown?.appendChild(item);
		});
	}

	private hideDropdown(): void {
		if (this.dropdown) {
			this.dropdown.classList.add('hidden');
		}
	}

	clear(): void {
		this.input.value = '';
		this.hideDropdown();
	}

	destroy(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		if (this.abortController) {
			this.abortController.abort();
		}
		this.input.removeEventListener('input', this.handleInput);
		this.input.removeEventListener('blur', this.handleBlur);
		if (this.dropdown) {
			this.dropdown.remove();
		}
	}
}

// ######################### Mapbox Provider #########################

// Module-level state for the Mapbox library
let mapboxglModule: typeof mapboxgl | null = null;
let loadingPromise: Promise<void> | null = null;

export class MapboxMapProvider implements IMapProvider {
	readonly name = 'mapbox' as const;

	isLoaded(): boolean {
		return mapboxglModule !== null;
	}

	async loadScript(): Promise<void> {
		if (mapboxglModule) return;

		if (loadingPromise) {
			return loadingPromise;
		}

		loadingPromise = (async () => {
			try {
				const module = await import('mapbox-gl');
				mapboxglModule = module.default as unknown as typeof mapboxgl;

				const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
				if (accessToken && mapboxglModule) {
					(mapboxglModule as { accessToken: string }).accessToken = accessToken;
				}
			} catch (_err) {
				loadingPromise = null;
				throw new Error('Failed to load Mapbox GL JS library');
			}
		})();

		return loadingPromise;
	}

	async createMap(container: HTMLElement, options: MapCreateOptions): Promise<IMapInstance> {
		await this.loadScript();

		if (!mapboxglModule) {
			throw new Error('Mapbox GL JS not loaded');
		}

		const map = new mapboxglModule.Map({
			container,
			style: this.getStyleUrl(options.style),
			center: [options.center.longitude, options.center.latitude],
			zoom: options.zoom,
			interactive: options.interactive !== false
		});

		// Add controls
		if (options.controls?.showZoomControls !== false) {
			map.addControl(
				new mapboxglModule.NavigationControl({ showCompass: false }),
				'bottom-right'
			);
		}
		if (options.controls?.showFullscreenControl) {
			map.addControl(new mapboxglModule.FullscreenControl(), 'top-right');
		}
		if (options.controls?.showScaleControl) {
			map.addControl(new mapboxglModule.ScaleControl(), 'bottom-left');
		}

		// Wait for map to load
		await new Promise<void>((resolve, reject) => {
			map.on('load', () => resolve());
			map.on('error', (e) => reject(new Error(e.error?.message || 'Map load error')));
		});

		return new MapboxMapInstance(map);
	}

	createMarker(map: IMapInstance, options: MarkerCreateOptions): IMarkerInstance {
		if (!mapboxglModule) {
			throw new Error('Mapbox GL JS not loaded');
		}

		const mapboxMap = (map as MapboxMapInstance).getMapboxMap();

		// Create custom marker element if icon provided
		let element: HTMLElement | undefined;
		if (options.icon) {
			element = document.createElement('div');
			element.className = 'map-marker';
			if (typeof options.icon === 'string') {
				const img = document.createElement('img');
				img.src = options.icon;
				img.alt = options.data.title;
				img.className = 'w-8 h-8 rounded-full border-2 border-white shadow-md';
				element.appendChild(img);
			} else {
				element.appendChild(options.icon);
			}
		}

		const marker = new mapboxglModule.Marker({
			element,
			draggable: options.draggable
		})
			.setLngLat([options.data.coordinates.longitude, options.data.coordinates.latitude])
			.addTo(mapboxMap);

		return new MapboxMarkerInstance(marker);
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
		const mapboxMap = (map as MapboxMapInstance).getMapboxMap();
		return new MapboxClustererInstance(mapboxMap, options, onClusterClick);
	}

	createAutocomplete(
		input: HTMLInputElement,
		onSelect: (suggestion: AddressSuggestion) => void
	): IAutocompleteInstance {
		return new MapboxAutocompleteInstance(input, onSelect);
	}

	getStyleUrl(style: MapStyle): string {
		return style === 'satellite'
			? 'mapbox://styles/mapbox/satellite-streets-v12'
			: 'mapbox://styles/mapbox/streets-v12';
	}

	isConfigured(): boolean {
		return Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
	}
}
