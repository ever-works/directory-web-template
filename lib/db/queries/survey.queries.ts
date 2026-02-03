/**
 * Survey Queries
 * Database queries for survey and survey response management
 */

import { db } from '../drizzle';
import {
	surveys,
	surveyResponses,
	type Survey,
	type NewSurvey,
	type SurveyResponse,
	type NewSurveyResponse
} from '../schema';
import { eq, and, desc, gte, lte, count, SQL, sql, not, isNull } from 'drizzle-orm';

// ==================== SURVEY QUERIES ====================

/**
 * Get surveys with filters and pagination
 */
export async function getSurveys(filters?: {
	type?: 'global' | 'item';
	itemId?: string;
	status?: 'draft' | 'published' | 'closed';
	page?: number;
	limit?: number;
	userId?: string;
	withResponseCount?: boolean;
	withCompletionStatus?: boolean;
	tenantId?: string;
}): Promise<{
	surveys: (Survey & { responseCount?: number; isCompletedByUser?: boolean })[];
	total: number;
	totalPages: number;
}> {
	const page = filters?.page || 1;
	const limit = filters?.limit || 10;
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [];

	// Exclude soft-deleted surveys
	conditions.push(isNull(surveys.deletedAt));

	if (filters?.type) {
		conditions.push(eq(surveys.type, filters.type));
	}
	if (filters?.itemId) {
		conditions.push(eq(surveys.itemId, filters.itemId));
	}
	if (filters?.status) {
		conditions.push(eq(surveys.status, filters.status));
	}
	if (filters?.tenantId) {
		conditions.push(eq(surveys.tenantId, filters.tenantId));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	// If we need response count or completion status, use JOIN
	if (filters?.withResponseCount || (filters?.withCompletionStatus && filters?.userId)) {
		// Build select object with proper typing
		const selectObj = {
			...surveys,
			...(filters.withResponseCount && {
				responseCount: count(surveyResponses.id)
			}),
			...(filters.withCompletionStatus &&
				filters.userId && {
					isCompletedByUser: sql<number>`COUNT(CASE WHEN ${surveyResponses.userId} = ${filters.userId} THEN 1 END)`
				})
		} as any;

		const surveysWithData = await db
			.select(selectObj)
			.from(surveys)
			.leftJoin(surveyResponses, eq(surveys.id, surveyResponses.surveyId))
			.where(where)
			.groupBy(surveys.id)
			.orderBy(desc(surveys.createdAt))
			.limit(limit)
			.offset(offset);

		// Get total count
		const totalCount = await db.select({ count: count() }).from(surveys).where(where);

		const total = totalCount[0]?.count || 0;

		const surveysList = surveysWithData.map((row: any) => {
			const { responseCount, isCompletedByUser, ...survey } = row;
			if (filters.withResponseCount) {
				(survey as any).responseCount = Number(responseCount ?? 0);
			}
			if (filters.withCompletionStatus && filters.userId) {
				(survey as any).isCompletedByUser = Number(isCompletedByUser ?? 0) > 0;
			}
			return survey as Survey & { responseCount?: number; isCompletedByUser?: boolean };
		});

		return {
			surveys: surveysList,
			total,
			totalPages: Math.ceil(total / limit)
		};
	}

	// Simple query without JOINs if not needed
	const [surveysList, totalCount] = await Promise.all([
		db.select().from(surveys).where(where).orderBy(desc(surveys.createdAt)).limit(limit).offset(offset),
		db.select({ count: count() }).from(surveys).where(where)
	]);

	const total = totalCount[0]?.count || 0;

	return {
		surveys: surveysList,
		total,
		totalPages: Math.ceil(total / limit)
	};
}

/**
 * Get survey by slug
 */
export async function getSurveyBySlug(slug: string, ignoreId?: string): Promise<Survey | null> {
	const conditions: SQL[] = [
		eq(surveys.slug, slug),
		isNull(surveys.deletedAt) // Exclude soft-deleted surveys
	];

	if (ignoreId) {
		conditions.push(not(eq(surveys.id, ignoreId)));
	}

	const [survey] = await db
		.select()
		.from(surveys)
		.where(and(...conditions))
		.limit(1);

	return survey || null;
}

/**
 * Get survey by ID
 */
export async function getSurveyById(id: string): Promise<Survey | null> {
	const [survey] = await db
		.select()
		.from(surveys)
		.where(
			and(
				eq(surveys.id, id),
				isNull(surveys.deletedAt) // Exclude soft-deleted surveys
			)
		)
		.limit(1);

	return survey || null;
}

/**
 * Create a new survey
 */
export async function createSurvey(survey: NewSurvey): Promise<Survey> {
	const [newSurvey] = await db.insert(surveys).values(survey).returning();
	return newSurvey;
}

/**
 * Update survey
 */
export async function updateSurvey(id: string, data: Partial<Survey>): Promise<Survey> {
	const [updatedSurvey] = await db
		.update(surveys)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(surveys.id, id))
		.returning();

	return updatedSurvey;
}

/**
 * Delete survey (soft delete)
 */
export async function deleteSurvey(id: string): Promise<void> {
	await db.update(surveys).set({ deletedAt: new Date() }).where(eq(surveys.id, id));
}

// ==================== SURVEY RESPONSE QUERIES ====================

/**
 * Create a new survey response
 */
export async function createSurveyResponse(response: NewSurveyResponse): Promise<SurveyResponse> {
	const [newResponse] = await db.insert(surveyResponses).values(response).returning();
	return newResponse;
}

/**
 * Get survey responses with filters
 */
export async function getSurveyResponses(
	surveyId: string,
	filters?: {
		itemId?: string;
		userId?: string;
		startDate?: string;
		endDate?: string;
		page?: number;
		limit?: number;
	}
): Promise<{ responses: SurveyResponse[]; total: number; totalPages: number }> {
	const page = filters?.page || 1;
	const limit = filters?.limit || 10;
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [eq(surveyResponses.surveyId, surveyId)];

	if (filters?.itemId) {
		conditions.push(eq(surveyResponses.itemId, filters.itemId));
	}
	if (filters?.userId) {
		conditions.push(eq(surveyResponses.userId, filters.userId));
	}
	if (filters?.startDate) {
		conditions.push(gte(surveyResponses.completedAt, new Date(filters.startDate)));
	}
	if (filters?.endDate) {
		conditions.push(lte(surveyResponses.completedAt, new Date(filters.endDate)));
	}

	const [responsesList, totalCount] = await Promise.all([
		db
			.select()
			.from(surveyResponses)
			.where(and(...conditions))
			.orderBy(desc(surveyResponses.completedAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: count() })
			.from(surveyResponses)
			.where(and(...conditions))
	]);

	const total = totalCount[0]?.count || 0;

	return {
		responses: responsesList,
		total,
		totalPages: Math.ceil(total / limit)
	};
}

/**
 * Get response by ID
 */
export async function getSurveyResponseById(id: string): Promise<SurveyResponse | null> {
	const [response] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, id)).limit(1);

	return response || null;
}

/**
 * Get survey response count
 */
export async function getSurveyResponseCount(surveyId: string): Promise<number> {
	const [result] = await db
		.select({ count: count() })
		.from(surveyResponses)
		.where(eq(surveyResponses.surveyId, surveyId));
	return Number(result?.count ?? 0);
}
