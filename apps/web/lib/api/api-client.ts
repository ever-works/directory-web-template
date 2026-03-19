import { getApiClient } from './singleton';
import type {
  ApiEndpoint,
  QueryParams,
  RequestBody,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  ErrorResponse,
  ApiClientConfig,
  ApiError
} from './types';

export const apiClient = getApiClient();

export const fetcherGet = async <T>(endpoint: string, params?: QueryParams): Promise<T> => {
  return apiClient.get<T>(endpoint, params);
};

export const fetcherPaginated = async <T>(
  endpoint: string,
  params: PaginationParams & QueryParams = {}
): Promise<PaginatedResponse<T>> => {
  return apiClient.getPaginated<T>(endpoint, params);
};

// Type exports
export type {
  ApiEndpoint,
  QueryParams,
  RequestBody,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  ErrorResponse,
  ApiClientConfig,
  ApiError
};
