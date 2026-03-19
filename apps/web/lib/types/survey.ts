/**
 * Shared Survey Types
 * 
 * This module contains all shared type definitions for surveys and survey responses.
 * These types are used by:
 * - Survey Service (lib/services/survey.service.ts)
 * - Survey API Client (lib/api/survey-api.client.ts)
 * - API Routes (app/api/surveys/*)
 * 
 * Single source of truth for survey-related data structures.
 */

/**
 * Data required to create a new survey
 */
export interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}

/**
 * Data for updating an existing survey
 */
export interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}

/**
 * Data for submitting a survey response
 */
export interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Filters for querying surveys
 */
export interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}

/**
 * Filters for querying survey responses
 */
export interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item'
} 

export enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed'
}
