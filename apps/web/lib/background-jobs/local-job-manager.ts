import { BackgroundJobManager, JobStatus, JobMetrics } from './types';
import { coreConfig } from '@/lib/config/config-service';

/**
 * Local job manager implementation using setInterval/setTimeout
 * Used for development and fallback when Trigger.dev is not configured
 */
export class LocalJobManager implements BackgroundJobManager {
  private jobs: Map<string, ReturnType<typeof setInterval>> = new Map();
  private jobStatuses: Map<string, JobStatus> = new Map();
  private jobFunctions: Map<string, () => Promise<void>> = new Map();
  private jobIntervals: Map<string, number> = new Map();
  
  private metrics: JobMetrics = {
    totalExecutions: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageJobDuration: 0,
    lastCleanup: new Date()
  };

  /**
   * Schedule a job to run at regular intervals
   */
  scheduleJob(id: string, name: string, job: () => Promise<void>, interval: number): void {
    // Clear existing job if it exists
    this.stopJob(id);

    const jobStatus: JobStatus = {
      id,
      name,
      status: 'scheduled',
      lastRun: null,
      nextRun: new Date(Date.now() + interval),
      duration: 0
    };

    this.jobStatuses.set(id, jobStatus);
    this.jobFunctions.set(id, job);
    this.jobIntervals.set(id, interval);

    const timeout = setInterval(async () => {
      await this.executeJob(id);
    }, interval);

    this.jobs.set(id, timeout);

    // Reduce logging in development mode
    if (coreConfig.NODE_ENV !== 'development') {
      console.log(`📝 Scheduled job: ${name} (${id}) - Interval: ${interval}ms`);
    }
  }

  /**
   * Schedule a job using cron expression (converted to interval)
   */
  scheduleCronJob(id: string, name: string, job: () => Promise<void>, cronExpression: string): void {
    const interval = this.cronToInterval(cronExpression);
    this.scheduleJob(id, name, job, interval);
  }

  /**
   * Execute a job
   */
  private async executeJob(id: string): Promise<void> {
    const jobStatus = this.jobStatuses.get(id);
    const jobFunction = this.jobFunctions.get(id);
    
    if (!jobStatus || !jobFunction) return;

    if (jobStatus.status === 'running') {
      // Reduce logging in development mode
      if (coreConfig.NODE_ENV !== 'development') {
        console.log(`Job ${id} is already running, skipping execution`);
      }
      return;
    }

    const startTime = Date.now();
    jobStatus.status = 'running';
    jobStatus.lastRun = new Date();

    try {
      await jobFunction();
      
      jobStatus.status = 'completed';
      jobStatus.error = undefined;
      jobStatus.duration = Date.now() - startTime;
      {
        const interval = this.jobIntervals.get(id);
        if (typeof interval === 'number') {
          const base = jobStatus.nextRun ?? new Date();
          jobStatus.nextRun = new Date(base.getTime() + interval);
        } else {
          jobStatus.nextRun = new Date();
        }
      }
      
      this.metrics.successfulJobs++;
      this.metrics.totalExecutions++;
      this.updateAverageJobDuration(jobStatus.duration);

      // Reduce logging in development mode
      if (coreConfig.NODE_ENV !== 'development') {
        console.log(`✅ Job ${id} completed successfully in ${jobStatus.duration}ms`);
      }
    } catch (error) {
      jobStatus.status = 'failed';
      jobStatus.duration = Date.now() - startTime;
      jobStatus.error = error instanceof Error ? error.message : 'Unknown error';
      {
        const interval = this.jobIntervals.get(id);
        if (typeof interval === 'number') {
          const base = jobStatus.nextRun ?? new Date();
          jobStatus.nextRun = new Date(base.getTime() + interval);
        } else {
          jobStatus.nextRun = new Date();
        }
      }
      
      this.metrics.failedJobs++;
      this.metrics.totalExecutions++;
      this.updateAverageJobDuration(jobStatus.duration);

      // Always log errors regardless of environment
      console.error(`❌ Job ${id} failed:`, error);
    }
  }

  /**
   * Convert cron expression to interval (simplified)
   */
  private cronToInterval(cronExpression: string): number {
    // Simplified dev-only cron→interval mapping (non-deterministic for time-of-day schedules)
    if (cronExpression.includes('*/30 * * * * *')) return 30 * 1000; // 30 seconds
    if (cronExpression.includes('*/2 * * * *')) return 2 * 60 * 1000; // 2 minutes
    if (cronExpression.includes('*/5 * * * *')) return 5 * 60 * 1000; // 5 minutes
    if (cronExpression.includes('*/10 * * * *')) return 10 * 60 * 1000; // 10 minutes
    if (cronExpression.includes('*/15 * * * *')) return 15 * 60 * 1000; // 15 minutes
    if (cronExpression.includes('0 * * * *')) return 60 * 60 * 1000; // hourly (approximate)
    if (cronExpression.includes('0 9 * * *')) return 24 * 60 * 60 * 1000; // daily (approximate; not time-accurate)
    return 60 * 1000; // Default 1 minute
  }

  /**
   * Update average job duration
   */
  private updateAverageJobDuration(duration: number): void {
    if (this.metrics.totalExecutions === 1) {
      this.metrics.averageJobDuration = duration;
    } else {
      this.metrics.averageJobDuration = 
        (this.metrics.averageJobDuration * (this.metrics.totalExecutions - 1) + duration) / this.metrics.totalExecutions;
    }
  }

  /**
   * Manually trigger a job execution
   */
  async triggerJob(id: string): Promise<void> {
    const jobFunction = this.jobFunctions.get(id);
    if (!jobFunction) {
      throw new Error(`Job ${id} not found`);
    }

    // Reduce logging in development mode
    if (coreConfig.NODE_ENV !== 'development') {
      console.log(`🔄 Manually triggering job: ${id}`);
    }
    await this.executeJob(id);
  }

  /**
   * Stop a specific job
   */
  stopJob(id: string): void {
    const timeout = this.jobs.get(id);
    if (timeout) {
      clearInterval(timeout);
      this.jobs.delete(id);
      this.jobFunctions.delete(id);
      this.jobIntervals.delete(id);
      this.jobStatuses.delete(id);

      // Reduce logging in development mode
      if (coreConfig.NODE_ENV !== 'development') {
        console.log(`⏹️  Stopped job: ${id}`);
      }
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs(): void {
    for (const [id, timeout] of this.jobs) {
      clearInterval(timeout);

      // Reduce logging in development mode
      if (coreConfig.NODE_ENV !== 'development') {
        console.log(`⏹️  Stopped job: ${id}`);
      }
    }
    this.jobs.clear();
    this.jobFunctions.clear();
    this.jobIntervals.clear();

    // Reduce logging in development mode
    if (coreConfig.NODE_ENV !== 'development') {
      console.log('⏹️  All jobs stopped');
    }
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(id: string): JobStatus | undefined {
    return this.jobStatuses.get(id);
  }

  /**
   * Get status of all jobs
   */
  getAllJobStatuses(): JobStatus[] {
    return Array.from(this.jobStatuses.values());
  }

  /**
   * Get job execution metrics
   */
  getJobMetrics(): JobMetrics {
    return { ...this.metrics };
  }
}
