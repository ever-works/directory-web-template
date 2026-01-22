/**
 * Survey API Client
 * Frontend service for all survey-related API calls
 */

import type { Survey, SurveyResponse } from '@/lib/db/schema';
import { apiClient } from './api-client';
import type {
	CreateSurveyData,
	UpdateSurveyData,
	SurveyFilters,
	SubmitResponseData,
	ResponseFilters
} from '@/lib/types/survey';

// ==================== TYPES ====================

export interface GetManyResponse {
	surveys: (Survey & { responseCount: number; isCompletedByUser?: boolean })[];
	total: number;
	totalPages: number;
	page: number;
}

export interface GetResponsesResponse {
	responses: SurveyResponse[];
	total: number;
	totalPages: number;
}

export interface SurveyAnalytics {
	surveyId: string;
	surveySlug: string;
	totalResponses: number;
	lastResponseAt: string | null;
}

// ==================== API CLIENT ====================

export class SurveyApiClient {
	private baseUrl: string = '/api/surveys';
	private client = apiClient;

	// ==================== SURVEY CRUD ====================

	/**
	 * Get many surveys with filters
	 */
	async getMany(filters?: SurveyFilters): Promise<GetManyResponse> {
		const params = new URLSearchParams();
		if (filters?.type) params.append('type', filters.type);
		if (filters?.itemId) params.append('itemId', filters.itemId);
		if (filters?.status) params.append('status', filters.status);
		if (filters?.page) params.append('page', filters.page.toString());
		if (filters?.limit) params.append('limit', filters.limit.toString());

		const paramsStr = params.toString();
		const url = paramsStr ? `${this.baseUrl}?${paramsStr}` : this.baseUrl;
		return this.client.get<GetManyResponse>(url);
	}

	/**
	 * Get one survey by ID
	 */
	async getOne(id: string): Promise<Survey | null> {
		return this.client.get<Survey | null>(`${this.baseUrl}/${encodeURIComponent(id)}`);
	}

	/**
	 * Get survey by slug
	 */
	async getBySlug(slug: string): Promise<Survey | null> {
		return this.client.get<Survey | null>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
	}
	/**
	 * Create a new survey
	 */
	async create(data: CreateSurveyData): Promise<Survey> {
		return this.client.post<Survey>(this.baseUrl, data as any);
	}

	/**
	 * Update survey by ID
	 */
	async update(id: string, data: UpdateSurveyData): Promise<Survey> {
		return this.client.put<Survey>(`${this.baseUrl}/${encodeURIComponent(id)}`, data as any);
	}

	/**
	 * Delete survey by ID
	 */
	async delete(id: string): Promise<void> {
		await this.client.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
	}

	// ==================== SURVEY RESPONSES ====================

	/**
	 * Submit survey response
	 */
	async submitResponse(data: SubmitResponseData): Promise<SurveyResponse> {
		return this.client.post<SurveyResponse>(
			`${this.baseUrl}/${encodeURIComponent(data.surveyId)}/responses`,
			data as any
		);
	}

	/**
	 * Get survey responses with filters
	 */
	async getResponses(surveyId: string, filters?: ResponseFilters): Promise<GetResponsesResponse> {
		const params = new URLSearchParams();
		if (filters?.itemId) params.append('itemId', filters.itemId);
		if (filters?.userId) params.append('userId', filters.userId);
		if (filters?.startDate) params.append('startDate', filters.startDate);
		if (filters?.endDate) params.append('endDate', filters.endDate);
		if (filters?.page) params.append('page', filters.page.toString());
		if (filters?.limit) params.append('limit', filters.limit.toString());

		const paramsStr = params.toString();
		const url = `${this.baseUrl}/${encodeURIComponent(surveyId)}/responses${paramsStr ? `?${paramsStr}` : ''}`;
		return this.client.get<GetResponsesResponse>(url);
	}

	/**
	 * Get single response by ID
	 */
	async getResponse(responseId: string): Promise<SurveyResponse | null> {
		return this.client.get<SurveyResponse | null>(`${this.baseUrl}/responses/${encodeURIComponent(responseId)}`);
	}
}

// Singleton instance
export const surveyApiClient = new SurveyApiClient();
