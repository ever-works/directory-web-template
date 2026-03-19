/**
 * Background job status types
 */
export type JobStatusType = 'running' | 'completed' | 'failed' | 'scheduled' | 'stopped';

/**
 * Job status information
 */
export interface JobStatus {
  id: string;
  name: string;
  status: JobStatusType;
  lastRun: Date | null;
  nextRun: Date | null;
  duration: number;
  error?: string;
}

/**
 * Job execution metrics
 */
export interface JobMetrics {
  /**
   * Total number of job executions (not the number of jobs scheduled)
   */
  totalExecutions: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}

/**
 * Background job manager interface
 * Provides abstraction for different job scheduling implementations
 */
export interface BackgroundJobManager {
  /**
   * Schedule a job to run at regular intervals
   * @param id Unique job identifier
   * @param name Human-readable job name
   * @param job Function to execute
   * @param interval Interval in milliseconds
   */
  scheduleJob(id: string, name: string, job: () => void | Promise<void>, interval: number): void;

  /**
   * Schedule a job using cron expression
   * @param id Unique job identifier
   * @param name Human-readable job name
   * @param job Function to execute
   * @param cronExpression Cron expression string
   */
  scheduleCronJob(id: string, name: string, job: () => void | Promise<void>, cronExpression: string): void;

  /**
   * Manually trigger a job execution
   * @param id Job identifier
   */
  triggerJob(id: string): Promise<void>;

  /**
   * Stop a specific job
   * @param id Job identifier
   */
  stopJob(id: string): void;

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs(): void;

  /**
   * Get status of a specific job
   * @param id Job identifier
   * @returns Job status or undefined if not found
   */
  getJobStatus(id: string): JobStatus | undefined;

  /**
   * Get status of all jobs
   * @returns Array of all job statuses
   */
  getAllJobStatuses(): JobStatus[];

  /**
   * Get job execution metrics
   * @returns Job metrics
   */
  getJobMetrics(): JobMetrics;
}

/**
 * Trigger.dev configuration
 */
export interface TriggerDevConfig {
  enabled: boolean;
  apiKey?: string;
  apiUrl?: string;
  environment: string;
  isFullyConfigured: boolean;
  isPartiallyConfigured: boolean;
}

/**
 * Scheduling mode determines which scheduling system is active
 */
export type SchedulingMode = 'trigger-dev' | 'vercel' | 'local' | 'disabled';
