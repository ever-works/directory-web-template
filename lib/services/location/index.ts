/**
 * Location Services Module
 *
 * Exports location calculation utilities and services.
 */

export {
	LocationService,
	getLocationService,
	resetLocationService,
	type Coordinates,
	type ItemWithLocation,
	type ItemWithDistance,
} from './location.service';

export {
	LocationIndexService,
	getLocationIndexService,
	resetLocationIndexService,
	type IndexItemResult,
	type RebuildIndexResult,
	type RadiusQueryOptions,
} from './location-index.service';
