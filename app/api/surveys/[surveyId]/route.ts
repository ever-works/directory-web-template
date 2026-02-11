import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { surveyService } from '@/lib/services/survey.service';
import type { UpdateSurveyData } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/utils/api-error';

const logger = Logger.create('SurveyDetailAPI');

/**
 * @swagger
 * /api/surveys/{surveyId}:
 *   get:
 *     tags: ["Surveys"]
 *     summary: "Get survey by ID or slug"
 *     description: "Retrieve a specific survey by its ID or slug"
 *     parameters:
 *       - name: "surveyId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Survey ID or slug"
 *     responses:
 *       200:
 *         description: "Survey retrieved successfully"
 *       404:
 *         description: "Survey not found"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ surveyId: string }> }
) {
    try {
        const { surveyId } = await params;

        // Try to get by ID first, then by slug
        let survey = await surveyService.getOne(surveyId);
        if (!survey) {
            survey = await surveyService.getBySlug(surveyId);
        }

        if (!survey) {
            return NextResponse.json(
                { success: false, error: 'Survey not found' },
                { status: 404 }
            );
        }
        
        if (survey.status !== 'published') {
            const session = await auth();
            if (!session?.user?.isAdmin) {
                return NextResponse.json(
                    { success: false, error: 'Survey not found' },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            data: survey
        });
    } catch (error) {
        logger.error('Error fetching survey', error);

        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/surveys/{surveyId}:
 *   put:
 *     tags: ["Surveys"]
 *     summary: "Update survey by ID"
 *     description: "Update a survey by ID (admin only)"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "surveyId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Survey ID or slug"
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
 *               status:
 *                 type: string
 *                 enum: ["draft", "published", "closed"]
 *               surveyJson:
 *                 type: object
 *     responses:
 *       200:
 *         description: "Survey updated successfully"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Survey not found"
 *       500:
 *         description: "Internal server error"
 */
export async function PUT(
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
        const body: UpdateSurveyData = await request.json();

        // Get survey to find its slug
        let survey = await surveyService.getOne(surveyId);
        if (!survey) {
            survey = await surveyService.getBySlug(surveyId);
        }

        if (!survey) {
            return NextResponse.json(
                { success: false, error: 'Survey not found' },
                { status: 404 }
            );
        }

        const updatedSurvey = await surveyService.update(survey.id, body);

        return NextResponse.json({
            success: true,
            data: updatedSurvey,
            message: 'Survey updated successfully'
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Survey not found') {
            return NextResponse.json(
                { success: false, error: 'Survey not found' },
                { status: 404 }
            );
        }

        return safeErrorResponse(error, 'Failed to update survey');
    }
}

/**
 * @swagger
 * /api/surveys/{surveyId}:
 *   delete:
 *     tags: ["Surveys"]
 *     summary: "Delete survey by ID"
 *     description: "Delete a survey by ID (admin only)"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "surveyId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Survey ID or slug"
 *     responses:
 *       200:
 *         description: "Survey deleted successfully"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Survey not found"
 *       500:
 *         description: "Internal server error"
 */
export async function DELETE(
    _request: NextRequest,
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

        // Get survey to find its slug
        let survey = await surveyService.getOne(surveyId);
        if (!survey) {
            survey = await surveyService.getBySlug(surveyId);
        }

        if (!survey) {
            return NextResponse.json(
                { success: false, error: 'Survey not found' },
                { status: 404 }
            );
        }

        await surveyService.delete(survey.id);

        return NextResponse.json({
            success: true,
            data: null,
            message: 'Survey deleted successfully'
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Survey not found') {
            return NextResponse.json(
                { success: false, error: 'Survey not found' },
                { status: 404 }
            );
        }

        return safeErrorResponse(error, 'Failed to delete survey');
    }
}

