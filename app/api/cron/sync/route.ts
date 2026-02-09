import { NextResponse } from "next/server";
import { triggerManualSync } from "@/lib/services/sync-service";
import { integrationsConfig } from "@/lib/config/config-service";
import { safeErrorResponse } from "@/lib/utils/api-error";

/**
 * Vercel Cron endpoint for automatic content synchronization.
 * Triggered every minute by Vercel's cron system.
 *
 * This endpoint calls the same triggerManualSync() function used by
 * the manual sync endpoint, ensuring consistent behavior and
 * proper cache invalidation after successful sync.
 *
 * Authentication: Requires CRON_SECRET environment variable.
 * Vercel automatically sends this in the Authorization header for cron jobs.
 */

interface CronSyncResponse {
    success: boolean;
    timestamp: string;
    duration: number;
    message: string;
    details?: string;
}

export async function GET(request: Request): Promise<NextResponse> {
    const startTime = Date.now();

    // Verify cron secret for authentication
    const authHeader = request.headers.get("authorization");
    const cronSecret = integrationsConfig.cron.secret;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn("[CRON_SYNC] Unauthorized request - invalid or missing CRON_SECRET");
        return NextResponse.json(
            {
                success: false,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                message: "Unauthorized",
            },
            { status: 401 }
        );
    }

    try {
        console.log("[CRON_SYNC] Vercel cron sync triggered");

        const result = await triggerManualSync();
        const duration = Date.now() - startTime;

        const response: CronSyncResponse = {
            success: result.success,
            timestamp: new Date().toISOString(),
            duration,
            message: result.message,
            ...(result.details && { details: result.details }),
        };

        console.log(`[CRON_SYNC] Completed in ${duration}ms: ${result.message}`);

        return NextResponse.json(response, {
            status: result.success ? 200 : 500,
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (error) {
        return safeErrorResponse(error, "Cron sync failed");
    }
}
