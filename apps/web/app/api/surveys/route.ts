import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { isAdmin } from '@/lib/db/roles';
import { surveyService } from '@/lib/services/survey.service';
import { buildSurveyListFilters } from '@/lib/services/survey-list-filters';
import type { CreateSurveyData } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';

const _logger = Logger.create('SurveyAPI');

/**
 * @swagger
 * /api/surveys:
 *   get:
 *     tags: ["Surveys"]
 *     summary: "Get surveys"
 *     description: "Retrieve surveys with optional filters. Non-admins (including anonymous callers) only get published surveys: their status filter is always published. Unknown type or status values are ignored."
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
 *         description: "Filter by status (admins only; non-admins always get published)"
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

        // Non-admins only ever see published surveys, whatever `status` asks for.
        // The role comes from the database: the session's isAdmin claim is set at
        // sign-in and stays true for the JWT's lifetime after the role is removed.
        const userIsAdmin = session?.user?.id ? await isAdmin(session.user.id) : false;
        const filters = buildSurveyListFilters(searchParams, userIsAdmin);

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
        // Check for common database errors using raw error message for routing
        const rawMessage = error instanceof Error ? error.message : '';

        if (rawMessage.includes('DATABASE_URL') ||
            rawMessage.includes('connect ECONNREFUSED') ||
            rawMessage.includes('connection') ||
            rawMessage.includes('ENOTFOUND')) {
            return safeErrorResponse(error, 'Database connection failed', 503);
        }

        // Check for schema/table errors
        if (rawMessage.includes('relation') ||
            rawMessage.includes('does not exist') ||
            rawMessage.includes('undefined')) {
            return safeErrorResponse(error, 'Database schema not initialized. Run migrations.', 503);
        }

        return safeErrorResponse(error, 'Failed to fetch surveys');
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
 *       403:
 *         description: "Forbidden - the caller is not an admin"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest) {
    try {
        // Check database availability first
        const dbCheck = checkDatabaseAvailability();
        if (dbCheck) return dbCheck;

        const authError = await checkAdminAuth();
        if (authError) return authError;

        const body: CreateSurveyData = await request.json();
        const survey = await surveyService.create(body);

        return NextResponse.json({
            success: true,
            data: survey
        }, { status: 201 });
    } catch (error) {
        return safeErrorResponse(error, 'Failed to create survey');
    }
}

