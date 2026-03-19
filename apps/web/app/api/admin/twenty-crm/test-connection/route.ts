import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TwentyCrmConfigRepository } from '@/lib/repositories/twenty-crm-config.repository';
import { TwentyCrmApiService } from '@/lib/services/twenty-crm-api.service';

const configRepository = new TwentyCrmConfigRepository();
const apiService = new TwentyCrmApiService();

/**
 * @swagger
 * /api/admin/twenty-crm/test-connection:
 *   post:
 *     tags: ["Admin - Twenty CRM"]
 *     summary: "Test Twenty CRM connection"
 *     description: "Tests connectivity to Twenty CRM API with the configured credentials. Returns connection status, latency, and diagnostic information. Handles timeouts (10s), authentication errors (401/403), rate limits (429), and server errors (5xx). Does not leak API keys in responses or logs. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Connection test completed (check 'ok' field for success/failure)"
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
 *                     ok:
 *                       type: boolean
 *                       description: "Whether the connection test succeeded"
 *                       example: true
 *                     latencyMs:
 *                       type: number
 *                       description: "Connection latency in milliseconds"
 *                       example: 245
 *                     message:
 *                       type: string
 *                       description: "Human-readable result message"
 *                       example: "Successfully connected to Twenty CRM"
 *                     details:
 *                       type: object
 *                       description: "Additional diagnostic information"
 *                       properties:
 *                         status:
 *                           type: number
 *                           description: "HTTP status code from Twenty CRM"
 *                           example: 200
 *                         error:
 *                           type: string
 *                           description: "Error type if connection failed"
 *                           example: "Unauthorized"
 *               required: ["success", "data"]
 *             examples:
 *               success:
 *                 summary: "Connection successful"
 *                 value:
 *                   success: true
 *                   data:
 *                     ok: true
 *                     latencyMs: 245
 *                     message: "Successfully connected to Twenty CRM"
 *                     details:
 *                       status: 200
 *               authFailed:
 *                 summary: "Authentication failed"
 *                 value:
 *                   success: true
 *                   data:
 *                     ok: false
 *                     latencyMs: 312
 *                     message: "Authentication failed - invalid API key"
 *                     details:
 *                       status: 401
 *                       error: "Unauthorized"
 *               timeout:
 *                 summary: "Connection timeout"
 *                 value:
 *                   success: true
 *                   data:
 *                     ok: false
 *                     latencyMs: 10000
 *                     message: "Connection timeout after 10s"
 *                     details:
 *                       error: "Timeout"
 *               rateLimit:
 *                 summary: "Rate limit exceeded"
 *                 value:
 *                   success: true
 *                   data:
 *                     ok: false
 *                     latencyMs: 156
 *                     message: "Rate limit exceeded - too many requests"
 *                     details:
 *                       status: 429
 *                       error: "Rate Limited"
 *               serverError:
 *                 summary: "Twenty CRM server error"
 *                 value:
 *                   success: true
 *                   data:
 *                     ok: false
 *                     latencyMs: 523
 *                     message: "Twenty CRM server error - service may be down"
 *                     details:
 *                       status: 503
 *                       error: "Server Error"
 *               networkError:
 *                 summary: "Network unreachable"
 *                 value:
 *                   success: true
 *                   data:
 *                     ok: false
 *                     latencyMs: 89
 *                     message: "Cannot reach Twenty CRM server - check network or base URL"
 *                     details:
 *                       error: "Network Error"
 *       400:
 *         description: "No configuration found"
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
 *                   example: "No Twenty CRM configuration found. Please configure Twenty CRM first."
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
 *                   example: "Failed to test connection"
 */
export async function POST() {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get raw configuration (unmasked API key for testing)
    const config = await configRepository.getRawConfig();

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: 'No Twenty CRM configuration found. Please configure Twenty CRM first.',
        },
        { status: 400 }
      );
    }

    // Test connection to Twenty CRM
    const result = await apiService.testConnection(config.baseUrl, config.apiKey);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error testing Twenty CRM connection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}
