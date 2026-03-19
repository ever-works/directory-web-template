import { NextResponse } from "next/server";
import { triggerManualSync, getSyncStatus } from "@/lib/services/sync-service";
import { safeErrorMessage } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/version/sync:
 *   post:
 *     tags: ["System"]
 *     summary: "Trigger manual repository synchronization"
 *     description: "Manually triggers a background synchronization of the Git repository. Prevents concurrent sync operations and provides detailed status information including duration and success metrics."
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               options:
 *                 type: object
 *                 description: "Optional sync configuration (reserved for future use)"
 *                 additionalProperties: true
 *             example: {}
 *     responses:
 *       200:
 *         description: "Sync operation completed or was already in progress"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   title: "Successful Sync"
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: "Operation completion timestamp"
 *                       example: "2024-01-15T10:35:00.000Z"
 *                     duration:
 *                       type: number
 *                       description: "Operation duration in milliseconds"
 *                       example: 1250
 *                     message:
 *                       type: string
 *                       description: "Success message"
 *                       example: "Repository synchronized successfully"
 *                     details:
 *                       type: string
 *                       description: "Additional operation details"
 *                       example: "Updated 5 files, 3 commits ahead"
 *                   required: ["success", "timestamp", "duration", "message"]
 *                 - type: object
 *                   title: "Sync Already in Progress"
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:35:00.000Z"
 *                     duration:
 *                       type: number
 *                       example: 50
 *                     message:
 *                       type: string
 *                       example: "Sync was already in progress"
 *                     details:
 *                       type: string
 *                       example: "Another sync operation is currently running"
 *                   required: ["success", "timestamp", "duration", "message"]
 *             examples:
 *               successful_sync:
 *                 summary: "Successful repository sync"
 *                 value:
 *                   success: true
 *                   timestamp: "2024-01-15T10:35:00.000Z"
 *                   duration: 1250
 *                   message: "Repository synchronized successfully"
 *                   details: "Updated 5 files, 3 commits ahead"
 *               already_in_progress:
 *                 summary: "Sync already running"
 *                 value:
 *                   success: true
 *                   timestamp: "2024-01-15T10:35:00.000Z"
 *                   duration: 50
 *                   message: "Sync was already in progress"
 *                   details: "Another sync operation is currently running"
 *       500:
 *         description: "Sync operation failed"
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
 *                   description: "Error message"
 *                   example: "Manual sync request failed"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:35:00.000Z"
 *                 duration:
 *                   type: number
 *                   description: "Operation duration before failure"
 *                   example: 800
 *                 details:
 *                   type: string
 *                   description: "Detailed error information"
 *                   example: "Git fetch failed: network timeout"
 *               required: ["success", "error", "timestamp", "duration"]
 *   get:
 *     tags: ["System"]
 *     summary: "Get repository synchronization status"
 *     description: "Retrieves current synchronization status including progress indicators, last sync time, and system uptime information."
 *     responses:
 *       200:
 *         description: "Sync status retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 syncInProgress:
 *                   type: boolean
 *                   description: "Whether a sync operation is currently running"
 *                   example: false
 *                 lastSyncTime:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   description: "Timestamp of last successful sync"
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 timeSinceLastSync:
 *                   type: number
 *                   nullable: true
 *                   description: "Milliseconds since last sync"
 *                   example: 300000
 *                 timeSinceLastSyncHuman:
 *                   type: string
 *                   description: "Human-readable time since last sync"
 *                   example: "300s ago"
 *                 uptime:
 *                   type: number
 *                   description: "Server uptime in seconds"
 *                   example: 86400
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: "Current server timestamp"
 *                   example: "2024-01-15T10:35:00.000Z"
 *               required: ["syncInProgress", "timeSinceLastSyncHuman", "uptime", "timestamp"]
 *             examples:
 *               sync_idle:
 *                 summary: "No sync in progress"
 *                 value:
 *                   syncInProgress: false
 *                   lastSyncTime: "2024-01-15T10:30:00.000Z"
 *                   timeSinceLastSync: 300000
 *                   timeSinceLastSyncHuman: "300s ago"
 *                   uptime: 86400
 *                   timestamp: "2024-01-15T10:35:00.000Z"
 *               sync_in_progress:
 *                 summary: "Sync currently running"
 *                 value:
 *                   syncInProgress: true
 *                   lastSyncTime: "2024-01-15T10:30:00.000Z"
 *                   timeSinceLastSync: 60000
 *                   timeSinceLastSyncHuman: "60s ago"
 *                   uptime: 86400
 *                   timestamp: "2024-01-15T10:31:00.000Z"
 *               never_synced:
 *                 summary: "Never synchronized"
 *                 value:
 *                   syncInProgress: false
 *                   lastSyncTime: null
 *                   timeSinceLastSync: null
 *                   timeSinceLastSyncHuman: "never"
 *                   uptime: 3600
 *                   timestamp: "2024-01-15T10:35:00.000Z"
 *     x-concurrency:
 *       description: "Concurrency handling"
 *       behavior: "Prevents multiple simultaneous sync operations"
 *       status: "Returns success=true if sync already in progress"
 *     x-performance:
 *       description: "Performance monitoring"
 *       metrics: "Duration tracking for all operations"
 *       logging: "Detailed operation logging"
 */

// Types
interface SyncResponse {
  success: true;
  timestamp: string;
  duration: number;
  message: string;
  details?: string;
}

interface SyncError {
  success: false;
  error: string;
  timestamp: string;
  duration: number;
  details?: string;
}

// Helper function to create sync response
function createSyncResponse(
  success: boolean,
  message: string,
  duration: number,
  details?: string
): NextResponse {
  const response: SyncResponse | SyncError = success
    ? {
        success: true,
        timestamp: new Date().toISOString(),
        duration,
        message,
        ...(details && { details }),
      }
    : {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        duration,
        ...(details && { details }),
      };

  return NextResponse.json(response, {
    status: success ? 200 : 500,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}

// POST endpoint for manual sync trigger
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Parse request body for options
    let options = {};
    try {
      const body = await request.json();
      options = body || {};
    } catch {
      // Body is optional, ignore parsing errors
    }

    console.log("[SYNC_API] Manual sync triggered", options);

    const result = await triggerManualSync();
    const duration = Date.now() - startTime;

    return createSyncResponse(
      result.success,
      result.message,
      duration,
      result.details
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[SYNC_API] Manual sync request failed after ${duration}ms:`, error);

    return createSyncResponse(
      false,
      "Manual sync request failed",
      duration,
      safeErrorMessage(error, "Unknown error")
    );
  }
}

// GET endpoint for sync status
export async function GET() {
  const syncStatus = getSyncStatus();
  const now = new Date();
  const timeSinceLastSync = syncStatus.lastSyncTime ? now.getTime() - syncStatus.lastSyncTime.getTime() : null;

  const status = {
    syncInProgress: syncStatus.isRunning,
    lastSyncTime: syncStatus.lastSyncTime?.toISOString() || null,
    timeSinceLastSync,
    timeSinceLastSyncHuman: timeSinceLastSync
      ? `${Math.floor(timeSinceLastSync / 1000)}s ago`
      : "never",
    uptime: process.uptime(),
    timestamp: now.toISOString(),
  };

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}
