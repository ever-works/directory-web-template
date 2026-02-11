import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { surveyService } from '@/lib/services/survey.service';
import { Logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/utils/api-error';

const logger = Logger.create('SurveyResponseDetailAPI');

/**
 * @swagger
 * /api/surveys/responses/{responseId}:
 *   get:
 *     tags: ["Surveys"]
 *     summary: "Get survey response by ID"
 *     description: "Retrieve a specific survey response (admin only)"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "responseId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Response ID"
 *     responses:
 *       200:
 *         description: "Response retrieved successfully"
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
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Response not found"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ responseId: string }> }
) {
    try {
        const session = await auth();
        
        if (!session?.user?.isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { responseId } = await params;
        const response = await surveyService.getResponseById(responseId);

        if (!response) {
            return NextResponse.json(
                { success: false, error: 'Response not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: response
        });
    } catch (error) {
        return safeErrorResponse(error, 'Failed to fetch response');
    }
}

