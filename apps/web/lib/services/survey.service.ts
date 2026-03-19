/**
 * Survey Service (SERVER-SIDE ONLY)
 * 
 * This service handles all survey-related business logic using direct database queries.
 * 
 * USAGE:
 * - API Routes (app/api)
 * - Server Components (app/[locale] pages and layouts)
 * - DO NOT use in Client Components (use surveyApiClient from lib/api/survey-api.client instead)
 * 
 * Standard CRUD Methods:
 * - create() - Create new survey
 * - getOne() - Get survey by ID
 * - getBySlug() - Get survey by slug
 * - getMany() - Get surveys with filters
 * - update() - Update survey by ID
 * - delete() - Delete survey by ID
 * 
 * Survey-Specific Methods:
 * - submitResponse() - Submit survey response
 * - getResponses() - Get survey responses
 * - getResponseById() - Get single response
 */

import * as queries from '@/lib/db/queries';
import type { Survey, NewSurvey, SurveyResponse, NewSurveyResponse } from '@/lib/db/schema';
import type {
  CreateSurveyData,
  UpdateSurveyData,
  SubmitResponseData,
  SurveyFilters,
  ResponseFilters,
} from '@/lib/types/survey';


export class SurveyService {
  /**
   * Create a new survey
   */
  async create(data: CreateSurveyData): Promise<Survey> {
    try {
      // Generate slug from title
      const slug = this.generateSlug(data.title);

      // Check if slug exists
      const existingSurvey = await queries.getSurveyBySlug(slug);
      const finalSlug = existingSurvey ? await this.ensureUniqueSlug(slug) : slug;

      const newSurvey: NewSurvey = {
        slug: finalSlug,
        title: data.title,
        description: data.description,
        type: data.type,
        itemId: data.itemId,
        status: data.status || 'draft',
        surveyJson: data.surveyJson,
        publishedAt: data.status === 'published' ? new Date() : undefined,
        closedAt: data.status === 'closed' ? new Date() : undefined,
      };

      return await queries.createSurvey(newSurvey);
    } catch (error) {
      // Check if error is database-related
      if (error instanceof Error && (
        error.message?.includes('DATABASE_URL') ||
        error.message?.includes('connect ECONNREFUSED') ||
        error.message?.includes('relation') ||
        error.message?.includes('database')
      )) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.error('[SurveyService] Database error in create:', error.message);
        }
        throw new Error('Database not configured');
      }
      throw error;
    }
  }

  /**
   * Get survey by slug
   */
  async getBySlug(slug: string): Promise<Survey | null> {
    return await queries.getSurveyBySlug(slug);
  }

  /**
   * Get survey by ID
   */
  async getOne(id: string): Promise<Survey | null> {
    return await queries.getSurveyById(id);
  }

  /**
   * Get surveys with filters
   * Uses efficient JOINs to get response count and completion status in a single query
   */
  async getMany(filters?: SurveyFilters, userId?: string) {
    try {
      const result = await queries.getSurveys({
        ...filters,
        userId,
        withResponseCount: true,
        withCompletionStatus: !!userId,
      });

      return {
        surveys: result.surveys,
        total: result.total,
        totalPages: result.totalPages,
        page: filters?.page || 1
      };
    } catch (error) {
      // Check if error is database-related
      if (error instanceof Error) {
        const msg = error.message || '';
        
        // Table doesn't exist - need to run migrations
        if (msg.includes('relation') && msg.includes('does not exist')) {
          console.error('[SurveyService] Surveys table does not exist. Run: pnpm db:migrate');
          throw new Error('Surveys table not found. Please run database migrations.');
        }
        
        // Connection errors
        if (msg.includes('DATABASE_URL') ||
            msg.includes('connect ECONNREFUSED') ||
            msg.includes('ENOTFOUND') ||
            msg.includes('connection')) {
          console.error('[SurveyService] Database connection error:', msg);
          throw new Error('Database connection failed');
        }
      }
      throw error;
    }
  }

  /**
   * Update survey
   */
  async update(id: string, data: UpdateSurveyData): Promise<Survey> {
    const survey = await queries.getSurveyById(id);

    if (!survey) {
      throw new Error('Survey not found');
    }

    if (data.slug) {
      const conflict = await queries.getSurveyBySlug(data.slug, id);
      if (conflict) {
        data.slug = await this.ensureUniqueSlug(data.slug, id);
      }
    }

    const updateData: Partial<Survey> = {
      ...data,
    };

    // Handle status changes
    if (data.status === 'published' && survey.status !== 'published') {
      updateData.publishedAt = new Date();
    }
    if (data.status === 'closed' && survey.status !== 'closed') {
      updateData.closedAt = new Date();
    }

    return await queries.updateSurvey(id, updateData);
  }

  /**
   * Delete survey
   */
  async delete(id: string): Promise<void> {
    const survey = await queries.getSurveyById(id);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check if survey has responses
    const responseCount = await queries.getSurveyResponseCount(survey.id);
    if (responseCount > 0) {
      throw new Error(`Cannot delete survey with ${responseCount} responses`);
    }

    await queries.deleteSurvey(id);
  }

  /**
   * Submit survey response
   */
  async submitResponse(data: SubmitResponseData): Promise<SurveyResponse> {
    const survey = await queries.getSurveyById(data.surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.status !== 'published') {
      throw new Error(`Survey is ${survey.status} and not accepting responses`);
    }

    const newResponse: NewSurveyResponse = {
      surveyId: data.surveyId,
      userId: data.userId,
      itemId: data.itemId,
      data: data.data,
      completedAt: new Date(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    return await queries.createSurveyResponse(newResponse);
  }

  /**
   * Get survey responses
   */
  async getResponses(surveyId: string, filters?: ResponseFilters) {
    return await queries.getSurveyResponses(surveyId, filters);
  }

  /**
   * Get single response
   */
  async getResponseById(id: string): Promise<SurveyResponse | null> {
    return await queries.getSurveyResponseById(id);
  }

  /**
   * Generate URL-friendly slug from title
   * Handles Unicode characters, diacritics, and special characters
   * Examples:
   * - "Café Survey" → "cafe-survey"
   * - "Niño's Test" → "ninos-test"
   * - "中文调查" → "zhong-wen-diao-cha" (if normalized) or falls back to safe handling
   */
  private generateSlug(title: string): string {
    return title
      // Normalize Unicode to NFD (Canonical Decomposition)
      // This separates base characters from combining diacritical marks
      .normalize('NFD')
      // Remove combining diacritical marks (U+0300 to U+036F)
      .replace(/[\u0300-\u036f]/g, '')
      // Convert to lowercase
      .toLowerCase()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove any character that is not alphanumeric or hyphen
      .replace(/[^a-z0-9-]+/g, '-')
      // Collapse multiple consecutive hyphens into a single hyphen
      .replace(/-+/g, '-')
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, '')
      // If the result is empty (e.g., all non-Latin characters), use a fallback
      || 'survey';
  }

  /**
   * Ensure slug is unique by appending a number
   */
  private async ensureUniqueSlug(baseSlug: string, ignoreId?: string): Promise<string> {
    let counter = 2;
    let slug = `${baseSlug}-${counter}`;

    while (await queries.getSurveyBySlug(slug, ignoreId)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }
}

// Singleton instance
export const surveyService = new SurveyService();

