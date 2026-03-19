export const API_CONSTANTS = {
	HEADERS: {
		CONTENT_TYPE: 'application/json',
		ACCEPT: 'application/json',
		AUTHORIZATION: 'Authorization'
	},
	STATUS: {
		UNAUTHORIZED: 401,
		FORBIDDEN: 403,
		NOT_FOUND: 404,
		SERVER_ERROR: 500
	},
	DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred'
} as const;

const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;

export const QUERY_CONFIG = {
	staleTime: 5 * ONE_MINUTE,
	gcTime: ONE_DAY,
	retry: 1,
	refetchOnWindowFocus: false
} as const;
