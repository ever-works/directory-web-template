import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { surveyService } from '@/lib/services/survey.service';
import type { CreateSurveyData, SurveyFilters, SurveyStatusEnum, SurveyTypeEnum } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

const logger = Logger.create('SurveyAPI');

/**
 * @swagger
 * /api/surveys:
 *   get:
 *     tags: ["Surveys"]
 *     summary: "Get surveys"
 *     description: "Retrieve surveys with optional filters"
 *     parameters:
 *       - name: "type"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["global", "item"]
 *         description: "Filter by survey type"
 *       - name: "itemId"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by item ID"
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["draft", "published", "closed"]
 *         description: "Filter by status"
 *       - name: "page"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number"
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: "Items per page"
 *     responses:
 *       200:
 *         description: "Surveys retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     surveys:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     page:
 *                       type: integer
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest) {
	try {
		// Check database availability first
		// Note: We check database directly rather than feature flags here.
		// This is intentional - the API validates actual capability (database availability)
		// while the client hook checks feature flags to prevent unnecessary calls.
		// This provides defense in depth: client optimization + server validation.
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		const { searchParams } = new URL(request.url);

		const typeParam = searchParams.get('type');
		const pageParam = searchParams.get('page');
		const limitParam = searchParams.get('limit');
		const statusParam = searchParams.get('status');

		const pageParsed = pageParam ? parseInt(pageParam, 10) : undefined;
		const limitParsed = limitParam ? parseInt(limitParam, 10) : undefined;
		const page =
			pageParsed !== undefined && Number.isInteger(pageParsed) && pageParsed >= 1 ? pageParsed : undefined;
		const limit =
			limitParsed !== undefined && Number.isInteger(limitParsed)
				? Math.min(100, Math.max(1, limitParsed))
				: undefined;

		// Require tenantId for survey queries
		if (!session?.user?.tenantId) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized - tenant context required' },
				{ status: 401 }
			);
		}

		const filters: SurveyFilters = {
			type: typeParam as SurveyTypeEnum,
			itemId: searchParams.get('itemId') || undefined,
			status: statusParam ? (statusParam as SurveyStatusEnum) : undefined,
			page,
			limit,
			tenantId: session.user.tenantId
		};

		const result = await surveyService.getMany(filters, session?.user?.id);

		return NextResponse.json({
			success: true,
			data: {
				surveys: result.surveys,
				total: result.total,
				totalPages: result.totalPages,
				page: result.page
			}
		});
	} catch (error) {
		// Log errors for debugging
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[API/surveys] Error:', errorMessage);

		// Check for common database errors
		if (
			errorMessage.includes('DATABASE_URL') ||
			errorMessage.includes('connect ECONNREFUSED') ||
			errorMessage.includes('connection') ||
			errorMessage.includes('ENOTFOUND')
		) {
			return NextResponse.json(
				{
					success: false,
					error: 'Database connection failed',
					code: 'DATABASE_CONNECTION_ERROR'
				},
				{ status: 503 }
			);
		}

		// Check for schema/table errors
		if (
			errorMessage.includes('relation') ||
			errorMessage.includes('does not exist') ||
			errorMessage.includes('undefined')
		) {
			return NextResponse.json(
				{
					success: false,
					error: 'Database schema not initialized. Run migrations.',
					code: 'DATABASE_SCHEMA_ERROR'
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}

/**
 * @swagger
 * /api/surveys:
 *   post:
 *     tags: ["Surveys"]
 *     summary: "Create survey"
 *     description: "Create a new survey (admin only)"
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ["global", "item"]
 *               itemId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: ["draft", "published", "closed"]
 *               surveyJson:
 *                 type: object
 *             required: ["title", "type", "surveyJson"]
 *     responses:
 *       201:
 *         description: "Survey created successfully"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest) {
	try {
		// Check database availability first
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const surveyData: CreateSurveyData = {
			...body,
			tenantId: session.user.tenantId!
		};
		const survey = await surveyService.create(surveyData);

		return NextResponse.json(
			{
				success: true,
				data: survey
			},
			{ status: 201 }
		);
	} catch (error) {
		// Only log errors in development mode
		if (process.env.NODE_ENV === 'development') {
			logger.error('Error creating survey', error);
		}
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to create survey'
			},
			{ status: 500 }
		);
	}
}
