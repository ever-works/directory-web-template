/**
 * Pagination validation utility
 * Shared validation logic for pagination parameters across admin API routes
 */

export interface PaginationParams {
	page: number;
	limit: number;
}

export interface PaginationError {
	error: string;
	status: 400;
}

/**
 * Validates pagination parameters from URL search params
 * @param searchParams - URLSearchParams from the request
 * @returns PaginationParams if valid, PaginationError if invalid
 */
export function validatePaginationParams(
	searchParams: URLSearchParams
): PaginationParams | PaginationError {
	const pageParam = searchParams.get('page');
	const limitParam = searchParams.get('limit');

	const page = pageParam ? parseInt(pageParam, 10) : 1;
	const limit = limitParam ? parseInt(limitParam, 10) : 10;

	// Validate page parameter
	if (isNaN(page) || page < 1) {
		return {
			error: 'Invalid page parameter. Must be a positive integer.',
			status: 400
		};
	}

	// Validate limit parameter
	if (isNaN(limit) || limit < 1 || limit > 100) {
		return {
			error: 'Invalid limit parameter. Must be between 1 and 100.',
			status: 400
		};
	}

	return { page, limit };
}
