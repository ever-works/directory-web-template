import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TwentyCrmConfigRepository } from '@/lib/repositories/twenty-crm-config.repository';
import { validateTwentyCrmConfig } from '@/lib/utils/twenty-crm-validation';
import { logActivity } from '@/lib/db/queries/activity.queries';
import { ActivityType } from '@/lib/db/schema';

const configRepository = new TwentyCrmConfigRepository();

/**
 * @swagger
 * /api/admin/twenty-crm/config:
 *   get:
 *     tags: ["Admin - Twenty CRM"]
 *     summary: "Get Twenty CRM configuration"
 *     description: "Returns the Twenty CRM configuration with masked API key. Configuration from database takes precedence over environment variables. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Configuration retrieved successfully"
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
 *                       example: "config_123abc"
 *                     baseUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://api.twenty.com"
 *                     apiKey:
 *                       type: string
 *                       description: "Masked API key showing only last 4 characters"
 *                       example: "****key123"
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     syncMode:
 *                       type: string
 *                       enum: ["disabled", "platform", "direct_crm"]
 *                       example: "platform"
 *                     updatedBy:
 *                       type: string
 *                       nullable: true
 *                       example: "user_456def"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T10:30:00.000Z"
 *               required: ["success"]
 *             examples:
 *               withConfig:
 *                 summary: "Configuration exists"
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "config_123abc"
 *                     baseUrl: "https://api.twenty.com"
 *                     apiKey: "****key123"
 *                     enabled: true
 *                     syncMode: "platform"
 *                     updatedBy: "user_456def"
 *                     updatedAt: "2024-01-20T10:30:00.000Z"
 *               noConfig:
 *                 summary: "No configuration set"
 *                 value:
 *                   success: true
 *                   data: null
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Admin access required."
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve configuration"
 */
export async function GET() {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get configuration (merged from DB and env)
    const config = await configRepository.getConfig();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error retrieving Twenty CRM config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/twenty-crm/config:
 *   post:
 *     tags: ["Admin - Twenty CRM"]
 *     summary: "Save Twenty CRM configuration"
 *     description: "Creates or updates the Twenty CRM configuration. Validates all fields before saving. Logs the configuration change to activity logs. Returns the saved configuration with masked API key. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["baseUrl", "apiKey", "enabled", "syncMode"]
 *             properties:
 *               baseUrl:
 *                 type: string
 *                 format: uri
 *                 description: "Twenty CRM API base URL (must be valid http/https URL)"
 *                 example: "https://api.twenty.com"
 *               apiKey:
 *                 type: string
 *                 minLength: 10
 *                 description: "Twenty CRM API key (minimum 10 characters)"
 *                 example: "example_api_key_12345678"
 *               enabled:
 *                 type: boolean
 *                 description: "Whether Twenty CRM integration is enabled"
 *                 example: true
 *               syncMode:
 *                 type: string
 *                 enum: ["disabled", "platform", "direct_crm"]
 *                 description: "Sync mode for Twenty CRM integration"
 *                 example: "platform"
 *           example:
 *             baseUrl: "https://api.twenty.com"
 *             apiKey: "example_api_key_12345678"
 *             enabled: true
 *             syncMode: "platform"
 *     responses:
 *       200:
 *         description: "Configuration saved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Configuration saved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "config_123abc"
 *                     baseUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://api.twenty.com"
 *                     apiKey:
 *                       type: string
 *                       description: "Masked API key"
 *                       example: "****5678"
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     syncMode:
 *                       type: string
 *                       enum: ["disabled", "platform", "direct_crm"]
 *                       example: "platform"
 *                     updatedBy:
 *                       type: string
 *                       example: "user_456def"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T10:30:00.000Z"
 *               required: ["success", "message", "data"]
 *             example:
 *               success: true
 *               message: "Configuration saved successfully"
 *               data:
 *                 id: "config_123abc"
 *                 baseUrl: "https://api.twenty.com"
 *                 apiKey: "****5678"
 *                 enabled: true
 *                 syncMode: "platform"
 *                 updatedBy: "user_456def"
 *                 updatedAt: "2024-01-20T10:30:00.000Z"
 *       400:
 *         description: "Validation error - Invalid request data"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *             examples:
 *               invalidUrl:
 *                 summary: "Invalid base URL"
 *                 value:
 *                   success: false
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "baseUrl"
 *                       message: "Base URL must be a valid URL"
 *               invalidApiKey:
 *                 summary: "API key too short"
 *                 value:
 *                   success: false
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "apiKey"
 *                       message: "API key must be at least 10 characters"
 *               invalidSyncMode:
 *                 summary: "Invalid sync mode"
 *                 value:
 *                   success: false
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "syncMode"
 *                       message: "Sync mode must be one of: disabled, platform, direct_crm"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Admin access required."
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to save configuration"
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request data
    const validation = validateTwentyCrmConfig(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Save configuration (session.user.id is guaranteed to be string here)
    const savedConfig = await configRepository.saveConfig(
      validation.data,
      session.user.id
    );

    // Log activity
    await logActivity(
      ActivityType.UPDATE_TWENTY_CRM_CONFIG,
      session.user.id,
      'user',
      request.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      data: savedConfig,
    });
  } catch (error) {
    console.error('Error saving Twenty CRM config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
