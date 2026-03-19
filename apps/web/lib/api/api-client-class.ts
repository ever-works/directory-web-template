import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { API_CONSTANTS } from './constants';
import type {
	ApiEndpoint,
	QueryParams,
	RequestBody,
	PaginationParams,
	PaginatedResponse,
	ApiResponse,
	ApiClientConfig,
	ApiError,
	ApiResponseInterceptor
} from './types';

export class ApiClient {
	private readonly client: AxiosInstance;
	private accessToken?: string;

	constructor(config: ApiClientConfig = {}) {
		this.accessToken = config.accessToken;
		this.client = axios.create({
			baseURL: config.baseURL,
			// timeout: config.timeout || env.API_TIMEOUT,

			headers: {
				'Content-Type': API_CONSTANTS.HEADERS.CONTENT_TYPE,
				Accept: API_CONSTANTS.HEADERS.ACCEPT,
				Authorization: `Bearer ${config.accessToken}`,
				...config.headers
			},
			withCredentials: true,
			...config
		});

		this.setupInterceptors();
		this.tokenInterceptor();
	}

	private setupInterceptors(): void {
		this.client.interceptors.response.use((response) => response, this.handleResponseError);
	}

	private tokenInterceptor(): void {
		this.client.interceptors.request.use((config) => {
			if (this.accessToken) {
				config.headers['Authorization'] = `Bearer ${this.accessToken}`;
			}
			return config;
		});
	}

	private handleResponseError: ApiResponseInterceptor = async (error) => {
		// Type guard to check if error has response property
		if (error && typeof error === 'object' && 'response' in error) {
			const responseError = error as { response?: { status?: number } };
			if (responseError.response?.status === API_CONSTANTS.STATUS.UNAUTHORIZED) {
				if (typeof window !== 'undefined' && env.AUTH_ENDPOINT_LOGIN) {
					window.location.href = env.AUTH_ENDPOINT_LOGIN;
				}
			}
		}
		throw this.formatError(error);
	};

	private formatError(error: unknown): ApiError {
		if (error instanceof AxiosError && error.response?.data) {
			const errorData = error.response.data as Record<string, unknown>;
			const message = (errorData.message as string) || (errorData.error as string) || 'An error occurred';
			const code = errorData.code as string | undefined;
			const details = errorData.details as unknown;

			const formattedError = new Error(message) as ApiError;
			Object.assign(formattedError, {
				code,
				details,
				status: error.response.status
			});
			return formattedError;
		}
		return new Error(API_CONSTANTS.DEFAULT_ERROR_MESSAGE) as ApiError;
	}

	public async get<T>(endpoint: ApiEndpoint, params?: QueryParams, config?: AxiosRequestConfig): Promise<T> {
		const response = await this.client.get<ApiResponse<T>>(endpoint, {
			params,
			...config
		});

		if (!response.data.success) {
			throw new Error(response.data.error || 'Request failed');
		}

		return response.data.data;
	}

	public async post<T>(endpoint: ApiEndpoint, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
		const response = await this.client.post<ApiResponse<T>>(endpoint, data, config);

		if (!response.data.success) {
			throw new Error(response.data.error || 'Request failed');
		}

		return response.data.data;
	}

	public async put<T>(endpoint: ApiEndpoint, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
		const response = await this.client.put<ApiResponse<T>>(endpoint, data, config);

		if (!response.data.success) {
			throw new Error(response.data.error || 'Request failed');
		}

		return response.data.data;
	}

	public async patch<T>(endpoint: ApiEndpoint, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
		const response = await this.client.patch<ApiResponse<T>>(endpoint, data, config);

		if (!response.data.success) {
			throw new Error(response.data.error || 'Request failed');
		}

		return response.data.data;
	}

	public async delete<T>(endpoint: ApiEndpoint, config?: AxiosRequestConfig): Promise<T> {
		const response = await this.client.delete<ApiResponse<T>>(endpoint, config);

		if (!response.data.success) {
			throw new Error(response.data.error || 'Request failed');
		}

		return response.data.data;
	}

	public async getPaginated<T>(
		endpoint: ApiEndpoint,
		params: PaginationParams & QueryParams = {}
	): Promise<PaginatedResponse<T>> {
		const response = await this.client.get<PaginatedResponse<T>>(endpoint, { params });
		return response.data;
	}
}
