import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { surveyService } from '@/lib/services/survey.service';
import type { SubmitResponseData, ResponseFilters } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/utils/api-error';

const logger = Logger.create('SurveyResponsesAPI');

/**
 * @swagger
 * /api/surveys/{surveyId}/responses:
 *   get:
 *     tags: ["Surveys"]
 *     summary: "Get survey responses"
 *     description: "Retrieve responses for a specific survey (admin only)"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "surveyId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Survey ID"
 *       - name: "itemId"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by item ID"
 *       - name: "userId"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by user ID"
 *       - name: "startDate"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter by start date"
 *       - name: "endDate"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter by end date"
 *       - name: "page"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *         description: "Page number"
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *         description: "Items per page"
 *     responses:
 *       200:
 *         description: "Responses retrieved successfully"
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
 *                     responses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           surveyId:
 *                             type: string
 *                           userId:
 *                             type: string
 *                             nullable: true
 *                           itemId:
 *                             type: string
 *                             nullable: true
 *                           data:
 *                             type: object
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                           ipAddress:
 *                             type: string
 *                             nullable: true
 *                           userAgent:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                       description: "Total number of responses"
 *                       example: 42
 *                     totalPages:
 *                       type: integer
 *                       description: "Total number of pages"
 *                       example: 5
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ surveyId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { surveyId } = await params;
        const { searchParams } = new URL(request.url);

        const toInt = (v: string | null) =>
            v && /^\d+$/.test(v) ? parseInt(v, 10) : undefined;

        const filters: ResponseFilters = {
            itemId: searchParams.get('itemId') || undefined,
            userId: searchParams.get('userId') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            page: toInt(searchParams.get('page')),
            limit: toInt(searchParams.get('limit')),
        };

        const responses = await surveyService.getResponses(surveyId, filters);

        return NextResponse.json({
            success: true,
            data: responses
        });
    } catch (error) {
        return safeErrorResponse(error, 'Failed to fetch responses');
    }
}

/**
 * @swagger
 * /api/surveys/{surveyId}/responses:
 *   post:
 *     tags: ["Surveys"]
 *     summary: "Submit survey response"
 *     description: "Submit a response to a published survey"
 *     parameters:
 *       - name: "surveyId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Survey ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               surveyId:
 *                 type: string
 *               data:
 *                 type: object
 *             required: ["surveyId", "data"]
 *     responses:
 *       201:
 *         description: "Response submitted successfully"
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
 *                     id:
 *                       type: string
 *                     surveyId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                       nullable: true
 *                     itemId:
 *                       type: string
 *                       nullable: true
 *                     data:
 *                       type: object
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                     ipAddress:
 *                       type: string
 *                       nullable: true
 *                     userAgent:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "Response submitted successfully"
 *       400:
 *         description: "Bad request"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ surveyId: string }> }
) {
    try {
        const { surveyId } = await params;

        const body = await request.json();

        if (!body || typeof body.data !== 'object' || body.data == null) {
            return NextResponse.json(
                { success: false, error: 'Invalid request body: "data" is required' },
                { status: 400 }
            );
        }

        const survey = await surveyService.getOne(surveyId);

        if (!survey) {
            return NextResponse.json(
                { success: false, error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Get user session if available
        const session = await auth();
        

        // Get IP address and user agent from request
        const forwardedFor = request.headers.get('x-forwarded-for') || '';
        const ipAddress =
            (forwardedFor.split(',')[0]?.trim()) ||
            request.headers.get('x-real-ip') ||
            'unknown';

        const userAgent = request.headers.get('user-agent') || 'unknown';

     


        const responseData: SubmitResponseData = {
            surveyId,
            userId: session?.user?.id,
            itemId: survey.itemId as string,
            data: body.data,
            ipAddress,
            userAgent
        };

        const response = await surveyService.submitResponse(responseData);

        return NextResponse.json({
            success: true,
            data: response,
            message: 'Response submitted successfully'
        }, { status: 201 });
    } catch (error) {
        return safeErrorResponse(error, 'Failed to submit response');
    }
}

