import { BackgroundJobManager, JobStatus, JobMetrics } from './types';

/**
 * No-op job manager implementation for development mode
 * All operations are no-ops to skip background job execution during development
 */
export class NoOpJobManager implements BackgroundJobManager {
  private metrics: JobMetrics = {
    totalExecutions: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageJobDuration: 0,
    lastCleanup: new Date()
  };

  scheduleJob(_id: string, _name: string, _job: () => void | Promise<void>, _interval: number): void {
    // No-op: Skip job scheduling in development
  }

  scheduleCronJob(_id: string, _name: string, _job: () => void | Promise<void>, _cronExpression: string): void {
    // No-op: Skip job scheduling in development
  }

  async triggerJob(_id: string): Promise<void> {
    // No-op: Skip job execution in development
  }

  stopJob(_id: string): void {
    // No-op: Nothing to stop
  }

  stopAllJobs(): void {
    // No-op: Nothing to stop
  }

  getJobStatus(_id: string): JobStatus | undefined {
    return undefined;
  }

  getAllJobStatuses(): JobStatus[] {
    return [];
  }

  getJobMetrics(): JobMetrics {
    return { ...this.metrics };
  }
}
